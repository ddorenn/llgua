import "server-only";
import { z } from "zod";
import type { CurrentUser } from "@/lib/auth/server";
import { getLesson, loadLessons } from "@/lib/lessons/registry";
import { lessonReport } from "@/lib/lessons/engine";
import type { Lesson } from "@/lib/lessons/schema";
import { placementStore } from "@/lib/placement/store";
import type { LinguaState } from "@/lib/store/types";

/**
 * The learner model the tutor sees (08 §2). Built on the server from stored data —
 * the diagnostic, lesson sessions, review bank — never from free text the client claims.
 * In local/demo mode the learner state lives in the browser, so a small validated snapshot is accepted.
 */
export interface LearnerModel {
  level: { label: string; confidence: string; preliminary: true } | null;
  goals: string[];
  weakSkills: string[];
  gaps: string[];
  teachingLanguage: "ru+en" | "en";
  lesson: { id: string; title: string; level: string; objective: string; languageGoals: string[]; stage?: { title: string; goal: string } } | null;
  studied: string[];
  recentErrors: { prompt: string; yours: string; correct: string }[];
  results: { lesson: string; accuracy: number | null }[];
  reviewErrors: string[];
}

/** What a local/demo client may send instead of server-side state (validated, capped). */
export const SnapshotSchema = z
  .object({
    lessonSessions: z.record(z.string().max(80), z.any()).optional(),
    srsErrors: z.array(z.string().max(200)).max(20).optional(),
    teachingLanguage: z.enum(["ru+en", "en"]).optional(),
  })
  .optional();
export type Snapshot = z.infer<typeof SnapshotSchema>;

async function serverState(user: CurrentUser): Promise<Partial<LinguaState> | null> {
  if (user.mode !== "supabase") return null;
  const { createSupabaseServerClient } = await import("@/lib/db/supabase/server");
  const db = await createSupabaseServerClient();
  const { data } = await db.from("learner_state").select("state").eq("user_id", user.id).maybeSingle();
  return (data?.state as Partial<LinguaState>) ?? null;
}

const GOAL_RU: Record<string, string> = {
  travel: "путешествия",
  work: "работа",
  exam: "экзамен",
  communication: "общение",
  study: "учёба",
  relocation: "переезд",
  self: "для себя",
};

export async function buildLearnerModel(user: CurrentUser, ref?: { lessonId?: string; stageId?: string }, snapshot?: Snapshot): Promise<LearnerModel> {
  const [placement, state, lessons] = await Promise.all([
    placementStore(user).then((s) => s.latestCompleted()).catch(() => null),
    serverState(user).catch(() => null),
    loadLessons(),
  ]);
  const res = placement?.result ?? null;
  const sessions = (state?.lessonSessions ?? (snapshot?.lessonSessions as LinguaState["lessonSessions"]) ?? {}) as NonNullable<LinguaState["lessonSessions"]>;
  const byId = new Map<string, Lesson>(lessons.map((l) => [l.id, l]));

  const results: LearnerModel["results"] = [];
  const studied: string[] = [];
  const recentErrors: LearnerModel["recentErrors"] = [];
  for (const [id, s] of Object.entries(sessions)) {
    const l = byId.get(id);
    if (!l || !s || typeof s !== "object") continue;
    try {
      const rep = lessonReport(l, s);
      results.push({ lesson: l.title, accuracy: rep.accuracy });
      if (s.status === "completed") studied.push(`${l.title}: ${l.languageGoals.join("; ")}`);
      for (const m of rep.mistakes.slice(-6)) recentErrors.push({ prompt: m.prompt, yours: m.yours, correct: m.correct });
    } catch {
      /* malformed snapshot entry — ignore */
    }
  }
  const reviewErrors =
    Object.values(state?.srs ?? {})
      .filter((i) => i.kind === "error" && i.lapses > 0)
      .slice(0, 10)
      .map((i) => `${i.front} → ${i.back}`) ?? [];

  let lesson: LearnerModel["lesson"] = null;
  if (ref?.lessonId) {
    const l = await getLesson(ref.lessonId);
    if (l) {
      const st = l.stages.find((x) => x.id === ref.stageId);
      lesson = { id: l.id, title: l.title, level: l.level, objective: l.objective, languageGoals: l.languageGoals, stage: st ? { title: st.title, goal: st.goal } : undefined };
    }
  }

  return {
    level: res && res.overall != null ? { label: res.overallLabel, confidence: res.confidence, preliminary: true } : null,
    goals: (placement?.intake.goals ?? []).map((g) => GOAL_RU[g] ?? g),
    weakSkills: res ? res.route.prioritySkills.map((p) => p.skill) : [],
    gaps: res ? res.gaps.filter((g) => g.kind !== "skill").map((g) => g.label).slice(0, 8) : [],
    teachingLanguage: state?.settings?.teachingLanguage ?? snapshot?.teachingLanguage ?? "ru+en",
    lesson,
    studied: studied.slice(-10),
    recentErrors: recentErrors.slice(-8),
    results: results.slice(-8),
    reviewErrors: reviewErrors.length ? reviewErrors : (snapshot?.srsErrors ?? []).slice(0, 10),
  };
}

/** Compact text block for the system prompt. Size-capped. */
export function learnerModelText(m: LearnerModel): string {
  const lines = [
    "## Learner model (from LINGUA data — do not invent anything beyond it)",
    `- Level: ${m.level ? `${m.level.label} (preliminary internal estimate, confidence ${m.level.confidence}; NOT a confirmed CEFR level)` : "not assessed yet"}`,
    `- Goals: ${m.goals.join(", ") || "not stated"}`,
    `- Priority / weak skills: ${m.weakSkills.join(", ") || "unknown"}`,
    `- Grammar/vocabulary gaps from the diagnostic: ${m.gaps.join("; ") || "none confirmed"}`,
    `- Feedback language: ${m.teachingLanguage === "en" ? "English" : "Russian explanations with English examples (A1–A2), more English from B1"}`,
  ];
  if (m.lesson) {
    lines.push(`- Current lesson: «${m.lesson.title}» (${m.lesson.level}). Objective: ${m.lesson.objective}. Language goals: ${m.lesson.languageGoals.join("; ")}.`);
    if (m.lesson.stage) lines.push(`- Current stage: ${m.lesson.stage.title} — ${m.lesson.stage.goal}`);
  }
  if (m.studied.length) lines.push(`- Studied: ${m.studied.join(" | ")}`);
  if (m.results.length) lines.push(`- Exercise results: ${m.results.map((r) => `${r.lesson}: ${r.accuracy == null ? "no data" : Math.round(r.accuracy * 100) + "% first try"}`).join("; ")}`);
  if (m.recentErrors.length) lines.push(`- Recent mistakes: ${m.recentErrors.map((e) => `"${e.yours}" instead of "${e.correct}" (${e.prompt})`).join("; ")}`);
  if (m.reviewErrors.length) lines.push(`- Recurring errors in the review bank: ${m.reviewErrors.join("; ")}`);
  return lines.join("\n").slice(0, 3500);
}
