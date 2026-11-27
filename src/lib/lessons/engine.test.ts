import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LessonSchema, validateLesson } from "./schema";
import { checkDialogue, checkGap, checkOrder, lessonReport, newSession, nextPosition, orderTokens, shouldBranch, stageBlocks } from "./engine";
import type { LessonAttempt } from "@/lib/store/types";

const lesson = LessonSchema.parse(JSON.parse(readFileSync("content/lessons/demo-a2-weekend-plans.json", "utf8")));
const att = (ok: boolean, answer = "x"): LessonAttempt => ({ ok, firstOk: ok, tries: 1, answer, at: new Date().toISOString() });

test("demo lesson is valid, 6 stages, 60 minutes, every block type used", () => {
  assert.deepEqual(validateLesson(lesson), []);
  assert.equal(lesson.stages.length, 6);
  assert.deepEqual(lesson.stages.map((s) => s.kind), ["warmup", "input", "practice", "use", "feedback", "wrapup"]);
  const types = new Set(lesson.stages.flatMap((s) => [...s.blocks, ...(s.branch?.add ?? [])].map((b) => b.type)));
  for (const t of ["explain", "vocab", "choice", "gap", "order", "match", "reading", "listening", "writing", "dialogue", "review", "feedback", "summary"]) assert.ok(types.has(t as never), t);
});

test("checking: gap with contractions, order ignores spacing before punctuation, dialogue keywords", () => {
  assert.ok(checkGap("I'm going to book", ["am going to book"], "I ___ (book) a table for four."));
  assert.ok(checkGap("am going to book", ["'m going to book"]));
  assert.ok(!checkGap("going to book", ["am going to book"]));
  assert.ok(checkOrder("What are you going to do on Sunday ?", ["What are you going to do on Sunday?"]));
  assert.ok(!checkOrder("What you are going to do on Sunday?", ["What are you going to do on Sunday?"]));
  const s1 = lesson.stages[3].blocks[0];
  assert.equal(s1.type, "dialogue");
  if (s1.type === "dialogue") {
    assert.ok(checkDialogue(s1.steps[0], { text: "I'm going to visit my mum." }));
    assert.ok(!checkDialogue(s1.steps[0], { text: "I visit my mum." }));
    assert.ok(checkDialogue(s1.steps[1], { choice: 0 }));
    assert.ok(!checkDialogue(s1.steps[1], { choice: 1 }));
  }
});

test("order tokens are shuffled but complete", () => {
  const b = lesson.stages[2].blocks.find((x) => x.type === "order")!;
  if (b.type !== "order") return;
  const t = orderTokens(b);
  assert.notEqual(t.join(" "), "What are you going to do on Sunday ?");
  assert.deepEqual([...t].sort(), "What are you going to do on Sunday ?".split(" ").sort());
});

test("adaptive branch: 2 concept-check errors add a second explanation", () => {
  const s = newSession(lesson);
  const input = lesson.stages[1];
  assert.equal(shouldBranch(input, s), false);
  s.attempts["input-cc1"] = att(false);
  s.attempts["input-cc2"] = att(false);
  assert.equal(shouldBranch(input, s), true);
  const before = stageBlocks(input, s).length;
  s.branches.push(input.id);
  const after = stageBlocks(input, s);
  assert.equal(after.length, before + 2);
  assert.ok(after.some((b) => b.id === "input-reteach"));
  assert.equal(shouldBranch(input, s), false, "branch fires once");
});

test("report: accuracy per stage, criteria, at most 3 prioritised mistakes", () => {
  const s = newSession(lesson);
  s.attempts["warmup-review/r1"] = att(true);
  s.attempts["warmup-review/r2"] = att(false, "visit");
  s.attempts["practice-c1"] = att(true);
  s.attempts["practice-c2"] = att(false, "aren't going to");
  s.attempts["practice-g1"] = att(false, "going to book");
  s.attempts["practice-g2"] = att(true);
  s.attempts["use-dialogue/s1"] = att(false, "I visit my mum");
  const r = lessonReport(lesson, s);
  const practice = r.stages.find((x) => x.kind === "practice")!;
  assert.equal(practice.graded, 4);
  assert.equal(practice.accuracy, 0.5);
  assert.equal(practice.criterion?.met, false);
  assert.equal(r.mistakes.length, 4);
  assert.equal(r.feedback.length, 3);
  assert.equal(r.feedback[0].stage, "use", "application first");
  assert.ok(r.feedback.every((m) => m.stage !== "warmup"), "warm-up mistake drops out when 3 higher-priority ones exist");
  assert.equal(r.feedback.find((m) => m.key === "practice-g1")?.correct, "am going to book");
});

test("navigation walks every stage to the end", () => {
  const s = newSession(lesson);
  let steps = 0;
  for (let p = nextPosition(lesson, s); p; p = nextPosition(lesson, s)) {
    s.stage = p.stage;
    s.block = p.block;
    steps++;
  }
  const total = lesson.stages.reduce((n, st) => n + st.blocks.length, 0);
  assert.equal(steps, total - 1);
  assert.equal(s.stage, lesson.stages.length - 1);
});

test("server grading by key ignores the client's verdict", async () => {
  const { gradeByKey, sessionFromAttempts } = await import("./engine");
  assert.deepEqual(gradeByKey(lesson, "practice-c1", { choice: 0 }), { ok: true, skill: "grammar", answer: "are going to" });
  assert.equal(gradeByKey(lesson, "practice-c1", { choice: 1 })?.ok, false);
  assert.equal(gradeByKey(lesson, "practice-g1", { text: "I'm going to book" })?.ok, true);
  assert.equal(gradeByKey(lesson, "input-listen/q2", { choice: 1 })?.skill, "listening");
  assert.equal(gradeByKey(lesson, "use-dialogue/s2", { choice: 0 })?.ok, true);
  assert.equal(gradeByKey(lesson, "practice-match", { wrong: 2 })?.ok, false);
  assert.equal(gradeByKey(lesson, "warmup-review/w:abc", { text: "x" }), null, "learner-owned review items are not server-gradable");
  assert.equal(gradeByKey(lesson, "nope", { choice: 0 }), null);
  const s = sessionFromAttempts(lesson, [
    { item_key: "practice-g1", try_no: 1, ok: false, answer: "book", created_at: "2026-01-01" },
    { item_key: "practice-g1", try_no: 2, ok: true, answer: "am going to book", created_at: "2026-01-02" },
    { item_key: "practice-x1", try_no: 1, ok: true, answer: "x", created_at: "2026-01-02" },
  ], {});
  assert.deepEqual(s.attempts["practice-g1"], { ok: true, firstOk: false, tries: 2, answer: "book", at: "2026-01-02" });
  assert.ok(s.branches.includes("practice"), "branch inferred from branch-only attempts");
});
