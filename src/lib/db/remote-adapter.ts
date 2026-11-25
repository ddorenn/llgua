"use client";

/**
 * Supabase-backed learner state with an offline browser cache.
 *
 * - Every change is written to localStorage immediately (works offline), then pushed to
 *   /api/state after a short debounce.
 * - Saves use optimistic concurrency (version numbers). If another device saved first,
 *   the server returns its copy, we merge (nothing earned is lost) and retry.
 * - When the tab becomes visible again we pull the latest server copy.
 * - Unsynced local changes survive reloads and are pushed on the next load.
 */
import { mergeStates } from "@/lib/store/merge";
import type { LinguaState } from "@/lib/store/types";
import type { StateAdapter, SyncStatus } from "./adapter";

interface CacheEntry {
  state: LinguaState;
  version: number;
  dirty: boolean;
}

const DEBOUNCE_MS = 1200;
const RETRY_MS = 15_000;

export class RemoteStateAdapter implements StateAdapter {
  readonly id = "supabase" as const;
  private version = 0;
  private latest: LinguaState | null = null;
  private dirty = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private inflight: Promise<void> | null = null;
  private status: SyncStatus = "loading";
  private statusCbs = new Set<(s: SyncStatus) => void>();
  private remoteCbs = new Set<(s: LinguaState) => void>();

  constructor(private cacheKey: string) {}

  /** Start listening for tab focus / network changes. Returns a detach function. */
  attach(): () => void {
    const onVisible = () => {
      if (document.visibilityState === "visible") void this.refresh();
      else void this.flush(true);
    };
    const onOnline = () => void this.flush();
    const onHide = () => void this.flush(true);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pagehide", onHide);
    };
  }

  /* ---------- status ---------- */
  private setStatus(s: SyncStatus) {
    this.status = s;
    this.statusCbs.forEach((cb) => cb(s));
  }
  onStatus(cb: (s: SyncStatus) => void) {
    this.statusCbs.add(cb);
    cb(this.status);
    return () => void this.statusCbs.delete(cb);
  }
  onRemoteState(cb: (s: LinguaState) => void) {
    this.remoteCbs.add(cb);
    return () => void this.remoteCbs.delete(cb);
  }
  private emitRemote(s: LinguaState) {
    this.remoteCbs.forEach((cb) => cb(s));
  }

  /* ---------- cache ---------- */
  private readCache(): CacheEntry | null {
    try {
      const raw = localStorage.getItem(this.cacheKey);
      return raw ? (JSON.parse(raw) as CacheEntry) : null;
    } catch {
      return null;
    }
  }
  private writeCache() {
    if (!this.latest) return;
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify({ state: this.latest, version: this.version, dirty: this.dirty }));
    } catch {
      /* storage full / blocked — the server copy is still the source of truth */
    }
  }

  /* ---------- server ---------- */
  private async fetchServer(): Promise<{ state: LinguaState | null; version: number } | "unauthorized"> {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (res.status === 401) return "unauthorized";
    if (!res.ok) throw new Error(`load ${res.status}`);
    return res.json();
  }

  async load(): Promise<Partial<LinguaState> | null> {
    const cache = this.readCache();
    try {
      const server = await this.fetchServer();
      if (server === "unauthorized") {
        this.setStatus("error");
        return cache?.state ?? null;
      }
      this.version = server.version;

      if (!server.state) {
        // First sync for this account: upload whatever this browser already has.
        if (cache?.state) {
          this.latest = cache.state;
          this.dirty = true;
          this.writeCache();
          void this.flush();
          return cache.state;
        }
        this.setStatus("synced");
        return null;
      }

      if (cache?.dirty && cache.state) {
        // Unsynced local edits from an earlier session.
        this.latest = cache.version === server.version ? cache.state : mergeStates(server.state, cache.state);
        this.dirty = true;
        this.writeCache();
        void this.flush();
        return this.latest;
      }

      this.latest = server.state;
      this.dirty = false;
      this.writeCache();
      this.setStatus("synced");
      return server.state;
    } catch {
      this.setStatus("offline");
      if (cache) {
        this.version = cache.version;
        this.latest = cache.state;
        this.dirty = cache.dirty;
      }
      this.scheduleRetry();
      return cache?.state ?? null;
    }
  }

  save(state: LinguaState) {
    this.latest = state;
    this.dirty = true;
    this.writeCache();
    if (this.status !== "offline") this.setStatus("saving");
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), DEBOUNCE_MS);
  }

  private scheduleRetry() {
    if (this.retryTimer) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void (this.dirty ? this.flush() : this.refresh());
    }, RETRY_MS);
  }

  /** Push pending changes. `leaving` uses keepalive so it can finish while the page closes. */
  async flush(leaving = false): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.dirty || !this.latest) return;
    if (this.inflight) {
      await this.inflight;
      if (this.dirty) return this.flush(leaving);
      return;
    }
    this.inflight = this.push(leaving).finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async push(leaving: boolean, attempt = 0): Promise<void> {
    const snapshot = this.latest!;
    const body = JSON.stringify({ state: snapshot, baseVersion: this.version });
    let res: Response;
    try {
      res = await fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: leaving && body.length < 60_000,
      });
    } catch {
      this.setStatus("offline");
      this.scheduleRetry();
      return;
    }

    if (res.ok) {
      const { version } = (await res.json()) as { version: number };
      this.version = version;
      // Only clear the dirty flag if nothing changed while the request was in flight.
      if (this.latest === snapshot) this.dirty = false;
      this.writeCache();
      this.setStatus(this.dirty ? "saving" : "synced");
      if (this.dirty) this.timer = setTimeout(() => void this.flush(), DEBOUNCE_MS);
      return;
    }

    if (res.status === 409 && attempt < 3) {
      // Another device saved first: merge both copies and try again.
      const server = (await res.json()) as { version: number; state: LinguaState };
      this.version = server.version;
      const merged = mergeStates(server.state, this.latest!);
      this.latest = merged;
      this.writeCache();
      this.emitRemote(merged);
      return this.push(leaving, attempt + 1);
    }

    this.setStatus(res.status === 401 ? "error" : "offline");
    this.scheduleRetry();
  }

  /** Pull a newer server copy (e.g. after using another device). */
  async refresh(): Promise<void> {
    if (this.dirty || this.inflight) {
      await this.flush();
      return;
    }
    try {
      const server = await this.fetchServer();
      if (server === "unauthorized") return this.setStatus("error");
      if (server.state && server.version > this.version && !this.dirty) {
        this.version = server.version;
        this.latest = server.state;
        this.writeCache();
        this.emitRemote(server.state);
      }
      this.setStatus("synced");
    } catch {
      this.setStatus("offline");
      this.scheduleRetry();
    }
  }

  async clear() {
    try {
      localStorage.removeItem(this.cacheKey);
    } catch {
      /* ignore */
    }
  }

  dispose() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    void this.flush(true);
  }
}
