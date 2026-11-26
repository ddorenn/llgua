/**
 * Placement engine (docs/curriculum/14): adaptive block ladder for Vocabulary and Grammar,
 * adaptive testlets for Reading and Listening, Writing collected for later rubric evaluation,
 * Speaking recorded as "not assessed" in this version. Pure and deterministic:
 * (state, answer) → new state + response record. All thresholds come from config.
 */
import {
  BANDS, config as defaultConfig, grammar, ladderItem, ladderItems, listening, testletQuestion, testlets, vocabulary, writing,
  type Config, type LadderItem, type TestletT,
} from "./bank";
import { checkInput, hasCyrillic, optionOrder } from "./scoring";
import type { Answer, Intake, SectionId, Step, Stimulus } from "./types";

export const ENGINE_VERSION = "placement-engine-1";
/** Longest time one item can add to a section's active time (a learner who walks away is not penalised). */
const MAX_ITEM_MS = 3 * 60_000;
const TOP = BANDS.length - 1;

export type ConfLevel = 0 | 1 | 2; // low, medium, high
export type OutcomeReason = "boundary" | "floor" | "ceiling" | "limit" | "time" | "unresolved" | "skipped";

export interface Outcome {
  /** Last passed band; −1 = below Pre-A1. */
  band: number;
  ceiling: boolean;
  reason: OutcomeReason;
  confidence: ConfLevel;
  borderline: boolean;
  assessed: boolean;
}

export interface BandRec {
  blocks: number[];
  passed: boolean | null;
  borderline: boolean;
  correct: number;
  total: number;
}

export interface LadderState {
  kind: "ladder";
  section: "vocabulary" | "grammar";
  startBand: number;
  band: number;
  blocksDone: number;
  block: { band: number; items: string[]; pos: number; correct: number } | null;
  bands: Record<number, BandRec>;
  itemsUsed: number;
  startedAt: number;
  /** Active answering time in this section (sum of per-item times, each capped) — pauses don't count. */
  elapsed?: number;
  fast: number;
  outcome: Outcome | null;
}

export interface TestletState {
  kind: "testlet";
  section: "reading" | "listening";
  startBand: number;
  band: number;
  runs: { band: number; id: string; score: number }[];
  current: { id: string; band: number; pos: number; correct: number } | null;
  startedAt: number;
  fast: number;
  outcome: Outcome | null;
}

export interface ZeroState {
  items: string[];
  pos: number;
  correctByBand: Record<number, number>;
  outcome: { preA1Passed: boolean; total: number; correct: number } | null;
}

export interface PlacementState {
  v: 1;
  mode: "full" | "zero";
  order: SectionId[];
  idx: number;
  seq: number;
  zero?: ZeroState;
  vocabulary?: LadderState;
  grammar?: LadderState;
  reading?: TestletState;
  listening?: TestletState;
  writing?: { taskId: string; status: "pending" | "submitted" | "skipped"; words?: number; pastedChars?: number; flagged?: boolean };
  speaking?: { status: "pending" | "not_assessed" };
  pending: { itemId: string; section: SectionId; issuedAt: number } | null;
}

export interface ResponseRecord {
  itemId: string;
  section: SectionId;
  band: number | null;
  answer: { choice?: number; original?: number; text?: string; dontKnow?: boolean; skip?: boolean; pastedChars?: number };
  correct: boolean | null;
  ms: number;
  suspectGuess: boolean;
}

export type ApplyError = "seq_mismatch" | "item_mismatch" | "cyrillic" | "empty" | "bad_answer" | "finished";

const SELF_BAND: Record<Intake["selfLevel"], number | null> = { A1: 1, A2: 2, B1: 4, B2: 6, C1: 7, unknown: null };

/* ------------------------------------------------------------------ setup */

export function createState(intake: Intake, cfg: Config = defaultConfig): PlacementState {
  const mode = intake.experience === "none" ? "zero" : "full";
  const st: PlacementState = {
    v: 1,
    mode,
    order: mode === "zero" ? ["zero"] : ["vocabulary", "grammar", "reading", "listening", "writing", "speaking"],
    idx: 0,
    seq: 0,
    pending: null,
  };
  void cfg;
  return st;
}

