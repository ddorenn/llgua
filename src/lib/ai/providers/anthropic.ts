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
        return { ok: false, code: "refused", error: "Модель отказалась отвечать на этот запрос." };
      }
      const text = response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return { ok: true, text: text || "(пустой ответ)", model: response.model, provider: this.id };
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) return { ok: false, code: "rate_limited", error: "Слишком много запросов — попробуй через минуту." };
      if (error instanceof Anthropic.AuthenticationError) return { ok: false, code: "not_configured", error: "Ключ доступа к модели отклонён." };
      if (error instanceof Anthropic.BadRequestError) return { ok: false, code: "bad_request", error: "Модель не смогла обработать запрос." };
      if (error instanceof Anthropic.APIError) return { ok: false, code: "provider_error", error: `Ошибка модели (${error.status ?? "сеть"}).` };
      return { ok: false, code: "provider_error", error: "Не удалось связаться с моделью." };
    }
  }
}
