import "server-only";
import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Tamper-proof writes. Learners can read their rows, but every write goes through the
 * `lingua_write` database function with a payload signed by this server (HMAC-SHA256).
 * The secret (LINGUA_SIGNING_SECRET) exists only on the server and inside the database,
 * so a learner's own session cannot forge or replay changes to their results.
 */
export class SignedWriteError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

/** The configured secret, tolerant of stray whitespace or quotes from copy-paste. */
function rawSecret(): string {
  return (process.env.LINGUA_SIGNING_SECRET ?? "").trim().replace(/^["']|["']$/g, "").trim();
}

export function signingSecret(): string {
  const s = rawSecret();
  if (!s || s.length < 32) throw new SignedWriteError("LINGUA_SIGNING_SECRET is not configured", "not_configured");
  return s;
}

export function signPayload(payload: string, secret = signingSecret()): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

/** Run one signed operation; returns the number of affected rows. */
export async function signedWrite(db: SupabaseClient, uid: string, op: string, d: Record<string, unknown>): Promise<number> {
  const payload = JSON.stringify({ op, uid, exp: Math.floor(Date.now() / 1000) + 120, d });
  const { data, error } = await db.rpc("lingua_write", { p_payload: payload, p_sig: signPayload(payload) });
  if (error) throw new SignedWriteError(`${op}: ${error.message}`, error.code);
  return Number((data as { n?: number } | null)?.n ?? 0);
}

export const signingEnabled = () => rawSecret().length >= 32;

/**
 * Transitional fallback while LINGUA_SIGNING_SECRET is not configured on the server:
 * the same operations as `lingua_write`, executed directly under RLS. Once the secret is set
 * and 20261127000100_close_direct_writes.sql is applied, this path is no longer used (and would be refused).
 */
async function directWrite(db: SupabaseClient, uid: string, op: string, d: Record<string, unknown>): Promise<number> {
  const s = (k: string) => d[k] as string;
  const check = (error: { message: string; code?: string } | null) => {
    if (error) throw new SignedWriteError(`${op}: ${error.message}`, error.code);
  };
  switch (op) {
    case "placement.create": {
      const { error } = await db.from("placements").insert({
        id: s("id"), user_id: uid, status: "in_progress", mode: s("mode"), config_version: s("configVersion"), bank_version: s("bankVersion"),
        intake: d.intake, state: d.state, parent_id: s("parentId") || null,
      });
      check(error);
      return 1;
    }
    case "placement.save": {
      const { data, error } = await db
        .from("placements")
        .update({ state: d.state, result: d.result, seq: d.seq, status: s("status"), completed_at: s("completedAt") || null, updated_at: new Date().toISOString() })
        .eq("id", s("id")).eq("user_id", uid).eq("seq", d.expectedSeq as number)
        .select("id");
      check(error);
      return data?.length ?? 0;
    }
    case "placement.status":
    case "placement.result": {
      const patch = op === "placement.status" ? { status: s("status") } : { result: d.result };
      let q = db.from("placements").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", s("id")).eq("user_id", uid);
      if (op === "placement.result") q = q.eq("status", "completed");
      const { data, error } = await q.select("id");
      check(error);
      return data?.length ?? 0;
    }
    case "placement.response": {
      const { error } = await db.from("placement_responses").insert({
        placement_id: s("placementId"), user_id: uid, item_id: s("itemId"), item_version: s("itemVersion"), seq: d.seq, section: s("section"),
        band: d.band === "" ? null : d.band, response: d.response, correct: d.correct, ms: d.ms, suspect_guess: d.suspectGuess,
      });
      if (error?.code === "23505") return 0;
      check(error);
      return 1;
    }
    case "placement.feedback": {
      const { error } = await db.from("placement_feedback").insert({ placement_id: s("placementId"), user_id: uid, direction: s("direction"), comment: s("comment") });
      check(error);
      return 1;
    }
    case "consent.set": {
      const { error } = await db.from("learner_consents").upsert({ user_id: uid, kind: s("kind"), granted: d.granted, decided_at: new Date().toISOString() });
      check(error);
      return 1;
    }
    case "ai.usage": {
      const { error } = await db.from("ai_usage").insert({
        user_id: uid, mode: s("mode"), task: s("task"), provider: s("provider"), model: s("model"), input_tokens: d.inputTokens, output_tokens: d.outputTokens,
        cost_usd: d.costUsd, ok: d.ok, error_code: d.errorCode ?? null,
      });
      check(error);
      return 1;
    }
    default:
      throw new SignedWriteError(`unknown op ${op}`);
  }
}

/** Write through the signed database function when signing is configured; otherwise the transitional direct path. */
export async function serverWrite(db: SupabaseClient, uid: string, op: string, d: Record<string, unknown>): Promise<number> {
  return signingEnabled() ? signedWrite(db, uid, op, d) : directWrite(db, uid, op, d);
}
