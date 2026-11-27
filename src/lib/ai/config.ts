/**
 * AI task routing, limits and pricing. One table decides, per task: which role (mode) speaks,
 * which model tier, how many output tokens, whether the answer must be JSON.
 */
import limitsJson from "../../../content/ai/limits.json";
import pricingJson from "../../../content/ai/pricing.json";

export const AI_LIMITS = limitsJson as {
  perMinuteRequests: number;
  perDayRequests: number;
  perDayCostUsd: number;
  maxInputChars: number;
  maxChatTurns: number;
  maxDialogueTurns: number;
};

export type TaskId = "chat" | "explain_mistake" | "evaluate_writing" | "dialogue_turn" | "vocab_examples" | "plan_next" | "analyze_progress";
export type ModeId = "teacher" | "examiner" | "speaking" | "vocabulary" | "planner" | "analyst";

export const TASKS: Record<TaskId, { mode: ModeId | null; tier: "fast" | "quality"; maxTokens: number; json: boolean; temperature: number; effort: "low" | "medium" }> = {
  // free chat inside a role (mode chosen by the learner)
  chat: { mode: null, tier: "quality", maxTokens: 1200, json: false, temperature: 0.5, effort: "low" },
  explain_mistake: { mode: "teacher", tier: "fast", maxTokens: 700, json: true, temperature: 0.3, effort: "low" },
  // rubric scoring needs the stronger model (16 §5 "different model classes")
  evaluate_writing: { mode: "examiner", tier: "quality", maxTokens: 1500, json: true, temperature: 0.2, effort: "medium" },
  dialogue_turn: { mode: "speaking", tier: "fast", maxTokens: 500, json: true, temperature: 0.6, effort: "low" },
  vocab_examples: { mode: "vocabulary", tier: "fast", maxTokens: 500, json: true, temperature: 0.5, effort: "low" },
  plan_next: { mode: "planner", tier: "fast", maxTokens: 700, json: true, temperature: 0.3, effort: "low" },
  analyze_progress: { mode: "analyst", tier: "fast", maxTokens: 700, json: true, temperature: 0.3, effort: "low" },
};

const pricing = pricingJson as { default: { input: number; output: number }; models: Record<string, { input: number; output: number }> };

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = pricing.models[model] ?? pricing.default;
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}
