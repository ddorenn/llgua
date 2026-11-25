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
  displayName: "Ученик",
  email: "",
  currentLevel: null,
  targetLevel: "C1",
  mainGoal: "Сбалансированное развитие всех навыков английского",
  focusSkills: ["grammar", "vocabulary", "reading", "listening", "speaking", "writing"],
  targetExam: "none",
  dailyMinutes: 60,
  teachingLanguage: "ru+en",
  interfaceLanguage: "ru",
  notifications: {
    dailyReminder: true,
    reminderTime: "19:00",
    homeworkDue: true,
    weeklyReport: true,
  },
  samplePreview: true,
};
