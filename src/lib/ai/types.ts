/**
 * Provider-agnostic AI contracts. Any provider (Groq, Anthropic, OpenAI, a local model…) implements
 * AIProvider.complete(); the rest of the app talks only to these types and never to a vendor SDK.
 */
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Legacy client context (the tutor page still sends it; the server now builds its own learner model). */
export interface LearningContext {
  level: string | null;
  teachingLanguage: "ru+en" | "en";
  dailyMinutes: number;
  goal: string;
  targetExam: string;
  stats?: { lessonsCompleted: number; wordsLearned: number; streak: number; weakAreas: string[] };
}

export interface ChatRequest {
  mode: string;
  messages: ChatTurn[];
  context?: LearningContext;
  lesson?: { lessonId: string; stageId?: string; blockId?: string };
}

export type AIErrorCode = "not_configured" | "disabled" | "refused" | "rate_limited" | "budget" | "provider_error" | "bad_request" | "invalid_output";

export type ChatResult =
  | { ok: true; text: string; model: string; provider: string }
  | { ok: false; error: string; code: AIErrorCode };

export interface CompletionRequest {
  system: string;
  messages: ChatTurn[];
  maxTokens: number;
  temperature?: number;
  /** Ask the model for a single JSON object. */
  json?: boolean;
  /** Model tier picked by the task router. */
  tier: "fast" | "quality";
  /** Reasoning effort for reasoning models. */
  effort?: "low" | "medium" | "high";
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export type CompletionResult =
  | { ok: true; text: string; model: string; provider: string; usage: Usage }
  | { ok: false; code: AIErrorCode; error: string; model: string; provider: string; usage?: Usage };

export interface AIProvider {
  readonly id: string;
  readonly label: string;
  modelFor(tier: CompletionRequest["tier"]): string;
  complete(req: CompletionRequest): Promise<CompletionResult>;
}

export interface AIStatus {
  configured: boolean;
  provider: string | null;
  model: string | null;
  /** Today's usage for the signed-in learner (never other learners). */
  usage?: { requests: number; costUsd: number; limitRequests: number; limitCostUsd: number };
}
