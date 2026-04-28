# Learn Buddy — UI & Code Revamp Design

**Date:** 2026-04-28
**Goal:** Transform the kids' learning PWA from a "junior-dev"-feeling shadcn/pastel app into a phenomenal arcade-cartoon experience, while cleaning up real code debt and preserving every existing user score and achievement.

---

## North Star

- **Audience:** kids on iPad / tablet (PWA, online-only for now).
- **Aesthetic:** arcade game-show energy (bold, saturated, celebratory) with cartoon warmth (a friendly recurring mascot named **Buddy**).
- **Constraints:** preserve all 10 games' core mechanics; preserve all existing scores/achievements in the DB; SEO is not a concern.

---

## Scope Decisions

| Topic | Decision |
|---|---|
| Visual direction | Arcade game-show (primary) + cartoon warmth (Khan/Duolingo-style) |
| Mascot | Single recurring Buddy character, animated SVG |
| Code refactor depth | **Medium**: GameShell + registry + dynamic imports + shared hooks. No file-splitting of giant game components. |
| PWA depth | **Install polish only**: splash screens, home-screen shortcuts, app-shell caching. No offline gameplay. |
| Sound | **Full SFX layer** (taps, correct, wrong, level-up, finish) + **header mute toggle** persisted in localStorage. |
| Rollout | **Hybrid 3-phase** (foundation → shell screens → per-game polish + fixes). |

---

## User-Reported Pain Points (must be addressed)

1. Repeated title/subtitle text across screens.
2. User profile / account dialog has overlapping/squashed text.
3. `GameProgress.level` field is non-functional / not displayed correctly.
4. Point-add logic could be improved (but **all existing scores must be preserved**).
5. Music Maker is too shallow — doesn't actually teach anything.
6. Trophy/cup visuals on the achievements page look poor.
7. Overall stale, "junior-dev" feel; soft pastel monotony; generic loading/result cards.

---

## Section 1 — Visual System

**Tokens (in `app/globals.css`)**

- Surfaces: `--surface-bg` (deep navy-violet), `--surface-card` (softer indigo gradient).
- Five category channels with `-base / -glow / -ink`:
  - **Math** electric blue, **Memory** magenta, **Reading** sunshine yellow-orange, **Music** mint green, **Spatial/Puzzle** coral red.
- Joy: `--joy-gold` (trophies/score), `--joy-correct` (vivid green), `--joy-wrong` (warm red — never harsh).
- All colors in OKLCH for predictable contrast.
- Single arcade-night theme (no light/dark split).

**Type**

- Body: keep Geist (already loaded).
- Display: add **Fredoka** (rounded, friendly) for headlines, scores, game titles.
- Two fonts max.

**Surfaces**

- Cards: `--radius: 1.5rem`, 2px inset top highlight, soft drop shadow tinted by category color.

**Motion**

- One shared spring curve.
- Tap: `scale(0.96)` press-in.
- Card hover/long-press: gentle tilt + lift.
- Correct: green pulse + Buddy thumbs-up + chime.
- Wrong: red shake (generalized from existing puzzle shake) + Buddy "try again" + soft buzz.
- Level-up / finish: confetti + Buddy celebrate + jingle.
- Always respects `prefers-reduced-motion`.

**Buddy mascot**

- Pure SVG, one component: `<Buddy mood="idle | cheer | wave | think | sad | celebrate" size="sm | md | lg" />`.
- Lives in: home hero, loading screens (replaces generic skeleton spinner), success/failure cards, empty states, splash.

**Background**

- One shared layout component paints the arcade backdrop — eliminates the 8 duplicated `bg-gradient-to-br…` blocks.

---

## Section 2 — Architecture & Shared Building Blocks

| Piece | Purpose | Location |
|---|---|---|
| `<GameShell>` | Single wrapper for every game page; owns backdrop, header, back button, score chip, mute, mascot slot | `components/game/GameShell.tsx` |
| `<LoadingScreen>` | Replaces 7 different "loading…" / "preparing your X" variants; Buddy spinning instead of a skeleton; `tone` prop varies copy | `components/game/LoadingScreen.tsx` |
| `<ResultsScreen>` | Replaces 6 duplicated trophy + Play-Again cards; Buddy reaction by score band; confetti for high band | `components/game/ResultsScreen.tsx` |
| Game registry | Replaces 10-way `if/else` in `app/game/[gameId]/page.tsx`; entries declare `lazy(() => import(...))` so each game is an async chunk | `lib/games/registry.ts` |
| `useGameTimer` | Shared timer hook (used by MemoryMatch, Subitizing) | `hooks/useGameTimer.ts` |
| `useGameQuestions<Q>` | Owns currentIndex/score/nextQuestion/dedupe/retries (used by TrueFalse, NumberFun, Subitizing, MathSpark) | `hooks/useGameQuestions.ts` |
| `useAchievementUnlock` | Single POST helper used by 6 games | `hooks/useAchievementUnlock.ts` |
| `<SoundProvider>` + `useSfx()` | Lazy-loaded SFX layer; `play('tap'\|'correct'\|...)`; mute persisted | `components/sound/SoundProvider.tsx` |
| `<Buddy>` | The mascot SVG component | `components/mascot/Buddy.tsx` |

**Outcomes**

- 8 gradient duplicates → 0
- 7 loading variants → 1
- 6 result-screen variants → 1
- 10-way dispatch → registry-driven
- Eager game imports → lazy-loaded chunks
- Game component LOC drops ~15–25% with no logic changes.

---

## Section 3 — Shell Screens (Phase 2)

