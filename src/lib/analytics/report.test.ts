import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReport } from "./report";
import type { AttemptRow, ResultRow } from "@/lib/records/store";

const now = new Date("2026-11-27T12:00:00Z");
const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();
const att = (daysAgo: number, ok: boolean, skill = "grammar", key = "k", tryNo = 1): AttemptRow => ({ lesson_id: "l", lesson_version: 1, item_key: key, skill, try_no: tryNo, ok, answer: "", ms: 0, created_at: at(daysAgo) });
const res = (daysAgo: number, mistakes: ResultRow["mistakes"] = []): ResultRow => ({ lesson_id: "l", lesson_version: 1, started_at: null, completed_at: at(daysAgo), graded: 4, first_try: 3, minutes: 50, stages: [], self_assessment: {}, objective_status: "met", mistakes });

test("empty data → no invented numbers", () => {
  const r = buildReport({ now, attempts: [], results: [], srs: [], placements: [], lessonTitle: (x) => x });
  assert.equal(r.week.lessons, 0);
  assert.equal(r.week.firstTryAccuracy, null);
  assert.equal(r.week.reviewAccuracy, null);
  assert.deepEqual(r.skillsByWeek, []);
  assert.deepEqual(r.recurringErrors, []);
  assert.ok(r.recommendations.some((x) => x.includes("диагностику")));
  assert.equal(r.retest.lastAt, null);
});

test("week metrics use first tries only and split this week from the previous one", () => {
  const r = buildReport({
    now,
    attempts: [att(1, true), att(1, false, "grammar", "k2"), att(1, true, "grammar", "k2", 2), att(9, false)],
    results: [res(1), res(10)],
    srs: [{ item_id: "w:a", kind: "word", ok: true, at: at(2) }],
    placements: [],
    lessonTitle: () => "Урок",
  });
  assert.equal(r.week.answers, 2);
  assert.equal(r.week.firstTryAccuracy, 0.5);
  assert.equal(r.week.lessons, 1);
  assert.equal(r.week.previous.lessons, 1);
  assert.equal(r.week.reviews, 1);
  assert.equal(r.history[0].title, "Урок");
});

test("recurring error = same item wrong in ≥ 2 lesson runs; retest after 14 days", () => {
  const m = [{ key: "practice-g1", prompt: "I ___ (book)", yours: "book", correct: "am going to book" }];
  const r = buildReport({
    now,
    attempts: [],
    results: [res(2, m), res(5, m), res(6, [{ ...m[0], key: "other" }])],
    srs: [],
    placements: [{ id: "p", completedAt: at(15), result: null }],
    lessonTitle: (x) => x,
  });
  assert.equal(r.recurringErrors.length, 1);
  assert.equal(r.recurringErrors[0].times, 2);
});
