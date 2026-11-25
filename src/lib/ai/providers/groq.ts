import "server-only";
import type { AIProvider, ChatRequest, ChatResult } from "../types";

/**
 * Groq provider (OpenAI-compatible Chat Completions API at api.groq.com).
 * Env: GROQ_API_KEY (required), GROQ_MODEL (default openai/gpt-oss-120b),
 *      GROQ_REASONING_EFFORT (low | medium | high, default "medium").
 */
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

interface GroqResponse {
  model?: string;
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  error?: { message?: string };
}

export class GroqProvider implements AIProvider {
  readonly id = "groq";
  readonly label = "Groq";
  readonly model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  private effort = process.env.GROQ_REASONING_EFFORT || "medium";

  async chat(req: ChatRequest, systemPrompt: string): Promise<ChatResult> {
    const isReasoningModel = this.model.startsWith("openai/gpt-oss");
    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "system", content: systemPrompt }, ...req.messages],
          max_completion_tokens: 4096,
          ...(isReasoningModel ? { reasoning_effort: this.effort } : {}),
        }),
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      return { ok: false, code: "provider_error", error: "Could not reach Groq — check the network and try again." };
    }

    const data = (await res.json().catch(() => ({}))) as GroqResponse;
    if (res.status === 401 || res.status === 403) return { ok: false, code: "not_configured", error: "The Groq API key was rejected." };
    if (res.status === 429) return { ok: false, code: "rate_limited", error: "Groq rate limit reached — try again in a moment." };
    if (res.status === 400) return { ok: false, code: "bad_request", error: data.error?.message ?? "Bad request to Groq." };
    if (!res.ok) return { ok: false, code: "provider_error", error: `Groq error (${res.status}).` };

    const text = data.choices?.[0]?.message?.content?.trim();
    return { ok: true, text: text || "(empty response)", model: data.model ?? this.model, provider: this.id };
  }
}
