/**
 * Placement engine tests. Run: npm test
 * Simulated learners answer an item correctly when its band ≤ their "true" band.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { BANDS, config, ladderItem, testletQuestion, validateBank } from "./bank";
import { applyAnswer, closeBlock, createState, currentStep, type LadderState, type PlacementState, type ResponseRecord } from "./engine";
import { bandToSublevel, computeResult, findGaps, lowerMedian } from "./result";
import { checkInput, normalizeAnswer, optionOrder } from "./scoring";
import type { Answer, Intake, Step } from "./types";

const SEED = "test-placement";
const intake = (over: Partial<Intake> = {}): Intake => ({ goals: ["communication"], experience: "some", selfLevel: "unknown", pace: 5, voiceConsent: false, ...over });

function itemBand(itemId: string): number {
  const it = ladderItem(itemId);
  if (it) return BANDS.indexOf(it.band);
  const q = testletQuestion(itemId);
  if (q) return BANDS.indexOf(q.testlet.band);
  return -1;
}

/** Build an answer for a simulated learner. `knows(itemId)` decides correctness. */
function answerFor(step: Step, seq: number, knows: (id: string) => boolean, opts: { skipListening?: boolean; writingText?: string; ms?: number } = {}): Answer {
  const ms = opts.ms ?? 4000;
  if (step.kind === "writing") return opts.writingText ? { itemId: step.itemId, text: opts.writingText, ms, seq } : { itemId: step.itemId, skip: true, ms, seq };
  if (step.kind === "speaking") return { itemId: step.itemId, skip: true, ms, seq };
  if (step.kind === "done") throw new Error("done");
  if (opts.skipListening && step.progress.section === "listening") return { itemId: step.itemId, skip: true, ms, seq };
  const ok = knows(step.itemId);
  if (step.kind === "input") {
    const it = ladderItem(step.itemId)!;
    return { itemId: step.itemId, text: ok && it.type === "input" ? it.answer[0] : "zzz", ms, seq };
  }
  // choice: find display index of the right (or a wrong) option
  const it = ladderItem(step.itemId);
  const q = testletQuestion(step.itemId);
  const n = step.options.length;
  const correctOriginal = it && it.type === "choice" ? it.answer : q!.q.answer;
  const order = optionOrder(`${SEED}:${step.itemId}`, n);
  const display = order.indexOf(correctOriginal);
  return { itemId: step.itemId, choice: ok ? display : (display + 1) % n, ms, seq };
}

function run(trueBand: number, intk: Intake, opts: Parameters<typeof answerFor>[3] = {}) {
  const st: PlacementState = createState(intk);
  const responses: ResponseRecord[] = [];
  let now = 1_000_000;
  for (let i = 0; i < 400; i++) {
    const step = currentStep(st, intk, SEED, now);
    if (step.kind === "done") break;
    const a = answerFor(step, st.seq, (id) => itemBand(id) <= trueBand, opts);
    const r = applyAnswer(st, intk, a, SEED, now);
    assert.ok(r.ok, `apply failed: ${!r.ok && r.error}`);
    if (r.ok) responses.push(r.response);
    now += 5000;
  }
  return { st, responses, result: computeResult(st, responses, intk, new Date(now)) };
}

test("bank structure is valid", () => {
  assert.deepEqual(validateBank(), []);
});

test("answer normalisation", () => {
  assert.equal(normalizeAnswer("  I'M   Waiting. "), "i am waiting");
  assert.ok(checkInput("am waiting", ["'m waiting"]));
  assert.ok(checkInput("does not like", ["doesn't like"]));
  assert.ok(checkInput("Doesn’t like", ["doesn't like"]));
  assert.ok(checkInput("WEDNESDAY", ["wednesday"]));
  assert.ok(!checkInput("wensday", ["wednesday"]));
  assert.ok(!checkInput("", ["x"]));
});

test("option order is a stable permutation", () => {
  const a = optionOrder("p:item", 4);
  assert.deepEqual([...a].sort(), [0, 1, 2, 3]);
  assert.deepEqual(optionOrder("p:item", 4), a);
});

test("lower median", () => {
  assert.equal(lowerMedian([4, 4, 5, 6]), 4); // A2+, A2+, B1, B1+ → A2+ (spec example 14 §6.5)
  assert.equal(lowerMedian([3, 5]), 3);
  assert.equal(lowerMedian([5]), 5);
  assert.equal(lowerMedian([]), null);
});

