import "server-only";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { getAuthMode } from "@/lib/auth/config";
import { signAnonymous, signingEnabled } from "@/lib/db/signed";

/** Version of the consent text shown next to the form (stored with every lead). */
export const CONSENT_VERSION = "2026-11-27";

export const LeadSchema = z.object({
  contact: z.string().trim().min(3).max(200),
  name: z.string().trim().max(80).optional().default(""),
  level: z.enum(["", "zero", "beginner", "intermediate", "advanced"]).optional().default(""),
  consent: z.literal(true),
  utm: z.record(z.string().max(40), z.string().max(120)).optional().default({}),
  referrer: z.string().max(300).optional().default(""),
  /** Honeypot: humans never fill it. */
  website: z.string().max(200).optional().default(""),
  /** ms since the form was shown (bots submit instantly). */
  elapsed: z.number().int().min(0).max(86_400_000),
});

export { classifyContact, cleanUtm } from "./pure";

export function ipHash(ip: string) {
  // Salted with the server secret when present, so stored hashes cannot be reversed by brute force.
  return createHash("sha256").update(`${process.env.LINGUA_SIGNING_SECRET ?? "lingua"}:${ip}`).digest("hex").slice(0, 32);
}

export interface LeadRecord {
  contact: string;
  contactType: "email" | "telegram";
  name: string;
  level: string;
  consent: true;
  consentVersion: string;
  utm: Record<string, string>;
  referrer: string;
  ipHash: string;
}

function leadsFile() {
  const dir = process.env.LINGUA_DATA_DIR || (process.env.VERCEL ? "/tmp/lingua-data" : path.join(process.cwd(), ".data"));
  return path.join(dir, "leads.json");
}
export async function readLocalLeads(): Promise<(LeadRecord & { created_at: string })[]> {
  try {
    return JSON.parse(await fs.readFile(leadsFile(), "utf8"));
  } catch {
    return [];
  }
}

export async function saveLead(lead: LeadRecord): Promise<"ok" | "rate_limited" | "error"> {
  if (getAuthMode() === "supabase") {
    if (!signingEnabled()) return "error";
    const { createSupabaseServerClient } = await import("@/lib/db/supabase/server");
    const db = await createSupabaseServerClient();
    const { payload, sig } = signAnonymous("lead.submit", { ...lead });
    const { data, error } = await db.rpc("lingua_lead_submit", { p_payload: payload, p_sig: sig });
    if (error) {
      console.error("[leads]", error.message);
      return "error";
    }
    return (data as { ok?: boolean })?.ok ? "ok" : "rate_limited";
  }
  const list = await readLocalLeads();
  if (list.filter((l) => l.ipHash === lead.ipHash && Date.now() - new Date(l.created_at).getTime() < 3_600_000).length >= 3) return "rate_limited";
  if (!list.some((l) => l.contact.toLowerCase() === lead.contact.toLowerCase())) list.push({ ...lead, created_at: new Date().toISOString() });
  await fs.mkdir(path.dirname(leadsFile()), { recursive: true });
  await fs.writeFile(leadsFile(), JSON.stringify(list));
  return "ok";
}
