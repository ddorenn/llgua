/**
 * Authentication mode resolution. Evaluated on the server / in middleware only.
 *
 *  supabase — NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
 *  local    — single private account from env: LINGUA_AUTH_USERNAME,
 *             LINGUA_AUTH_PASSWORD_HASH (scrypt, see `npm run auth:hash`), LINGUA_SESSION_SECRET.
 *  demo     — nothing configured and NOT production (or LINGUA_ALLOW_DEMO=true).
 *             Clearly labelled, NOT secure. Fixed demo credentials.
 *  disabled — production without any configuration: sign-in is refused.
 */
export type AuthMode = "supabase" | "local" | "demo" | "disabled";

export const SESSION_COOKIE = "lingua_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days ("remember me")
export const SESSION_SHORT_AGE = 60 * 60 * 12; // 12 h token lifetime when not remembered (cookie is session-only)

export const DEMO_CREDENTIALS = { username: "demo", password: "lingua-demo" } as const;
/** Publicly known on purpose: demo sessions are not a security boundary. */
export const DEMO_SECRET = "lingua-demo-mode-insecure-secret-do-not-use-in-production";

export function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getAuthMode(): AuthMode {
  if (supabaseConfigured()) return "supabase";
  if (process.env.LINGUA_AUTH_USERNAME && process.env.LINGUA_AUTH_PASSWORD_HASH && process.env.LINGUA_SESSION_SECRET) {
    return "local";
  }
  if (process.env.NODE_ENV !== "production" || process.env.LINGUA_ALLOW_DEMO === "true") return "demo";
  return "disabled";
}

export function getSessionSecret(mode: AuthMode): string | null {
  if (mode === "local") return process.env.LINGUA_SESSION_SECRET ?? null;
  if (mode === "demo") return DEMO_SECRET;
  return null;
}
