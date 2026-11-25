# LINGUA

**Your Personal AI English Tutor.** A private, dark-premium English learning environment for one learner (multi-user ready), covering CEFR A1–C2.

This is the **product & platform phase**: full interface, navigation, interactions, data/AI/auth architecture. The educational methodology, curriculum, assessment validity and tutor behaviour are deliberately left to be filled in from your own materials. Everything educational lives in [`/content`](content/README.md) as validated data.

---

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000. With no configuration the app runs in **development demo mode** (clearly labelled, *not secure*). Sign in with `demo` / `lingua-demo` (the login screen has a button that fills them in).

Other scripts:

| Command | What it does |
|---|---|
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |
| `npm run content:check` | Validates every file in `/content` against its schema |
| `npm run auth:hash -- "password"` | Generates a password hash + session secret for private-account auth |

---

## Authentication

Mode is chosen automatically from environment variables (see `.env.example`):

| Mode | When | Security |
|---|---|---|
| **Supabase** | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` set | Supabase Auth (email + password). Create your user in the Supabase dashboard; there is no sign-up page. |
| **Private account** | `LINGUA_AUTH_USERNAME`, `LINGUA_AUTH_PASSWORD_HASH`, `LINGUA_SESSION_SECRET` set | scrypt password hash, HMAC-signed HttpOnly session cookie, constant-time comparison, 5-attempt/15-min throttle. No external service. |
| **Demo** | Nothing configured, `NODE_ENV !== production` | Fixed public credentials and signing key. For previewing only. Shown with warnings in the login screen, top bar and sidebar. |
| **Disabled** | Production with nothing configured | Sign-in refused. Set `LINGUA_ALLOW_DEMO=true` only if you really want demo mode in production. |

"Keep me signed in" sets a 30-day cookie. Without it the cookie lasts for the browser session (and the token itself expires after 12 hours).

Private-account setup:

```bash
npm run auth:hash -- "a-long-password-of-your-choice"
```

Paste the two printed lines into `.env.local`, add `LINGUA_AUTH_USERNAME=yourname`, and restart.

---

## AI tutor

Without a key, the tutor UI runs fully, but the app says plainly that **no AI model is connected**. Messages are saved locally and you get no fake replies.

**Groq (connected):** set `AI_PROVIDER=groq` and `GROQ_API_KEY` (optional `GROQ_MODEL`, default `openai/gpt-oss-120b`). Tested end-to-end: replies in English and Russian, multi-turn context, Markdown rendering.

**Claude (alternative):** add `ANTHROPIC_API_KEY` to `.env.local` (optional: `AI_MODEL`, default `claude-opus-5-5`; `AI_EFFORT`, default `medium`). The tutor then calls Claude through the official SDK, with server-side refusal fallback enabled.

- Mode instructions: `content/ai/base.md` + `content/ai/modes/*.md` (placeholders like `{{level}}` are filled from settings)
- Mode registry and suggested prompts: `content/ai/modes.json`
- Swap or add providers: implement `AIProvider` in `src/lib/ai/providers/` and register it in `providers/index.ts`

---

## Database (Supabase / PostgreSQL)

- Schema: [`supabase/migrations/20261125000000_initial_schema.sql`](supabase/migrations/20261125000000_initial_schema.sql). It contains every suggested entity, RLS on all learner tables, and a trigger that creates `profiles` and `learning_goals` rows for new users.
- Apply it with `supabase db push` (Supabase CLI) or paste it into the SQL editor.
- **Progress sync (Supabase mode):** all learner progress is saved to `learner_state` (one JSON document per user, RLS-protected) through `/api/state`. Saves use version numbers; if two devices save at the same time, the copies are merged so nothing is lost (`src/lib/store/merge.ts`). A copy is kept in the browser, so the app works offline and uploads changes when the connection returns. The tab pulls the latest copy when it becomes visible. The top bar shows the sync status.
- Apply both migrations in order: `20261125000000_initial_schema.sql`, then `20261125120000_learner_state_sync.sql` (which also adds explicit table grants).

---

## Where to add your materials

See [`content/README.md`](content/README.md). In short:

```
content/
  curriculum/        levels.json, course.json (modules → lessons → blocks)
  daily-plan/        default.json (60-min routine, rotation rules)
  vocabulary/        words.json
  practice/          reading/, listening/, speaking/, writing/
  assessments/       initial.json, weekly.json, progress-14d.json
  rubrics/           writing-general.json, speaking-general.json
  homework/          assignments.json
  library/           resources.json
  ai/                modes.json, base.md, modes/*.md
  samples/           demonstration analytics (only shown in Sample preview)
```

Files marked `"sample": true` show a **Sample content** badge wherever they appear.

---

## Implemented vs not yet implemented

### Implemented and tested
(Tested with Playwright end-to-end runs against both the dev server and a production build.)

- Login: validation, password toggle, remember session, error states, throttling, auth guard (middleware plus a server-side check), sign-out. Demo, private-account and disabled modes tested. Tampered cookies are rejected.
- App shell: sidebar, mobile drawer and bottom tab bar, skip link, loading skeletons, error boundary, 404. Responsive at 390px with no horizontal scroll.
- **Dashboard**: greeting, level, daily goal, streak, words, lessons, today's checklist, weak areas, activity, tutor report.
- **My Learning**: CEFR levels A1–C2 with progress, modules, lesson cards (completed / in progress / available / locked / content pending), skill filter, data-driven lesson player (text, examples, tips, quizzes), sequential unlocking.
- **Daily Plan**: 60-minute plan scaled to your daily duration, alternating rotation blocks, checklist, proportional timeline, focus timer that completes the block, 7-day history.
- **AI Tutor**: 6 modes, per-mode history, suggestions, learning context with "share my stats", connection status, voice placeholder, provider-agnostic API route (`/api/tutor`).
- **Homework**: pending/completed tabs, details, text submission with word-count validation, withdraw/edit, feedback area (sample feedback only in Sample preview).
- **Vocabulary**: cards with IPA, translation (hideable), examples, browser pronunciation, level and status filters, search, flashcard review with keyboard shortcuts and status progression.
- **Reading / Listening**: exercise picker, questions, scoring, results, retry, saved attempts. Listening has a text-to-speech audio preview with speed control and a hidden transcript.
- **Speaking**: prompts, hints, a local microphone recorder (MediaRecorder) with playback, self-review notes, rubric. *The recorder and the browser text-to-speech (Listening, pronunciation) could not be exercised with real audio devices in the headless test environment, so check them in your browser.*
- **Writing**: editor, debounced autosave, live word count with target range, submission validation, rubric, AI feedback placeholder.
- **Progress**: KPIs and charts (weekly activity, initial vs current skills, grammar topics, vocabulary growth, mistakes, assessment history), table view, honest empty states.
- **Assessments**: initial, weekly and 14-day flows (multiple choice and gap fill), per-skill results, answer review, history. A clear disclaimer says these are not a CEFR placement.
- **Library**: category structure, search, metadata schema, empty state with instructions.
- **Settings**: profile (validated), level/target/goal, daily duration, focus skills, exam, interface language (EN/RU navigation), teaching language, notification preferences, sample-preview toggle, JSON export, reset.
- **Sample preview** toggle: demonstration analytics are always badged and bannered. Turn it off to see only your own data.
- Supabase migration, checked against Postgres (PGlite).

- **Progress sync with Supabase**, tested with two browsers on the real project: data appears on the second device, concurrent edits merge, offline changes upload on reconnect, a focused tab pulls fresh data.

### Prepared but not connected (code exists, not verified end-to-end)
- **Anthropic provider**. Type-checked against the SDK, but **no real API call was made** (no key). The Groq provider *is* tested with a real key.

### Not implemented yet
- AI-generated feedback for homework/writing, AI weekly reports, speech-to-text and pronunciation analysis, audio upload.
- Real audio files for listening (TTS preview only), notification delivery, IELTS/TOEFL modules.
- A validated curriculum, item bank and CEFR scoring. **All educational content is demonstration material.**
- Full Russian localisation of page content (navigation and common labels only).

---

## Tech stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui-style primitives (cva + tailwind-merge, in `src/components/ui`) · Recharts · Zod · Supabase (`@supabase/ssr`) · Anthropic SDK · lucide-react. Deploys to Vercel as a standard Next.js app (set the env vars in project settings).

Architecture details: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
