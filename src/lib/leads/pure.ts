/** Pure helpers for early-access leads (no server-only imports, so they are testable). */
export function classifyContact(raw: string): { type: "email" | "telegram"; value: string } | null {
  const v = raw.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return { type: "email", value: v.toLowerCase() };
  const tg = v.replace(/^https?:\/\/t\.me\//i, "").replace(/^@/, "");
  if (/^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(tg)) return { type: "telegram", value: `@${tg}` };
  return null;
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
export function cleanUtm(u: Record<string, string>) {
  return Object.fromEntries(Object.entries(u).filter(([k, v]) => UTM_KEYS.includes(k) && /^[\w.\-+ %]{1,120}$/.test(v)));
}

