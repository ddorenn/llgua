import { NextResponse } from "next/server";
import { z } from "zod";
import { getAIStatus, getProvider } from "@/lib/ai/providers";
import { buildSystemPrompt } from "@/lib/ai/instructions";
import { getCurrentUser } from "@/lib/auth/server";
import { tutorModesFile } from "@/lib/content";

export const runtime = "nodejs";

const BodySchema = z.object({
  mode: z.string().refine((m) => tutorModesFile.modes.some((x) => x.id === m), "Unknown mode"),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8000) }))
    .min(1)
    .max(60),
  context: z.object({
    level: z.string().nullable(),
    teachingLanguage: z.enum(["ru+en", "en"]),
    dailyMinutes: z.number().int().min(5).max(480),
    goal: z.string().max(300),
    targetExam: z.string().max(20),
    stats: z
      .object({
        lessonsCompleted: z.number(),
        wordsLearned: z.number(),
        streak: z.number(),
        weakAreas: z.array(z.string()).max(10),
      })
      .optional(),
  }),
});

/** GET /api/tutor → provider status (never exposes keys). */
export async function GET() {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await getAIStatus());
}

/** POST /api/tutor → one tutor reply. 503 when no provider is configured. */
export async function POST(request: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, code: "bad_request", error: "Некорректный запрос." }, { status: 400 });

  const provider = await getProvider();
  if (!provider) {
    return NextResponse.json(
      { ok: false, code: "not_configured", error: "AI-репетитор пока не подключён." },
      { status: 503 },
    );
  }

  const system = await buildSystemPrompt(parsed.data.mode, parsed.data.context);
  const result = await provider.chat(parsed.data, system);
  return NextResponse.json(result, { status: result.ok ? 200 : result.code === "rate_limited" ? 429 : 502 });
}
