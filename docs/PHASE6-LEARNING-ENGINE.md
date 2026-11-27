# Phase 6 — Learning Engine, AI Tutor, Vocabulary, Voice

Specs: `docs/curriculum/11` (lesson standard), `08` (tutor), `13` (data model), `15` (adaptation), `16` (MVP).

## 1. Diagnostic integrity (finished)

- Learners can **read** their placement rows; every write goes through `public.lingua_write(payload, sig)` — a
  payload signed by the Next.js server with HMAC-SHA256 (`LINGUA_SIGNING_SECRET`, also stored in
  `private.app_secrets`, never in the repo). Forged, altered, expired or other-user payloads are rejected by the DB.
- `GET /api/health/signing` → `{"signing":"ok"}` proves the server and DB secrets match.
- TRUNCATE / TRIGGER / REFERENCES revoked from API roles on all public tables (TRUNCATE ignores RLS).
- "Не согласен с уровнем": stored in `placement_feedback`; for higher/lower a short re-check (one grammar block +
  one reading testlet at the neighbouring band). The level moves by one step only when the re-check supports it;
  confidence is never raised. Every level is shown as "предварительно · не подтверждённый уровень CEFR".

## 2. Lesson engine

**Content = data.** Each `content/lessons/*.json` file is a lesson (schema: `src/lib/lessons/schema.ts`). The registry
reads the folder at runtime, so a new lesson needs no code or UI change. `npm run content:check` validates every file.

```
Lesson { id, version, status, title, level, module, type (A–K), objective, languageGoals, minutes, stages[] }
Stage  { id, kind: warmup|input|practice|use|feedback|wrapup, title, goal, minutes, role, blocks[], branch? }
Block  explain | vocab | choice | gap | order | match | reading | listening | writing | dialogue | review | feedback | summary
branch { errorsAtLeast, note, add: Block[] }   // 11 §5: e.g. second explanation after 2 concept-check errors
```

- **Engine** (`src/lib/lessons/engine.ts`, pure): which blocks a stage shows (incl. branches), deterministic checks
  (gap with contractions and repeated lead words, sentence order, dialogue keywords, writing target forms),
  the lesson report (accuracy per stage vs the standard's criteria, ≤ 3 prioritised mistakes for feedback,
  time per stage vs plan, objective status), navigation.
- **Player** (`src/components/lesson/*`, route `/lessons/[id]`): goal, stage rail, progress, block, instant feedback
  with "why", retry once then the answer, contextual tutor actions, feedback stage with self-correction,
  can-do self-assessment, report. Progress lives in the learner state (`lessonSessions`), synced through
  `learner_state` (RLS) — leave at any block and continue on any device.
- **Recorded per lesson** (11 §3): every attempt (first-try result, tries, the learner's first answer, time),
  branches applied, writing texts (+ AI evaluation if requested), active minutes per stage, self-assessment,
  self-corrections, saved words. On completion all mistakes become review items.

## 3. Vocabulary engine

`src/lib/srs` (pure): interval ladder 1–3–7–14–30–60 days, a mistake resets to day 1 and counts a lapse,
daily queue (due first, then up to 10 new; 40 reviews/day), stats incl. 7-day retention.
Items (`srs` in the learner state): words (from lessons "В мой словарь", course words "В повторение", manual add)
and personal errors (auto from lessons). The vocabulary page shows today's queue (typed recall RU→EN / fix the
mistake), "Мои слова", "Мои ошибки" with answer history. The lesson warm-up pulls due items from the same bank.

## 4. AI tutor

```
UI action ─► /api/tutor/task {task, payload}     (structured)   ─┐
Tutor page ─► /api/tutor {mode, messages}         (role chat)    ─┤
                                                                   ▼
            tutor.ts: auth → limits → learner model → role prompt + task format → provider → zod validation → usage record
```

- **One mentor, six roles**: `content/ai/base.md` (honesty, copyright, error priority, feedback language,
  prompt-injection rule) + `content/ai/modes/*.md`.
- **Learner model** (`context.ts`), built on the server: preliminary level + confidence, goals, priority skills,
  diagnostic gaps, current lesson/objective/stage, studied lessons, recent mistakes, exercise results, recurring
  errors from the review bank. Lesson facts (prompt, correct answer, task text) are looked up server-side;
  the client only names the lesson/block and sends its own answer.
- **Tasks** (`tasks.ts`, output validated with zod): `explain_mistake` (Teacher), `evaluate_writing` (Examiner,
  rubric: task / range / coherence / accuracy, ≤ 3 corrections, confidence), `dialogue_turn` (Speaking Partner,
  corrects only communication breakdowns, ≤ 10 turns), `vocab_examples` (Vocabulary Coach), `plan_next` (Planner),
  `analyze_progress` (Analyst).
- **Providers** (`providers/*`): one interface `complete({system, messages, maxTokens, json, tier})` → text + token
  usage. Groq (connected earlier) and Anthropic (inactive until a key is approved). Models per tier via env.
  `AI_DISABLED=1` switches all AI off; lessons work fully without AI.
- **Cost & abuse**: per learner 6 requests/min, 80/day, $0.25/day (`content/ai/limits.json`); input ≤ 4000 chars,
  ≤ 12 chat turns, output token caps per task; every call (incl. failures) is stored in `ai_usage`
  (server-signed writes — a learner cannot erase usage); estimated cost from `content/ai/pricing.json`
  (verify prices). When a limit is hit the lesson continues without AI ("мягкая деградация", 16 §5).

## 5. Voice

`src/lib/voice`: interfaces `TextToSpeech`, `SpeechToText`, `PronunciationAssessor`, `ConversationSession`;
policy: raw audio not retained, consent required, no model training, **no simulated pronunciation scores**.
Only on-device browser TTS is active. Browser speech *recognition* sends audio to the browser vendor in most
browsers, so it is treated as external and disabled until reviewed. Dialogues use text replies for now.

## 6. Not done yet / next

- Full first module after the owner's diagnostic; lesson types other than A as content.
- Placement listening/lesson audio are synthetic; studio recordings later.
- STT/pronunciation provider after a data-processing review; voice consent UI in settings.
- Expert review queue, weekly report, 14-day re-assessment, data export/deletion requests.
