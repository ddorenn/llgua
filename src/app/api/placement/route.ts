import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { abandonPlacement, getOverview, IntakeSchema, startPlacement } from "@/lib/placement/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

/** GET → current diagnostic (in progress or latest completed) for the signed-in learner. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await getOverview(user), { headers: noStore });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}

/**
 * POST { action: "start", intake } → start a new diagnostic (an unfinished one is closed).
 * POST { action: "abandon", placementId } → stop the current attempt.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { action?: string; intake?: unknown; placementId?: unknown } | null;
  try {
    if (body?.action === "start") {
      const intake = IntakeSchema.safeParse(body.intake);
      if (!intake.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
      const r = await startPlacement(user, intake.data);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 409 });
      return NextResponse.json(r.overview, { headers: noStore });
    }
    if (body?.action === "abandon" && typeof body.placementId === "string") {
      return NextResponse.json(await abandonPlacement(user, body.placementId), { headers: noStore });
    }
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
