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

/** One graded answer inside a lesson (13: Attempt, stored with the learner state). */
export interface LessonAttempt {
  ok: boolean;
  /** First attempt was correct (used for "≥ 80% с первой попытки" style criteria). */
  firstOk: boolean;
  tries: number;
  answer: string;
  at: string;
  ms?: number;
}

export interface LessonSession {
  lessonId: string;
  version: number;
  status: "in_progress" | "completed";
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  /** Position: stage index and block index within the stage's (possibly extended) block list. */
  stage: number;
  block: number;
  attempts: Record<string, LessonAttempt>;
  /** Branches applied (stage ids) — 11 §5 adaptive additions. */
  branches: string[];
  writing: Record<string, { text: string; words: number; submittedAt: string; evaluation?: unknown }>;
  /** Active time per stage, ms (11 §3: real duration vs plan). */
  stageMs: Record<string, number>;
  selfAssessment?: Record<string, "yes" | "almost" | "no">;
  /** Feedback stage: mistakes the learner corrected themselves. */
  corrections: Record<string, boolean>;
  savedWords: string[];
  /** Warm-up items fixed when the review block was first shown (so a reload shows the same set). */
  reviewPlan?: Record<string, ReviewPlanItem[]>;
}

export interface ReviewPlanItem {
  key: string;
  srsId: string | null;
  prompt: string;
  answers: string[];
  explanation: string;
  label: string;
}

/** Spaced-repetition item (13: ReviewItem + ReviewSchedule). */
export interface SrsItem {
  id: string;
  kind: "word" | "error";
  front: string;
  back: string;
  example?: string;
  note?: string;
  source: { type: "lesson" | "content" | "manual"; ref?: string; label?: string };
  createdAt: string;
  updatedAt: string;
  /** Next review date (YYYY-MM-DD, learner's local day). */
  due: string;
  /** Index in the interval ladder; −1 = not yet reviewed. */
  step: number;
  reps: number;
  lapses: number;
  history: { at: string; ok: boolean }[];
  suspended?: boolean;
}

export interface LinguaState {
  schemaVersion: 1;
  /** One-time migrations already applied to this learner's data. */
  migrations?: string[];
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
  lessonSessions?: Record<string, LessonSession>;
  srs?: Record<string, SrsItem>;
}
