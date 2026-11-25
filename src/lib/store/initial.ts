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
  // v3: Russian interface, real data first (demo analytics off until the learner turns them on).
  const migrations = [...(persisted.migrations ?? [])];
  if (!migrations.includes("v3-ru-real-data")) {
    settings.interfaceLanguage = "ru";
    settings.samplePreview = false;
    migrations.push("v3-ru-real-data");
  }
  return {
    ...base,
    ...persisted,
    migrations,
    settings: {
      ...settings,
      notifications: { ...base.settings.notifications, ...(persisted.settings?.notifications ?? {}) },
    },
    schemaVersion: 1,
  };
}
