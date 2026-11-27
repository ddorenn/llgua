import "server-only";
import { z } from "zod";
import type { CurrentUser } from "@/lib/auth/server";
import { BANK_VERSION, catalog, config, grammar, listening, reading, vocabulary, writing } from "./bank";
import { applyAnswer, createRecheckState, createState, currentStep, type ApplyError } from "./engine";
import { applyRecheck, applyWritingEvaluations, computeResult, sublevelToBand } from "./result";
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

/** Route content readiness is live: a module is ready once its published lessons exist (content added as files). */
async function withLiveReadiness(view: PlacementView | null): Promise<PlacementView | null> {
  const route = view?.result?.route;
  if (!route) return view;
  const { loadLessons } = await import("@/lib/lessons/registry");
  const mod = catalog.levels.flatMap((l) => l.modules).find((m) => m.code === route.startModule);
  const published = (await loadLessons()).filter((l) => l.module === route.startModule && (l.status === "published" || l.status === "reviewed"));
  const need = mod?.lessons ?? config.route.lessonsPerModule;
  if (published.length < need) return view;
  return { ...view!, result: { ...view!.result!, route: { ...route, content: { ready: true, message: `Модуль ${route.startModule} «${route.startTitle}» готов — можно начинать занятия.` } } } };
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
    // An expert review saved by the admin function is folded into the result once (level recombined).
    const r = lastCompleted.result;
    if (r?.writingExpert && r.skills.writing.confirmedBy !== "expert") {
      lastCompleted.result = applyWritingEvaluations(r, lastCompleted.intake);
      await store.setResult(lastCompleted.id, lastCompleted.result).catch(() => undefined);
    }
    current = toView(lastCompleted, { lastCompleted });
  }
  current = await withLiveReadiness(current);
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
    rec.status = "completed";
    rec.completedAt = new Date().toISOString();
    if (rec.mode === "recheck") {
      rec.result = null;
    } else {
      const responses = await store.responses(rec.id);
      rec.result = computeResult(rec.state, responses, rec.intake, new Date());
    }
  }
  const saved = await store.save(rec, expectedSeq);
  if (saved === "conflict") return { ok: false, error: "conflict", overview: await overview(store) };
  if (rec.status === "completed" && rec.mode === "recheck" && rec.state.recheck) {
    const parent = await store.latestCompleted();
    if (parent?.id === rec.state.recheck.parentId && parent.result) {
      await store.setResult(parent.id, applyRecheck(parent.result, rec.state, parent.intake, new Date()));
    }
  }
  return { ok: true, overview: await overview(store) };
}

export async function abandonPlacement(user: CurrentUser, placementId: string) {
  const store = await placementStore(user);
  const rec = await store.latest();
  if (rec && rec.id === placementId && rec.status === "in_progress") await store.setStatus(rec.id, "abandoned");
  return overview(store);
}

export type DisputeOutcome =
  | { ok: true; overview: Overview; recheck: boolean; message: string }
  | { ok: false; error: "not_found" | "recheck_done" };

/**
 * "Не согласен с уровнем" (14 §15): store the disagreement and, for "higher" / "lower",
 * start a short re-check at the neighbouring band. The level never changes without new evidence.
 */
export async function disputePlacement(user: CurrentUser, placementId: string, direction: "higher" | "lower" | "other", comment: string): Promise<DisputeOutcome> {
  const store = await placementStore(user);
  const parent = await store.latestCompleted();
  if (!parent || parent.id !== placementId || !parent.result) return { ok: false, error: "not_found" };
  if (parent.result.recheck) return { ok: false, error: "recheck_done" };
  await store.addFeedback(parent.id, direction, comment);
  const at = new Date().toISOString();
  await store.setResult(parent.id, { ...parent.result, dispute: { direction, at } });

  const res = parent.result;
  const band = res.overall == null ? -1 : sublevelToBand(res.overall);
  let target: number | null = null;
  if (direction === "higher" && !res.aboveRange && !res.overallLabel.startsWith("не ниже") && band < 7) target = band + 1;
  if (direction === "lower" && band > 0) target = band - 1;
  if (direction === "other" || target == null) {
    const message =
      direction === "other"
        ? "Спасибо — отзыв сохранён и будет учтён при калибровке диагностики."
        : direction === "higher"
          ? "Ваш результат уже на верхней границе диапазона диагностики — перепроверка выше невозможна. Отзыв сохранён."
          : "Ниже начального уровня перепроверить нельзя — программа и так начинается с основ. Отзыв сохранён.";
    return { ok: true, overview: await overview(store), recheck: false, message };
  }

  const latest = await store.latest();
  if (latest?.status === "in_progress") await store.setStatus(latest.id, "abandoned");
  // Use the grammar block the learner has not seen at that band, when possible.
  const seen = (await store.responses(parent.id)).filter((r) => r.section === "grammar" && r.band === target).length;
  await store.create({
    mode: "recheck",
    parentId: parent.id,
    configVersion: config.version,
    bankVersion: BANK_VERSION,
    intake: parent.intake,
    state: createRecheckState({ parentId: parent.id, direction, target, grammarBlock: seen > 0 && seen <= 5 ? 2 : 1 }),
  });
  return { ok: true, overview: await overview(store), recheck: true, message: "Короткая перепроверка: 5 заданий по грамматике и один текст." };
}

/** Preliminary AI evaluation of the placement writing text (once per placement). */
export async function evaluateWriting(user: CurrentUser, placementId: string): Promise<{ ok: true; overview: Overview } | { ok: false; error: string; message?: string }> {
  const store = await placementStore(user);
  const rec = await store.latestCompleted();
  if (!rec || rec.id !== placementId || !rec.result || rec.mode !== "full") return { ok: false, error: "not_found" };
  if (rec.result.writingAi) return { ok: true, overview: await overview(store) };
  const w = (await store.responses(rec.id)).find((r) => r.section === "writing" && typeof r.answer.text === "string" && r.answer.text.trim());
  if (!w) return { ok: false, error: "no_text" };
  const task = writing.tasks.find((t) => t.id === w.itemId);
  if (!task) return { ok: false, error: "not_found" };
  const { evaluatePlacementWriting } = await import("@/lib/ai/tutor");
  const words = config.writing.wordsByTier[task.tier] ?? [20, 200];
  const r = await evaluatePlacementWriting(user, { title: task.title, instruction: task.instruction, prompt: task.prompt, tier: task.tier, words }, w.answer.text!);
  if (!r.ok) return { ok: false, error: r.code, message: r.error };
  const pasted = Number(w.answer.pastedChars ?? 0) >= config.writing.pasteFlagChars;
  const next = applyWritingEvaluations(
    {
      ...rec.result,
      writingAi: { ...r.data, model: r.model, at: new Date().toISOString(), pasteFlagged: pasted, words: w.answer.text!.trim().split(/\s+/).length },
    },
    rec.intake,
  );
  await store.setResult(rec.id, next);
  return { ok: true, overview: await overview(store) };
}
