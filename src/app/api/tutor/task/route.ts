import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/server";
import { SnapshotSchema } from "@/lib/ai/context";
import { TaskInput } from "@/lib/ai/tasks";
import { tutorTask } from "@/lib/ai/tutor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  task: z.enum(["explain_mistake", "evaluate_writing", "dialogue_turn", "vocab_examples", "plan_next", "analyze_progress"]),
  payload: z.record(z.string(), z.unknown()).default({}),
  snapshot: SnapshotSchema,
});

/**
 * POST /api/tutor/task { task, payload } → { ok, data } with data validated against the task's schema.
 * Lesson facts are looked up on the server; the client only names the lesson, block and its own answer.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const raw = await request.text();
  if (raw.length > 60_000) return NextResponse.json({ ok: false, code: "bad_request", error: "Слишком длинный запрос." }, { status: 413 });
  const body = Body.safeParse((() => { try { return JSON.parse(raw); } catch { return null; } })());
  if (!body.success) return NextResponse.json({ ok: false, code: "bad_request", error: "Некорректный запрос." }, { status: 400 });
  const input = TaskInput[body.data.task].safeParse(body.data.payload);
  if (!input.success) return NextResponse.json({ ok: false, code: "bad_request", error: "Некорректные данные задания." }, { status: 400 });
  const snapshot = user.mode === "supabase" ? undefined : body.data.snapshot;
  const r = await tutorTask(user, body.data.task, input.data as Record<string, unknown>, snapshot);
  const status = r.ok ? 200 : r.code === "not_configured" ? 503 : r.code === "rate_limited" || r.code === "budget" ? 429 : r.code === "bad_request" ? 400 : 502;
  return NextResponse.json(r, { status });
}
