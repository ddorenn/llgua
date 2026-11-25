import { DEFAULT_SETTINGS } from "@/config/app";
import type { LinguaState } from "./types";

export function createInitialState(): LinguaState {
  return {
    schemaVersion: 1,
    settings: structuredClone(DEFAULT_SETTINGS),
    dailyPlans: {},
    lessons: {},
    vocabulary: {},
    homework: {},
    reading: {},
    listening: {},
    writing: {},
    speaking: {},
    assessments: [],
    tutor: {},
    activity: [],
  };
}

/** Merge persisted state over defaults so new fields added later get defaults. */
export function hydrate(persisted: Partial<LinguaState> | null): LinguaState {
  const base = createInitialState();
  if (!persisted) return base;
  return {
    ...base,
    ...persisted,
    settings: {
      ...base.settings,
      ...(persisted.settings ?? {}),
      notifications: { ...base.settings.notifications, ...(persisted.settings?.notifications ?? {}) },
    },
    schemaVersion: 1,
  };
}
