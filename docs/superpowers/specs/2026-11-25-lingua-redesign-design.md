# LINGUA redesign — design concept

## Intent
LINGUA must read as a real, finished education product for one learner (soon a few first students),
not a generated dashboard. Add a public website, a Light/Dark/System theme, and rework the platform's
composition. Keep the stack, data, Supabase auth and sync.

## Subject → visual idea
Learning a language happens *on the page*: a sentence, a correction, a note in the margin, a word
with its transcription. LINGUA's visual language is the **annotated page**:

- **Two voices of type.** The language being learned (English examples, words, reading texts,
  corrections) is set in **Literata**, a reading serif with italics and Cyrillic. The tool itself
  (navigation, labels, buttons, numbers) is set in **Onest**, a quiet Cyrillic-ready grotesk.
  The serif/sans switch carries meaning: serif = English to learn, sans = interface.
- **The correction mark** is the brand's one bold gesture: a struck-through mistake with the fix set
  above it and a short note in the margin. It opens the landing page as a live, typographic moment
  and appears wherever the product corrects you (tutor, homework feedback, assessment review).
- **Paper and ink, not panels.** Sections are separated by space and hairline rules, not boxed.
  Cards exist only for real objects: word cards, lesson cards, the timer. Purple is ink for actions,
  progress and focus. It is not used for borders around everything.

## Tokens
| Role | Light | Dark |
|---|---|---|
| Page (`bg`) | `#F1EFF3` milky lilac-grey | `#18171C` soft graphite |
| Surface (`surface`) | `#F7F6F9` | `#1F1D24` |
| Object (`card`) | `#FBFAFC` (never #FFF) | `#26232C` |
| Ink (`fg`) | `#23212A` graphite | `#ECE9F1` |
| Secondary (`muted`) | `#6B6577` grey-lilac | `#A59FB0` |
| Accent fill (`accent`) | `#5E45B8` | `#8C6EE6` |
| Accent text (`accent-soft` → ink) | `#5A41B0` | `#B8A3F5` |
| Accent wash | `#E7E1F6` | `rgba(140,110,230,.16)` |
| Lines | `#E2DEE7` / strong `#CFC9D7` | `#302D37` / `#423E4B` |

Status colours are muted and theme-tuned (success, warning, danger, info). Shadows exist only in light
theme and only for lifted objects. Radius hierarchy: 6px for controls, 12px for objects, full for chips.

Type scale (Onest): 13 / 15 / 17 / 21 / 28 / 40 / 56–72 px, tight tracking on display sizes.
Literata for reading at 17–19 px with 1.7 line-height; lines are kept under about 70 characters.

## Layout
- **Landing:** left-aligned editorial grid on 12 columns. The hero has the headline on the left and,
  on the right, a "lesson sheet" assembled from real UI pieces (corrected sentence, word card,
  today's plan). Sections alternate between text-led and object-led compositions. There is no
  repeating card grid: principles are a numbered sequence only where order matters (How it works);
  skills are a typographic index; CEFR is one horizontal ladder; the tutor is a single dialogue.
- **Platform:** a quiet sidebar (text-led, small icons), with a content column built from sections
  and hairline rules. The dashboard is a page from a notebook: greeting and goal, one large
  Continue action, today's plan as a timeline strip, skills as a list with fine bars, recent
  results, and a next-step recommendation.

## Motion (Motion library)
One orchestrated moment on the landing: the correction mark draws itself. Everything else answers
the user: page fade, progress fills, completion checkmarks, theme cross-fade (View Transitions where
supported). `prefers-reduced-motion` disables all of it.

## Navigation
`/` landing (public; the CTA changes to "Open dashboard" when signed in) → `/login` → `/dashboard`.
No public sign-up. Supabase auth and sync are unchanged.

## Telegram-ready
Vocabulary review logic moves into a UI-free module (`src/lib/vocab`). Words (content) stay
separate from progress (state). A read API `/api/v1/vocabulary` serves words plus the learner's
statuses for future clients. No bot or Mini App is built now.

## Non-goals and anti-goals
- No gradients, glows, glass or stock photos. No fake stats, testimonials or "fluent in 30 days".
- Not a rewrite: keep routes, data, store, auth and sync.

## Stages
1. Tokens and themes
2. Primitives
3. Landing
4. Routing
5. Platform pages
6. Motion
7. QA in both themes and three viewports
