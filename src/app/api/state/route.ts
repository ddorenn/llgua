import { NextResponse } from "next/server";
import { getAuthMode } from "@/lib/auth/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 1_500_000;

/**
 * Learner progress sync (Supabase mode only).
 * GET  → { state, version, updatedAt }   (state = null when nothing saved yet)
 * PUT  { state, baseVersion } → 200 { version, updatedAt }
 *                              409 { version, updatedAt, state }  (stale baseVersion — merge and retry)
 * All access goes through the signed-in user's Supabase session, so RLS applies.
 */
async function client() {
  if (getAuthMode() !== "supabase") return null;
  const { createSupabaseServerClient } = await import("@/lib/db/supabase/server");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user ? { supabase, user: data.user } : null;
}

export async function GET() {
  if (getAuthMode() !== "supabase") return NextResponse.json({ error: "sync_unavailable" }, { status: 404 });
  const c = await client();
  if (!c) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await c.supabase
    .from("learner_state")
    .select("state, version, updated_at")
    .eq("user_id", c.user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });

  return NextResponse.json(
    { state: data?.state ?? null, version: data?.version ?? 0, updatedAt: data?.updated_at ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(request: Request) {
  if (getAuthMode() !== "supabase") return NextResponse.json({ error: "sync_unavailable" }, { status: 404 });
  const c = await client();
  if (!c) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const raw = await request.text();
  if (raw.length > MAX_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });

  let body: { state?: unknown; baseVersion?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const state = body.state as { schemaVersion?: unknown } | null;
  const baseVersion = Number(body.baseVersion);
  if (!state || typeof state !== "object" || state.schemaVersion !== 1 || !Number.isInteger(baseVersion) || baseVersion < 0) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { data, error } = await c.supabase.rpc("save_learner_state", { p_state: state, p_base_version: baseVersion });
  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });

  const row = (Array.isArray(data) ? data[0] : data) as { ok: boolean; version: number; state: unknown; updated_at: string };
  if (!row) return NextResponse.json({ error: "db_error" }, { status: 500 });
  if (!row.ok) {
    return NextResponse.json({ version: row.version, updatedAt: row.updated_at, state: row.state }, { status: 409 });
  }
  return NextResponse.json({ version: row.version, updatedAt: row.updated_at });
}
