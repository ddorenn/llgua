import { NextResponse } from "next/server";
import { loadLessons } from "@/lib/lessons/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET → number of valid lessons the server can read (checks that /content ships with the deployment). */
export async function GET() {
  const lessons = await loadLessons();
  return NextResponse.json({ lessons: lessons.length }, { headers: { "Cache-Control": "no-store" } });
}
