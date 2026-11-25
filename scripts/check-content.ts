// Validates every file in /content against its schema. Usage: npm run content:check
import * as content from "../src/lib/content/index";

const ids = new Set<string>();
const dupes: string[] = [];
for (const l of content.allLessons) (ids.has(l.id) ? dupes.push(l.id) : ids.add(l.id));
if (dupes.length) {
  console.error("Duplicate lesson ids:", dupes.join(", "));
  process.exit(1);
}
console.log(
  `✓ content valid — ${content.course.modules.length} modules, ${content.allLessons.length} lessons, ` +
    `${content.vocabularyFile.words.length} words, ${content.assessments.length} assessments, ` +
    `${content.tutorModesFile.modes.length} tutor modes`,
);
