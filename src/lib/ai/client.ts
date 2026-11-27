/** Browser-side client for the tutor API. UI components call only these functions. */
import type { AIStatus, ChatRequest, ChatResult } from "./types";

export async function fetchAIStatus(): Promise<AIStatus> {
  const res = await fetch("/api/tutor", { cache: "no-store" });
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
}

export async function sendTutorMessage(req: ChatRequest & { snapshot?: unknown }): Promise<ChatResult> {
  try {
    const res = await fetch("/api/tutor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) });
    return (await res.json()) as ChatResult;
  } catch {
    return { ok: false, code: "provider_error", error: "Нет связи — проверьте интернет." };
  }
}

export type TaskResult<T> = { ok: true; data: T; model: string } | { ok: false; code: string; error: string };

export async function runTutorTask<T>(task: string, payload: Record<string, unknown>, snapshot?: unknown): Promise<TaskResult<T>> {
  try {
    const res = await fetch("/api/tutor/task", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task, payload, snapshot }) });
    return (await res.json()) as TaskResult<T>;
  } catch {
    return { ok: false, code: "provider_error", error: "Нет связи — проверьте интернет." };
  }
}
