import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { LessonSchema, validateLesson, type Lesson } from "./schema";

/**
 * Lesson registry: every *.json in /content/lessons is a lesson. Adding a lesson = adding a file;
 * no code or UI changes. Invalid files are skipped with a server log (and fail `npm run content:check`).
 */
const DIR = path.join(process.cwd(), "content", "lessons");

let cache: { at: number; lessons: Lesson[] } | null = null;

export async function loadLessons(): Promise<Lesson[]> {
  if (cache && (process.env.NODE_ENV === "production" || Date.now() - cache.at < 2000)) return cache.lessons;
  let files: string[] = [];
  try {
    files = (await readdir(DIR)).filter((f) => f.endsWith(".json")).sort();
  } catch {
    files = [];
  }
  const lessons: Lesson[] = [];
  for (const f of files) {
    try {
      const parsed = LessonSchema.safeParse(JSON.parse(await readFile(path.join(DIR, f), "utf8")));
      if (!parsed.success) {
        console.error(`[lessons] ${f}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
        continue;
      }
      const problems = validateLesson(parsed.data);
      if (problems.length) {
        console.error(`[lessons] ${f}: ${problems.join("; ")}`);
        continue;
      }
      lessons.push(parsed.data);
    } catch (e) {
      console.error(`[lessons] ${f}: ${(e as Error).message}`);
    }
  }
  cache = { at: Date.now(), lessons };
  return lessons;
}

export async function getLesson(id: string): Promise<Lesson | null> {
  return (await loadLessons()).find((l) => l.id === id) ?? null;
}

export interface LessonSummary {
  id: string;
  title: string;
  level: Lesson["level"];
  module: string;
  status: Lesson["status"];
  objective: string;
  minutes: number;
  stages: number;
}

export async function lessonSummaries(): Promise<LessonSummary[]> {
  return (await loadLessons()).map((l) => ({ id: l.id, title: l.title, level: l.level, module: l.module, status: l.status, objective: l.objective, minutes: l.minutes, stages: l.stages.length }));
}
