import "server-only";
import type { CurrentUser } from "@/lib/auth/server";
import { readLocalLeads } from "@/lib/leads";

/**
 * Owner / admin access. Supabase: membership in private.admins, checked inside every admin database
 * function (the server cannot bypass it). Local/demo mode: usernames in LINGUA_LOCAL_ADMINS
 * (default "demo" outside production) — data comes from local files.
 */
export async function isAdmin(user: CurrentUser): Promise<boolean> {
  if (user.mode === "supabase") {
    const { createSupabaseServerClient } = await import("@/lib/db/supabase/server");
    const db = await createSupabaseServerClient();
    const { data } = await db.rpc("lingua_is_admin");
    return data === true;
  }
  const list = (process.env.LINGUA_LOCAL_ADMINS ?? (process.env.NODE_ENV === "production" ? "" : "demo")).split(",").map((x) => x.trim()).filter(Boolean);
  return list.includes(user.name);
}

export interface AdminStats {
  leads_total: number;
  leads_7d: number;
  leads_by_source: Record<string, number>;
  leads_by_day: Record<string, number>;
  learners?: number;
  placements_completed?: number;
  lessons_completed?: number;
  pending_account_removals?: number;
  ai_cost_7d?: number;
  ai_requests_7d?: number;
}

export async function adminData(user: CurrentUser) {
  if (user.mode === "supabase") {
    const { createSupabaseServerClient } = await import("@/lib/db/supabase/server");
    const db = await createSupabaseServerClient();
    const [stats, leads, queue] = await Promise.all([db.rpc("lingua_admin_stats"), db.rpc("lingua_admin_leads", { p_limit: 50 }), db.rpc("lingua_admin_writing_queue")]);
    if (stats.error) throw new Error(stats.error.message);
    return { stats: stats.data as AdminStats, leads: (leads.data ?? []) as Record<string, unknown>[], queue: (queue.data ?? []) as Record<string, unknown>[] };
  }
  const leads = await readLocalLeads();
  const weekAgo = Date.now() - 7 * 86_400_000;
  const bySource: Record<string, number> = {};
  const byDay: Record<string, number> = {};
  for (const l of leads) {
    const src = l.utm.utm_source ?? "direct";
    bySource[src] = (bySource[src] ?? 0) + 1;
    const day = l.created_at.slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + 1;
  }
  return {
    stats: { leads_total: leads.length, leads_7d: leads.filter((l) => new Date(l.created_at).getTime() > weekAgo).length, leads_by_source: bySource, leads_by_day: byDay } as AdminStats,
    leads: leads.slice(-50).reverse().map((l) => ({ contact: l.contact, contact_type: l.contactType, name: l.name, level: l.level, utm: l.utm, referrer: l.referrer, created_at: l.created_at })),
    queue: [] as Record<string, unknown>[],
  };
}

export async function reviewWriting(user: CurrentUser, placementId: string, evaluation: { level: string; comment?: string }) {
  if (user.mode !== "supabase") throw new Error("expert review needs the database");
  const { createSupabaseServerClient } = await import("@/lib/db/supabase/server");
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("lingua_admin_review_writing", { p_placement: placementId, p_evaluation: evaluation });
  if (error) throw new Error(error.message);
}
