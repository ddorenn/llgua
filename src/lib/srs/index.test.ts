import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, dailyQueue, dayKey, newItem, review, stats, SRS } from "./index";

const mk = (id: string, now: Date) => newItem({ id, kind: "word", front: id, back: "x", source: { type: "manual" } }, now);

test("intervals follow the ladder 1-3-7-14-30-60, a mistake resets", () => {
  const t0 = new Date(2026, 10, 1, 10);
  let it = mk("a", t0);
  const dues: string[] = [];
  let now = t0;
  for (let i = 0; i < 7; i++) {
    it = review(it, true, now);
    dues.push(it.due);
    now = new Date(it.due + "T10:00:00");
  }
  const day = dayKey(t0);
  assert.equal(dues[0], addDays(day, 1));
  assert.equal(it.step, SRS.ladder.length - 1);
  const wrong = review(it, false, now);
  assert.equal(wrong.step, 0);
  assert.equal(wrong.lapses, 1);
  assert.equal(wrong.due, addDays(dayKey(now), 1));
});

test("daily queue: due first, new items capped", () => {
  const now = new Date(2026, 10, 10, 9);
  const items: Record<string, ReturnType<typeof mk>> = {};
  for (let i = 0; i < 25; i++) items[`n${i}`] = mk(`n${i}`, new Date(2026, 10, 1));
  const due = review(mk("d", new Date(2026, 10, 1)), true, new Date(2026, 10, 1));
  items.d = due;
  const q = dailyQueue(items, now);
  assert.equal(q[0].id, "d");
  assert.equal(q.length, 1 + SRS.newPerDay);
  const s = stats(items, now);
  assert.equal(s.dueToday, 1);
  assert.equal(s.fresh, 25);
});

test("addDays crosses month boundaries", () => {
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2026-12-31", 60), "2027-03-01");
});