/** Start band of Vocabulary from the self-assessment (14 §5.1): one band below the self-rated level, A2 when unknown. */
export function vocabStartBand(intake: Intake): number {
  const self = SELF_BAND[intake.selfLevel];
  if (self == null) return 2;
  return Math.max(0, self - 1);
}

function initSection(st: PlacementState, section: SectionId, intake: Intake, now: number, cfg: Config) {
  switch (section) {
    case "zero": {
      const per = cfg.zeroMode.itemsPerBand / 2;
      const pick = (items: LadderItem[], band: string) => items.filter((i) => i.band === band && i.block === 1).slice(0, per).map((i) => i.id);
      st.zero = {
        items: [...pick(vocabulary.items, "Pre-A1"), ...pick(grammar.items, "Pre-A1"), ...pick(vocabulary.items, "A1"), ...pick(grammar.items, "A1")],
        pos: 0,
        correctByBand: {},
        outcome: null,
      };
      break;
    }
    case "vocabulary":
      st.vocabulary = newLadder("vocabulary", vocabStartBand(intake), now);
      break;
    case "grammar": {
      const v = st.vocabulary?.outcome;
      st.grammar = newLadder("grammar", v ? clamp(v.band, 0, TOP) : 2, now);
      break;
    }
    case "reading":
    case "listening": {
      const p0 = Math.min(st.vocabulary?.outcome?.band ?? 2, st.grammar?.outcome?.band ?? 2);
      st[section] = { kind: "testlet", section, startBand: clamp(p0 - 1, 0, TOP), band: clamp(p0 - 1, 0, TOP), runs: [], current: null, startedAt: now, fast: 0, outcome: null };
      break;
    }
    case "writing":
      st.writing = { taskId: writingTaskFor(p1Band(st)).id, status: "pending" };
      break;
    case "speaking":
      st.speaking = { status: "pending" };
      break;
  }
}

function newLadder(section: "vocabulary" | "grammar", band: number, now: number): LadderState {
  return { kind: "ladder", section, startBand: band, band, blocksDone: 0, block: null, bands: {}, itemsUsed: 0, startedAt: now, fast: 0, outcome: null };
}

/** Refined band P1 after Reading / Listening (14 §2). */
export function p1Band(st: PlacementState): number {
  const r = st.reading?.outcome;
  const l = st.listening?.outcome;
  const bands = [r, l].filter((o): o is Outcome => !!o && o.assessed).map((o) => o.band);
  if (bands.length) return clamp(Math.min(...bands), 0, TOP);
  return clamp(Math.min(st.vocabulary?.outcome?.band ?? 2, st.grammar?.outcome?.band ?? 2), 0, TOP);
}

export function writingTaskFor(band: number) {
  const name = BANDS[clamp(band, 0, TOP)];
  return writing.tasks.find((t) => t.bands.includes(name)) ?? writing.tasks[0];
}

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

function sectionDone(st: PlacementState, s: SectionId): boolean {
  switch (s) {
    case "zero":
      return !!st.zero?.outcome;
    case "vocabulary":
    case "grammar":
    case "reading":
    case "listening":
      return !!st[s]?.outcome;
    case "writing":
      return !!st.writing && st.writing.status !== "pending";
    case "speaking":
      return !!st.speaking && st.speaking.status !== "pending";
  }
}

/* ------------------------------------------------------------- ladder core */

function rec(l: LadderState, band: number): BandRec {
  return (l.bands[band] ??= { blocks: [], passed: null, borderline: false, correct: 0, total: 0 });
}

/** Highest passed band strictly below the lowest failed band (or overall highest passed if nothing failed). */
function bestPassed(bands: Record<number, { passed: boolean | null }>): { passed: number; failed: number } {
  const failed = Object.entries(bands).filter(([, r]) => r.passed === false).map(([b]) => Number(b));
  const lowestFailed = failed.length ? Math.min(...failed) : Infinity;
  const passed = Object.entries(bands).filter(([b, r]) => r.passed === true && Number(b) < lowestFailed).map(([b]) => Number(b));
  return { passed: passed.length ? Math.max(...passed) : -1, failed: lowestFailed };
}

