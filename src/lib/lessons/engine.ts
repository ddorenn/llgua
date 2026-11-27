/**
 * Lesson engine (docs/curriculum/11): pure functions over (lesson, session).
 * - which blocks a stage shows (incl. adaptive branches, 11 §5)
 * - deterministic checking of closed answers (13 §8)
 * - the lesson report: accuracy per stage against the standard's criteria, up to 3 mistakes
 *   for the feedback stage (11 §6), time per stage vs plan, words saved, self-assessment.
 */
import { checkInput, normalizeAnswer } from "@/lib/placement/scoring";
import type { LessonSession } from "@/lib/store/types";
import type { Block, BlockOf, Lesson, Stage } from "./schema";

export const LESSON_RULES = {
  warmupFirstTry: 0.8,
  practicePass: 0.7,
  maxFeedbackItems: 3,
} as const;

export function newSession(lesson: Lesson, now = new Date()): LessonSession {
  const at = now.toISOString();
  return {
    lessonId: lesson.id,
    version: lesson.version,
    status: "in_progress",
    startedAt: at,
    updatedAt: at,
    stage: 0,
    block: 0,
    attempts: {},
    branches: [],
    writing: {},
    stageMs: {},
    corrections: {},
    savedWords: [],
  };
}

/** Blocks shown in a stage: authored blocks + branch blocks once the branch fired. */
export function stageBlocks(stage: Stage, session: LessonSession): Block[] {
  if (stage.branch && session.branches.includes(stage.id)) {
    // Insert extra work before closing (non-graded) blocks so it is practised before moving on.
    const tailStart = stage.blocks.findIndex((b, i) => i > 0 && stage.blocks.slice(i).every((x) => !isGraded(x)));
    const at = tailStart > 0 ? tailStart : stage.blocks.length;
    return [...stage.blocks.slice(0, at), ...stage.branch.add, ...stage.blocks.slice(at)];
  }
  return stage.blocks;
}

export function isGraded(b: Block): boolean {
  return ["choice", "gap", "order", "match", "reading", "listening", "dialogue", "review"].includes(b.type);
}

/** Attempt keys a block produces (review keys are dynamic and prefixed by the block id). */
export function blockKeys(b: Block): string[] {
  switch (b.type) {
    case "choice":
    case "gap":
    case "order":
    case "match":
      return [b.id];
    case "reading":
    case "listening":
      return b.questions.map((q) => `${b.id}/${q.id}`);
    case "dialogue":
      return b.steps.map((s) => `${b.id}/${s.id}`);
    default:
      return [];
  }
}

function stageAttempts(stage: Stage, session: LessonSession) {
  const blocks = stageBlocks(stage, session);
  const keys = new Set(blocks.flatMap(blockKeys));
  const reviewPrefixes = blocks.filter((b) => b.type === "review").map((b) => `${b.id}/`);
  return Object.entries(session.attempts).filter(([k]) => keys.has(k) || reviewPrefixes.some((p) => k.startsWith(p)));
}

export function stageErrors(stage: Stage, session: LessonSession): number {
  return stageAttempts(stage, session).filter(([, a]) => !a.firstOk).length;
}

export function shouldBranch(stage: Stage, session: LessonSession): boolean {
  return !!stage.branch && !session.branches.includes(stage.id) && stageErrors(stage, session) >= stage.branch.errorsAtLeast;
}

/* ------------------------------------------------------------ checking */

/**
 * Gap answers. Also accepts the answer when the learner repeated the words that already stand
 * before the gap ("I ___ (book)" → "I'm going to book").
 */
export function checkGap(text: string, answers: string[], prompt?: string): boolean {
  if (checkInput(text, answers)) return true;
  const before = prompt?.split("___")[0]?.trim();
  if (!before) return false;
  const lead = normalizeAnswer(before.split(/\s+/).slice(-2).join(" "));
  const t = normalizeAnswer(text);
  for (const n of [lead, lead.split(" ").slice(-1)[0]]) {
    if (n && t.startsWith(n + " ") && checkInput(t.slice(n.length + 1), answers)) return true;
  }
  return false;
}

