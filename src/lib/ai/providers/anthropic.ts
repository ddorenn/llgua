import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, ChatRequest, ChatResult } from "../types";

/**
 * Claude provider via the official Anthropic SDK.
 * Env: ANTHROPIC_API_KEY (required), AI_MODEL (default claude-opus-5-5), AI_EFFORT (default "medium").
 */
export class AnthropicProvider implements AIProvider {
  readonly id = "anthropic";
  readonly label = "Anthropic Claude";
  private client = new Anthropic();
  readonly model = process.env.AI_MODEL || "claude-opus-5-5";
  private effort = (process.env.AI_EFFORT || "medium") as "low" | "medium" | "high";

  async chat(req: ChatRequest, systemPrompt: string): Promise<ChatResult> {
    try {
      const response = await this.client.beta.messages.create({
        model: this.model,
        max_tokens: 16000,
        system: systemPrompt,
        messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
        output_config: { effort: this.effort },
        // Server-side fallback if a safety classifier declines the request.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });

      if (response.stop_reason === "refusal") {
        return { ok: false, code: "refused", error: "The model declined to answer this request." };
      }
      const text = response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return { ok: true, text: text || "(empty response)", model: response.model, provider: this.id };
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) return { ok: false, code: "rate_limited", error: "Rate limited — try again shortly." };
      if (error instanceof Anthropic.AuthenticationError) return { ok: false, code: "not_configured", error: "The AI API key was rejected." };
      if (error instanceof Anthropic.BadRequestError) return { ok: false, code: "bad_request", error: error.message };
      if (error instanceof Anthropic.APIError) return { ok: false, code: "provider_error", error: `Provider error (${error.status ?? "network"}).` };
      return { ok: false, code: "provider_error", error: "Unexpected error contacting the AI provider." };
    }
  }
}