function finishLadder(l: LadderState, reason: OutcomeReason, cfg: Config) {
  const { passed, failed } = bestPassed(l.bands);
  let band = passed;
  if (band < 0 && reason !== "floor") {
    // Nothing passed (limit/time hit while descending): one band below the lowest failure, conservative.
    band = Number.isFinite(failed) ? failed - 1 : l.startBand - 1;
  }
  if (reason === "floor") band = -1;
  let conf = 2;
  const total = Object.values(l.bands).reduce((n, r) => n + r.blocks.length, 0);
  if (total < 2) conf--;
  if (band >= 0 && l.bands[band]?.borderline) conf--;
  if (reason === "limit" || reason === "time") conf--;
  if (l.fast >= cfg.guessSuspicionsLowerConfidence) conf--;
  l.outcome = {
    band,
    ceiling: reason === "ceiling",
    reason,
    confidence: clamp(conf, 0, 2) as ConfLevel,
    borderline: band >= 0 && !!l.bands[band]?.borderline,
    assessed: true,
  };
  l.block = null;
}

/** Apply the block rules (14 §5.2) and stop rules (§5.3) after a complete block. */
export function closeBlock(l: LadderState, cfg: Config = defaultConfig) {
  const C = cfg.ladder;
  const b = l.block!.band;
  const score = l.block!.correct;
  const r = rec(l, b);
  r.blocks.push(score);
  const blockIndex = l.blocksDone; // 0-based index of this block within the section
  l.blocksDone++;
  l.block = null;

  let next: number;
  if (score >= C.passThresholdBlock) {
    r.passed = true;
    next = b + (score === C.blockSize && blockIndex < C.fastJumpFirstBlocks ? 2 : 1);
  } else if (score >= C.retryThreshold) {
    if (r.blocks.length < C.maxBlocksPerBand) {
      next = b;
    } else {
      r.passed = true;
      r.borderline = true;
      next = b + 1;
    }
  } else {
    r.passed = false;
    next = b - 1;
  }

  // Stop rules.
  if (r.passed && b === TOP) return finishLadder(l, "ceiling", cfg);
  if (r.passed === false && b === 0) return finishLadder(l, "floor", cfg);
  const { passed, failed } = bestPassed(l.bands);
  if (passed >= 0 && failed === passed + 1) return finishLadder(l, "boundary", cfg);
  if (l.itemsUsed >= C.maxItemsSection) return finishLadder(l, "limit", cfg);

  next = clamp(next, 0, TOP);
  // A jump must not skip over a known failure: never land above the lowest failed band.
  if (Number.isFinite(failed) && next >= failed) next = failed - 1;
  // Never re-enter a band that is already decided; move one step towards the open side.
  while (l.bands[next]?.passed === true && next < TOP && next + 1 < failed) next++;
  if (l.bands[next]?.passed === true) return finishLadder(l, "boundary", cfg);
  if ((l.bands[next]?.blocks.length ?? 0) >= C.maxBlocksPerBand) return finishLadder(l, "limit", cfg);
  l.band = next;
}

function startBlock(l: LadderState, now: number, cfg: Config): boolean {
  const C = cfg.ladder;
  if ((l.elapsed ?? 0) > C.sectionTimeLimitMin * 60_000 && l.blocksDone > 0) {
    finishLadder(l, "time", cfg);
    return false;
  }
  if (l.itemsUsed + C.blockSize > C.maxItemsSection) {
    finishLadder(l, "limit", cfg);
    return false;
  }
  const used = rec(l, l.band).blocks.length;
  const blockNo = used + 1;
  const items = ladderItems(l.section).filter((i) => i.band === BANDS[l.band] && i.block === blockNo).map((i) => i.id);
  if (items.length < C.blockSize) {
    finishLadder(l, "limit", cfg);
    return false;
  }
  l.block = { band: l.band, items: items.slice(0, C.blockSize), pos: 0, correct: 0 };
  return true;
}

/* ------------------------------------------------------------ testlet core */