for (let band = 0; band < BANDS.length; band++) {
  for (const selfLevel of ["unknown", "A1", "B2"] as const) {
    test(`simulated learner at ${BANDS[band]} (self ${selfLevel}) is placed at ${BANDS[band]} in every auto-scored section`, () => {
      const { st, result } = run(band, intake({ selfLevel }));
      // A far too modest self-assessment can exhaust the 25-item limit one band short (14 §5.3 rule 4):
      // then the result is the last passed band with lowered confidence.
      for (const s of ["vocabulary", "grammar"] as const) {
        const o = st[s]!.outcome!;
        if (o.reason === "limit") {
          assert.ok(o.band >= band - 1 && o.band <= band, s);
          assert.ok(o.confidence < 2, `${s} confidence lowered`);
        } else assert.equal(o.band, band, s);
      }
      assert.equal(st.reading!.outcome!.band, band, "reading");
      assert.equal(st.listening!.outcome!.band, band, "listening");
      assert.ok(st.vocabulary!.itemsUsed <= config.ladder.maxItemsSection);
      assert.ok(st.grammar!.itemsUsed <= config.ladder.maxItemsSection);
      assert.equal(result.overall, bandToSublevel(band, 1));
      // writing / speaking never get invented scores
      assert.equal(result.skills.writing.assessed, false);
      assert.equal(result.skills.speaking.assessed, false);
      assert.equal(result.skills.writing.sublevel, null);
      assert.equal(result.confidence, "low");
      assert.ok(result.disclaimers.some((d) => d.includes("не сертификат CEFR")));
      assert.ok(!/C1|C2/.test(result.overallLabel));
    });
  }
}

test("learner who knows nothing hits the floor", () => {
  const { st, result } = run(-1, intake({ selfLevel: "A2" }));
  assert.equal(st.vocabulary!.outcome!.reason, "floor");
  assert.equal(st.vocabulary!.outcome!.band, -1);
  assert.equal(result.overall, -1);
  assert.equal(result.route.startModule, "A1-M0");
});

test("top learner: ceiling, honest 'не ниже B2+', never C1", () => {
  const { st, result } = run(7, intake({ selfLevel: "C1" }));
  assert.equal(st.vocabulary!.outcome!.ceiling, true);
  assert.match(result.overallLabel, /не ниже B2\+/);
  assert.equal(result.route.startModule, "B2-M7");
  assert.equal(result.route.mode, "check_gaps");
});

test("B1 learner starts at B1-M1 and is never sent to A1/A2", () => {
  const { result } = run(4, intake({ selfLevel: "B1" }));
  assert.equal(result.overallLabel, "B1");
  assert.equal(result.route.startModule, "B1-M1");
  assert.equal(result.route.level, "B1");
  assert.equal(result.route.content.ready, false);
  assert.equal(result.route.content.practiceModuleId, "b1-experience");
});

test("skipping listening → listening not assessed, level from reading only", () => {
  const { st, result } = run(3, intake(), { skipListening: true });
  assert.equal(st.listening!.outcome!.assessed, false);
  assert.equal(result.skills.listening.assessed, false);
  assert.equal(result.skills.reading.assessed, true);
  assert.equal(result.overall, bandToSublevel(3, 1));
});

test("writing text is stored but not scored", () => {
  const { st, responses, result } = run(4, intake(), { writingText: "I taught myself to cook by watching videos and trying recipes." });
  assert.equal(st.writing!.status, "submitted");
  const w = responses.find((r) => r.section === "writing")!;
  assert.equal(w.correct, null);
  assert.match(w.answer.text!, /cook/);
  assert.equal(result.skills.writing.assessed, false);
  assert.match(result.skills.writing.note!, /сохранён/);
});

test("ladder rules: 5/5 on an early block jumps two bands", () => {
  const l: LadderState = { kind: "ladder", section: "grammar", startBand: 1, band: 1, blocksDone: 0, block: { band: 1, items: [], pos: 5, correct: 5 }, bands: {}, itemsUsed: 5, startedAt: 0, fast: 0, outcome: null };
  closeBlock(l);
  assert.equal(l.band, 3);
});

test("ladder rules: 3/5 twice = borderline pass", () => {
  const l: LadderState = { kind: "ladder", section: "grammar", startBand: 2, band: 2, blocksDone: 0, block: { band: 2, items: [], pos: 5, correct: 3 }, bands: {}, itemsUsed: 5, startedAt: 0, fast: 0, outcome: null };
  closeBlock(l);
  assert.equal(l.band, 2, "same band again");
  l.block = { band: 2, items: [], pos: 5, correct: 3 };
  l.itemsUsed = 10;
  closeBlock(l);
  assert.equal(l.bands[2].passed, true);
  assert.equal(l.bands[2].borderline, true);
  assert.equal(l.band, 3);
});

