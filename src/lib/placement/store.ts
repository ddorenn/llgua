import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { PlacementState, ResponseRecord } from "./engine";
import type { Intake, PlacementResult } from "./types";

/**
 * Placement persistence.
 * - Supabase mode: tables `placements`, `placement_responses`, `learner_consents` through the signed-in
 *   learner's own session, so row-level security restricts every query to their rows.
 * - Local / demo mode: one JSON file per user under LINGUA_DATA_DIR (default .data/, /tmp on Vercel).
 * Both expose the same interface; the API routes never touch storage directly.
 */

export interface PlacementRecord {
  id: string;
  userId: string;
  status: "in_progress" | "completed" | "abandoned";
  mode: "full" | "zero";
  configVersion: string;
  bankVersion: string;
  intake: Intake;
  state: PlacementState;
  result: PlacementResult | null;
  seq: number;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface StoredResponse extends ResponseRecord {
  seq: number;
  itemVersion: string;
  createdAt: string;
}

export type SaveOutcome = "ok" | "conflict";

export interface PlacementStore {
  latest(): Promise<PlacementRecord | null>;
  latestCompleted(): Promise<PlacementRecord | null>;
  create(rec: Omit<PlacementRecord, "id" | "userId" | "startedAt" | "updatedAt" | "completedAt" | "result" | "seq" | "status">): Promise<PlacementRecord>;
  /** Persist new state/result if the stored seq still equals `expectedSeq`. */
  save(rec: PlacementRecord, expectedSeq: number): Promise<SaveOutcome>;
  /** Append a response; "conflict" when one with the same (placement, seq) exists. */
  addResponse(placementId: string, r: StoredResponse): Promise<SaveOutcome>;
  responses(placementId: string): Promise<StoredResponse[]>;
  setStatus(id: string, status: PlacementRecord["status"]): Promise<void>;
  setConsent(kind: "voice_recording" | "text_storage", granted: boolean): Promise<void>;
}

/* ------------------------------------------------------------- supabase */

type Row = {
  id: string;
  user_id: string;
  status: PlacementRecord["status"];
  mode: PlacementRecord["mode"];
  config_version: string;
  bank_version: string;
  intake: Intake;
  state: PlacementState;
  result: PlacementResult | null;
  seq: number;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
};
const fromRow = (r: Row): PlacementRecord => ({
  id: r.id,
  userId: r.user_id,
  status: r.status,
  mode: r.mode,
  configVersion: r.config_version,
  bankVersion: r.bank_version,
  intake: r.intake,
  state: r.state,
  result: r.result,
  seq: r.seq,
  startedAt: r.started_at,
  updatedAt: r.updated_at,
  completedAt: r.completed_at,
});

async function supabaseStore(userId: string): Promise<PlacementStore> {
  const { createSupabaseServerClient } = await import("@/lib/db/supabase/server");
  const db = await createSupabaseServerClient();
  const cols = "id,user_id,status,mode,config_version,bank_version,intake,state,result,seq,started_at,updated_at,completed_at";
  const fail = (what: string, e: { message?: string } | null) => {
    if (e) throw new Error(`placement ${what}: ${e.message ?? "db error"}`);
  };
  return {
    async latest() {
      const { data, error } = await db.from("placements").select(cols).eq("user_id", userId).order("started_at", { ascending: false }).limit(1).maybeSingle();
      fail("latest", error);
      return data ? fromRow(data as Row) : null;
    },
    async latestCompleted() {
      const { data, error } = await db
        .from("placements")
        .select(cols)
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      fail("latestCompleted", error);
      return data ? fromRow(data as Row) : null;
    },
    async create(rec) {
      const { data, error } = await db
        .from("placements")
        .insert({ user_id: userId, mode: rec.mode, config_version: rec.configVersion, bank_version: rec.bankVersion, intake: rec.intake, state: rec.state })
        .select(cols)
        .single();
      fail("create", error);
      return fromRow(data as Row);
    },
    async save(rec, expectedSeq) {
      const { data, error } = await db
        .from("placements")
        .update({
          state: rec.state,
          result: rec.result,
          seq: rec.seq,
          status: rec.status,
          completed_at: rec.completedAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", rec.id)
        .eq("user_id", userId)
        .eq("seq", expectedSeq)
        .select("id");
      fail("save", error);
      return data && data.length ? "ok" : "conflict";
    },
    async addResponse(placementId, r) {
      const { error } = await db.from("placement_responses").insert({
        placement_id: placementId,
        user_id: userId,
        item_id: r.itemId,
        item_version: r.itemVersion,
        seq: r.seq,
        section: r.section,
        band: r.band,
        response: r.answer,
        correct: r.correct,
        ms: Math.round(r.ms),
        suspect_guess: r.suspectGuess,
      });
      if (error?.code === "23505") return "conflict";
      fail("addResponse", error);
      return "ok";
    },
    async responses(placementId) {
      const { data, error } = await db
        .from("placement_responses")
        .select("item_id,item_version,seq,section,band,response,correct,ms,suspect_guess,created_at")
        .eq("placement_id", placementId)
        .eq("user_id", userId)
        .order("seq", { ascending: true });
      fail("responses", error);
      return (data ?? []).map((d) => ({
        itemId: d.item_id,
        itemVersion: d.item_version,
        seq: d.seq,
        section: d.section,
        band: d.band,
        answer: d.response,
        correct: d.correct,
        ms: d.ms,
        suspectGuess: d.suspect_guess,
        createdAt: d.created_at,
      }));
    },
    async setStatus(id, status) {
      const { error } = await db.from("placements").update({ status, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
      fail("setStatus", error);
    },
    async setConsent(kind, granted) {
      const { error } = await db.from("learner_consents").upsert({ user_id: userId, kind, granted, decided_at: new Date().toISOString() });
      fail("setConsent", error);
    },
  };
}

/* ----------------------------------------------------------------- file */

interface FileData {
  placements: PlacementRecord[];
  responses: Record<string, StoredResponse[]>;
  consents: Record<string, { granted: boolean; decidedAt: string }>;
}

const locks = new Map<string, Promise<unknown>>();
function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(key, next.catch(() => undefined));
  return next;
}

function dataDir() {
  return process.env.LINGUA_DATA_DIR || (process.env.VERCEL ? "/tmp/lingua-data" : path.join(process.cwd(), ".data"));
}

function fileStore(userId: string): PlacementStore {
  // User ids in local/demo mode are usernames; keep file names safe and unambiguous.
  const safe = Buffer.from(userId).toString("base64url");
  const file = path.join(dataDir(), "placement", `${safe}.json`);
  const read = async (): Promise<FileData> => {
    try {
      return JSON.parse(await fs.readFile(file, "utf8")) as FileData;
    } catch {
      return { placements: [], responses: {}, consents: {} };
    }
  };
  const write = async (d: FileData) => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(d));
    await fs.rename(tmp, file);
  };
  const tx = <T>(fn: (d: FileData) => T | Promise<T>, mutate = true) =>
    withLock(file, async () => {
      const d = await read();
      const out = await fn(d);
      if (mutate) await write(d);
      return out;
    });
  const sorted = (d: FileData) => [...d.placements].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return {
    latest: () => tx((d) => sorted(d)[0] ?? null, false),
    latestCompleted: () => tx((d) => sorted(d).find((p) => p.status === "completed") ?? null, false),
    create: (rec) =>
      tx((d) => {
        const now = new Date().toISOString();
        if (d.placements.some((p) => p.status === "in_progress")) throw new Error("placement create: one already in progress");
        const full: PlacementRecord = { ...rec, id: crypto.randomUUID(), userId, status: "in_progress", result: null, seq: 0, startedAt: now, updatedAt: now, completedAt: null };
        d.placements.push(full);
        return full;
      }),
    save: (rec, expectedSeq) =>
      tx((d) => {
        const i = d.placements.findIndex((p) => p.id === rec.id);
        if (i < 0 || d.placements[i].seq !== expectedSeq) return "conflict" as const;
        d.placements[i] = { ...rec, userId, updatedAt: new Date().toISOString() };
        return "ok" as const;
      }),
    addResponse: (placementId, r) =>
      tx((d) => {
        const list = (d.responses[placementId] ??= []);
        if (list.some((x) => x.seq === r.seq)) return "conflict" as const;
        list.push(r);
        return "ok" as const;
      }),
    responses: (placementId) => tx((d) => [...(d.responses[placementId] ?? [])].sort((a, b) => a.seq - b.seq), false),
    setStatus: (id, status) =>
      tx((d) => {
        const p = d.placements.find((x) => x.id === id);
        if (p) {
          p.status = status;
          p.updatedAt = new Date().toISOString();
        }
      }),
    setConsent: (kind, granted) =>
      tx((d) => {
        d.consents[kind] = { granted, decidedAt: new Date().toISOString() };
      }),
  };
}

export async function placementStore(user: { id: string; mode: string }): Promise<PlacementStore> {
  return user.mode === "supabase" ? supabaseStore(user.id) : fileStore(user.id);
}
