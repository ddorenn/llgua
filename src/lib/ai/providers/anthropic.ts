import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, CompletionRequest, CompletionResult } from "../types";

/**
 * Claude via the official Anthropic SDK. Not active unless ANTHROPIC_API_KEY is set (requires the owner's approval).
 * Models per tier: ANTHROPIC_MODEL_FAST (default claude-haiku-5-5), ANTHROPIC_MODEL (quality, default claude-sonnet-5-5).
 */
export class AnthropicProvider implements AIProvider {
  readonly id = "anthropic";
  readonly label = "Anthropic Claude";
  private client = new Anthropic();

  modelFor(tier: CompletionRequest["tier"]) {
    return tier === "fast" ? process.env.ANTHROPIC_MODEL_FAST || "claude-haiku-5-5" : process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const model = this.modelFor(req.tier);
    const base = { model, provider: this.id };
    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: req.maxTokens,
        system: req.json ? `${req.system}\n\nRespond with a single JSON object and nothing else.` : req.system,
        messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
      });
      const usage = { inputTokens: response.usage?.input_tokens ?? 0, outputTokens: response.usage?.output_tokens ?? 0 };
      if (response.stop_reason === "refusal") return { ...base, ok: false, code: "refused", error: "Модель отказалась отвечать на этот запрос.", usage };
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      if (!text) return { ...base, ok: false, code: "invalid_output", error: "Модель вернула пустой ответ.", usage };
      return { ok: true, text, model: response.model, provider: this.id, usage };
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) return { ...base, ok: false, code: "rate_limited", error: "Слишком много запросов — попробуйте через минуту." };
      if (error instanceof Anthropic.AuthenticationError) return { ...base, ok: false, code: "not_configured", error: "Ключ доступа к модели отклонён." };
      if (error instanceof Anthropic.BadRequestError) return { ...base, ok: false, code: "bad_request", error: "Модель не смогла обработать запрос." };
      return { ...base, ok: false, code: "provider_error", error: "Не удалось связаться с моделью." };
    }
  }
}
