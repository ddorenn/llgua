import type { Cefr, Skill } from "@/lib/content";
import type { Locale } from "@/lib/i18n";

/**
 * Client-side learner state. Each slice maps to a future Supabase table
 * (see supabase/migrations and docs/ARCHITECTURE.md → "State → table mapping").
 */

export type VocabStatus = "new" | "learning" | "review" | "learned";
export type TeachingLanguage = "ru+en" | "en";
export type TargetExam = "none" | "ielts" | "toefl";

export interface Settings {
  displayName: string;
  email: string;
  /** Self-reported level until a validated assessment exists. null = not set. */
  currentLevel: Cefr | null;
  targetLevel: Cefr;
  mainGoal: string;
  focusSkills: Skill[];
  targetExam: TargetExam;
  dailyMinutes: number;
  teachingLanguage: TeachingLanguage;
  interfaceLanguage: Locale;
  notifications: {
    dailyReminder: boolean;
    reminderTime: string;
    homeworkDue: boolean;
    weeklyReport: boolean;
  };
  /** When true the UI shows clearly labelled demonstration analytics. */
  samplePreview: boolean;
  /** Set on every settings change; used to resolve conflicts between devices. */
  updatedAt?: string;
}

export interface DailyPlanDay {
  completed: string[];
}

export interface LessonProgress {
  status: "in_progress" | "completed";
  score?: number;
  total?: number;
  updatedAt: string;
}

export interface UserVocab {
  status: VocabStatus;
  reviews: number;
  correct: number;
  lastReviewed?: string;
}

export interface HomeworkSubmission {
  text: string;
  submittedAt: string;
  status: "submitted" | "reviewed";
}

export interface PracticeResult {
  answers: Record<string, number | boolean>;
  score: number;
  total: number;
  completedAt: string;
}

export interface WritingEntry {
  draft: string;
  submittedText?: string;
  submittedAt?: string;
  updatedAt: string;
}

export interface SpeakingEntry {
  notes: string;
  recordings: number;
  lastRecordedAt?: string;
}

export interface AssessmentResult {
  id: string;
  assessmentId: string;
  type: "initial" | "weekly" | "progress";
  title: string;
  completedAt: string;
  score: number;
  total: number;
  bySkill: Record<string, { score: number; total: number }>;
  mistakes: { questionId: string; tag?: string; skill: string }[];
}

export interface TutorMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  /** "notice" messages are UI/system notices, never sent to an AI provider. */
  kind?: "chat" | "notice";
}

export interface ActivityEvent {
  id: string;
  type: "lesson" | "vocabulary" | "homework" | "assessment" | "practice" | "plan";
  label: string;
  at: string;
}

export interface LinguaState {
  schemaVersion: 1;
  settings: Settings;
  dailyPlans: Record<string, DailyPlanDay>;
  lessons: Record<string, LessonProgress>;
  vocabulary: Record<string, UserVocab>;
  homework: Record<string, HomeworkSubmission>;
  reading: Record<string, PracticeResult>;
  listening: Record<string, PracticeResult>;
  writing: Record<string, WritingEntry>;
  speaking: Record<string, SpeakingEntry>;
  assessments: AssessmentResult[];
  tutor: Record<string, TutorMessage[]>;
  activity: ActivityEvent[];
}
