// Validates every file in /content against its schema. Usage: npm run content:check
import * as content from "../src/lib/content/index";
import * as placement from "../src/lib/placement/bank";

const ids = new Set<string>();
const dupes: string[] = [];
for (const l of content.allLessons) (ids.has(l.id) ? dupes.push(l.id) : ids.add(l.id));
if (dupes.length) {
  console.error("Duplicate lesson ids:", dupes.join(", "));
  process.exit(1);
}
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
