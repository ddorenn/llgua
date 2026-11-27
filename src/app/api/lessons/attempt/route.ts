import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/server";
import { gradeByKey } from "@/lib/lessons/engine";
import { getLesson } from "@/lib/lessons/registry";
import { recordsStore } from "@/lib/records/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  lessonId: z.string().max(80),
  key: z.string().max(160),
  answer: z.object({ choice: z.number().int().min(0).max(20).optional(), text: z.string().max(500).optional(), wrong: z.number().int().min(0).max(100).optional() }),
  ms: z.number().min(0).max(3_600_000).default(0),
});

/**
 * POST → grade one lesson answer on the server from the lesson content and store it (append-only, signed).
 * The learner's statistics are built only from these records, never from client-reported results.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const lesson = await getLesson(body.data.lessonId);
  if (!lesson) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const graded = gradeByKey(lesson, body.data.key, body.data.answer);
  if (!graded) return NextResponse.json({ ok: false, recorded: false, reason: "not_gradable" });
  try {
    const store = await recordsStore(user);
    const prev = await store.attempts({ lessonId: lesson.id, version: lesson.version });
    const tryNo = prev.filter((a) => a.item_key === body.data.key).length + 1;
    if (tryNo > 5) return NextResponse.json({ ok: graded.ok, recorded: false, reason: "too_many_tries" });
    await store.addAttempt({ lesson_id: lesson.id, lesson_version: lesson.version, item_key: body.data.key, skill: graded.skill, try_no: tryNo, ok: graded.ok, answer: graded.answer.slice(0, 500), ms: Math.round(body.data.ms) });
    return NextResponse.json({ ok: graded.ok, recorded: true, tryNo });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
