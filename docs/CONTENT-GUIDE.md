# Adding learning content

Content is data: one JSON file per lesson in `content/lessons/`. The app reads the folder at runtime — no code
or UI changes. Format: `src/lib/lessons/schema.ts` (13 block types, 6 stages, adaptive branches), standard:
`docs/curriculum/11-lesson-standard.md`.

## Workflow

```bash
npm run lessons -- new a1-m1-l01 --module A1-M1 --type A   # draft skeleton in content/lessons/drafts/
# fill every TODO (original texts only — never copy textbooks, 00 §7)
npm run lessons -- validate content/lessons/drafts          # schema + structure + editorial checks
npm run lessons -- import content/lessons/drafts            # copies valid files into content/lessons/
npm run lessons -- modules                                  # readiness per catalog module
npm run content:check && npm test                           # before committing
```

- `status`: `draft` → `demo` → `reviewed` → `published`. A module counts as ready in the learner's route when it has
  as many `reviewed`/`published` lessons as the catalog says (default 12) — the route switches automatically.
- Changing a published lesson: increase `version` (stored attempts keep pointing to the old version); `import`
  refuses an equal or lower version unless `--force`.
- Listening scripts are voiced by the browser for now; see `docs/VOICE-AND-AI-RESEARCH.md` for natural audio.
- The first full module is chosen after the owner's diagnostic.
