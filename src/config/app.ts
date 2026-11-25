/**
 * Application-level configuration. Personal defaults live here (not in components).
 */
import type { Settings } from "@/lib/store/types";

export const APP = {
  name: "LINGUA",
  tagline: "Your Personal AI English Tutor",
  storageKey: "lingua:state:v1",
} as const;

export const DEFAULT_SETTINGS: Settings = {
  displayName: "Student",
  email: "",
  currentLevel: null,
  targetLevel: "C1",
  mainGoal: "Balanced development of all English skills",
  focusSkills: ["grammar", "vocabulary", "reading", "listening", "speaking", "writing"],
  targetExam: "none",
  dailyMinutes: 60,
  teachingLanguage: "ru+en",
  interfaceLanguage: "en",
  notifications: {
    dailyReminder: true,
    reminderTime: "19:00",
    homeworkDue: true,
    weeklyReport: true,
  },
  samplePreview: true,
};
