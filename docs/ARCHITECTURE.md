# LINGUA architecture

## Layers

```
content/                  Educational data (JSON/Markdown) — no code
src/
  lib/content/            Zod schemas + the only loader of /content  ← content contract
  config/                 App defaults (60 min, ru+en, …), navigation
  lib/store/              Client learner state: types, actions, derived selectors
  lib/db/                 Persistence adapters (localStorage now, Supabase next) + Supabase server client
  lib/auth/               Mode resolution, signed sessions, password hashing, server actions
  lib/ai/                 Provider-agnostic types, providers/, instruction composer, browser client
  lib/learning.ts         Curriculum rules (unlocking, progress)
  lib/assessment.ts       Scoring (raw, transparent — replaceable)
  lib/i18n/               UI dictionaries (en, ru)
  components/ui/          Design-system primitives (Button, Card, Badge, Tabs, Input, Progress…)
  components/shared|layout|practice|charts/
  app/(auth)/login        Public route
  app/(app)/*             Authenticated pages (guarded by middleware + server check)
  app/api/tutor           AI endpoint (GET status, POST chat)
  middleware.ts           Route protection for all modes
supabase/migrations/      PostgreSQL schema + RLS
```

**Rule:** components never hard-code educational content or logic. They read typed content from
`@/lib/content` and call rules in `lib/learning.ts`, `lib/assessment.ts` or `lib/store/selectors.ts`.

## Design system

Tokens are defined once in `src/app/globals.css` (`@theme`): `bg #0B0A10`, `surface #14121C`,
`card #1B1825`, `accent #8855D9`, `accent-soft #B28AFF`, `fg #FFFFFF`, `muted #A49CAF`, plus
line, status and radius tokens. Use utilities like `bg-card text-muted border-line`, never hex values in components.
Charts use the same palette (`components/charts/charts.tsx`).

## State → table mapping (for the SupabaseAdapter)

| `LinguaState` slice | Table(s) |
|---|---|
| `settings` | `profiles` (+ `settings` jsonb), `learning_goals` |
| `dailyPlans[date].completed[]` | `study_sessions` (one row per block per day, minutes) |
| `lessons` | `lesson_progress` |
| `vocabulary` | `user_vocabulary` |
| `homework` | `submissions` (kind = 'homework') |
| `reading` / `listening` | `submissions` (kind = 'reading' / 'listening', answers in feedback/score) |
| `writing` | `submissions` (kind = 'writing', status draft/submitted) |
| `speaking` | `submissions` (kind = 'speaking', audio_path in Storage) |
| `assessments` | `assessments` + `skill_levels` (per skill) + `error_records` (mistakes) |
| `tutor[mode]` | `ai_conversations` |
| `activity` | derived: can be a view over the tables above |

Content tables (`courses`, `modules`, `lessons`, `exercises`, `homework`, `vocabulary`,
`learning_resources`) mirror `/content`. A seed script can load the JSON into them when content moves to the DB.
Only `src/lib/content/index.ts` would then need to change.

To implement it: create `SupabaseAdapter implements StateAdapter` in `src/lib/db/`, and pass it
to `<StoreProvider adapter={…}>` in `app/(app)/layout.tsx` when Supabase is configured. A finer-grained
repository (write per action instead of per snapshot) is the natural evolution.

## AI integration

```
UI (tutor page) ── lib/ai/client.ts ──► POST /api/tutor
                                         ├─ auth check
                                         ├─ zod validation
                                         ├─ buildSystemPrompt(mode, context)  ← content/ai/*.md
                                         └─ getProvider().chat()              ← providers/anthropic.ts
```

- The browser never sees keys. `GET /api/tutor` returns only `{configured, provider, model}`.
- Only **real** learner statistics are sent, and only when "Share my stats" is on. Sample data never is.
- Planned uses of the same endpoint pattern: Examiner feedback for writing/homework (send the rubric
  from `content/rubrics`), Analyst weekly reports (`progress_reports`), Planner plan generation.

## Speech & audio (planned integration points)

- Speaking: `Recorder` in `app/(app)/practice/speaking/page.tsx` produces a `Blob`. Upload it to Supabase
  Storage and send it to an STT/pronunciation service. Store results in `submissions.feedback`.
- Listening: set `audioUrl` in `content/practice/listening/*.json`. The player switches from TTS
  preview to a native `<audio>` element automatically.
- Pronunciation: `lib/speech.ts` wraps the Web Speech API and can be replaced by a TTS provider.

## Extending the curriculum

- New CEFR content: add modules/lessons to `content/curriculum/course.json`. Lessons with empty
  `blocks` show as "Content pending".
- IELTS / TOEFL: add another course file with the same `CourseSchema`, plus assessment files with
  `type` values extended in `AssessmentSchema`.
- Unlock behaviour: `unlockRule` in the course file (`sequential` | `open`). Logic is in `lib/learning.ts`.
- Daily plan: blocks, minutes and rotation in `content/daily-plan/default.json`. Duration scaling is in
  `lib/store/selectors.ts → scaledPlan`.
