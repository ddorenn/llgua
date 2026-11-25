/**
 * Persistence adapter for learner state.
 *
 * v1 ships a LocalStorageAdapter (works offline, no credentials needed).
 * A SupabaseAdapter can implement the same interface by mapping each slice of
 * LinguaState to the tables in supabase/migrations (see docs/ARCHITECTURE.md).
 */
import type { LinguaState } from "@/lib/store/types";

export interface StateAdapter {
  readonly id: "local" | "supabase";
  load(): Promise<Partial<LinguaState> | null>;
  save(state: LinguaState): Promise<void>;
  clear(): Promise<void>;
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

  async save(state: LinguaState) {
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
}
