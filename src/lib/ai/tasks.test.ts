import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTaskOutput } from "./tasks";
import { estimateCostUsd, TASKS } from "./config";

test("structured output: valid JSON inside prose/code fences is accepted", () => {
  const text = 'Sure!\n```json\n{"explanation":"Нужен be.","rule":"am/is/are + going to + V","example":{"en":"I am going to cook.","ru":"Я собираюсь готовить."},"hint":"Кто действует?"}\n```';
  const r = parseTaskOutput("explain_mistake", text);
  assert.ok(r);
  assert.equal(r!.rule, "am/is/are + going to + V");
});

test("structured output: wrong shape or too many corrections is rejected", () => {
  assert.equal(parseTaskOutput("explain_mistake", '{"explanation": "x"}'), null);
  const tooMany = {
    criteria: [{ name: "task", level: "A2", comment: "ok" }, { name: "range", level: "A2", comment: "ok" }, { name: "accuracy", level: "A2", comment: "ok" }],
    estimated_level: "A2",
    confidence: "medium",
    strengths: ["a"],
    corrections: [1, 2, 3, 4].map((i) => ({ original: `o${i}`, corrected: `c${i}`, why: "w" })),
    next_step: "n",
  };
  assert.equal(parseTaskOutput("evaluate_writing", JSON.stringify(tooMany)), null, "max 3 corrections (11 §6)");
  assert.ok(parseTaskOutput("evaluate_writing", JSON.stringify({ ...tooMany, corrections: tooMany.corrections.slice(0, 3) })));
  assert.equal(parseTaskOutput("evaluate_writing", "not json"), null);
});

test("cost estimate and task routing", () => {
  assert.ok(Math.abs(estimateCostUsd("openai/gpt-oss-120b", 1_000_000, 0) - 0.15) < 1e-9);
  assert.ok(estimateCostUsd("unknown-model", 1000, 1000) > 0);
  assert.equal(TASKS.evaluate_writing.tier, "quality", "rubric scoring uses the stronger model");
  assert.equal(TASKS.explain_mistake.json, true);
});