export function checkOrder(sentence: string, answers: string[]): boolean {
  const n = (s: string) => normalizeAnswer(s).replace(/\s+([,.!?])/g, "$1");
  return answers.some((a) => n(a) === n(sentence));
}

/** Tokens for an order task, shuffled deterministically by block id. */
export function orderTokens(b: BlockOf<"order">): string[] {
  const words = b.answers[0].replace(/([,.!?])/g, " $1").split(/\s+/).filter(Boolean);
  return seededShuffle(words, b.id);
}

export function seededShuffle<T>(xs: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 2246822507) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  // never show the solved order
  if (out.length > 2 && out.every((x, i) => x === xs[i])) out.push(out.shift()!);
  return out;
}

export function checkDialogue(step: BlockOf<"dialogue">["steps"][number], reply: { choice?: number; text?: string }): boolean {
  if (step.options && reply.choice != null) return (step.correct ?? []).includes(reply.choice);
  if (step.keywords && reply.text) return step.keywords.every((k) => new RegExp(k, "i").test(reply.text!));
  return false;
}

export function writingTargets(b: BlockOf<"writing">, text: string) {
  return b.targets.map((t) => ({ label: t.label, count: (text.match(new RegExp(t.pattern, "gi")) ?? []).length }));
}

/** The correct answer as text, for feedback. */
export function correctText(lesson: Lesson, key: string): { prompt: string; correct: string; explanation: string } | null {
  const [blockId, sub] = key.split("/");
  for (const st of lesson.stages) {
    for (const b of [...st.blocks, ...(st.branch?.add ?? [])]) {
      if (b.id !== blockId) continue;
      if (b.type === "choice") return { prompt: b.prompt, correct: b.options[b.answer], explanation: b.explanation };
      if (b.type === "gap") return { prompt: b.prompt, correct: b.answers[0], explanation: b.explanation };
      if (b.type === "order") return { prompt: b.prompt ?? "Составьте предложение", correct: b.answers[0], explanation: b.explanation };
      if (b.type === "match") return { prompt: b.prompt ?? "Сопоставьте", correct: b.pairs.map((p) => `${p[0]} — ${p[1]}`).join("; "), explanation: b.explanation ?? "" };
      if (b.type === "reading" || b.type === "listening") {
        const q = b.questions.find((x) => x.id === sub);
        if (q) return { prompt: q.prompt, correct: q.options[q.answer], explanation: q.explanation };
      }
      if (b.type === "dialogue") {
        const s = b.steps.find((x) => x.id === sub);
        if (s) return { prompt: s.partner, correct: s.model, explanation: s.feedback ?? "" };
      }
      if (b.type === "review") {
        const f = b.fallback.find((x) => x.id === sub);
        if (f) return { prompt: f.prompt, correct: f.answers[0], explanation: f.explanation };
      }
    }
  }
  return null;
}

/* -------------------------------------------------------------- report */

export interface StageReport {
  id: string;
  title: string;
  kind: Stage["kind"];
  graded: number;
  firstTry: number;
  correct: number;
  accuracy: number | null;
  /** Criterion of the standard for this stage, if any, and whether it was met. */
  criterion?: { label: string; met: boolean };
  minutesPlanned: number;
  minutesActual: number;
  branched: boolean;
}

export interface Mistake {
  key: string;
  prompt: string;
  yours: string;
  correct: string;
  explanation: string;
  stage: Stage["kind"];
}

export interface LessonReport {
  stages: StageReport[];
  graded: number;
  firstTry: number;
  accuracy: number | null;
  mistakes: Mistake[];
  /** At most 3, by priority (11 §6 / 08 §5): application → practice → input → warm-up. */
  feedback: Mistake[];
  savedWords: string[];
  writingSubmitted: number;
  selfAssessment: LessonSession["selfAssessment"];
  minutesActual: number;
  /** Objective-level summary for the wrap-up — honest: based only on graded work in this lesson. */
  objectiveStatus: "met" | "partly" | "not_yet" | "no_data";
}

