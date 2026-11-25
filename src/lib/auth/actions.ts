"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  DEMO_CREDENTIALS, getAuthMode, getSessionSecret, SESSION_COOKIE, SESSION_MAX_AGE, SESSION_SHORT_AGE,
} from "./config";
import { safeEqual, verifyPassword } from "./password";
import { signSession } from "./session";

export interface LoginState {
  error?: string;
  fieldErrors?: { username?: string; password?: string };
  values?: { username: string; remember: boolean };
}

/* Simple in-memory throttle: 5 failed attempts per 15 minutes per client+username. */
const attempts = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function throttleKey(ip: string, username: string) {
  return `${ip}|${username.toLowerCase()}`;
}

function isThrottled(key: string) {
  const a = attempts.get(key);
  if (!a) return false;
  if (Date.now() - a.first > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return a.count >= MAX_ATTEMPTS;
}

function recordFailure(key: string) {
  const a = attempts.get(key);
  if (!a || Date.now() - a.first > WINDOW_MS) attempts.set(key, { count: 1, first: Date.now() });
  else a.count++;
}

function safeNext(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard";
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";
  const next = safeNext(formData.get("next"));
  const values = { username, remember };

  const fieldErrors: LoginState["fieldErrors"] = {};
  if (!username) fieldErrors.username = "Enter your username or email.";
  if (!password) fieldErrors.password = "Enter your password.";
  else if (password.length < 6) fieldErrors.password = "Password must be at least 6 characters.";
  if (fieldErrors.username || fieldErrors.password) return { fieldErrors, values };

  const mode = getAuthMode();
  if (mode === "disabled") {
    return { error: "Sign-in is not configured on this server. See README → Authentication.", values };
  }

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = throttleKey(ip, username);
  if (isThrottled(key)) return { error: "Too many attempts. Please wait 15 minutes and try again.", values };

  if (mode === "supabase") {
    const { createSupabaseServerClient } = await import("@/lib/db/supabase/server");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email: username, password });
    if (error) {
      recordFailure(key);
      return { error: "Incorrect email or password.", values };
    }
    redirect(next);
  }

  let ok = false;
  if (mode === "local") {
    ok =
      safeEqual(username.toLowerCase(), process.env.LINGUA_AUTH_USERNAME!.toLowerCase()) &&
      (await verifyPassword(password, process.env.LINGUA_AUTH_PASSWORD_HASH!));
  } else {
    ok = safeEqual(username, DEMO_CREDENTIALS.username) && safeEqual(password, DEMO_CREDENTIALS.password);
  }

  if (!ok) {
    recordFailure(key);
    return { error: "Incorrect username or password.", values };
  }
  attempts.delete(key);

  const now = Math.floor(Date.now() / 1000);
  const ttl = remember ? SESSION_MAX_AGE : SESSION_SHORT_AGE;
  const token = await signSession(
    { sub: mode === "demo" ? "demo" : username, mode: mode as "local" | "demo", iat: now, exp: now + ttl },
    getSessionSecret(mode)!,
  );
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(remember ? { maxAge: SESSION_MAX_AGE } : {}),
  });
  redirect(next);
}

export async function logoutAction() {
  const mode = getAuthMode();
  if (mode === "supabase") {
    const { createSupabaseServerClient } = await import("@/lib/db/supabase/server");
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
