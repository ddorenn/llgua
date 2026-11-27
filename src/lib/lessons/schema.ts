/**
 * Universal lesson format (docs/curriculum/11, 13 §3). A lesson is data: stages → blocks.
 * New lessons are added as JSON files in /content/lessons — the player renders any valid file.
 */
import { z } from "zod";

const Id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "kebab-case id");
const En = z.string().min(1);

const ChoiceQ = z.object({
  id: Id,
  prompt: z.string().min(1),
  options: z.array(z.string()).min(2).max(5),
  answer: z.number().int().min(0),
  explanation: z.string().min(1),
  hint: z.string().optional(),
});

export const BlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("explain"),
    id: Id,
    title: z.string().optional(),
    /** Light markdown: **bold**, *italic*, line breaks, "- " lists. */
    body: z.string().min(1),
    examples: z.array(z.object({ en: En, ru: z.string().optional() })).optional(),
    /** Show only as a second explanation when the stage branch fires (11 §5). */
  }),
  z.object({
    type: z.literal("vocab"),
    id: Id,
    title: z.string().optional(),
    words: z.array(z.object({ word: En, translation: z.string(), example: En, exampleRu: z.string().optional(), pos: z.string().optional(), ipa: z.string().optional() })).min(1),
  }),
  ChoiceQ.extend({ type: z.literal("choice"), check: z.enum(["concept", "practice", "recall"]).default("practice") }),
  z.object({
    type: z.literal("gap"),
    id: Id,
    prompt: z.string().includes("___"),
    answers: z.array(z.string().min(1)).min(1),
    explanation: z.string().min(1),
    hint: z.string().optional(),
    check: z.enum(["practice", "recall"]).default("practice"),
  }),
  z.object({
    type: z.literal("order"),
    id: Id,
    prompt: z.string().optional(),
    /** Accepted sentences; tokens are derived from the first one. */
    answers: z.array(En).min(1),
    explanation: z.string().min(1),
  }),
  z.object({
    type: z.literal("match"),
    id: Id,
    prompt: z.string().optional(),
    pairs: z.array(z.tuple([z.string(), z.string()])).min(3).max(8),
    explanation: z.string().optional(),
  }),
  z.object({ type: z.literal("reading"), id: Id, title: En, text: En, questions: z.array(ChoiceQ).min(1).max(6) }),
  z.object({
    type: z.literal("listening"),
    id: Id,
    title: En,
    lines: z.array(z.object({ speaker: z.string(), text: En })).min(1),
    rate: z.number().min(0.5).max(1.3).default(0.9),
    maxPlays: z.number().int().min(1).max(5).default(3),
    questions: z.array(ChoiceQ).min(1).max(6),
  }),
  z.object({
    type: z.literal("writing"),
    id: Id,
    title: z.string(),
    instruction: z.string(),
    prompt: En,
    words: z.tuple([z.number().int(), z.number().int()]),
    /** Target forms the text should use (checked with simple patterns, regex source). */
    targets: z.array(z.object({ label: z.string(), pattern: z.string() })).default([]),
    checklist: z.array(z.string()).default([]),
  }),
  z.object({
    type: z.literal("dialogue"),
    id: Id,
    title: z.string(),
    scenario: z.string(),
    partner: z.string(),
    goal: z.string(),
    /** Scripted branching-free dialogue (A1–A2, 16 §5): partner line → learner reply (choose or type). */
    steps: z
      .array(
        z.object({
          id: Id,
          partner: En,
          options: z.array(z.string()).optional(),
          correct: z.array(z.number().int()).optional(),
          /** Typed reply is accepted when it contains every keyword pattern (regex source, case-insensitive). */
          keywords: z.array(z.string()).optional(),
          model: En,
          feedback: z.string().optional(),
        }),
      )
      .min(1),
  }),
  z.object({
    type: z.literal("review"),
    id: Id,
    title: z.string().optional(),
    count: z.number().int().min(1).max(20).default(6),
    /** Used when the learner's review queue is empty (first lessons). */
    fallback: z.array(z.object({ id: Id, prompt: z.string().includes("___"), answers: z.array(z.string()).min(1), explanation: z.string() })).min(1),
  }),
  z.object({ type: z.literal("feedback"), id: Id, title: z.string().optional() }),
  z.object({ type: z.literal("summary"), id: Id, cando: z.array(z.string()).min(1).max(5), next: z.string().optional() }),
]);

export const StageSchema = z.object({
  id: Id,
  kind: z.enum(["warmup", "input", "practice", "use", "feedback", "wrapup"]),
  title: z.string(),
  goal: z.string(),
  minutes: z.number().int().min(1).max(40),
  role: z.enum(["teacher", "examiner", "speaking-partner", "vocabulary-coach", "planner", "analyst"]),
  blocks: z.array(BlockSchema).min(1),
  /** Adaptive branch (11 §5): when graded errors in this stage reach the threshold, insert extra blocks. */
  branch: z.object({ errorsAtLeast: z.number().int().min(1), note: z.string(), add: z.array(BlockSchema).min(1) }).optional(),
});

export const LessonSchema = z.object({
  id: Id,
  version: z.number().int().min(1),
  status: z.enum(["draft", "demo", "reviewed", "published"]),
  title: z.string(),
  level: z.enum(["Pre-A1", "A1", "A2", "B1", "B2"]),
  module: z.string(),
  type: z.enum(["A", "B", "C", "D", "E", "F", "G", "H", "K"]),
  objective: z.string(),
  languageGoals: z.array(z.string()).min(1),
  minutes: z.number().int(),
  feedbackLanguage: z.enum(["ru", "mixed", "en"]).default("ru"),
  stages: z.array(StageSchema).min(1),
  note: z.string().optional(),
});

export type Lesson = z.infer<typeof LessonSchema>;
export type Stage = z.infer<typeof StageSchema>;
export type Block = z.infer<typeof BlockSchema>;
export type BlockOf<T extends Block["type"]> = Extract<Block, { type: T }>;

/** Structural checks beyond the schema (unique ids, valid answer indexes). */
export function validateLesson(lesson: Lesson): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const seen = (id: string) => {
    if (ids.has(id)) problems.push(`duplicate id ${id}`);
    ids.add(id);
  };
  const walk = (b: Block) => {
    seen(b.id);
    if (b.type === "choice" && b.answer >= b.options.length) problems.push(`${b.id}: answer out of range`);
    if (b.type === "reading" || b.type === "listening") for (const q of b.questions) { seen(`${b.id}/${q.id}`); if (q.answer >= q.options.length) problems.push(`${q.id}: answer out of range`); }
    if (b.type === "dialogue") for (const s of b.steps) { if (s.options && !s.correct?.length) problems.push(`${s.id}: options without correct`); if (!s.options && !s.keywords?.length) problems.push(`${s.id}: needs options or keywords`); }
    if (b.type === "writing") for (const t of b.targets) { try { new RegExp(t.pattern, "i"); } catch { problems.push(`${b.id}: bad pattern ${t.pattern}`); } }
  };
  for (const st of lesson.stages) {
    seen(st.id);
    st.blocks.forEach(walk);
    st.branch?.add.forEach(walk);
  }
  const total = lesson.stages.reduce((n, s) => n + s.minutes, 0);
  if (Math.abs(total - lesson.minutes) > 5) problems.push(`stage minutes ${total} ≠ lesson minutes ${lesson.minutes}`);
  return problems;
}