test("ladder rules: ≤2/5 moves down, boundary stops the section", () => {
  const l: LadderState = { kind: "ladder", section: "vocabulary", startBand: 4, band: 4, blocksDone: 0, block: { band: 4, items: [], pos: 5, correct: 1 }, bands: {}, itemsUsed: 5, startedAt: 0, fast: 0, outcome: null };
  closeBlock(l);
  assert.equal(l.band, 3);
  l.block = { band: 3, items: [], pos: 5, correct: 4 };
  l.itemsUsed = 10;
  closeBlock(l);
  assert.equal(l.outcome?.reason, "boundary");
  assert.equal(l.outcome?.band, 3);
});

test("cyrillic answer is rejected without advancing", () => {
  const intk = intake();
  const st = createState(intk);
  let step = currentStep(st, intk, SEED, 0);
  // advance to the first input item
  for (let i = 0; i < 10 && step.kind !== "input"; i++) {
    const r = applyAnswer(st, intk, answerFor(step, st.seq, () => true), SEED, 0);
    assert.ok(r.ok);
    step = currentStep(st, intk, SEED, 0);
  }
  assert.equal(step.kind, "input");
  const seq = st.seq;
  const r = applyAnswer(st, intk, { itemId: (step as { itemId: string }).itemId, text: "привет", ms: 3000, seq }, SEED, 0);
  assert.deepEqual(r, { ok: false, error: "cyrillic" });
  assert.equal(st.seq, seq);
});

test("stale or replayed answers are rejected", () => {
  const intk = intake();
  const st = createState(intk);
  const step = currentStep(st, intk, SEED, 0);
  const a = answerFor(step, st.seq, () => true);
  assert.ok(applyAnswer(st, intk, a, SEED, 0).ok);
  assert.deepEqual(applyAnswer(st, intk, a, SEED, 0), { ok: false, error: "seq_mismatch" });
  assert.deepEqual(applyAnswer(st, intk, { ...a, seq: st.seq }, SEED, 0), { ok: false, error: "item_mismatch" });
});

test("fast answers lower confidence", () => {
  const { result } = run(4, intake(), { ms: 300 });
  assert.notEqual(result.components.grammar.confidence, "high");
});

test("zero mode: 8 items, strong beginner is offered the full test", () => {
  const { st, result } = run(1, intake({ experience: "none" }));
  assert.equal(st.mode, "zero");
  assert.equal(st.zero!.items.length, 8);
  assert.equal(result.overall, 0);
  assert.equal(result.offerFullMode, true);
  assert.equal(result.route.startModule, "A1-M0");
  const { result: r2 } = run(-1, intake({ experience: "none" }));
  assert.equal(r2.overall, -1);
  assert.equal(r2.offerFullMode, false);
});

test("a single error on a topic is not a gap; two are", () => {
  const mk = (itemId: string, correct: boolean): ResponseRecord => ({ itemId, section: "grammar", band: 1, answer: {}, correct, ms: 3000, suspectGuess: false });
  assert.equal(findGaps([mk("g-a1-01", false), mk("g-a1-02", true)], 4).length, 0);
  const gaps = findGaps([mk("g-a1-01", false), mk("g-a1-02", false)], 4);
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].module, "A1-M3");
  // errors above the level are not gaps
  assert.equal(findGaps([mk("g-a1-01", false), mk("g-a1-02", false)], 0).length, 0);
});

test("learner with grammar holes gets review items", () => {
  // Knows everything up to B1 except A1 present simple items.
  const intk = intake({ selfLevel: "B1" });
  const st = createState(intk);
  const responses: ResponseRecord[] = [];
  const knows = (id: string) => !id.startsWith("g-a1-0") && itemBand(id) <= 4;
  for (let i = 0; i < 400; i++) {
    const step = currentStep(st, intk, SEED, 0);
    if (step.kind === "done") break;
    const r = applyAnswer(st, intk, answerFor(step, st.seq, knows), SEED, 0);
    assert.ok(r.ok);
    if (r.ok) responses.push(r.response);
  }
  const result = computeResult(st, responses, intk, new Date());
  // A1 grammar may not even be visited when the learner starts high — then there's simply no evidence (no fake gap).
  const visitedA1 = responses.some((r) => r.itemId.startsWith("g-a1-0"));
  if (visitedA1) assert.ok(result.gaps.some((g) => g.kind === "grammar"));
  assert.equal(result.route.level, "B1");
});
