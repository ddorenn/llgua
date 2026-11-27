/**
 * Placement types shared by the server engine and the client UI.
 * Nothing in here carries answer keys.
 */

export type SectionId = "zero" | "vocabulary" | "grammar" | "reading" | "listening" | "writing" | "speaking";
export type Goal = "travel" | "work" | "exam" | "communication" | "study" | "relocation" | "self";
export type Experience = "none" | "some" | "current";
export type SelfLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "unknown";
export type Confidence = "high" | "medium" | "low";
export type SkillKey = "listening" | "reading" | "speaking" | "writing";
export type ComponentKey = "grammar" | "vocabulary";

/** Result scale (docs/curriculum/14 §1). Index −1 = below Pre-A1. */
export const SUBLEVELS = ["Pre-A1", "A1.1", "A1.2", "A2", "A2+", "B1", "B1+", "B2", "B2+"] as const;
export type Sublevel = (typeof SUBLEVELS)[number];
export const sublevelLabel = (i: number) => (i < 0 ? "ниже Pre-A1" : SUBLEVELS[Math.min(i, SUBLEVELS.length - 1)]);

export interface Intake {
  name?: string;
  goals: Goal[];
  experience: Experience;
  selfLevel: SelfLevel;
  /** Lessons per week. */
  pace: number;
  /** Consent to voice recording for the speaking part (asked up front; speaking is not run in this version). */
  voiceConsent: boolean;
}

export type Stimulus =
  | { type: "text"; title: string; text: string }
  | { type: "audio"; title: string; testletId: string; lines: { speaker: string; text: string }[]; rate: number; maxPlays: number };

export interface StepProgress {
  section: SectionId;
  /** 1-based position among sections of this mode. */
  sectionNo: number;
  sectionCount: number;
  /** Items answered in the current section. */
  answered: number;
  /** Planned items in the current section (upper bound for adaptive ones). */
  planned: number;
}

export type Step =
  | { kind: "choice"; itemId: string; prompt: string; options: string[]; stimulus?: Stimulus; dontKnow: boolean; questionNo?: number; progress: StepProgress }
  | { kind: "input"; itemId: string; prompt: string; dontKnow: boolean; progress: StepProgress }
  | { kind: "writing"; itemId: string; title: string; instruction: string; prompt: string; words: [number, number]; timeMin: number; progress: StepProgress }
  | { kind: "speaking"; itemId: string; consent: boolean; progress: StepProgress }
  | { kind: "done" };

export interface Answer {
  itemId: string;
  /** Display index of the chosen option. */
  choice?: number;
  text?: string;
  dontKnow?: boolean;
  /** Learner cannot play audio / chooses to skip a section that allows it (listening, writing, speaking). */
  skip?: boolean;
  /** Writing: characters inserted by paste. */
  pastedChars?: number;
  /** Time spent on the item, ms (client measured). */
  ms: number;
  /** Expected state sequence number (prevents double submits). */
  seq: number;
}

export interface SkillResult {
  /** Sublevel index, −1 = below Pre-A1; null = not assessed. */
  sublevel: number | null;
  label: string;
  confidence: Confidence | null;
  assessed: boolean;
  /** Why not assessed / what limits the estimate. */
  note?: string;
  ceiling?: boolean;
}

export interface Gap {
  kind: "grammar" | "vocabulary" | "skill";
  key: string;
  label: string;
  module?: string;
  errors?: number;
  checked?: number;
}

export interface RouteModule {
  code: string;
  title: string;
  subtitle: string;
  status: "start" | "credited" | "credited_check" | "next" | "upcoming";
  note?: string;
}

export interface Route {
  startModule: string;
  startTitle: string;
  path: 0 | 1 | 2 | null;
  level: "A1" | "A2" | "B1" | "B2";
  mode: "normal" | "check_gaps";
  modules: RouteModule[];
  review: { label: string; module?: string; how: "microlesson" | "review_bank" }[];
  prioritySkills: { skill: SkillKey; reason: string }[];
  pace: number;
  paceWarning?: string;
  lessonsLeft: number;
  weeksLeft: number;
  content: { ready: boolean; message: string; practiceModuleId?: string; practiceTitle?: string };
  explanations: string[];
  rulesVersion: string;
}

export interface PlacementResult {
  mode: "full" | "zero";
  completeness: "full" | "partial";
  /** Overall estimate (sublevel index) or null if it cannot be stated. */
  overall: number | null;
  overallLabel: string;
  aboveRange: boolean;
  confidence: Confidence;
  confidenceReasons: string[];
  meaning: string;
  skills: Record<SkillKey, SkillResult>;
  components: Record<ComponentKey, SkillResult>;
  strengths: string[];
  gaps: Gap[];
  recommendations: string[];
  disclaimers: string[];
  offerFullMode?: boolean;
  /** Learner reported disagreement with the level (14 §15). */
  dispute?: { direction: "higher" | "lower" | "other"; at: string };
  /** Outcome of the short re-check that followed the disagreement. */
  recheck?: { direction: "higher" | "lower"; target: string; supported: boolean; at: string; grammar: string; reading: string; changed: boolean; previous: string };
  route: Route;
  configVersion: string;
  bankVersion: string;
  computedAt: string;
}

/** What GET /api/placement returns. */
export interface PlacementView {
  id: string;
  status: "in_progress" | "completed" | "abandoned";
  mode: "full" | "zero" | "recheck";
  startedAt: string;
  completedAt?: string | null;
  seq: number;
  step: Step;
  intake: Intake;
  result?: PlacementResult | null;
  /** When a new diagnostic is allowed (ISO), if a retest interval applies. */
  retestAfter?: string | null;
  pilotEarlyRetake?: boolean;
}
