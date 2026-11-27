import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/server";
import { lessonReport, sessionFromAttempts } from "@/lib/lessons/engine";
import { getLesson } from "@/lib/lessons/registry";
import { recordsStore } from "@/lib/records/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  lessonId: z.string().max(80),
  startedAt: z.string().max(40).optional(),
  stageMs: z.record(z.string().max(80), z.number().min(0).max(6 * 3_600_000)).default({}),
  selfAssessment: z.record(z.string().max(300), z.enum(["yes", "almost", "no"])).default({}),
});

/** POST → compute the lesson result on the server from stored attempts and save it (signed). */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const lesson = await getLesson(body.data.lessonId);
  if (!lesson) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try {
    const store = await recordsStore(user);
    const attempts = await store.attempts({ lessonId: lesson.id, version: lesson.version });
    // Only attempts of the current run: after the last saved result for this lesson.
    const last = (await store.results()).find((r) => r.lesson_id === lesson.id && r.lesson_version === lesson.version);
    const run = last ? attempts.filter((a) => a.created_at > last.completed_at) : attempts;
    const stageMs = Object.fromEntries(Object.entries(body.data.stageMs).filter(([k]) => lesson.stages.some((s) => s.id === k)));
    const session = sessionFromAttempts(lesson, run, { stageMs, selfAssessment: body.data.selfAssessment, startedAt: body.data.startedAt });
    const rep = lessonReport(lesson, session);
    const row = {
      lesson_id: lesson.id,
      lesson_version: lesson.version,
      started_at: body.data.startedAt ?? null,
      completed_at: new Date().toISOString(),
      graded: rep.graded,
      first_try: rep.firstTry,
      minutes: rep.minutesActual,
      stages: rep.stages.map((s) => ({ id: s.id, title: s.title, kind: s.kind, graded: s.graded, firstTry: s.firstTry, minutesActual: s.minutesActual, minutesPlanned: s.minutesPlanned })),
      self_assessment: body.data.selfAssessment,
      objective_status: rep.objectiveStatus,
      mistakes: rep.mistakes.map((m) => ({ key: m.key, prompt: m.prompt, yours: m.yours, correct: m.correct })).slice(0, 40),
    };
    await store.addResult(row);
    return NextResponse.json({ ok: true, result: row });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
