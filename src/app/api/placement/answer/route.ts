import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { AnswerSchema, answerPlacement } from "@/lib/placement/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { placementId, answer } → score the answer on the server (keys never reach the browser)
 * and return the next step, or the result when the diagnostic is finished.
 * 422 { error: "cyrillic" | "empty" | "bad_answer" } — the learner can fix and resend.
 * 409 { error, overview } — stale or duplicate submit; the client re-syncs from `overview`.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { placementId?: unknown; answer?: unknown } | null;
  const answer = AnswerSchema.safeParse(body?.answer);
  if (typeof body?.placementId !== "string" || !answer.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  try {
    const r = await answerPlacement(user, body.placementId, answer.data);
    if (r.ok) return NextResponse.json(r.overview, { headers: { "Cache-Control": "no-store" } });
    const status = r.error === "cyrillic" || r.error === "empty" || r.error === "bad_answer" ? 422 : r.error === "not_found" ? 404 : 409;
    return NextResponse.json({ error: r.error, overview: r.overview }, { status });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
