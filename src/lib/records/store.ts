import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { CurrentUser } from "@/lib/auth/server";
import { signedWrite2 } from "@/lib/db/signed";

/**
 * Server-authoritative learning records: lesson attempts, lesson results, review events.
 * Supabase: learners can read their rows, writes are server-signed (lingua_write2) — results and
 * statistics cannot be edited through the public API. Local/demo mode: a JSON file per user.
 */

export interface AttemptRow {
  lesson_id: string;
  lesson_version: number;
  item_key: string;
  skill: string;
  try_no: number;
  ok: boolean;
  answer: string;
  ms: number;
  created_at: string;
}

export interface ResultRow {
  lesson_id: string;
  lesson_version: number;
  started_at: string | null;
  completed_at: string;
  graded: number;
  first_try: number;
  minutes: number;
  stages: { id: string; title: string; kind: string; graded: number; firstTry: number; minutesActual: number; minutesPlanned: number }[];
  self_assessment: Record<string, string>;
  objective_status: string;
  mistakes: { key: string; prompt: string; yours: string; correct: string }[];
}

export interface SrsEventRow {
  item_id: string;
  kind: "word" | "error";
  ok: boolean;
  at: string;
}

export interface RecordsStore {
  attempts(filter: { lessonId?: string; version?: number; since?: string }): Promise<AttemptRow[]>;
  addAttempt(a: Omit<AttemptRow, "created_at">): Promise<boolean>;
  results(): Promise<ResultRow[]>;
  addResult(r: ResultRow): Promise<boolean>;
  srsEvents(since?: string): Promise<SrsEventRow[]>;
  addSrsEvent(e: Omit<SrsEventRow, "at">): Promise<void>;
}

async function supabaseRecords(userId: string): Promise<RecordsStore> {
  const { createSupabaseServerClient } = await import("@/lib/db/supabase/server");
  const db = await createSupabaseServerClient();
  const fail = (what: string, e: { message?: string } | null) => {
    if (e) throw new Error(`records ${what}: ${e.message}`);
  };
  return {
    async attempts(f) {
      let q = db.from("lesson_attempts").select("lesson_id,lesson_version,item_key,skill,try_no,ok,answer,ms,created_at").eq("user_id", userId);
      if (f.lessonId) q = q.eq("lesson_id", f.lessonId);
      if (f.version != null) q = q.eq("lesson_version", f.version);
      if (f.since) q = q.gte("created_at", f.since);
      const { data, error } = await q.order("created_at", { ascending: true }).limit(5000);
      fail("attempts", error);
      return (data ?? []) as AttemptRow[];
    },
    async addAttempt(a) {
      const r = await signedWrite2(db, userId, "lesson.attempt", { lessonId: a.lesson_id, version: a.lesson_version, key: a.item_key, skill: a.skill, tryNo: a.try_no, ok: a.ok, answer: a.answer, ms: a.ms });
      return r.n > 0;
    },
    async results() {
      const { data, error } = await db
        .from("lesson_results")
        .select("lesson_id,lesson_version,started_at,completed_at,graded,first_try,minutes,stages,self_assessment,objective_status,mistakes")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false })
        .limit(500);
      fail("results", error);
      return (data ?? []) as ResultRow[];
    },
    async addResult(r) {
      const x = await signedWrite2(db, userId, "lesson.result", {
        lessonId: r.lesson_id,
        version: r.lesson_version,
        startedAt: r.started_at ?? "",
        completedAt: r.completed_at,
        graded: r.graded,
        firstTry: r.first_try,
        minutes: r.minutes,
        stages: r.stages,
        selfAssessment: r.self_assessment,
        objectiveStatus: r.objective_status,
        mistakes: r.mistakes,
      });
      return x.n > 0;
    },
    async srsEvents(since) {
      let q = db.from("srs_events").select("item_id,kind,ok,at").eq("user_id", userId);
      if (since) q = q.gte("at", since);
      const { data, error } = await q.order("at", { ascending: true }).limit(10000);
      fail("srs", error);
      return (data ?? []) as SrsEventRow[];
    },
    async addSrsEvent(e) {
      await signedWrite2(db, userId, "srs.event", { itemId: e.item_id, kind: e.kind, ok: e.ok });
    },
  };
}

interface FileData {
  attempts: AttemptRow[];
  results: ResultRow[];
  srs: SrsEventRow[];
}

function recordsFile(userId: string) {
  const dir = process.env.LINGUA_DATA_DIR || (process.env.VERCEL ? "/tmp/lingua-data" : path.join(process.cwd(), ".data"));
  return path.join(dir, "records", `${Buffer.from(userId).toString("base64url")}.json`);
}

export async function readRecordsFile(userId: string): Promise<FileData> {
  try {
    return JSON.parse(await fs.readFile(recordsFile(userId), "utf8")) as FileData;
  } catch {
    return { attempts: [], results: [], srs: [] };
  }
}
export async function writeRecordsFile(userId: string, d: FileData) {
  const f = recordsFile(userId);
  await fs.mkdir(path.dirname(f), { recursive: true });
  await fs.writeFile(f, JSON.stringify(d));
}

let chain: Promise<unknown> = Promise.resolve();
const serial = <T>(fn: () => Promise<T>) => {
  const next = chain.then(fn, fn);
  chain = next.catch(() => undefined);
  return next;
};

function fileRecords(userId: string): RecordsStore {
  return {
    async attempts(f) {
      const d = await readRecordsFile(userId);
      return d.attempts.filter((a) => (!f.lessonId || a.lesson_id === f.lessonId) && (f.version == null || a.lesson_version === f.version) && (!f.since || a.created_at >= f.since));
    },
    addAttempt: (a) =>
      serial(async () => {
        const d = await readRecordsFile(userId);
        if (d.attempts.some((x) => x.lesson_id === a.lesson_id && x.lesson_version === a.lesson_version && x.item_key === a.item_key && x.try_no === a.try_no)) return false;
        d.attempts.push({ ...a, created_at: new Date().toISOString() });
        await writeRecordsFile(userId, d);
        return true;
      }),
    async results() {
      return [...(await readRecordsFile(userId)).results].sort((a, b) => b.completed_at.localeCompare(a.completed_at));
    },
    addResult: (r) =>
      serial(async () => {
        const d = await readRecordsFile(userId);
        d.results.push(r);
        await writeRecordsFile(userId, d);
        return true;
      }),
    async srsEvents(since) {
      return (await readRecordsFile(userId)).srs.filter((e) => !since || e.at >= since);
    },
    addSrsEvent: (e) =>
      serial(async () => {
        const d = await readRecordsFile(userId);
        d.srs.push({ ...e, at: new Date().toISOString() });
        await writeRecordsFile(userId, d);
      }),
  };
}

export async function recordsStore(user: CurrentUser): Promise<RecordsStore> {
  return user.mode === "supabase" ? supabaseRecords(user.id) : fileRecords(user.id);
}
