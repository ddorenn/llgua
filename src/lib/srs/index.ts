/**
 * Spaced repetition (docs/curriculum/00 §2.5, 13 §7). Pure, framework-free.
 * Interval ladder 1–3–7–14–30–60 days [ГИПОТЕЗА]. A correct answer moves one step up,
 * a mistake sends the item back to the start (due tomorrow) and counts a lapse.
 */
import type { SrsItem } from "@/lib/store/types";

export const SRS = {
  ladder: [1, 3, 7, 14, 30, 60],
  /** Daily caps (00 §2.5): new items and total reviews per day. */
  newPerDay: 10,
  reviewsPerDay: 40,
  historyKept: 20,
} as const;

/** Local calendar day, YYYY-MM-DD. */
export function dayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d + days));
}

export function normKey(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function wordId(word: string) {
  return `w:${normKey(word)}`;
}

export function newItem(input: Omit<SrsItem, "createdAt" | "updatedAt" | "due" | "step" | "reps" | "lapses" | "history">, now = new Date()): SrsItem {
  const at = now.toISOString();
  return { ...input, createdAt: at, updatedAt: at, due: dayKey(now), step: -1, reps: 0, lapses: 0, history: [] };
}

/** Apply one review. Pure. */
export function review(item: SrsItem, ok: boolean, now = new Date()): SrsItem {
  const today = dayKey(now);
  const step = ok ? Math.min(item.step + 1, SRS.ladder.length - 1) : 0;
  const interval = ok ? SRS.ladder[step] : 1;
  return {
    ...item,
    step,
    reps: item.reps + 1,
    lapses: item.lapses + (ok ? 0 : 1),
    due: addDays(today, interval),
    updatedAt: now.toISOString(),
    history: [...item.history, { at: now.toISOString(), ok }].slice(-SRS.historyKept),
  };
}

/** Today's queue: due reviews first (oldest due first), then new items, within the daily caps. */
export function dailyQueue(items: Record<string, SrsItem>, now = new Date(), caps = SRS): SrsItem[] {
  const today = dayKey(now);
  const all = Object.values(items).filter((i) => !i.suspended);
  const reviewedToday = all.filter((i) => i.history.some((h) => h.at.slice(0, 10) === now.toISOString().slice(0, 10))).length;
  const due = all.filter((i) => i.step >= 0 && i.due <= today).sort((a, b) => a.due.localeCompare(b.due) || b.lapses - a.lapses);
  const fresh = all.filter((i) => i.step < 0).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const introducedToday = all.filter((i) => i.history[0]?.at.slice(0, 10) === now.toISOString().slice(0, 10)).length;
  const newSlots = Math.max(0, caps.newPerDay - introducedToday);
  const queue = [...due, ...fresh.slice(0, newSlots)];
  return queue.slice(0, Math.max(0, caps.reviewsPerDay - reviewedToday));
}

export interface SrsStats {
  total: number;
  dueToday: number;
  fresh: number;
  learned: number;
  errors: number;
  retention7d: number | null;
}

export function stats(items: Record<string, SrsItem>, now = new Date()): SrsStats {
  const all = Object.values(items).filter((i) => !i.suspended);
  const today = dayKey(now);
  const weekAgo = now.getTime() - 7 * 86_400_000;
  const recent = all.flatMap((i) => i.history.filter((h) => new Date(h.at).getTime() >= weekAgo));
  return {
    total: all.length,
    dueToday: all.filter((i) => i.step >= 0 && i.due <= today).length,
    fresh: all.filter((i) => i.step < 0).length,
    learned: all.filter((i) => i.step >= 3).length,
    errors: all.filter((i) => i.kind === "error").length,
    retention7d: recent.length ? recent.filter((h) => h.ok).length / recent.length : null,
  };
}
