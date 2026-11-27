import { NextResponse } from "next/server";
import { CONSENT_VERSION, classifyContact, cleanUtm, ipHash, LeadSchema, saveLead } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-instance burst guard in addition to the database's per-IP hourly limit.
const recent = new Map<string, number[]>();

/**
 * POST (public) → early-access request. Minimal data (contact + optional name/level), explicit consent,
 * honeypot + minimum fill time + per-IP limits, UTM source. Always answers neutrally to bots.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 4000) return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });
  const parsed = LeadSchema.safeParse((() => { try { return JSON.parse(raw); } catch { return null; } })());
  if (!parsed.success) {
    const consentMissing = parsed.error.issues.some((i) => i.path[0] === "consent");
    return NextResponse.json({ ok: false, error: consentMissing ? "consent" : "invalid" }, { status: 400 });
  }
  const d = parsed.data;
  // Bots: pretend success, store nothing.
  if (d.website || d.elapsed < 2500) return NextResponse.json({ ok: true });
  const contact = classifyContact(d.contact);
  if (!contact) return NextResponse.json({ ok: false, error: "contact" }, { status: 400 });

  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
  const h = ipHash(ip);
  const now = Date.now();
  const list = (recent.get(h) ?? []).filter((t) => now - t < 60_000);
  if (list.length >= 3) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  recent.set(h, [...list, now]);

  const r = await saveLead({
    contact: contact.value,
    contactType: contact.type,
    name: d.name,
    level: d.level,
    consent: true,
    consentVersion: CONSENT_VERSION,
    utm: cleanUtm(d.utm),
    referrer: d.referrer.replace(/[?#].*$/, "").slice(0, 300),
    ipHash: h,
  });
  if (r === "rate_limited") return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  if (r === "error") return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
