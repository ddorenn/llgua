import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/server";
import { isAdmin, reviewWriting } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ placementId: z.string().uuid(), level: z.enum(["below A1", "A1", "A2", "B1", "B2", "above B2"]), comment: z.string().max(600).optional() });

/** POST (admin) → confirmed expert evaluation of a placement writing text (separate from the AI estimate). */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await isAdmin(user))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  try {
    await reviewWriting(user, body.data.placementId, { level: body.data.level, comment: body.data.comment });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
