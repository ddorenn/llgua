import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/server";
import { signedWrite2 } from "@/lib/db/signed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ scope: z.enum(["all", "texts", "voice"]), confirm: z.literal("УДАЛИТЬ") });

/**
 * POST { scope, confirm: "УДАЛИТЬ" } → delete the learner's data (13 §14 DeletionRequest).
 * all: diagnostics, lesson records, review events, AI usage, consents, synced progress (the login itself
 * is removed by the administrator — status "account_removal_pending"); texts: writing texts redacted;
 * voice: no recordings are stored, the request is logged.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  try {
    if (user.mode === "supabase") {
      const { createSupabaseServerClient } = await import("@/lib/db/supabase/server");
      const db = await createSupabaseServerClient();
      const r = await signedWrite2(db, user.id, "account.delete", { scope: body.data.scope });
      return NextResponse.json({ ok: true, scope: body.data.scope, log: r.log, accountRemoval: body.data.scope === "all" ? "pending" : null });
    }
    const dir = process.env.LINGUA_DATA_DIR || (process.env.VERCEL ? "/tmp/lingua-data" : path.join(process.cwd(), ".data"));
    const safe = Buffer.from(user.id).toString("base64url");
    if (body.data.scope === "all") for (const sub of ["placement", "records", "ai-usage"]) await fs.rm(path.join(dir, sub, `${safe}.json`), { force: true });
    return NextResponse.json({ ok: true, scope: body.data.scope, log: {}, accountRemoval: null });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
}