function finishTestlets(t: TestletState, reason: OutcomeReason, cfg: Config) {
  const byBand: Record<number, { passed: boolean | null }> = {};
  for (const r of t.runs) byBand[r.band] = { passed: r.score >= cfg.testlet.pass ? true : r.score <= cfg.testlet.fail ? false : null };
  const { passed, failed } = bestPassed(byBand);
  let band = passed;
  if (reason === "floor") band = -1;
  else if (band < 0) band = Number.isFinite(failed) ? failed - 1 : t.startBand - 1;
  let conf = 2;
  if (t.runs.length < 2) conf--;
  if (reason === "limit" || reason === "unresolved") conf--;
  if (t.fast >= cfg.guessSuspicionsLowerConfidence) conf--;
  // Pilot listening uses synthetic voices on the learner's device — never "high".
  if (t.section === "listening") conf = Math.min(conf, 1);
  t.outcome = { band, ceiling: reason === "ceiling", reason, confidence: clamp(conf, 0, 2) as ConfLevel, borderline: false, assessed: true };
  t.current = null;
}

export function closeTestlet(t: TestletState, cfg: Config = defaultConfig) {
  const cur = t.current!;
  t.runs.push({ band: cur.band, id: cur.id, score: cur.correct });
  t.current = null;
  const b = cur.band;
  const byBand: Record<number, { passed: boolean | null }> = {};
  for (const r of t.runs) byBand[r.band] = { passed: r.score >= cfg.testlet.pass ? true : r.score <= cfg.testlet.fail ? false : null };

  if (cur.correct >= cfg.testlet.pass && b === TOP) return finishTestlets(t, "ceiling", cfg);
  if (cur.correct <= cfg.testlet.fail && b === 0) return finishTestlets(t, "floor", cfg);
  const { passed, failed } = bestPassed(byBand);
  if (passed >= 0 && failed === passed + 1) return finishTestlets(t, "boundary", cfg);
  if (t.runs.length >= cfg.testlet.max) return finishTestlets(t, "limit", cfg);

  let next: number;
  if (cur.correct >= cfg.testlet.pass) next = b + 1;
  else if (cur.correct <= cfg.testlet.fail) next = b - 1;
  else next = b; // 2 of 4: another testlet of the same band
  next = clamp(next, 0, TOP);
  const available = testlets(t.section).filter((x) => x.band === BANDS[next] && !t.runs.some((r) => r.id === x.id));
  if (!available.length) return finishTestlets(t, "unresolved", cfg);
  if (byBand[next]?.passed === true) return finishTestlets(t, "boundary", cfg);
  t.band = next;
}

function startTestlet(t: TestletState): boolean {
  const pool = testlets(t.section).filter((x) => x.band === BANDS[t.band] && !t.runs.some((r) => r.id === x.id));
  if (!pool.length) return false;
  t.current = { id: pool[0].id, band: t.band, pos: 0, correct: 0 };
  return true;
}

/* -------------------------------------------------------------- stepping */

function progressFor(st: PlacementState, s: SectionId, cfg: Config) {
  const base = { section: s, sectionNo: st.idx + 1, sectionCount: st.order.length };
  if (s === "vocabulary" || s === "grammar") {
    const l = st[s]!;
    return { ...base, answered: l.itemsUsed, planned: Math.min(cfg.ladder.maxItemsSection, Math.max(15, l.itemsUsed + (l.block ? l.block.items.length - l.block.pos : cfg.ladder.blockSize))) };
  }
  if (s === "reading" || s === "listening") {
    const t = st[s]!;
    const answered = t.runs.length * 4 + (t.current?.pos ?? 0);
    return { ...base, answered, planned: Math.max(8, Math.min(cfg.testlet.max * 4, answered + 4 - (t.current?.pos ?? 0))) };
  }
  if (s === "zero") return { ...base, answered: st.zero!.pos, planned: st.zero!.items.length };
  return { ...base, answered: 0, planned: 1 };
}

function ladderStep(itemId: string, seed: string, progress: ReturnType<typeof progressFor>): Step {
  const it = ladderItem(itemId)!;
  if (it.type === "choice") {
    const order = optionOrder(`${seed}:${it.id}`, it.options.length);
    return { kind: "choice", itemId: it.id, prompt: it.prompt, options: order.map((i) => it.options[i]), dontKnow: true, progress };
  }
  return { kind: "input", itemId: it.id, prompt: it.prompt, dontKnow: true, progress };
}

