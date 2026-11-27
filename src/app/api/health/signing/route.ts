import { NextResponse } from "next/server";
import { getAuthMode } from "@/lib/auth/config";
import { signingEnabled, signPayload } from "@/lib/db/signed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET → { mode, signing: "off" | "ok" | "mismatch" | "error" }.
 * Checks that the server's LINGUA_SIGNING_SECRET matches the database copy by signing a
 * throwaway nonce. Reveals nothing about the secret itself.
 */
export async function GET() {
  const mode = getAuthMode();
  if (mode !== "supabase") return NextResponse.json({ mode, signing: "off" });
  if (!signingEnabled()) return NextResponse.json({ mode, signing: "off" });
  try {
    const { createSupabaseServerClient } = await import("@/lib/db/supabase/server");
    const db = await createSupabaseServerClient();
    const payload = `ping:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const { data, error } = await db.rpc("lingua_signing_check", { p_payload: payload, p_sig: signPayload(payload) });
    if (error) return NextResponse.json({ mode, signing: "error" }, { status: 500 });
    return NextResponse.json({ mode, signing: data === true ? "ok" : "mismatch" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ mode, signing: "error" }, { status: 500 });
  }
}
