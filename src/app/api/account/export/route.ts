import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth/server";
import { readRecordsFile } from "@/lib/records/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET → all of the learner's data as one JSON file (13 §14 DataExport). Only the learner's own rows (RLS). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const out: Record<string, unknown> = { exportedAt: new Date().toISOString(), format: "lingua-export-1", account: { username: user.name, mode: user.mode } };
  try {
    if (user.mode === "supabase") {
      const { createSupabaseServerClient } = await import("@/lib/db/supabase/server");
      const db = await createSupabaseServerClient();
      const tables: [string, string, string][] = [
        ["profile", "profiles", "id"],
        ["learnerState", "learner_state", "user_id"],
        ["placements", "placements", "user_id"],
        ["placementResponses", "placement_responses", "user_id"],
        ["placementFeedback", "placement_feedback", "user_id"],
        ["consents", "learner_consents", "user_id"],
        ["lessonAttempts", "lesson_attempts", "user_id"],
        ["lessonResults", "lesson_results", "user_id"],
        ["reviewEvents", "srs_events", "user_id"],
        ["aiUsage", "ai_usage", "user_id"],
        ["deletionRequests", "deletion_requests", "user_id"],
      ];
      for (const [key, table, col] of tables) {
        const { data, error } = await db.from(table).select("*").eq(col, user.id).limit(20000);
        out[key] = error ? { error: "unavailable" } : data;
      }
      const { data: reviews } = await db.from("expert_reviews").select("placement_id,evaluation,created_at").limit(1000);
      out.expertReviews = reviews ?? [];
    } else {
      const dir = process.env.LINGUA_DATA_DIR || (process.env.VERCEL ? "/tmp/lingua-data" : path.join(process.cwd(), ".data"));
      const safe = Buffer.from(user.id).toString("base64url");
      const read = async (p: string) => {
        try {
          return JSON.parse(await fs.readFile(path.join(dir, p, `${safe}.json`), "utf8"));
        } catch {
          return null;
        }
      };
      out.placements = await read("placement");
      out.records = await readRecordsFile(user.id);
      out.aiUsage = await read("ai-usage");
      out.note = "Локальный режим: прогресс приложения хранится в этом браузере и добавляется в файл на стороне клиента.";
    }
    return new NextResponse(JSON.stringify(out, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="lingua-export-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "export_failed" }, { status: 500 });
  }
}
