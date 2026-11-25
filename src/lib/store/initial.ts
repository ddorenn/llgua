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
  const settings = { ...base.settings, ...(persisted.settings ?? {}) };
  // Migrate defaults from the English-first version (never overwrite an explicit choice).
  if (!persisted.settings?.updatedAt) settings.interfaceLanguage = "ru";
  if (settings.mainGoal === "Balanced development of all English skills") settings.mainGoal = base.settings.mainGoal;
  if (settings.displayName === "Student") settings.displayName = base.settings.displayName;
  return {
    ...base,
    ...persisted,
    settings: {
      ...settings,
      notifications: { ...base.settings.notifications, ...(persisted.settings?.notifications ?? {}) },
    },
    schemaVersion: 1,
  };
}
