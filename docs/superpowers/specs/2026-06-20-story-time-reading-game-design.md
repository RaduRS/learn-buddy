# Story Time — Reading Game Design

**Date:** 2026-06-20
**Status:** Approved design, pending spec review

## Summary

A new reading game for Year 1 (age ~6) children. The child picks a theme, an AI
writes a short, age-appropriate story (one simple sentence per page, ~8–10
pages), the child reads it at their own pace (free page navigation), then answers
3 simple comprehension questions **out loud**. Spoken answers are transcribed and
judged by AI, producing a score out of 3.

The game reuses the existing shared game look and feel (`GameShell`,
`ResultsScreen`, `LoadingScreen`, `Buddy`, `cat-reading` styling) so it is
consistent with the rest of the app.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Game name | **Story Time** (slug `story-time`, icon `📚`, category `reading`, difficulty `2`) |
| Story source | Child picks a theme, then a fresh story is generated (DeepSeek) |
| Reading help | Pure reading — **no** text-to-speech audio while reading |
| Answering | Verbal only, **one attempt per question**, judged by AI for meaning, score /3 |
| Reading level | Simple full sentences, ~6–10 words per page |
| Mic blocked/unsupported | Friendly explanatory error + retry (cannot score without mic, but no crash) |
| Story persistence | Generated on the fly per play; **not** stored in the DB |
| Judging | One batched DeepSeek call for all 3 answers at "Finish" |

## Reading-level constraints (age 6 / UK Year 1)

The story generator prompt must enforce:
- Simple full sentences, roughly 6–10 words each, one sentence per page.
- Common, high-frequency vocabulary a 6-year-old can decode; avoid rare/long words.
- A clear, gentle narrative arc (beginning → middle → happy ending) on the chosen theme.
- Kid-safe content only: no violence, fear, death, or scary imagery.
- 3 **literal recall** comprehension questions (who / what / where / what happened),
  each with a short `expectedAnswer` for the judge to compare against.

## Game flow (5 phases)

All phases render inside `GameShell` (title "Story Time", `category="reading"`).

1. **Theme picker** — grid of ~6 themed tiles. Tapping one starts generation.
   - Themes: 🐾 Animals, 🚀 Space, 🏴‍☠️ Pirates, 🦕 Dinosaurs, 🌊 Under the Sea, 🧚 Magic.
2. **Loading** — `LoadingScreen tone="thinking"` while the story is generated (~5–10s).
   On generation failure: friendly error + "Try again" (returns to theme picker).
3. **Reader** — one sentence per page, large readable text.
   - Back / Next buttons + page dots; child can jump between any pages freely.
   - "Questions →" button is disabled until the child has reached the last page at
     least once, then stays enabled.
4. **Questions** — the 3 questions, each on its own card with a 🎤 **Record answer**
   button (tap to start, tap to stop). After stopping, the audio is transcribed and
   "You said: …" appears under that question. Each question is recorded **once**.
   - A **Finish** button is enabled once all 3 have a transcript; it judges all 3.
5. **Results** — `ResultsScreen` with score out of 3 and a one-line note per
   question (correct/!correct + short feedback). "Play Again" returns to the theme
   picker; "Home" exits.

## Architecture

### New component
`components/game/ReadingStoryGame.tsx`
- Props: standard `{ userId, gameId, userAge, onGameComplete }` (matches other games
  via the registry adapter).
- Holds phase state machine: `theme | loading | reading | questions | results`.
- Holds: chosen theme, generated story (`{ title, pages[], questions[] }`), current
  page index, per-question recordings/transcripts, judged verdicts.
- Calls `incrementScore(gameId, score)` and `onGameComplete(score, 3)` at results,
  matching existing games.

### New hook
`hooks/useAudioRecorder.ts`
- Wraps `navigator.mediaDevices.getUserMedia` + `MediaRecorder`.
- API: `{ isSupported, isRecording, start(), stop(): Promise<Blob>, error }`.
- Produces an audio `Blob` (`audio/webm` / opus, whatever the browser yields).
- Surfaces a permission/unsupported error so the UI can show the friendly retry.

