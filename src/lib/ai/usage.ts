import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { CurrentUser } from "@/lib/auth/server";
import { serverWrite } from "@/lib/db/signed";
import { AI_LIMITS } from "./config";

/**
 * AI usage accounting (13 §14 AIUsageRecord) and limits (16 §5).
 * Supabase: table ai_usage — learners can read their rows, writes are server-signed, so a learner
 * cannot erase their usage to bypass limits. Local/demo: a JSON file per user.
 */
export interface UsageRecord {
  mode: string;
  task: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  ok: boolean;
  errorCode?: string;
}

interface Row {
  at: string;
  cost: number;
}

async function rows(user: CurrentUser, sinceMs: number): Promise<Row[]> {
  const since = new Date(Date.now() - sinceMs).toISOString();
  if (user.mode === "supabase") {
    const { createSupabaseServerClient } = await import("@/lib/db/supabase/server");
    const db = await createSupabaseServerClient();
    const { data, error } = await db.from("ai_usage").select("at,cost_usd").eq("user_id", user.id).gte("at", since).limit(2000);
    if (error) throw new Error(`ai usage read: ${error.message}`);
    return (data ?? []).map((r) => ({ at: r.at as string, cost: Number(r.cost_usd) }));
  }
  const list = await readFile(user);
  return list.filter((r) => r.at >= since).map((r) => ({ at: r.at, cost: r.costUsd }));
}

function filePath(user: CurrentUser) {
  const dir = process.env.LINGUA_DATA_DIR || (process.env.VERCEL ? "/tmp/lingua-data" : path.join(process.cwd(), ".data"));
  return path.join(dir, "ai-usage", `${Buffer.from(user.id).toString("base64url")}.json`);
}
async function readFile(user: CurrentUser): Promise<(UsageRecord & { at: string })[]> {
  try {
    return JSON.parse(await fs.readFile(filePath(user), "utf8"));
  } catch {
    return [];
  }
}

export async function recordUsage(user: CurrentUser, rec: UsageRecord): Promise<void> {
  try {
    if (user.mode === "supabase") {
      const { createSupabaseServerClient } = await import("@/lib/db/supabase/server");
      const db = await createSupabaseServerClient();
      await serverWrite(db, user.id, "ai.usage", { ...rec, costUsd: Number(rec.costUsd.toFixed(6)), errorCode: rec.errorCode ?? null });
      return;
    }
    const list = await readFile(user);
    list.push({ ...rec, at: new Date().toISOString() });
    const f = filePath(user);
    await fs.mkdir(path.dirname(f), { recursive: true });
    await fs.writeFile(f, JSON.stringify(list.slice(-5000)));
  } catch (e) {
    // Accounting must never break the lesson; log for the operator.
    console.error("[ai] usage record failed", (e as Error).message);
  }
}

export interface LimitCheck {
  ok: boolean;
  reason?: "per_minute" | "per_day" | "cost";
  requests24h: number;
  cost24h: number;
}

export async function checkLimits(user: CurrentUser): Promise<LimitCheck> {
  const day = await rows(user, 86_400_000);
  const minuteAgo = new Date(Date.now() - 60_000).toISOString();
  const lastMinute = day.filter((r) => r.at >= minuteAgo).length;
  const cost = day.reduce((s, r) => s + r.cost, 0);
  const base = { requests24h: day.length, cost24h: cost };
  if (lastMinute >= AI_LIMITS.perMinuteRequests) return { ok: false, reason: "per_minute", ...base };
  if (day.length >= AI_LIMITS.perDayRequests) return { ok: false, reason: "per_day", ...base };
  if (cost >= AI_LIMITS.perDayCostUsd) return { ok: false, reason: "cost", ...base };
  return { ok: true, ...base };
}
