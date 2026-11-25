import "server-only";
import type { AIProvider, AIStatus } from "../types";

/**
 * Provider registry. To add a provider: implement AIProvider in this folder and add a case below.
 * Selection: AI_PROVIDER env ("groq" | "anthropic"). If unset, the first provider with a key wins
 * (Groq, then Anthropic).
 */
function selectedProviderId(): string {
  if (process.env.AI_PROVIDER) return process.env.AI_PROVIDER;
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "";
}

export async function getProvider(): Promise<AIProvider | null> {
  switch (selectedProviderId()) {
    case "groq": {
      if (!process.env.GROQ_API_KEY) return null;
      const { GroqProvider } = await import("./groq");
      return new GroqProvider();
    }
    case "anthropic": {
      if (!process.env.ANTHROPIC_API_KEY) return null;
      const { AnthropicProvider } = await import("./anthropic");
      return new AnthropicProvider();
    }
    default:
      return null;
  }
}

export async function getAIStatus(): Promise<AIStatus> {
  const p = await getProvider();
  if (!p) return { configured: false, provider: null, model: null };
  return { configured: true, provider: p.label, model: (p as { model?: string }).model ?? null };
}
