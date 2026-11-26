import "server-only";
import { z } from "zod";
import type { CurrentUser } from "@/lib/auth/server";
import { BANK_VERSION, config, grammar, listening, reading, vocabulary, writing } from "./bank";
import { applyAnswer, createState, currentStep, type ApplyError } from "./engine";
import { computeResult } from "./result";
import { placementStore, type PlacementRecord, type PlacementStore } from "./store";
import type { Answer, Intake, PlacementView } from "./types";

/** Validation of what the client may send. */
export const IntakeSchema = z.object({
  name: z.string().trim().max(60).optional(),
  goals: z.array(z.enum(["travel", "work", "exam", "communication", "study", "relocation", "self"])).max(7),
  experience: z.enum(["none", "some", "current"]),
  selfLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "unknown"]),
  pace: z.number().int().refine((n) => config.pace.allowed.includes(n), "pace"),
  voiceConsent: z.boolean(),
});

export const AnswerSchema = z.object({
  itemId: z.string().min(1).max(40),
  choice: z.number().int().min(0).max(5).optional(),
  text: z.string().max(8000).optional(),
  dontKnow: z.boolean().optional(),
  skip: z.boolean().optional(),
  pastedChars: z.number().int().min(0).max(100000).optional(),
  ms: z.number().min(0).max(24 * 3600 * 1000),
  seq: z.number().int().min(0),
});

function itemVersion(itemId: string) {
  if (itemId.startsWith("v-")) return `vocabulary@${vocabulary.version}`;
  if (itemId.startsWith("g-")) return `grammar@${grammar.version}`;
  if (itemId.startsWith("r-")) return `reading@${reading.version}`;
  if (itemId.startsWith("l-")) return `listening@${listening.version}`;
  if (itemId.startsWith("w-")) return `writing@${writing.version}`;
  return "speaking@0";
}

function retestAfter(last: PlacementRecord | null): string | null {
  if (!last?.completedAt || config.retestIntervalDays <= 0) return null;
  const t = new Date(last.completedAt).getTime() + config.retestIntervalDays * 86_400_000;
  return t > Date.now() ? new Date(t).toISOString() : null;
}

function resumeExpired(rec: PlacementRecord) {
  return Date.now() - new Date(rec.updatedAt).getTime() > config.resumeWindowHours * 3_600_000;
}

function toView(rec: PlacementRecord, store: { lastCompleted: PlacementRecord | null }): PlacementView {
  const step = rec.status === "in_progress" ? currentStep(rec.state, rec.intake, rec.id, Date.now()) : { kind: "done" as const };
  return {
    id: rec.id,
    status: rec.status,
    mode: rec.mode,
    startedAt: rec.startedAt,
    completedAt: rec.completedAt,
    seq: rec.state.seq,
    step,
    intake: rec.intake,
    result: rec.result,
    retestAfter: retestAfter(store.lastCompleted),
    pilotEarlyRetake: config.pilotAllowEarlyRetake,
  };
}

export interface Overview {
  /** The in-progress placement, or the latest completed one. */
  current: PlacementView | null;
  canStart: boolean;
  retestAfter: string | null;
  pilotEarlyRetake: boolean;
  configVersion: string;
}

async function overview(store: PlacementStore): Promise<Overview> {
  let latest = await store.latest();
  if (latest?.status === "in_progress" && resumeExpired(latest)) {
    // 14 §15: after the resume window the attempt is closed; a new one starts from scratch.
    await store.setStatus(latest.id, "abandoned");
    latest = await store.latest();
  }
  const lastCompleted = await store.latestCompleted();
  const ra = retestAfter(lastCompleted);
  let current: PlacementView | null = null;
  if (latest?.status === "in_progress") {
    const before = JSON.stringify(latest.state);
    current = toView(latest, { lastCompleted });
    // Section initialisation (start bands, first block) is persisted so a reload sees the same item.
    if (JSON.stringify(latest.state) !== before) await store.save(latest, latest.seq);
  } else if (lastCompleted) {
    current = toView(lastCompleted, { lastCompleted });
  }
  return {
    current,
    canStart: !ra || config.pilotAllowEarlyRetake,
    retestAfter: ra,
    pilotEarlyRetake: config.pilotAllowEarlyRetake,
    configVersion: config.version,
  };
}

export async function getOverview(user: CurrentUser) {
  return overview(await placementStore(user));
}

export async function startPlacement(user: CurrentUser, intake: Intake): Promise<{ ok: true; overview: Overview } | { ok: false; error: "retest_too_soon" }> {
  const store = await placementStore(user);
  const lastCompleted = await store.latestCompleted();
  if (retestAfter(lastCompleted) && !config.pilotAllowEarlyRetake) return { ok: false, error: "retest_too_soon" };
  const latest = await store.latest();
  if (latest?.status === "in_progress") await store.setStatus(latest.id, "abandoned");
  await store.setConsent("voice_recording", intake.voiceConsent);
  await store.create({ mode: intake.experience === "none" ? "zero" : "full", configVersion: config.version, bankVersion: BANK_VERSION, intake, state: createState(intake) });
  return { ok: true, overview: await overview(store) };
}

export type AnswerError = ApplyError | "not_found" | "conflict";

export async function answerPlacement(user: CurrentUser, placementId: string, answer: Answer): Promise<{ ok: true; overview: Overview } | { ok: false; error: AnswerError; overview?: Overview }> {
  const store = await placementStore(user);
  const rec = await store.latest();
  if (!rec || rec.id !== placementId || rec.status !== "in_progress") return { ok: false, error: "not_found", overview: await overview(store) };
  const expectedSeq = rec.seq;
  const r = applyAnswer(rec.state, rec.intake, answer, rec.id, Date.now());
  if (!r.ok) {
    return { ok: false, error: r.error, overview: r.error === "seq_mismatch" || r.error === "item_mismatch" ? await overview(store) : undefined };
  }
  // Append the response first: the unique (placement, seq) key makes a double submit a no-op.
  const added = await store.addResponse(rec.id, { ...r.response, seq: answer.seq, itemVersion: itemVersion(r.response.itemId), createdAt: new Date().toISOString() });
  // A conflict while the stored state is still at this seq means an earlier request stored the response
  // but never saved the state (e.g. it crashed in between) — continue, so the learner is not stuck.
  if (added === "conflict") {
    const fresh = await store.latest();
    if (!fresh || fresh.id !== rec.id || fresh.seq !== expectedSeq) return { ok: false, error: "conflict", overview: await overview(store) };
  }

  rec.seq = rec.state.seq;
  const step = currentStep(rec.state, rec.intake, rec.id, Date.now());
  if (step.kind === "done") {
    const responses = await store.responses(rec.id);
    rec.result = computeResult(rec.state, responses, rec.intake, new Date());
    rec.status = "completed";
    rec.completedAt = new Date().toISOString();
  }
  const saved = await store.save(rec, expectedSeq);
  if (saved === "conflict") return { ok: false, error: "conflict", overview: await overview(store) };
  return { ok: true, overview: await overview(store) };
}

export async function abandonPlacement(user: CurrentUser, placementId: string) {
  const store = await placementStore(user);
  const rec = await store.latest();
  if (rec && rec.id === placementId && rec.status === "in_progress") await store.setStatus(rec.id, "abandoned");
  return overview(store);
}
