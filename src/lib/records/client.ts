"use client";

/**
 * Sends learning events to the server, which grades/stores them as the trusted record.
 * Fire-and-forget with a small persistent retry queue (offline-friendly).
 */
const KEY = "lingua:records-queue";
type Job = { url: string; body: unknown; tries: number };

function load(): Job[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
function save(q: Job[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(q.slice(-300)));
  } catch {
    /* ignore */
  }
}

let flushing = false;
async function flush() {
  if (flushing) return;
  flushing = true;
  try {
    let q = load();
    while (q.length) {
      const job = q[0];
      let ok = false;
      try {
        const res = await fetch(job.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(job.body), keepalive: true });
        ok = res.ok || (res.status >= 400 && res.status < 500); // 4xx will not succeed on retry
      } catch {
        ok = false;
      }
      q = load();
      if (ok || job.tries >= 5) q.shift();
      else {
        q[0] = { ...job, tries: job.tries + 1 };
        save(q);
        break;
      }
      save(q);
    }
  } finally {
    flushing = false;
  }
}

let last = { sig: "", at: 0 };
export function sendRecord(url: string, body: unknown) {
  if (typeof window === "undefined") return;
  // State updaters can run twice in development (StrictMode): drop an identical event within 2 s.
  const sig = url + JSON.stringify(body);
  if (sig === last.sig && Date.now() - last.at < 2000) return;
  last = { sig, at: Date.now() };
  save([...load(), { url, body, tries: 0 }]);
  void flush();
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => void flush());
  setTimeout(() => void flush(), 3000);
}

export async function completeLessonOnServer(body: unknown) {
  try {
    await flush();
    const res = await fetch("/api/lessons/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return res.ok;
  } catch {
    sendRecord("/api/lessons/complete", body);
    return false;
  }
}
