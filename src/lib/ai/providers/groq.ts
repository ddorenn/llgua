import "server-only";
import type { AIProvider, CompletionRequest, CompletionResult } from "../types";

/**
 * Groq (OpenAI-compatible Chat Completions at api.groq.com).
 * Env: GROQ_API_KEY; models per tier: GROQ_MODEL_FAST (default openai/gpt-oss-20b), GROQ_MODEL (quality, default openai/gpt-oss-120b).
 */
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

interface GroqResponse {
  model?: string;
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
}

export class GroqProvider implements AIProvider {
  readonly id = "groq";
  readonly label = "Groq";

  modelFor(tier: CompletionRequest["tier"]) {
    return tier === "fast" ? process.env.GROQ_MODEL_FAST || "openai/gpt-oss-20b" : process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const model = this.modelFor(req.tier);
    const base = { model, provider: this.id };
    const body: Record<string, unknown> = {
      model,
      messages: [{ role: "system", content: req.system }, ...req.messages],
      max_completion_tokens: req.maxTokens,
      temperature: req.temperature ?? 0.4,
    };
    if (model.startsWith("openai/gpt-oss")) body.reasoning_effort = req.effort ?? "low";
    if (req.json) body.response_format = { type: "json_object" };

    const call = async (b: Record<string, unknown>) =>
      fetch(ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(b),
        signal: AbortSignal.timeout(45_000),
      });

    let res: Response;
    try {
      res = await call(body);
      // Some models reject JSON mode; retry once without it (the prompt still asks for JSON).
      if (res.status === 400 && req.json) {
        delete body.response_format;
        res = await call(body);
      }
    } catch {
      return { ...base, ok: false, code: "provider_error", error: "Не удалось связаться с моделью — проверьте интернет и попробуйте ещё раз." };
    }
    const data = (await res.json().catch(() => ({}))) as GroqResponse;
    const usage = { inputTokens: data.usage?.prompt_tokens ?? 0, outputTokens: data.usage?.completion_tokens ?? 0 };
    if (res.status === 401 || res.status === 403) return { ...base, ok: false, code: "not_configured", error: "Ключ доступа к модели отклонён.", usage };
    if (res.status === 429) return { ...base, ok: false, code: "rate_limited", error: "Модель перегружена — попробуйте через минуту.", usage };
    if (res.status === 400) return { ...base, ok: false, code: "bad_request", error: "Модель не смогла обработать запрос.", usage };
    if (!res.ok) return { ...base, ok: false, code: "provider_error", error: `Ошибка модели (${res.status}).`, usage };
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) return { ...base, ok: false, code: "invalid_output", error: "Модель вернула пустой ответ.", usage };
    return { ok: true, text, model: data.model ?? model, provider: this.id, usage };
  }
}
