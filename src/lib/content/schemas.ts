/**
 * Zod schemas for every content file in /content.
 * These are the contract between educational content and the UI.
 * Update a schema here when the content format needs to grow.
 */
import { z } from "zod";

export const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const CefrSchema = z.enum(CEFR);
export type Cefr = z.infer<typeof CefrSchema>;

export const SKILLS = ["grammar", "vocabulary", "reading", "listening", "speaking", "writing"] as const;
export const SkillSchema = z.enum(SKILLS);
export type Skill = z.infer<typeof SkillSchema>;

export const MetaSchema = z.object({
  sample: z.boolean(),
  source: z.string().optional(),
  version: z.number().int().default(1),
});
export type ContentMeta = z.infer<typeof MetaSchema>;

/* ---------- Curriculum ---------- */
export const CefrLevelSchema = z.object({ id: CefrSchema, name: z.string(), summary: z.string() });
export const LevelsFileSchema = z.object({ meta: MetaSchema, levels: z.array(CefrLevelSchema) });

export const QuizQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  options: z.array(z.string()).min(2),
  answer: z.number().int(),
  explanation: z.string().optional(),
});

export const LessonBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), title: z.string().optional(), body: z.string() }),
  z.object({
    type: z.literal("examples"),
    title: z.string().optional(),
    items: z.array(z.object({ en: z.string(), ru: z.string().optional() })),
  }),
  z.object({ type: z.literal("tip"), body: z.string() }),
  z.object({ type: z.literal("quiz"), title: z.string().optional(), questions: z.array(QuizQuestionSchema) }),
]);
export type LessonBlock = z.infer<typeof LessonBlockSchema>;

export const LessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  skill: SkillSchema,
  minutes: z.number().int().positive(),
  objectives: z.array(z.string()).default([]),
  blocks: z.array(LessonBlockSchema).default([]),
});
export type Lesson = z.infer<typeof LessonSchema>;

export const ModuleSchema = z.object({
  id: z.string(),
  level: CefrSchema,
  title: z.string(),
  skill: SkillSchema,
  description: z.string(),
  lessons: z.array(LessonSchema),
});
export type Module = z.infer<typeof ModuleSchema>;

export const CourseSchema = z.object({
  meta: MetaSchema,
  id: z.string(),
  title: z.string(),
  /** "sequential": a lesson unlocks when the previous one is completed. "open": all lessons available. */
  unlockRule: z.enum(["sequential", "open"]).default("sequential"),
  modules: z.array(ModuleSchema),
});
export type Course = z.infer<typeof CourseSchema>;

/* ---------- Daily plan ---------- */
export const PlanRotationSchema = z.object({ skill: SkillSchema, title: z.string(), href: z.string() });
export const PlanBlockSchema = z.object({
  id: z.string(),
  title: z.string(),
  skill: z.union([SkillSchema, z.literal("rotation"), z.literal("review")]),
  minutes: z.number().int().positive(),
  description: z.string(),
  href: z.string().optional(),
  rotation: z.array(PlanRotationSchema).optional(),
});
export type PlanBlock = z.infer<typeof PlanBlockSchema>;
export const DailyPlanSchema = z.object({
  meta: MetaSchema,
  id: z.string(),
  title: z.string(),
  totalMinutes: z.number().int(),
  blocks: z.array(PlanBlockSchema),
});
export type DailyPlan = z.infer<typeof DailyPlanSchema>;

/* ---------- Vocabulary ---------- */
export const VocabWordSchema = z.object({
  id: z.string(),
  word: z.string(),
  pos: z.string(),
  ipa: z.string().optional(),
  translation: z.string(),
  level: CefrSchema,
  topic: z.string().optional(),
  examples: z.array(z.string()).default([]),
});
export type VocabWord = z.infer<typeof VocabWordSchema>;
export const VocabFileSchema = z.object({ meta: MetaSchema, words: z.array(VocabWordSchema) });

/* ---------- Practice ---------- */
export const PracticeQuestionSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string(), type: z.literal("mcq"), prompt: z.string(), options: z.array(z.string()), answer: z.number().int() }),
  z.object({ id: z.string(), type: z.literal("truefalse"), prompt: z.string(), answer: z.boolean() }),
]);
export type PracticeQuestion = z.infer<typeof PracticeQuestionSchema>;

export const ReadingExerciseSchema = z.object({
  id: z.string(),
  title: z.string(),
  level: CefrSchema,
  minutes: z.number().int(),
  text: z.string(),
  questions: z.array(PracticeQuestionSchema),
});
export type ReadingExercise = z.infer<typeof ReadingExerciseSchema>;
export const ReadingFileSchema = z.object({ meta: MetaSchema, exercises: z.array(ReadingExerciseSchema) });

export const ListeningExerciseSchema = z.object({
  id: z.string(),
  title: z.string(),
  level: CefrSchema,
  minutes: z.number().int(),
  /** URL of a real audio file (e.g. Supabase Storage). null = not provided yet. */
  audioUrl: z.string().nullable(),
  durationSec: z.number().int().optional(),
  transcript: z.string(),
  questions: z.array(PracticeQuestionSchema),
});
export type ListeningExercise = z.infer<typeof ListeningExerciseSchema>;
export const ListeningFileSchema = z.object({ meta: MetaSchema, exercises: z.array(ListeningExerciseSchema) });