- **Home (`app/page.tsx`)**: hero with Buddy waving, "Hi, {name}!" line, daily-streak chip (next milestone shown), category-tinted game cards in a chunky grid, locked games look intentional (not faded-out broken).
- **Game page (`app/game/[gameId]/page.tsx`)**: registry-driven, `<Suspense fallback={<LoadingScreen .../>}>`, no more if/else.
- **Achievements (`app/achievements/page.tsx`)**: redrawn trophies (see Section 5), category-grouped, progress rings to next tier.
- **User dialog (`components/user/UserSelectionDialog.tsx`)**: fixes the overlap/squash issue, larger touch targets, profile cards with avatar slots and "create new" tile.
- **Header**: dedupes title/subtitle (currently rendered both in header *and* in mobile sheet); adds mute toggle.

---

## Section 4 — Music Maker Rebuild

Current state: 4 modes (free play, note recognition, rhythm game, melody maker), 714 lines, "doesn't help kids learn anything."

**Redesign goals**

- Teach **note names** (C–B), **basic rhythm** (quarter/half/whole), and **simple melodies** through guided play, not free-form noodling.
- Three structured **lessons** the kid completes in order, then unlock **free play** as a reward:
  1. **Sing the Notes** — a key lights up, Buddy sings the note name; child taps it; repeat 8 times across the octave; ear-training.
  2. **Match the Rhythm** — Buddy claps a pattern (visual + audio); child taps the pattern back on a single big drum.
  3. **Play the Song** — Twinkle Twinkle / Mary Had a Little Lamb walked through note by note, with the next key glowing; finishes with kid playing it solo with no glow.
- Free-play mode preserved as the "playground" unlocked after lessons.

**Implementation**

- Stays in `MusicLearningGame.tsx` (medium refactor — does not split file unless necessary).
- Rhythm game and melody maker modes are removed/replaced; free play and note recognition are kept and reframed inside the lesson structure.

---

## Section 5 — Targeted Fixes

- **Trophies redrawn**: replace the current TrophyCup with a chunky cartoon trophy (SVG), three tiers (bronze/silver/gold) with animated fill that doesn't look like a thermometer; add small star burst on tier-up.
- **User dialog overlap**: rebuild layout with vertical stack on small widths, two-column on tablet, generous padding, no overlapping text on the avatar/name row.
- **`level` field**: either wire it up (display "Level X" on game cards once `bestScore` crosses thresholds) or remove the UI references that mention it. Decision during implementation: keep the field, derive a level from `totalScore` per game, display it on cards. **No DB migration needed; no data destruction.**
- **Point-add logic**: switch from "POST per point" to "POST batched at game end" via a single `/api/game-progress` call with `{ delta }`. Existing endpoint already accepts `score`. Preserve all current rows. Optimistic UI in `useScore` keeps the chip feeling instant.
- **Repeated title/subtitle**: removed by `<GameShell>` and the new `Header`.

---

## Section 6 — PWA Install Polish

- **Splash screens** for iPad portrait & landscape (two PNGs covering common iPad sizes), referenced from the manifest and `<link rel="apple-touch-startup-image">`.
- **`shortcuts`** in `manifest.json` for top 3 games (deep-links into `/game/<id>`).
- **App-shell caching**: existing `next-pwa` already handles this; we'll verify the SW precaches the home and game routes so the app *opens* offline (games still need the network).
- **No offline game logic** — out of scope per decision.

---

## Section 7 — Testing / Verification

- **Manual smoke pass** on each of the 10 games after Phase 3 migration: load → play → finish → score persists → achievement unlock.
- **iPad PWA install pass**: install to home screen, verify splash, verify shortcuts, verify mute persists across launches.
- **Score-preservation check**: before & after Phase 3, snapshot `GameProgress.totalScore` for each (user, game) pair via the API, confirm equality after the new save path.
- **Lighthouse pass** on home + a game page: confirm bundle reduction (lazy imports), CLS/LCP within reasonable budget.

---

## Phased Rollout

**Phase 1 — Foundation (no visible UI change yet, but the stage is set):**
1. Design tokens, fonts, motion utilities in `globals.css`.
2. `<Buddy>`, `<SoundProvider>` + audio assets.
3. `<GameShell>`, `<LoadingScreen>`, `<ResultsScreen>`.
4. `lib/games/registry.ts` + lazy imports.
5. Shared hooks (`useGameTimer`, `useGameQuestions`, `useAchievementUnlock`).
6. Refactor `app/game/[gameId]/page.tsx` to registry-driven.

**Phase 2 — Shell screens:**
1. New `Header` (dedupes title/subtitle, adds mute).
2. New `Home` page.
3. New `Achievements` page (with redrawn trophies).
4. Fixed `UserSelectionDialog`.

**Phase 3 — Per-game polish + targeted fixes + PWA:**
1. Each game adopts `GameShell` / `LoadingScreen` / `ResultsScreen` / shared hooks.
2. Music Maker rebuild.
3. `level` field wiring; batched point save (preserves existing data).
4. PWA splash + shortcuts + app-shell cache verification.
5. Manual smoke pass and score-preservation check.

---

## Things This Spec Explicitly Does NOT Do

- No SEO work.
- No offline gameplay.
- No backend schema migrations.
- No multiplayer / leaderboards / parental dashboards.
- No splitting of `MusicLearningGame.tsx`, `PuzzleGame.tsx`, or `SubitizingGame.tsx` into multiple files (left as-is unless strictly needed).
- No removal of the ReadingHelper password gate or MathSpark logic.