### New API routes (all server-side, keys never reach the client)

1. `POST /api/ai/generate-story`
   - Input: `{ theme: string, age: number }`.
   - Calls DeepSeek (`deepseek-chat`, `https://api.deepseek.com/chat/completions`,
     `Authorization: Bearer $DEEPSEEK_API_KEY`), reusing the existing prompt/parse
     pattern (strip ``` fences, `JSON.parse`).
   - Output: `{ title: string, pages: string[], questions: { q: string, expectedAnswer: string }[] }`.
   - Validates: 8–10 pages, exactly 3 questions; returns 502 on malformed AI output.

2. `POST /api/ai/reading-stt`
   - Input: raw audio body (the recorded `Blob`), `Content-Type` from the blob.
   - Calls Deepgram `https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true`,
     `Authorization: Token $DEEPGRAM_API_KEY`, body = audio bytes.
   - Output: `{ transcript: string }` (best alternative).

3. `POST /api/ai/reading-judge`
   - Input: `{ storyTitle, answers: { question, expectedAnswer, transcript }[] }`.
   - Calls DeepSeek; system framing: the speaker is a 6-year-old and the transcript
     may be imperfect — judge **meaning generously**, not exact wording.
   - Output: `{ results: { correct: boolean, feedback: string }[] }` (length 3).

### Registration (existing patterns)
- `lib/games/registry.tsx`: add `ReadingStoryAdapter(ctx)` → `<ReadingStoryGame {...} />`
  and `"story-time": { title: "Story Time", category: "reading", Component: ReadingStoryAdapter }`.
- `scripts/seed.ts`: add a Game record
  `{ title: "Story Time", description: "...", icon: "📚", category: "reading", difficulty: 2, isActive: true }`.
- `lib/games/categories.ts`: no change — `reading` category already exists.
- `prisma/schema.prisma`: no change — existing `Game` model covers it.

## Data flow

```
Theme tap
  → POST /api/ai/generate-story { theme, age }
  → { title, pages[], questions[{q, expectedAnswer}] }
  → render Reader (pages)
  → render Questions (questions[].q)
Per question:
  record (MediaRecorder) → Blob
  → POST /api/ai/reading-stt (audio) → { transcript }
  → show "You said: <transcript>"
Finish:
  → POST /api/ai/reading-judge { storyTitle, answers:[{question, expectedAnswer, transcript}] }
  → { results:[{correct, feedback}] }
  → score = count(correct); ResultsScreen(score, 3)
  → incrementScore(gameId, score); onGameComplete(score, 3)
```

## Error handling

- **Story generation fails / malformed**: friendly error card + "Try again" → theme picker.
- **Mic blocked or unsupported**: explanatory message + button to grant/retry; no
  scoring path without audio (does not crash).
- **STT fails for a recording**: allow re-record of that one question (this is the
  transcription step, not a second scoring attempt).
- **Judge call fails**: friendly error + retry of the judge step (transcripts kept).
- All API routes validate inputs and return clear non-200s with messages; the client
  shows kid-friendly copy, never raw errors.

## Out of scope (YAGNI)

- Storing/replaying past stories or a story library.
- Text-to-speech reading help (explicitly declined).
- Tap-to-answer multiple-choice fallback.
- Difficulty adaptation by age beyond the fixed Year-1 prompt.
- Per-word tap-to-sound-out.

## Testing

- `useAudioRecorder`: unit test support detection and start/stop returning a Blob
  (mock `MediaRecorder`/`getUserMedia`).
- API routes: unit test request validation and response parsing with mocked
  DeepSeek/Deepgram fetch (success + malformed + upstream-error cases).
- `generate-story` parsing: handles fenced JSON and rejects wrong page/question counts.
- Manual: full play-through on device (mic permission, recording, judging) — the
  speech path can't be meaningfully unit-tested end to end.
