import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { buildReport } from "@/lib/analytics/report";
import { loadLessons } from "@/lib/lessons/registry";
import { placementStore } from "@/lib/placement/store";
import { recordsStore } from "@/lib/records/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET → weekly report + analytics for the signed-in learner, computed on the server from stored records. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const now = new Date();
    const since = new Date(now.getTime() - 60 * 86_400_000).toISOString();
    const [records, pstore, lessons] = await Promise.all([recordsStore(user), placementStore(user), loadLessons()]);
    const [attempts, results, srs, history] = await Promise.all([records.attempts({ since }), records.results(), records.srsEvents(since), pstore.history()]);
    const titles = new Map(lessons.map((l) => [l.id, l.title]));
    const report = buildReport({
      now,
      attempts,
      results,
      srs,
      placements: history.map((p) => ({ id: p.id, completedAt: p.completedAt, result: p.result })),
      lessonTitle: (id) => titles.get(id) ?? id,
      pacePerWeek: history[0]?.intake.pace ?? null,
    });
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