function testletStimulus(t: TestletT, section: "reading" | "listening"): Stimulus {
  if (section === "reading") return { type: "text", title: t.title, text: (t as { text: string }).text };
  const lt = listening.testlets.find((x) => x.id === t.id)!;
  return { type: "audio", title: lt.title, testletId: lt.id, lines: lt.lines, rate: lt.rate, maxPlays: lt.maxPlays };
}

/**
 * Advance through finished sections and return the current step. Mutates `st`
 * (initialises sections, starts blocks/testlets, sets `pending`).
 */
export function currentStep(st: PlacementState, intake: Intake, seed: string, now: number, cfg: Config = defaultConfig): Step {
  for (let guard = 0; guard < 50; guard++) {
    if (st.idx >= st.order.length) {
      st.pending = null;
      return { kind: "done" };
    }
    const s = st.order[st.idx];
    const initialised = s === "zero" ? !!st.zero : !!st[s as Exclude<SectionId, "zero">];
    if (!initialised) initSection(st, s, intake, now, cfg);
    if (sectionDone(st, s)) {
      st.idx++;
      continue;
    }

    let step: Step | null = null;
    if (s === "zero") {
      const z = st.zero!;
      step = ladderStep(z.items[z.pos], seed, progressFor(st, s, cfg));
    } else if (s === "vocabulary" || s === "grammar") {
      const l = st[s]!;
      if (!l.block && !startBlock(l, now, cfg)) continue;
      step = ladderStep(l.block!.items[l.block!.pos], seed, progressFor(st, s, cfg));
    } else if (s === "reading" || s === "listening") {
      const t = st[s]!;
      if (!t.current && !startTestlet(t)) {
        finishTestlets(t, "unresolved", cfg);
        continue;
      }
      const tl = testlets(s).find((x) => x.id === t.current!.id)!;
      const q = tl.questions[t.current!.pos];
      const order = optionOrder(`${seed}:${q.id}`, q.options.length);
      step = {
        kind: "choice",
        itemId: q.id,
        prompt: q.prompt,
        options: order.map((i) => q.options[i]),
        stimulus: testletStimulus(tl, s),
        dontKnow: true,
        questionNo: t.current!.pos + 1,
        progress: progressFor(st, s, cfg),
      };
    } else if (s === "writing") {
      const task = writing.tasks.find((t) => t.id === st.writing!.taskId)!;
      step = {
        kind: "writing",
        itemId: task.id,
        title: task.title,
        instruction: task.instruction,
        prompt: task.prompt,
        words: cfg.writing.wordsByTier[task.tier] ?? [20, 200],
        timeMin: cfg.writing.timeMin,
        progress: progressFor(st, s, cfg),
      };
    } else if (s === "speaking") {
      step = { kind: "speaking", itemId: "speaking", consent: intake.voiceConsent, progress: progressFor(st, s, cfg) };
    }
    if (!step || step.kind === "done") continue;
    if (!st.pending || st.pending.itemId !== step.itemId) st.pending = { itemId: step.itemId, section: s, issuedAt: now };
    return step;
  }
  st.pending = null;
  return { kind: "done" };
}

