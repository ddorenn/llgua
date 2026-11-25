/**
 * Content registry. The only place that imports files from /content.
 * Everything is validated at load time — a malformed file fails loudly in dev/build.
 *
 * To plug in a different source later (Supabase tables, CMS, uploaded files),
 * keep these exported names and types and change only this module.
 */
import levelsJson from "../../../content/curriculum/levels.json";
import courseJson from "../../../content/curriculum/course.json";
import dailyPlanJson from "../../../content/daily-plan/default.json";
import wordsJson from "../../../content/vocabulary/words.json";
import readingJson from "../../../content/practice/reading/exercises.json";
import listeningJson from "../../../content/practice/listening/exercises.json";
import speakingJson from "../../../content/practice/speaking/tasks.json";
import writingJson from "../../../content/practice/writing/tasks.json";
import initialJson from "../../../content/assessments/initial.json";
import weeklyJson from "../../../content/assessments/weekly.json";
import progressJson from "../../../content/assessments/progress-14d.json";
import writingRubricJson from "../../../content/rubrics/writing-general.json";
import speakingRubricJson from "../../../content/rubrics/speaking-general.json";
import homeworkJson from "../../../content/homework/assignments.json";
import libraryJson from "../../../content/library/resources.json";
import tutorModesJson from "../../../content/ai/modes.json";
import sampleJson from "../../../content/samples/progress.json";
import {
  AssessmentSchema, CourseSchema, DailyPlanSchema, HomeworkFileSchema, LevelsFileSchema, LibrarySchema,
  ListeningFileSchema, ReadingFileSchema, RubricSchema, SampleDataSchema, SpeakingFileSchema,
  TutorModesFileSchema, VocabFileSchema, WritingFileSchema,
  type Cefr, type Lesson, type Module,
} from "./schemas";

export * from "./schemas";

export const levelsFile = LevelsFileSchema.parse(levelsJson);
export const course = CourseSchema.parse(courseJson);
export const dailyPlan = DailyPlanSchema.parse(dailyPlanJson);
export const vocabularyFile = VocabFileSchema.parse(wordsJson);
export const readingFile = ReadingFileSchema.parse(readingJson);
export const listeningFile = ListeningFileSchema.parse(listeningJson);
export const speakingFile = SpeakingFileSchema.parse(speakingJson);
export const writingFile = WritingFileSchema.parse(writingJson);
export const assessments = [initialJson, weeklyJson, progressJson].map((a) => AssessmentSchema.parse(a));
export const rubrics = [writingRubricJson, speakingRubricJson].map((r) => RubricSchema.parse(r));
export const homeworkFile = HomeworkFileSchema.parse(homeworkJson);
export const library = LibrarySchema.parse(libraryJson);
export const tutorModesFile = TutorModesFileSchema.parse(tutorModesJson);
export const sampleData = SampleDataSchema.parse(sampleJson);

export const levels = levelsFile.levels;

/* ---------- Helpers ---------- */
export const allLessons: (Lesson & { moduleId: string; level: Cefr })[] = course.modules.flatMap((m) =>
  m.lessons.map((l) => ({ ...l, moduleId: m.id, level: m.level })),
);

export function getLesson(id: string) {
  return allLessons.find((l) => l.id === id);
}

export function getModule(id: string): Module | undefined {
  return course.modules.find((m) => m.id === id);
}

export function getAssessment(id: string) {
  return assessments.find((a) => a.id === id);
}

export function getRubric(id?: string) {
  return rubrics.find((r) => r.id === id);
}

export function lessonHasContent(l: Lesson) {
  return l.blocks.length > 0;
}
