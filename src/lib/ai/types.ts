/**
 * Provider-agnostic AI contracts. Any provider (Anthropic, OpenAI, local model…)
 * implements AIProvider; the rest of the app only talks to these types.
 */
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Learner context the client may share with the tutor. Only real data — never sample data. */
export interface LearningContext {
  level: string | null;
  teachingLanguage: "ru+en" | "en";
  dailyMinutes: number;
  goal: string;
  targetExam: string;
  stats?: {
    lessonsCompleted: number;
    wordsLearned: number;
    streak: number;
    weakAreas: string[];
  };
}

export interface ChatRequest {
  mode: string;
  messages: ChatTurn[];
  context: LearningContext;
}

export type ChatResult =
  | { ok: true; text: string; model: string; provider: string }
  | { ok: false; error: string; code: "not_configured" | "refused" | "rate_limited" | "provider_error" | "bad_request" };

export interface AIProvider {
  readonly id: string;
  readonly label: string;
  chat(req: ChatRequest, systemPrompt: string): Promise<ChatResult>;
}

export interface AIStatus {
  configured: boolean;
  provider: string | null;
  model: string | null;
}
