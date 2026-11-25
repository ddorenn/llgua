/**
 * Persistence adapters for learner state.
 *  - LocalStorageAdapter: browser only (demo / private-account modes).
 *  - RemoteStateAdapter (./remote-adapter.ts): Supabase sync with an offline browser cache.
 */
import type { LinguaState } from "@/lib/store/types";

export type SyncStatus = "local" | "loading" | "saving" | "synced" | "offline" | "error";

export interface StateAdapter {
  readonly id: "local" | "supabase";
  load(): Promise<Partial<LinguaState> | null>;
  save(state: LinguaState): void;
  clear(): Promise<void>;
  /** Called when a newer copy arrives from another device. Returns an unsubscribe fn. */
  onRemoteState?(cb: (state: LinguaState) => void): () => void;
  onStatus?(cb: (status: SyncStatus) => void): () => void;
  /** Start background listeners (focus, network). Returns a detach function. */
  attach?(): () => void;
  dispose?(): void;
}

export class LocalStorageAdapter implements StateAdapter {
  readonly id = "local" as const;
  constructor(private key: string) {}

  async load() {
    try {
      const raw = window.localStorage.getItem(this.key);
      return raw ? (JSON.parse(raw) as Partial<LinguaState>) : null;
    } catch {
      return null;
    }
  }

  save(state: LinguaState) {
    try {
      window.localStorage.setItem(this.key, JSON.stringify(state));
    } catch {
      /* storage full or blocked — state stays in memory for this session */
    }
  }

  async clear() {
    try {
      window.localStorage.removeItem(this.key);
    } catch {
      /* ignore */
    }
  }

  onStatus(cb: (s: SyncStatus) => void) {
    cb("local");
    return () => {};
  }
}
