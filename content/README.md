# LINGUA educational content

Everything in this folder is **data**, not code. The UI reads it through typed,
validated loaders in `src/lib/content/`. You can replace any file here without
touching React components.

| Folder | What lives here | Schema |
|---|---|---|
| `curriculum/levels.json` | CEFR levels A1–C2 and their short descriptors | `CefrLevelSchema` |
| `curriculum/course.json` | Modules → lessons → lesson blocks (text, examples, quiz) | `CourseSchema` |
| `daily-plan/default.json` | The 60-minute daily routine (blocks, minutes, rotation) | `DailyPlanSchema` |
| `vocabulary/words.json` | Vocabulary entries (word, IPA, translation, examples) | `VocabWordSchema` |
| `practice/reading/*.json` | Reading texts + questions | `ReadingExerciseSchema` |
| `practice/listening/*.json` | Listening transcripts/audio + questions | `ListeningExerciseSchema` |
| `practice/speaking/tasks.json` | Speaking prompts | `SpeakingTaskSchema` |
| `practice/writing/tasks.json` | Writing tasks | `WritingTaskSchema` |
| `assessments/*.json` | Assessment definitions + questions | `AssessmentSchema` |
| `rubrics/*.json` | Editable evaluation criteria (writing, speaking) | `RubricSchema` |
| `homework/assignments.json` | Homework assignments | `HomeworkSchema` |
| `library/resources.json` | Library categories and resource metadata | `LibrarySchema` |
| `ai/modes.json` + `ai/*.md` | AI tutor modes and their system instructions | `TutorModeSchema` |
| `samples/*.json` | Demonstration analytics shown only in "Sample preview" mode | `SampleDataSchema` |

## Rules

1. Every file has a `meta` block. Set `"sample": true` for demonstration content —
   the UI then shows a **Sample content** badge wherever it is used.
2. When you replace sample content with real material, set `"sample": false`
   and fill `source` (textbook, author, edition, page range…).
3. IDs must be stable and unique — progress is stored against them.
4. After editing, run `npm run content:check` to validate every file against its schema.
5. Do not commit copyrighted textbook text you do not have rights to. Store your
   own notes/summaries, or reference the source in `source` and keep files private.
