import "server-only";
import type { AIProvider } from "../types";

/**
 * Provider registry. To add a provider: implement AIProvider in this folder and add a case below.
 * Selection: AI_PROVIDER env ("groq" | "anthropic"); if unset, the first provider with a key wins.
 * AI_DISABLED=1 turns every AI feature off (the app keeps working without it).
 */
export function aiDisabled() {
  return process.env.AI_DISABLED === "1";
}

function selectedProviderId(): string {
  if (process.env.AI_PROVIDER) return process.env.AI_PROVIDER;
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "";
}

export async function getProvider(): Promise<AIProvider | null> {
  if (aiDisabled()) return null;
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
