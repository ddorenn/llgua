/**
 * Derived, *real* statistics computed from the learner's own state.
 * Nothing here invents data: with no activity every metric is zero/empty.
 */
import { allLessons, dailyPlan, type PlanBlock } from "@/lib/content";
import { todayKey } from "@/lib/utils";
import type { LinguaState } from "./types";

export function resolveBlock(block: PlanBlock, date = new Date()) {
  if (block.rotation && block.rotation.length) {
    // Rotation by day number keeps alternation deterministic and configurable in content.
    const dayIndex = Math.floor(date.getTime() / 86_400_000);
    const pick = block.rotation[dayIndex % block.rotation.length];
    return { ...block, title: pick.title, href: pick.href, resolvedSkill: pick.skill as string, alt: block.rotation.filter((r) => r !== pick) };
  }
  return { ...block, resolvedSkill: block.skill as string, alt: [] as NonNullable<PlanBlock["rotation"]> };
}

/** Scale the configured plan to the user's daily minutes, keeping proportions. */
export function scaledPlan(dailyMinutes: number) {
  const factor = dailyMinutes / dailyPlan.totalMinutes;
  return dailyPlan.blocks.map((b) => ({ ...b, minutes: Math.max(1, Math.round(b.minutes * factor)) }));
}

export function minutesForDay(state: LinguaState, date: string) {
  const day = state.dailyPlans[date];
  if (!day) return 0;
  return scaledPlan(state.settings.dailyMinutes)
    .filter((b) => day.completed.includes(b.id))
    .reduce((sum, b) => sum + b.minutes, 0);
}

export function todayProgress(state: LinguaState) {
  const blocks = scaledPlan(state.settings.dailyMinutes);
  const done = state.dailyPlans[todayKey()]?.completed ?? [];
  const minutesDone = blocks.filter((b) => done.includes(b.id)).reduce((s, b) => s + b.minutes, 0);
  const total = blocks.reduce((s, b) => s + b.minutes, 0);
  return { blocks, done, minutesDone, total, percent: total ? Math.round((minutesDone / total) * 100) : 0 };
}

/** A day counts towards the streak if at least one plan block was completed. */
export function studyStreak(state: LinguaState) {
  let streak = 0;
  const d = new Date();
  // Today not yet started does not break the streak.
  if (!(state.dailyPlans[todayKey(d)]?.completed.length)) d.setDate(d.getDate() - 1);
  for (;;) {
    if (state.dailyPlans[todayKey(d)]?.completed.length) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

export function last7Days(state: LinguaState) {
  const out: { day: string; date: string; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = todayKey(d);
    out.push({ day: d.toLocaleDateString("en-GB", { weekday: "short" }), date: key, minutes: minutesForDay(state, key) });
  }
  return out;
}

export function vocabCounts(state: LinguaState, totalWords: number) {
  const values = Object.values(state.vocabulary);
  const learned = values.filter((v) => v.status === "learned").length;
  const review = values.filter((v) => v.status === "review").length;
  const learning = values.filter((v) => v.status === "learning").length;
  return { learned, review, learning, new: totalWords - learned - review - learning };
}

export function lessonsCompleted(state: LinguaState) {
  return Object.values(state.lessons).filter((l) => l.status === "completed").length;
}

export function overallCourseProgress(state: LinguaState) {
  const total = allLessons.length;
  return total ? Math.round((lessonsCompleted(state) / total) * 100) : 0;
}

/** Skill percentages from the most recent assessment that covered each skill. */
export function skillSnapshot(state: LinguaState, which: "first" | "latest") {
  const list = which === "latest" ? state.assessments : [...state.assessments].reverse();
  const out: Record<string, number> = {};
  for (const a of list) {
    for (const [skill, v] of Object.entries(a.bySkill)) {
      if (out[skill] === undefined && v.total > 0) out[skill] = Math.round((v.score / v.total) * 100);
    }
  }
  return out;
}

export function mistakeStats(state: LinguaState) {
  const counts = new Map<string, number>();
  for (const a of state.assessments) for (const m of a.mistakes) {
    const key = m.tag ?? m.skill;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ category: key.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase()), count })).sort((a, b) => b.count - a.count);
}

export function totalStudyMinutes(state: LinguaState) {
  return Object.keys(state.dailyPlans).reduce((s, d) => s + minutesForDay(state, d), 0);
}
