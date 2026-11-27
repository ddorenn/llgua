import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/server";
import { tutorModesFile } from "@/lib/content";
import { AI_LIMITS } from "@/lib/ai/config";
import { SnapshotSchema } from "@/lib/ai/context";
import { tutorChat, tutorStatus } from "@/lib/ai/tutor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  mode: z.string().refine((m) => tutorModesFile.modes.some((x) => x.id === m), "Unknown mode"),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(AI_LIMITS.maxInputChars) }))
    .min(1)
    .max(60),
  lesson: z.object({ lessonId: z.string().max(80), stageId: z.string().max(80).optional() }).optional(),
  snapshot: SnapshotSchema,
  // legacy field from older clients — ignored (the server builds the learner model itself)
  context: z.unknown().optional(),
});

/** GET /api/tutor → provider status + today's usage for this learner (never exposes keys). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await tutorStatus(user), { headers: { "Cache-Control": "no-store" } });
}

/** POST /api/tutor → one reply in the chosen role, with the server-built learner model. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const raw = await request.text();
  if (raw.length > 120_000) return NextResponse.json({ ok: false, code: "bad_request", error: "Слишком длинный запрос." }, { status: 413 });
  const parsed = BodySchema.safeParse((() => { try { return JSON.parse(raw); } catch { return null; } })());
  if (!parsed.success) return NextResponse.json({ ok: false, code: "bad_request", error: "Некорректный запрос." }, { status: 400 });
  const snapshot = user.mode === "supabase" ? undefined : parsed.data.snapshot;
  const r = await tutorChat(user, { mode: parsed.data.mode, messages: parsed.data.messages, lesson: parsed.data.lesson, snapshot });
  const status = r.ok ? 200 : r.code === "not_configured" || r.code === "disabled" ? 503 : r.code === "rate_limited" || r.code === "budget" ? 429 : r.code === "bad_request" ? 400 : 502;
  return NextResponse.json(r, { status });
}