export const SpeakingTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  level: CefrSchema,
  minutes: z.number().int(),
  type: z.enum(["monologue", "discussion", "roleplay"]),
  prompt: z.string(),
  hints: z.array(z.string()).default([]),
  rubricId: z.string().optional(),
});
export type SpeakingTask = z.infer<typeof SpeakingTaskSchema>;
export const SpeakingFileSchema = z.object({ meta: MetaSchema, tasks: z.array(SpeakingTaskSchema) });

export const WritingTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  level: CefrSchema,
  minutes: z.number().int(),
  type: z.string(),
  instructions: z.string(),
  minWords: z.number().int(),
  maxWords: z.number().int(),
  rubricId: z.string().optional(),
});
export type WritingTask = z.infer<typeof WritingTaskSchema>;
export const WritingFileSchema = z.object({ meta: MetaSchema, tasks: z.array(WritingTaskSchema) });

/* ---------- Assessments ---------- */
export const AssessmentQuestionSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(), type: z.literal("mcq"), level: CefrSchema, prompt: z.string(),
    options: z.array(z.string()), answer: z.number().int(), tag: z.string().optional(),
  }),
  z.object({
    id: z.string(), type: z.literal("gap"), level: CefrSchema, prompt: z.string(),
    accepted: z.array(z.string()).min(1), tag: z.string().optional(),
  }),
]);
export type AssessmentQuestion = z.infer<typeof AssessmentQuestionSchema>;

export const AssessmentSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  skill: SkillSchema,
  passage: z.string().optional(),
  questions: z.array(AssessmentQuestionSchema),
});
export const AssessmentSchema = z.object({
  meta: MetaSchema,
  id: z.string(),
  type: z.enum(["initial", "weekly", "progress"]),
  title: z.string(),
  description: z.string(),
  minutes: z.number().int(),
  /** Must stay false until the item bank and scoring are validated. Controls UI disclaimers. */
  validated: z.boolean(),
  sections: z.array(AssessmentSectionSchema),
});
export type Assessment = z.infer<typeof AssessmentSchema>;

/* ---------- Rubrics ---------- */
export const RubricSchema = z.object({
  meta: MetaSchema,
  id: z.string(),
  title: z.string(),
  scale: z.object({ min: z.number(), max: z.number() }),
  criteria: z.array(z.object({ id: z.string(), title: z.string(), description: z.string() })),
});
export type Rubric = z.infer<typeof RubricSchema>;

/* ---------- Homework ---------- */
export const HomeworkSchema = z.object({
  id: z.string(),
  title: z.string(),
  skill: SkillSchema,
  level: CefrSchema,
  lessonId: z.string().optional(),
  dueInDays: z.number().int(),
  submission: z.enum(["text", "audio"]),
  instructions: z.string(),
  minWords: z.number().int().optional(),
  sampleFeedback: z
    .object({
      score: z.number(),
      summary: z.string(),
      corrections: z.array(z.object({ original: z.string(), corrected: z.string(), note: z.string() })),
    })
    .optional(),
});
export type Homework = z.infer<typeof HomeworkSchema>;
export const HomeworkFileSchema = z.object({ meta: MetaSchema, assignments: z.array(HomeworkSchema) });

/* ---------- Library ---------- */
export const ResourceSchema = z.object({
  id: z.string(),
  category: SkillSchema,
  title: z.string(),
  author: z.string().optional(),
  level: z.array(CefrSchema).default([]),
  format: z.enum(["book", "pdf", "audio", "video", "link", "notes"]),
  url: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  rights: z.enum(["owned", "public-domain", "open-licence", "personal-notes", "link-only"]).default("link-only"),
});
export type Resource = z.infer<typeof ResourceSchema>;
export const LibrarySchema = z.object({
  meta: MetaSchema,
  categories: z.array(z.object({ id: SkillSchema, title: z.string(), description: z.string() })),
  resources: z.array(ResourceSchema),
});

/* ---------- AI tutor ---------- */
export const TutorModeSchema = z.object({
  id: z.string(),
  name: z.string(),
  short: z.string(),
  icon: z.string(),
  instructions: z.string(),
  suggestions: z.array(z.string()),
});
export type TutorModeDef = z.infer<typeof TutorModeSchema>;
export const TutorModesFileSchema = z.object({ meta: MetaSchema, baseInstructions: z.string(), modes: z.array(TutorModeSchema) });

/* ---------- Sample analytics ---------- */
export const SampleDataSchema = z.object({
  meta: MetaSchema,
  level: CefrSchema,
  streak: z.number(),
  wordsLearned: z.number(),
  lessonsCompleted: z.number(),
  studyMinutesWeek: z.number(),
  overallProgress: z.number(),
  weeklyActivity: z.array(z.object({ day: z.string(), minutes: z.number() })),
  skills: z.array(z.object({ skill: z.string(), initial: z.number(), current: z.number() })),
  grammarTopics: z.array(z.object({ topic: z.string(), mastery: z.number() })),
  vocabularyGrowth: z.array(z.object({ week: z.string(), words: z.number() })),
  assessments: z.array(z.object({ date: z.string(), title: z.string(), score: z.number() })),
  mistakes: z.array(z.object({ category: z.string(), count: z.number() })),
  weakAreas: z.array(z.string()),
  recentActivity: z.array(z.object({ label: z.string(), when: z.string(), type: z.string() })),
  tutorReport: z.object({ date: z.string(), summary: z.string(), recommendations: z.array(z.string()) }),
});
export type SampleData = z.infer<typeof SampleDataSchema>;
