/**
 * Structured tutor tasks: input validation, output schema (zod) and the instruction that tells
 * the model the exact JSON shape. Outputs are validated before they reach the learner.
 */
import { z } from "zod";
import type { TaskId } from "./config";

const Level = z.enum(["below A1", "A1", "A2", "B1", "B2", "above B2"]);
const Conf = z.enum(["low", "medium", "high"]);
const short = (n: number) => z.string().min(1).max(n);

export const TaskInput = {
  explain_mistake: z.object({ lessonId: z.string().max(80), key: z.string().max(120), answer: z.string().max(300) }),
  evaluate_writing: z.object({ lessonId: z.string().max(80), blockId: z.string().max(80), text: z.string().min(1).max(4000) }),
  dialogue_turn: z.object({
    lessonId: z.string().max(80),
    blockId: z.string().max(80),
    messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(600) })).min(1).max(20),
  }),
  vocab_examples: z.object({ word: z.string().min(1).max(60), lessonId: z.string().max(80).optional() }),
  plan_next: z.object({}).passthrough(),
  analyze_progress: z.object({}).passthrough(),
} satisfies Partial<Record<TaskId, z.ZodTypeAny>>;

export const TaskOutput = {
  explain_mistake: z.object({
    explanation: short(900),
    rule: short(300),
    example: z.object({ en: short(200), ru: z.string().max(200).optional() }),
    hint: short(300),
  }),
  evaluate_writing: z.object({
    criteria: z
      .array(z.object({ name: z.enum(["task", "range", "coherence", "accuracy"]), level: Level, comment: short(300) }))
      .min(3)
      .max(4),
    estimated_level: Level,
    confidence: Conf,
    strengths: z.array(short(200)).min(1).max(3),
    corrections: z.array(z.object({ original: short(200), corrected: short(200), why: short(250) })).max(3),
    next_step: short(300),
  }),
  dialogue_turn: z.object({
    reply: short(400),
    correction: z.object({ original: short(200), better: short(200), why: short(200) }).nullable().optional(),
    goal_reached: z.boolean(),
  }),
  vocab_examples: z.object({
    examples: z.array(z.object({ en: short(200), ru: z.string().max(200).optional() })).min(1).max(3),
    collocations: z.array(short(60)).max(5),
    memory_tip: z.string().max(250).optional(),
  }),
  plan_next: z.object({
    focus: z.array(short(120)).min(1).max(3),
    next_steps: z.array(z.object({ title: short(120), minutes: z.number().int().min(5).max(90), why: short(200) })).min(1).max(5),
    note: z.string().max(300).optional(),
  }),
  analyze_progress: z.object({
    summary: short(600),
    strengths: z.array(short(200)).max(3),
    weaknesses: z.array(short(200)).max(3),
    missing_data: z.array(short(200)).max(3),
    recommendation: short(300),
  }),
};

export type TaskOutputOf<T extends keyof typeof TaskOutput> = z.infer<(typeof TaskOutput)[T]>;

/** JSON shape instructions per task (kept next to the schema so they cannot drift apart). */
export const TASK_FORMAT: Record<keyof typeof TaskOutput, string> = {
  explain_mistake:
    'Return JSON: {"explanation": string (why the answer is wrong, in the feedback language, max 3 sentences), "rule": string (the rule in one line), "example": {"en": string (a NEW original example), "ru": string}, "hint": string (a hint that helps the learner fix it themselves, without giving the answer away)}',
  evaluate_writing:
    'Return JSON: {"criteria": [{"name": "task"|"range"|"coherence"|"accuracy", "level": "below A1"|"A1"|"A2"|"B1"|"B2"|"above B2", "comment": string}] (all four criteria), "estimated_level": same scale, "confidence": "low"|"medium"|"high" (low for texts under the word target or ambiguous), "strengths": [string] (1–3), "corrections": [{"original": exact fragment from the text, "corrected": string, "why": string}] (at most 3, prioritised: meaning-breaking → target language → recurring), "next_step": string}',
  dialogue_turn:
    'Return JSON: {"reply": string (your next line in English, 1–2 short sentences, at the learner\'s level), "correction": null or {"original": string, "better": string, "why": string in Russian} (ONLY if the learner\'s last message breaks communication), "goal_reached": boolean (true when the dialogue goal has been achieved)}',
  vocab_examples:
    'Return JSON: {"examples": [{"en": string (original, at the learner\'s level), "ru": string}] (2), "collocations": [string] (up to 4 common collocations), "memory_tip": string (short, in Russian)}',
  plan_next:
    'Return JSON: {"focus": [string] (1–3 priorities in Russian), "next_steps": [{"title": string, "minutes": number, "why": string}] (2–4 steps for the next study session, 60 minutes in total), "note": string (optional)}',
  analyze_progress:
    'Return JSON: {"summary": string (3–4 sentences in Russian, only from the data), "strengths": [string], "weaknesses": [string], "missing_data": [string] (what is not measured yet), "recommendation": string}',
};

/** Extract and validate the JSON object from model text (tolerates code fences / prose around it). */
export function parseTaskOutput<T extends keyof typeof TaskOutput>(task: T, text: string): TaskOutputOf<T> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = TaskOutput[task].safeParse(JSON.parse(text.slice(start, end + 1)));
    return parsed.success ? (parsed.data as TaskOutputOf<T>) : null;
  } catch {
    return null;
  }
}
