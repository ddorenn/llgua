import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { tutorModesFile } from "@/lib/content";
import type { LearningContext } from "./types";

const AI_DIR = path.join(process.cwd(), "content", "ai");

function fill(template: string, ctx: LearningContext) {
  const vars: Record<string, string> = {
    level: ctx.level ?? "not assessed yet",
    teachingLanguage: ctx.teachingLanguage === "ru+en" ? "Russian + English" : "English only",
    dailyMinutes: String(ctx.dailyMinutes),
    goal: ctx.goal,
    targetExam: ctx.targetExam,
  };
  return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? `{{${k}}}`);
}

async function readSafe(rel: string) {
  const full = path.join(AI_DIR, rel);
  if (!full.startsWith(AI_DIR)) throw new Error("Invalid instructions path");
  return readFile(full, "utf8");
}

/** Compose the system prompt: base instructions + mode instructions + learner context. */
export async function buildSystemPrompt(modeId: string, ctx: LearningContext) {
  const mode = tutorModesFile.modes.find((m) => m.id === modeId);
  if (!mode) throw new Error(`Unknown tutor mode: ${modeId}`);
  const [base, modeText] = await Promise.all([readSafe(tutorModesFile.baseInstructions), readSafe(mode.instructions)]);
  const contextBlock = [
    "## Learning context (from the app — real data only)",
    `- Level: ${ctx.level ?? "not assessed yet"}`,
    `- Goal: ${ctx.goal}`,
    `- Daily study time: ${ctx.dailyMinutes} min`,
    `- Target exam: ${ctx.targetExam}`,
    ctx.stats
      ? `- Lessons completed: ${ctx.stats.lessonsCompleted}; words learned: ${ctx.stats.wordsLearned}; streak: ${ctx.stats.streak} days; weak areas: ${ctx.stats.weakAreas.join(", ") || "unknown"}`
      : "- No activity statistics shared.",
  ].join("\n");
  return [fill(base, ctx), fill(modeText, ctx), contextBlock].join("\n\n");
}
