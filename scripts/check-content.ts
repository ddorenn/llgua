// Validates every file in /content against its schema. Usage: npm run content:check
import * as content from "../src/lib/content/index";
import * as placement from "../src/lib/placement/bank";
import { readdirSync, readFileSync } from "node:fs";
import { LessonSchema, validateLesson } from "../src/lib/lessons/schema";

const ids = new Set<string>();
const dupes: string[] = [];
for (const l of content.allLessons) (ids.has(l.id) ? dupes.push(l.id) : ids.add(l.id));
if (dupes.length) {
  console.error("Duplicate lesson ids:", dupes.join(", "));
  process.exit(1);
}
const lessonFiles = readdirSync("content/lessons").filter((f) => f.endsWith(".json"));
for (const f of lessonFiles) {
  const parsed = LessonSchema.safeParse(JSON.parse(readFileSync(`content/lessons/${f}`, "utf8")));
  if (!parsed.success) {
    console.error(`Lesson ${f}:\n  ` + parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n  "));
    process.exit(1);
  }
  const problems = validateLesson(parsed.data);
  if (problems.length) {
    console.error(`Lesson ${f}:\n  ` + problems.join("\n  "));
    process.exit(1);
  }
}
console.log(`✓ lessons valid — ${lessonFiles.length} file(s) in content/lessons`);
const bankProblems = placement.validateBank();
if (bankProblems.length) {
  console.error("Placement bank problems:\n  " + bankProblems.join("\n  "));
  process.exit(1);
}
console.log(
  `✓ placement bank valid (${placement.config.version}) — ${placement.vocabulary.items.length} vocabulary, ` +
    `${placement.grammar.items.length} grammar, ${placement.reading.testlets.length} reading and ` +
    `${placement.listening.testlets.length} listening testlets, ${placement.writing.tasks.length} writing tasks`,
);
console.log(
  `✓ content valid — ${content.course.modules.length} modules, ${content.allLessons.length} lessons, ` +
    `${content.vocabularyFile.words.length} words, ${content.assessments.length} assessments, ` +
    `${content.tutorModesFile.modes.length} tutor modes`,
);
