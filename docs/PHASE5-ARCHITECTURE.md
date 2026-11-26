# Phase 5 — architecture and first working stage (placement test)

Source specs: `docs/curriculum/` (07, 08, 11, 13, 14, 15, 16) and `docs/knowledge-analysis/`.
The stack stays as is: Next.js 15 (App Router) + TypeScript + Tailwind v4 + Supabase (Auth, Postgres, RLS) + Vercel.

## 1. Where the project stood

| Area | State before Phase 5 |
|---|---|
| Auth | Real: Supabase Auth (username → `name@lingua.local`), closed registration; local/demo modes for development |
| Learner data | One synced JSON document per learner (`learner_state`, optimistic concurrency, RLS) — progress of the existing practice app |
| Content | JSON files in `/content` validated by zod: a short demo course (6 modules / 12 lessons), practice sets, 3 fixed "assessments" (demo, not validated) |
| AI tutor | Groq/Anthropic chat through `/api/tutor`, no evaluation pipeline |
| Missing for the new curriculum | placement test, item bank, attempts/responses, learner goals & consents, route (enrollment), mastery/SRS model, lesson player per standard 11, A1-M1 content, AI usage accounting |

## 2. Mapping the learning model (13) onto the stack

Principle: **content = versioned files in the repo, learner data = Postgres rows owned by the learner (RLS)**. No new services.

| Spec entity (13) | Implementation now | Later |
|---|---|---|
| Program / Level / Module | `content/placement/catalog.json` (titles, sublevels, `ready` flag) | full module files per standard 11 |
| ActivityItem + versions | `content/placement/{vocabulary,grammar,reading,listening,writing}.json`; every response stores `item_version` (`grammar@1` …) | same format for lesson activities |
| LanguageItem → module link | grammar `topics` (`present-simple` → `A1-M3`), vocabulary `themes` | prerequisite graph from 06 |
| Learner / LearnerGoals | `placements.intake` (goals, experience, self-level, pace, name) | dedicated `learner_goals` row once the route is editable |
| Consent | `learner_consents` (voice_recording now; text_storage, model_training reserved) | consent screen in settings, revocation |
| Placement | `placements` (state, result, config & bank version, status, seq) | — |
| PlacementItemResponse / Attempt | `placement_responses` — append-only, unique `(placement_id, seq)` | `attempts` for lessons with the same shape |
| Evaluation (AI / expert) | not yet: writing text is stored with `correct = null` | `evaluations` table, expert queue (ADM-2) |
| SkillProfileSnapshot / LevelEstimate | inside `placements.result` (`skills`, `components`, `overall`, `confidence`, disclaimer) | separate snapshot rows for history charts |
| Enrollment / Recommendation | `placements.result.route` (start module, path, credited modules, review queue, priorities, pace, explanations, `rulesVersion`) | `enrollments` once lessons exist |
| MasteryState / ReviewItem | not yet — gaps are emitted as review items in the route | SRS tables (13 §7) |
| AIUsageRecord / AIBudget | not yet (no AI in placement) | before connecting rubric evaluation |

Configuration (`content/placement/config.json`, versioned) holds every [ГИПОТЕЗА] number from 14 §16 and 15 §10.

## 3. Placement test — how it works

```
/placement (UI) ──► /api/placement (GET overview, POST start/abandon)
                └─► /api/placement/answer (POST one answer)
                        │
                        ▼
              src/lib/placement/service.ts  (server only)
                 ├─ engine.ts  — pure state machine (no I/O)
                 ├─ result.ts  — level, confidence, gaps, recommendations, route
                 ├─ bank.ts    — item bank + config (answer keys never reach the browser)
                 └─ store.ts   — Supabase (RLS) or local JSON file
```

- **Server-side scoring.** The client receives prompts and shuffled options only; keys stay on the server. Option order is a deterministic permutation per (placement, item) so reloads show the same order.
- **Block ladder** for Vocabulary and Grammar (14 §5): blocks of 5 (≥ 2 typed answers), 5/5 → +2 bands in the first two blocks, 4 → +1, 3 → repeat once then "borderline pass", ≤ 2 → −1; stops at boundary / floor / ceiling / 25 items / 10 min active time.
- **Testlets** for Reading and Listening: start at P0 − 1, ≥ 3/4 up, ≤ 1/4 down, 2/4 → another testlet of the band (pilot bank has one per band → marked "unresolved", lower confidence), max 3.
- **Writing:** one task by P1 band; text stored, **not scored** (no paid AI API in this phase). Paste detection flags the text.
- **Speaking:** not run in this version → "not assessed". The voice consent is asked and stored up front.
- **Zero mode:** learner says "never studied" → 8 items (Pre-A1 + A1); strong results offer the full test.
- **Result (14 §6, §9, §10):** overall = lower median of *assessed* skills (L, R, W, S); grammar/vocabulary never raise it; ≥ 2 skills not assessed → confidence "low"; ceiling → "не ниже B2+", never C1. Gaps need ≥ 2 checked items with ≥ 2 errors at bands not above the level.
- **Route (15):** start module by sublevel table, earlier modules credited (beyond 3 → "credited, confirm by check"), gaps → micro-lesson (max 3, same level) or review bank, priority skills from lag + goals, pace 3–6 (warning < 4), forecast "estimate, not a promise". No module is `ready` yet → honest message + practice lessons **of the same level**.
- **Integrity:** every answer carries the state `seq`; stale/duplicate submits get 409 and the client re-syncs. Cyrillic input is rejected without counting as an error. Resume within 48 h; older in-progress attempts are closed.
- **Isolation:** all three tables have RLS `auth.uid() = user_id`; responses are insert-only and only into the learner's own in-progress placement. In local/demo mode each user gets a separate file.

Accepted risk (owner-only stage): a learner could tamper with *their own* placement through the API with their own session; this cannot affect anyone else. Before paid students, move writes behind a service role or signed state.

## 4. Pilot deviations from the spec (documented, configurable)

- Bank: 10 items per band per section (spec 15), 1 testlet per band (spec 3), 1 writing task per tier (spec 2 per band). Status `draft`, not calibrated.
- Listening audio: browser speech synthesis on the learner's device (no external service, no recordings) — listening confidence is capped at "medium".
- Not implemented yet: fast-guess block repeat (needs extra items), R/L consistency extra testlet, "Не согласен с уровнем" re-check, step-back rule (needs objective-level mapping).

## 5. Next stage (proposal)

1. Rubric evaluation of Writing (AI, one call per text) with `evaluations` + `ai_usage` tables and a budget — needs owner approval of provider and budget (16 §11).
2. Voice recording + storage policy (retention, deletion) → Speaking part; requires decisions on retention and jurisdiction (PRV-3, PRV-8).
3. Lesson player per standard 11 and A1-M1 content (12 lessons) + "Старт".
4. Mastery/SRS tables, enrollment from the placement route.
5. Expand and calibrate the bank (≥ 15 items per band, 2–3 testlets per band, studio audio).