/** Score one answer and advance the state. Returns the response to store (append-only). */
export function applyAnswer(
  st: PlacementState,
  intake: Intake,
  answer: Answer,
  seed: string,
  now: number,
  cfg: Config = defaultConfig,
): { ok: true; response: ResponseRecord } | { ok: false; error: ApplyError } {
  if (answer.seq !== st.seq) return { ok: false, error: "seq_mismatch" };
  const step = currentStep(st, intake, seed, now, cfg);
  if (step.kind === "done") return { ok: false, error: "finished" };
  if (answer.itemId !== step.itemId) return { ok: false, error: "item_mismatch" };
  const section = st.order[st.idx];
  const ms = Math.max(0, Math.min(Number(answer.ms) || 0, 60 * 60_000));

  // Productive / skippable parts.
  if (step.kind === "writing") {
    const w = st.writing!;
    if (answer.skip) {
      w.status = "skipped";
    } else {
      const text = (answer.text ?? "").trim();
      if (!text) return { ok: false, error: "empty" };
      if (hasCyrillic(text)) return { ok: false, error: "cyrillic" };
      w.status = "submitted";
      w.words = text.split(/\s+/).filter(Boolean).length;
      w.pastedChars = Math.max(0, Number(answer.pastedChars) || 0);
      w.flagged = w.pastedChars >= cfg.writing.pasteFlagChars;
    }
    st.seq++;
    st.pending = null;
    return {
      ok: true,
      response: { itemId: step.itemId, section, band: null, answer: answer.skip ? { skip: true } : { text: (answer.text ?? "").slice(0, 8000), pastedChars: w.pastedChars }, correct: null, ms, suspectGuess: false },
    };
  }
  if (step.kind === "speaking") {
    st.speaking!.status = "not_assessed";
    st.seq++;
    st.pending = null;
    return { ok: true, response: { itemId: "speaking", section, band: null, answer: { skip: true }, correct: null, ms, suspectGuess: false } };
  }

  // Listening can be skipped when audio is unavailable — the skill is then "not assessed".
  if (answer.skip) {
    if (section !== "listening") return { ok: false, error: "bad_answer" };
    const t = st.listening!;
    t.outcome = { band: -1, ceiling: false, reason: "skipped", confidence: 0, borderline: false, assessed: false };
    t.current = null;
    st.seq++;
    st.pending = null;
    return { ok: true, response: { itemId: step.itemId, section, band: null, answer: { skip: true }, correct: null, ms, suspectGuess: false } };
  }

  // Closed items.
  let correct = false;
  let band: number | null = null;
  const stored: ResponseRecord["answer"] = {};
  const withText = section === "reading" || section === "listening";
  if (answer.dontKnow) {
    stored.dontKnow = true;
  } else if (step.kind === "choice") {
    const n = step.options.length;
    if (!Number.isInteger(answer.choice) || answer.choice! < 0 || answer.choice! >= n) return { ok: false, error: "bad_answer" };
    const order = optionOrder(`${seed}:${step.itemId}`, n);
    const original = order[answer.choice!];
    stored.choice = answer.choice;
    stored.original = original;
    if (withText) {
      const q = testletQuestion(step.itemId)!;
      correct = original === q.q.answer;
    } else {
      const it = ladderItem(step.itemId)!;
      correct = it.type === "choice" && original === it.answer;
    }
  } else if (step.kind === "input") {
    const text = (answer.text ?? "").trim();
    if (!text) return { ok: false, error: "empty" };
    if (hasCyrillic(text)) return { ok: false, error: "cyrillic" };
    stored.text = text.slice(0, 200);
    const it = ladderItem(step.itemId)!;
    correct = it.type === "input" && checkInput(text, it.answer);
  }
  const suspect = !answer.dontKnow && ms < (withText ? cfg.fastAnswerSecWithText : cfg.fastAnswerSec) * 1000;

  if (section === "zero") {
    const z = st.zero!;
    const it = ladderItem(step.itemId)!;
    band = BANDS.indexOf(it.band);
    if (correct) z.correctByBand[band] = (z.correctByBand[band] ?? 0) + 1;
    z.pos++;
    if (z.pos >= z.items.length) {
      const preA1 = z.correctByBand[0] ?? 0;
      const total = Object.values(z.correctByBand).reduce((a, b) => a + b, 0);
      z.outcome = { preA1Passed: preA1 >= Math.ceil((cfg.zeroMode.itemsPerBand * 3) / 4), total: z.items.length, correct: total };
    }
  } else if (section === "vocabulary" || section === "grammar") {
    const l = st[section]!;
    band = l.block!.band;
    const r = rec(l, band);
    r.total++;
    if (correct) {
      r.correct++;
      l.block!.correct++;
    }
    if (suspect) l.fast++;
    l.elapsed = (l.elapsed ?? 0) + Math.min(ms, MAX_ITEM_MS);
    l.itemsUsed++;
    l.block!.pos++;
    if (l.block!.pos >= l.block!.items.length) closeBlock(l, cfg);
  } else if (section === "reading" || section === "listening") {
    const t = st[section]!;
    band = t.current!.band;
    if (correct) t.current!.correct++;
    if (suspect) t.fast++;
    t.current!.pos++;
    if (t.current!.pos >= 4) closeTestlet(t, cfg);
  }

  st.seq++;
  st.pending = null;
  return { ok: true, response: { itemId: step.itemId, section, band, answer: stored, correct, ms, suspectGuess: suspect } };
}
