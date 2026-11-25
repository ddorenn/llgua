import "server-only";
import { cookies } from "next/headers";
import { getAuthMode, getSessionSecret, SESSION_COOKIE, type AuthMode } from "./config";
import { verifySession } from "./session";

export interface CurrentUser {
  id: string;
  name: string;
  mode: AuthMode;
  /** Name from the learner's profile (Supabase), if set. */
  displayName?: string;
}

/** Resolve the signed-in user for the current request, or null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const mode = getAuthMode();
  if (mode === "disabled") return null;

  if (mode === "supabase") {
    const { createSupabaseServerClient } = await import("@/lib/db/supabase/server");
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", data.user.id).maybeSingle();
    const username = data.user.email?.endsWith("@lingua.local") ? data.user.email.split("@")[0] : data.user.email;
    return { id: data.user.id, name: username ?? "Student", mode, displayName: profile?.display_name ?? undefined };
  }

  const secret = getSessionSecret(mode);
  if (!secret) return null;
  const store = await cookies();
  const payload = await verifySession(store.get(SESSION_COOKIE)?.value, secret);
  if (!payload || payload.mode !== mode) return null;
  return { id: payload.sub, name: payload.sub, mode };
}