const PRIORITY: Record<Stage["kind"], number> = { use: 0, practice: 1, input: 2, warmup: 3, feedback: 4, wrapup: 5 };

export function lessonReport(lesson: Lesson, session: LessonSession): LessonReport {
  const stages: StageReport[] = lesson.stages.map((st) => {
    const atts = stageAttempts(st, session).map(([, a]) => a);
    const graded = atts.length;
    const firstTry = atts.filter((a) => a.firstOk).length;
    const correct = atts.filter((a) => a.ok).length;
    const accuracy = graded ? firstTry / graded : null;
    let criterion: StageReport["criterion"];
    if (st.kind === "warmup" && graded) criterion = { label: "≥ 80% с первой попытки", met: accuracy! >= LESSON_RULES.warmupFirstTry };
    if (st.kind === "practice" && graded) criterion = { label: "≥ 70% в практике", met: accuracy! >= LESSON_RULES.practicePass };
    if (st.kind === "input" && graded) criterion = { label: "concept-check без ошибок (допускается одна)", met: graded - firstTry <= 1 };
    return {
      id: st.id,
      title: st.title,
      kind: st.kind,
      graded,
      firstTry,
      correct,
      accuracy,
      criterion,
      minutesPlanned: st.minutes,
      minutesActual: Math.round((session.stageMs[st.id] ?? 0) / 60000),
      branched: session.branches.includes(st.id),
    };
  });

  const stageOf = new Map<string, Stage["kind"]>();
  for (const st of lesson.stages) for (const b of [...st.blocks, ...(st.branch?.add ?? [])]) for (const k of [b.id]) stageOf.set(k, st.kind);
  const mistakes: Mistake[] = [];
  for (const [key, a] of Object.entries(session.attempts)) {
    if (a.firstOk) continue;
    const c = correctText(lesson, key);
    if (!c) continue;
    mistakes.push({ key, prompt: c.prompt, yours: a.answer, correct: c.correct, explanation: c.explanation, stage: stageOf.get(key.split("/")[0]) ?? "practice" });
  }
  const feedback = [...mistakes].sort((x, y) => PRIORITY[x.stage] - PRIORITY[y.stage]).slice(0, LESSON_RULES.maxFeedbackItems);

  const graded = stages.reduce((n, s) => n + s.graded, 0);
  const firstTry = stages.reduce((n, s) => n + s.firstTry, 0);
  const accuracy = graded ? firstTry / graded : null;
  const practice = stages.find((s) => s.kind === "practice");
  const use = stages.find((s) => s.kind === "use");
  const objectiveStatus: LessonReport["objectiveStatus"] =
    accuracy == null ? "no_data" : (practice?.criterion?.met ?? true) && (use?.accuracy ?? 1) >= 0.7 ? "met" : accuracy >= 0.5 ? "partly" : "not_yet";

  return {
    stages,
    graded,
    firstTry,
    accuracy,
    mistakes,
    feedback,
    savedWords: session.savedWords,
    writingSubmitted: Object.keys(session.writing).length,
    selfAssessment: session.selfAssessment,
    minutesActual: Math.round(Object.values(session.stageMs).reduce((a, b) => a + b, 0) / 60000),
    objectiveStatus,
  };
}

/** Advance the position by one block; returns the new (stage, block) or null at the end of the lesson. */
export function nextPosition(lesson: Lesson, session: LessonSession): { stage: number; block: number } | null {
  const st = lesson.stages[session.stage];
  if (!st) return null;
  const blocks = stageBlocks(st, session);
  if (session.block + 1 < blocks.length) return { stage: session.stage, block: session.block + 1 };
  if (session.stage + 1 < lesson.stages.length) return { stage: session.stage + 1, block: 0 };
  return null;
}
