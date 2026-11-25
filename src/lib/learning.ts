/**
 * Curriculum logic (lesson availability, module progress).
 * Kept out of components so unlock rules can change without touching UI.
 */
import { allLessons, course, type Cefr } from "@/lib/content";
import type { LinguaState } from "@/lib/store/types";

export type LessonState = "completed" | "in_progress" | "available" | "locked" | "pending";

export function lessonState(state: LinguaState, lessonId: string): LessonState {
  const idx = allLessons.findIndex((l) => l.id === lessonId);
  const lesson = allLessons[idx];
  if (!lesson) return "locked";
  if (lesson.blocks.length === 0) return "pending";
  const p = state.lessons[lessonId];
  if (p?.status === "completed") return "completed";
  if (p?.status === "in_progress") return "in_progress";
  if (course.unlockRule === "open") return "available";
  // Sequential: the previous lesson *with content* must be completed.
  const prev = allLessons.slice(0, idx).reverse().find((l) => l.blocks.length > 0);
  if (!prev) return "available";
  return state.lessons[prev.id]?.status === "completed" ? "available" : "locked";
}

export function levelProgress(state: LinguaState, level: Cefr) {
  const lessons = allLessons.filter((l) => l.level === level);
  const done = lessons.filter((l) => state.lessons[l.id]?.status === "completed").length;
  const withContent = lessons.filter((l) => l.blocks.length > 0).length;
  return { total: lessons.length, done, withContent, percent: lessons.length ? Math.round((done / lessons.length) * 100) : 0 };
}

export function moduleProgress(state: LinguaState, moduleId: string) {
  const lessons = allLessons.filter((l) => l.moduleId === moduleId);
  const done = lessons.filter((l) => state.lessons[l.id]?.status === "completed").length;
  return { total: lessons.length, done, percent: lessons.length ? Math.round((done / lessons.length) * 100) : 0 };
}
