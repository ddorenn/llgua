import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { getAuthMode } from "@/lib/auth/config";
import { vocabularyFile } from "@/lib/content";
import type { UserVocab } from "@/lib/store/types";
import { toCard } from "@/lib/vocab";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/vocabulary — words + the signed-in learner's progress, as cards.
 * Designed for other clients (e.g. a Telegram Mini App) as well as the web app.
 *
 * Response: { meta: { sample, count }, cards: VocabCard[] }
 * Progress is read from Supabase (learner_state) in Supabase mode; otherwise it lives only in the
 * browser, so cards come back with "new" status.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let progress: Record<string, UserVocab> = {};
  if (getAuthMode() === "supabase") {
    const { createSupabaseServerClient } = await import("@/lib/db/supabase/server");
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("learner_state").select("state").eq("user_id", user.id).maybeSingle();
    progress = (data?.state as { vocabulary?: Record<string, UserVocab> } | null)?.vocabulary ?? {};
  }

  const cards = vocabularyFile.words.map((w) => toCard(w, progress[w.id]));
  return NextResponse.json(
    { meta: { sample: vocabularyFile.meta.sample, count: cards.length, progressSource: getAuthMode() === "supabase" ? "account" : "none" }, cards },
    { headers: { "Cache-Control": "no-store" } },
  );
}
