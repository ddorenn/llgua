import "server-only";
import type { AIProvider, AIStatus } from "../types";

/**
 * Provider registry. To add a provider: implement AIProvider in this folder and
 * add a case below. Selection: AI_PROVIDER env (default "anthropic" when a key exists).
 */
export async function getProvider(): Promise<AIProvider | null> {
  const id = process.env.AI_PROVIDER || (process.env.ANTHROPIC_API_KEY ? "anthropic" : "");
  switch (id) {
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
