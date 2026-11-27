import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/server";
import { recordsStore } from "@/lib/records/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ itemId: z.string().min(1).max(200), kind: z.enum(["word", "error"]), ok: z.boolean() });

/** POST → log one review answer (append-only, signed) for retention statistics. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  try {
    await (await recordsStore(user)).addSrsEvent({ item_id: body.data.itemId, kind: body.data.kind, ok: body.data.ok });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
