# Story Time Reading Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Story Time" reading game where a Year-1 child picks a theme, reads an AI-generated short story (one sentence per page), then answers 3 comprehension questions out loud, scored by AI.

**Architecture:** A single client component (`ReadingStoryGame`) drives a 5-phase state machine (theme → reading → questions → results). It calls three new server routes: `generate-story` (DeepSeek writes the story), `reading-stt` (Deepgram transcribes spoken answers), and `reading-judge` (DeepSeek marks the answers). A new `useAudioRecorder` hook wraps `MediaRecorder`. The game registers through the existing registry/seed pattern; no DB schema change.

**Tech Stack:** Next.js App Router (route handlers), React client components, DeepSeek chat API, Deepgram `/v1/listen` + existing styling system (`surface-card`, `cat-reading`, `GameShell`, `ResultsScreen`, `LoadingScreen`, `Buddy`).

**Testing note:** This repo has no test framework and no existing tests. Per project decision, each task is verified with `npx tsc --noEmit` (typecheck), `npx eslint <files>` (lint), and a manual play-through at the end — not automated unit tests.

**Conventions:** Commit messages end with the trailer:
```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```
Commit directly to `main` (project preference).

---

### Task 1: Shared story types and theme list

**Files:**
- Create: `lib/games/storyTime.ts`

- [ ] **Step 1: Create the shared types and constants**

```typescript
// lib/games/storyTime.ts

export interface StoryQuestion {
  q: string;
  expectedAnswer: string;
}

export interface Story {
  title: string;
  pages: string[];
  questions: StoryQuestion[];
}

export interface JudgeResult {
  correct: boolean;
  feedback: string;
}

export interface StoryTheme {
  id: string;
  label: string;
  emoji: string;
  /** Phrase injected into the generation prompt. */
  prompt: string;
}

export const STORY_THEMES: StoryTheme[] = [
  { id: "animals", label: "Animals", emoji: "🐾", prompt: "friendly animals" },
  { id: "space", label: "Space", emoji: "🚀", prompt: "a happy space adventure with planets and rockets" },
  { id: "pirates", label: "Pirates", emoji: "🏴‍☠️", prompt: "friendly pirates looking for treasure" },
  { id: "dinosaurs", label: "Dinosaurs", emoji: "🦕", prompt: "gentle, friendly dinosaurs" },
  { id: "under-the-sea", label: "Under the Sea", emoji: "🌊", prompt: "kind sea creatures under the sea" },
  { id: "magic", label: "Magic", emoji: "🧚", prompt: "a gentle magical fairy tale" },
];

export const STORY_PAGE_MIN = 8;
export const STORY_PAGE_MAX = 10;
export const STORY_QUESTION_COUNT = 3;
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/games/storyTime.ts
git commit -m "feat(reading): shared Story Time types and themes

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Story generation route (DeepSeek)

**Files:**
- Create: `app/api/ai/generate-story/route.ts`

Mirrors the DeepSeek pattern in `app/api/ai/generate-question/route.ts` (Bearer auth, `deepseek-chat`, fenced-JSON parse).

- [ ] **Step 1: Create the route**

```typescript
// app/api/ai/generate-story/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  STORY_PAGE_MIN,
  STORY_PAGE_MAX,
  STORY_QUESTION_COUNT,
  type Story,
} from "@/lib/games/storyTime";

function parseJsonLoose(content: string): unknown {
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  }
  return JSON.parse(cleaned);
}

export async function POST(request: NextRequest) {
  try {
    const { theme, age } = await request.json();

    if (!theme || typeof theme !== "string") {
      return NextResponse.json({ error: "Theme is required" }, { status: 400 });
    }
    const childAge = typeof age === "number" && age >= 3 && age <= 12 ? age : 6;

    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    const deepseekApiUrl =
      process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/chat/completions";
    if (!deepseekApiKey) {
      return NextResponse.json(
        { error: "DeepSeek API key not configured" },
        { status: 500 },
      );
    }

    const prompt = `Write a short story for a ${childAge}-year-old child (UK Year 1) about ${theme}.

Rules for the story:
- Between ${STORY_PAGE_MIN} and ${STORY_PAGE_MAX} pages. Each page is ONE simple sentence of about 6 to 10 words.
- Use common, easy words a 6-year-old can read. Avoid long or rare words.
- A clear, gentle story: a beginning, a middle, and a happy ending.
- Completely kid-safe: no violence, nothing scary, no death.

Then write exactly ${STORY_QUESTION_COUNT} very simple questions about the story.
- Each question asks about something that literally happened (who, what, or where).
- For each question include a short correct answer of a few words.

Respond with ONLY a JSON object, no extra text, in this exact shape:
{
  "title": "short story title",
  "pages": ["sentence one.", "sentence two."],
  "questions": [
    { "q": "question text?", "expectedAnswer": "short answer" }
  ]
}`;

    const response = await fetch(deepseekApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
        max_tokens: 900,
      }),
    });

    if (!response.ok) {
      console.error("DeepSeek story error:", response.status);
      return NextResponse.json({ error: "Failed to generate story" }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No story received" }, { status: 502 });
    }

    let story: Story;
    try {
      story = parseJsonLoose(content) as Story;
    } catch {
      console.error("Failed to parse story JSON:", content);
      return NextResponse.json({ error: "Invalid story format" }, { status: 502 });
    }

    const validPages =
      Array.isArray(story.pages) &&
      story.pages.length >= STORY_PAGE_MIN &&
      story.pages.length <= STORY_PAGE_MAX &&
      story.pages.every((p) => typeof p === "string" && p.trim().length > 0);
    const validQuestions =
      Array.isArray(story.questions) &&
      story.questions.length === STORY_QUESTION_COUNT &&
      story.questions.every(
        (qq) =>
          qq && typeof qq.q === "string" && typeof qq.expectedAnswer === "string",
      );
    if (!story.title || !validPages || !validQuestions) {
      console.error("Story failed validation:", story);
      return NextResponse.json({ error: "Invalid story content" }, { status: 502 });
    }

    return NextResponse.json(story);
  } catch (error) {
    console.error("Error generating story:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npx eslint app/api/ai/generate-story/route.ts`
Expected: clean (no errors).

- [ ] **Step 4: Commit**

```bash
git add app/api/ai/generate-story/route.ts
git commit -m "feat(reading): generate-story DeepSeek route

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Speech-to-text route (Deepgram)

**Files:**
- Create: `app/api/ai/reading-stt/route.ts`

Mirrors the Deepgram `Token` auth pattern in `app/api/ai/reading-audio/route.ts`, but calls `/v1/listen` (STT) and forwards the raw audio body.

- [ ] **Step 1: Create the route**

```typescript
// app/api/ai/reading-stt/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramApiKey) {
      return NextResponse.json(
        { error: "Deepgram API key not configured" },
        { status: 500 },
      );
    }

    const contentType = request.headers.get("content-type") || "audio/webm";
    const audio = await request.arrayBuffer();
    if (!audio || audio.byteLength === 0) {
      return NextResponse.json({ error: "No audio received" }, { status: 400 });
    }

    const sttUrl = new URL("https://api.deepgram.com/v1/listen");
    sttUrl.searchParams.set("model", "nova-2");
    sttUrl.searchParams.set("smart_format", "true");
    sttUrl.searchParams.set("punctuate", "true");

    const dgResponse = await fetch(sttUrl.toString(), {
      method: "POST",
      headers: {
        Authorization: `Token ${deepgramApiKey}`,
        "Content-Type": contentType,
      },
      body: audio,
    });

    if (!dgResponse.ok) {
      const errText = await dgResponse.text();
      console.error("Deepgram STT error:", dgResponse.status, errText);
      return NextResponse.json(
        { error: "Failed to transcribe audio" },
        { status: dgResponse.status >= 500 ? 502 : dgResponse.status },
      );
    }

    const data = await dgResponse.json();
    const transcript: string =
      data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";

    return NextResponse.json({ transcript: transcript.trim() });
  } catch (error) {
    console.error("Error in reading STT API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npx eslint app/api/ai/reading-stt/route.ts`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/api/ai/reading-stt/route.ts
git commit -m "feat(reading): Deepgram speech-to-text route

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Answer-judging route (DeepSeek)

**Files:**
- Create: `app/api/ai/reading-judge/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/ai/reading-judge/route.ts
import { NextRequest, NextResponse } from "next/server";
import { type JudgeResult } from "@/lib/games/storyTime";

interface JudgeAnswer {
  question: string;
  expectedAnswer: string;
  transcript: string;
}

function parseJsonLoose(content: string): unknown {
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  }
  return JSON.parse(cleaned);
}

export async function POST(request: NextRequest) {
  try {
    const { storyTitle, answers } = await request.json();
    if (!Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: "Answers are required" }, { status: 400 });
    }

    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    const deepseekApiUrl =
      process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/chat/completions";
    if (!deepseekApiKey) {
      return NextResponse.json(
        { error: "DeepSeek API key not configured" },
        { status: 500 },
      );
    }

    const items = (answers as JudgeAnswer[])
      .map(
        (a, i) =>
          `${i + 1}. Question: "${a.question}"\n   Correct answer: "${a.expectedAnswer}"\n   Child said: "${a.transcript}"`,
      )
      .join("\n");

    const prompt = `You are kindly marking a 6-year-old child's spoken answers about a story titled "${storyTitle ?? "the story"}".
The "Child said" text comes from speech-to-text and may be slightly wrong or misspelled.
Judge by MEANING, not exact words. Be generous: if the child clearly understood, mark it correct.

Here are the answers:
${items}

Respond with ONLY a JSON object in this exact shape (one result per question, in the same order):
{ "results": [ { "correct": true, "feedback": "short kind one-line note" } ] }`;

    const response = await fetch(deepseekApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      console.error("DeepSeek judge error:", response.status);
      return NextResponse.json({ error: "Failed to judge answers" }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No judgement received" }, { status: 502 });
    }

    let parsed: { results?: JudgeResult[] };
    try {
      parsed = parseJsonLoose(content) as { results?: JudgeResult[] };
    } catch {
      console.error("Failed to parse judge JSON:", content);
      return NextResponse.json({ error: "Invalid judgement format" }, { status: 502 });
    }

    const results = Array.isArray(parsed.results) ? parsed.results : [];
    if (results.length !== answers.length) {
      return NextResponse.json({ error: "Judgement count mismatch" }, { status: 502 });
    }

    const normalized: JudgeResult[] = results.map((r) => ({
      correct: Boolean(r?.correct),
      feedback: typeof r?.feedback === "string" ? r.feedback : "",
    }));

    return NextResponse.json({ results: normalized });
  } catch (error) {
    console.error("Error judging answers:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npx eslint app/api/ai/reading-judge/route.ts`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/api/ai/reading-judge/route.ts
git commit -m "feat(reading): DeepSeek answer-judging route

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Microphone recorder hook

**Files:**
- Create: `hooks/useAudioRecorder.ts`

First browser audio recording in the app. Single-instance (only one question records at a time).

- [ ] **Step 1: Create the hook**

```typescript
// hooks/useAudioRecorder.ts
"use client";

import { useCallback, useRef, useState } from "react";

interface UseAudioRecorder {
  isSupported: boolean;
  isRecording: boolean;
  /** null = no error; "denied" = permission refused; "unsupported" = no API. */
  error: "denied" | "unsupported" | null;
  start: () => Promise<void>;
  stop: () => Promise<Blob | null>;
}

export function useAudioRecorder(): UseAudioRecorder {
  const isSupported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function" &&
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined";

  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<"denied" | "unsupported" | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    setError(null);
    if (!isSupported) {
      setError("unsupported");
      throw new Error("Audio recording not supported");
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setError("denied");
      throw new Error("Microphone permission denied");
    }
  }, [isSupported]);

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder) {
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setIsRecording(false);
        resolve(blob.size > 0 ? blob : null);
      };
      recorder.stop();
    });
  }, []);

  return { isSupported, isRecording, error, start, stop };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npx eslint hooks/useAudioRecorder.ts`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add hooks/useAudioRecorder.ts
git commit -m "feat(reading): useAudioRecorder mic hook

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: ReadingStoryGame component

**Files:**
- Create: `components/game/ReadingStoryGame.tsx`

A client component returning inner content only (the page wraps games in `GameShell`, so do NOT wrap GameShell here — see `app/game/[gameId]/page.tsx`).

- [ ] **Step 1: Create the component**

```tsx
// components/game/ReadingStoryGame.tsx
"use client";

import { useCallback, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mic,
  Square,
} from "lucide-react";
import { ResultsScreen } from "@/components/game/ResultsScreen";
import { LoadingScreen } from "@/components/game/LoadingScreen";
import { Buddy } from "@/components/mascot/Buddy";
import { useScore } from "@/hooks/useScore";
import { useSfx } from "@/components/sound/SoundProvider";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { cn } from "@/lib/utils";
import {
  STORY_THEMES,
  STORY_QUESTION_COUNT,
  type Story,
  type JudgeResult,
  type StoryTheme,
} from "@/lib/games/storyTime";

interface ReadingStoryGameProps {
  userId: string;
  gameId: string;
  userAge: number;
  onGameComplete: (score: number, totalQuestions: number) => void;
}

type Phase =
  | "theme"
  | "loading"
  | "reading"
  | "questions"
  | "judging"
  | "results"
  | "error";

interface AnswerState {
  transcript: string | null;
  transcribing: boolean;
}

export default function ReadingStoryGame({
  gameId,
  userAge,
  onGameComplete,
}: ReadingStoryGameProps) {
  const { incrementScore } = useScore();
  const { play } = useSfx();
  const recorder = useAudioRecorder();

  const [phase, setPhase] = useState<Phase>("theme");
  const [story, setStory] = useState<Story | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [activeRecording, setActiveRecording] = useState<number | null>(null);
  const [results, setResults] = useState<JudgeResult[] | null>(null);
  const [score, setScore] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const pickTheme = useCallback(
    async (theme: StoryTheme) => {
      play("tap");
      setPhase("loading");
      setErrorMsg("");
      try {
        const res = await fetch("/api/ai/generate-story", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: theme.prompt, age: userAge }),
        });
        if (!res.ok) throw new Error("generate failed");
        const data = (await res.json()) as Story;
        setStory(data);
        setPageIndex(0);
        setAnswers(
          Array.from({ length: data.questions.length }, () => ({
            transcript: null,
            transcribing: false,
          })),
        );
        setResults(null);
        setScore(0);
        setPhase("reading");
      } catch {
        setErrorMsg("Buddy couldn't write a story this time.");
        setPhase("error");
      }
    },
    [play, userAge],
  );

  const goPage = useCallback(
    (next: number) => {
      if (!story) return;
      play("tap");
      const clamped = Math.max(0, Math.min(story.pages.length - 1, next));
      setPageIndex(clamped);
    },
    [story, play],
  );

  const toggleRecording = useCallback(
    async (i: number) => {
      if (activeRecording === i) {
        const blob = await recorder.stop();
        setActiveRecording(null);
        if (!blob) return;
        setAnswers((prev) =>
          prev.map((a, idx) => (idx === i ? { ...a, transcribing: true } : a)),
        );
        try {
          const res = await fetch("/api/ai/reading-stt", {
            method: "POST",
            headers: { "Content-Type": blob.type || "audio/webm" },
            body: blob,
          });
          if (!res.ok) throw new Error("stt failed");
          const data = (await res.json()) as { transcript: string };
          play(data.transcript ? "correct" : "wrong");
          setAnswers((prev) =>
            prev.map((a, idx) =>
              idx === i
                ? { transcript: data.transcript, transcribing: false }
                : a,
            ),
          );
        } catch {
          setAnswers((prev) =>
            prev.map((a, idx) =>
              idx === i ? { transcript: null, transcribing: false } : a,
            ),
          );
        }
      } else {
        play("tap");
        try {
          await recorder.start();
          setActiveRecording(i);
        } catch {
          setActiveRecording(null);
        }
      }
    },
    [activeRecording, recorder, play],
  );

  const finish = useCallback(async () => {
    if (!story) return;
    play("tap");
    setPhase("judging");
    try {
      const payload = {
        storyTitle: story.title,
        answers: story.questions.map((q, i) => ({
          question: q.q,
          expectedAnswer: q.expectedAnswer,
          transcript: answers[i]?.transcript ?? "",
        })),
      };
      const res = await fetch("/api/ai/reading-judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("judge failed");
      const data = (await res.json()) as { results: JudgeResult[] };
      const correct = data.results.filter((r) => r.correct).length;
      setResults(data.results);
      setScore(correct);
      setPhase("results");
      if (gameId) incrementScore(gameId, correct);
      onGameComplete(correct, STORY_QUESTION_COUNT);
    } catch {
      setErrorMsg("Buddy couldn't check your answers. Let's try again.");
      setPhase("questions");
    }
  }, [story, answers, play, gameId, incrementScore, onGameComplete]);

  const restart = useCallback(() => {
    play("tap");
    setStory(null);
    setPageIndex(0);
    setAnswers([]);
    setActiveRecording(null);
    setResults(null);
    setScore(0);
    setErrorMsg("");
    setPhase("theme");
  }, [play]);

  if (phase === "loading") {
    return (
      <LoadingScreen
        tone="thinking"
        message="Writing your story…"
        subMessage="Buddy is dreaming up something fun to read."
      />
    );
  }

  if (phase === "judging") {
    return (
      <LoadingScreen
        tone="thinking"
        message="Checking your answers…"
        subMessage="Buddy is listening carefully."
      />
    );
  }

  if (phase === "error") {
    return (
      <div className="surface-card cat-reading p-8 text-center">
        <div className="flex justify-center mb-3">
          <Buddy mood="sad" size="lg" />
        </div>
        <h3 className="font-display text-2xl text-arcade-strong">Oops!</h3>
        <p className="mt-2 text-arcade-mid">{errorMsg}</p>
        <button
          type="button"
          onClick={restart}
          className="mt-5 font-display text-lg px-6 py-3 rounded-full text-[var(--ink-on-color)]
                     bg-[var(--cat-reading)] active:scale-[0.97]"
        >
          Try again
        </button>
      </div>
    );
  }

  if (phase === "results" && results && story) {
    return (
      <div className="space-y-4">
        <ResultsScreen
          score={score}
          total={STORY_QUESTION_COUNT}
          category="reading"
          onPlayAgain={restart}
        />
        <div className="surface-card cat-reading p-5 max-w-2xl mx-auto space-y-3">
          {story.questions.map((q, i) => (
            <div
              key={i}
              className="rounded-2xl p-3 bg-[var(--arcade-card-soft)] border border-[var(--arcade-edge)]"
            >
              <div className="font-display text-arcade-strong">{q.q}</div>
              <div
                className="text-sm mt-1"
                style={{
                  color: results[i].correct
                    ? "var(--joy-correct)"
                    : "var(--joy-wrong)",
                }}
              >
                {results[i].correct ? "✓ " : "✗ "}
                {results[i].feedback}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "questions" && story) {
    const allAnswered = answers.every(
      (a) => a.transcript && a.transcript.trim() !== "",
    );
    const micProblem =
      !recorder.isSupported ||
      recorder.error === "denied" ||
      recorder.error === "unsupported";
    return (
      <div className="space-y-4">
        <div className="surface-card cat-reading p-5">
          <p
            className="text-xs uppercase tracking-[0.18em] font-display"
            style={{ color: "var(--cat-reading)" }}
          >
            {story.title}
          </p>
          <h3 className="font-display text-xl sm:text-2xl text-arcade-strong mt-1">
            Answer out loud
          </h3>
          <p className="text-arcade-mid text-sm mt-1">
            Tap the mic, say your answer, then tap again to stop.
          </p>
          {errorMsg && (
            <p className="text-sm mt-2" style={{ color: "var(--joy-wrong)" }}>
              {errorMsg}
            </p>
          )}
        </div>

        {micProblem && (
          <div className="surface-card p-4 flex items-start gap-3">
            <AlertTriangle
              className="w-5 h-5 mt-0.5"
              style={{ color: "var(--joy-wrong)" }}
            />
            <div>
              <p className="font-display text-arcade-strong">
                Buddy needs the microphone
              </p>
              <p className="text-arcade-mid text-sm mt-1">
                Please allow microphone access, then tap a mic button to try
                again.
              </p>
            </div>
          </div>
        )}

        {story.questions.map((q, i) => {
          const a = answers[i];
          const isRec = activeRecording === i;
          return (
            <div key={i} className="surface-card cat-reading p-5">
              <div className="font-display text-lg text-arcade-strong">
                {i + 1}. {q.q}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleRecording(i)}
                  disabled={
                    a.transcribing ||
                    (activeRecording !== null && !isRec)
                  }
                  className={cn(
                    "font-display inline-flex items-center gap-2 px-5 py-2.5 rounded-full",
                    "active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed",
                    isRec
                      ? "text-white"
                      : "text-[var(--ink-on-color)]",
                  )}
                  style={{
                    background: isRec
                      ? "var(--joy-wrong)"
                      : "var(--cat-reading)",
                  }}
                >
                  {isRec ? (
                    <Square className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                  {isRec
                    ? "Stop"
                    : a.transcript
                      ? "Record again"
                      : "Record answer"}
                </button>
                {a.transcribing && (
                  <Loader2 className="w-5 h-5 animate-spin text-arcade-soft" />
                )}
              </div>
              {a.transcript && (
                <p className="mt-3 text-arcade-mid text-sm">
                  You said:{" "}
                  <span className="text-arcade-strong">
                    &ldquo;{a.transcript}&rdquo;
                  </span>
                </p>
              )}
            </div>
          );
        })}

        <div className="text-center">
          <button
            type="button"
            onClick={finish}
            disabled={!allAnswered}
            className="font-display text-lg px-10 py-3 rounded-full text-[var(--ink-on-color)]
                       bg-[var(--joy-gold)] active:scale-[0.97]
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Finish
          </button>
          {!allAnswered && (
            <p className="text-arcade-soft text-sm mt-2">
              Answer all three questions to finish.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (phase === "reading" && story) {
    const isLast = pageIndex === story.pages.length - 1;
    return (
      <div className="space-y-4">
        <div className="surface-card cat-reading p-5">
          <p
            className="text-xs uppercase tracking-[0.18em] font-display"
            style={{ color: "var(--cat-reading)" }}
          >
            {story.title}
          </p>
          <p className="text-arcade-mid text-sm mt-1">
            Page {pageIndex + 1} of {story.pages.length}
          </p>
        </div>

        <div className="surface-card cat-reading p-8 sm:p-12 min-h-[40vh] flex items-center justify-center">
          <p className="font-display text-3xl sm:text-5xl leading-snug text-center text-arcade-strong">
            {story.pages[pageIndex]}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2">
          {story.pages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goPage(i)}
              aria-label={`Go to page ${i + 1}`}
              className="w-3 h-3 rounded-full"
              style={{
                background:
                  i === pageIndex
                    ? "var(--cat-reading)"
                    : "var(--arcade-edge)",
              }}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goPage(pageIndex - 1)}
            disabled={pageIndex === 0}
            className="font-display inline-flex items-center gap-1 px-5 py-2.5 rounded-full
                       bg-[var(--arcade-card-soft)] text-arcade-strong
                       border border-[var(--arcade-edge)]
                       disabled:opacity-40 active:scale-[0.97]"
          >
            <ChevronLeft className="w-5 h-5" /> Back
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={() => {
                play("tap");
                setPhase("questions");
              }}
              className="font-display inline-flex items-center gap-2 px-6 py-2.5 rounded-full
                         text-[var(--ink-on-color)] bg-[var(--cat-reading)] active:scale-[0.97]"
            >
              Questions <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => goPage(pageIndex + 1)}
              className="font-display inline-flex items-center gap-1 px-5 py-2.5 rounded-full
                         text-[var(--ink-on-color)] bg-[var(--cat-reading)] active:scale-[0.97]"
            >
              Next <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // phase === "theme" (default)
  return (
    <div className="space-y-4">
      <div className="surface-card cat-reading p-5 sm:p-7 flex items-center gap-5">
        <div className="hidden sm:block">
          <Buddy mood="cheer" size="md" />
        </div>
        <div>
          <p
            className="text-xs uppercase tracking-[0.22em] font-display"
            style={{ color: "var(--cat-reading)" }}
          >
            Story Time
          </p>
          <h2 className="font-display text-2xl sm:text-3xl text-arcade-strong">
            Pick a story to read
          </h2>
          <p className="mt-1 text-arcade-mid text-sm">
            Choose what your story is about. Then read it and answer 3 questions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {STORY_THEMES.map((theme) => (
          <button
            key={theme.id}
            type="button"
            onClick={() => pickTheme(theme)}
            className="surface-card cat-reading p-5 text-left active:scale-[0.985] transition-transform"
          >
            <div className="text-4xl leading-none">{theme.emoji}</div>
            <div className="font-display text-arcade-strong mt-2">
              {theme.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npx eslint components/game/ReadingStoryGame.tsx`
Expected: clean (Tailwind "canonical class" hints are warnings and acceptable — match existing files).

- [ ] **Step 4: Commit**

```bash
git add components/game/ReadingStoryGame.tsx
git commit -m "feat(reading): ReadingStoryGame component (5-phase flow)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Register the game

**Files:**
- Modify: `lib/games/registry.tsx`

- [ ] **Step 1: Add the lazy import**

Find the block of `lazy(() => import(...))` lines (around lines 28-38) and add, after the `MathSparkGame` line:

```tsx
const ReadingStoryGame    = lazy(() => import("@/components/game/ReadingStoryGame"));
```

- [ ] **Step 2: Add the adapter**

After the existing `MathSparkAdapter` function, add:

```tsx
function ReadingStoryAdapter(ctx: GameContext) {
  return (
    <ReadingStoryGame
      userId={ctx.userId}
      gameId={ctx.gameId}
      userAge={ctx.userAge}
      onGameComplete={ctx.onGameComplete}
    />
  );
}
```

- [ ] **Step 3: Add the registry entry**

In the `REGISTRY` object, add this line (after the `"reading-helper"` entry):

```tsx
  "story-time":     { title: "Story Time",     category: "reading", Component: ReadingStoryAdapter },
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Lint**

Run: `npx eslint lib/games/registry.tsx`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add lib/games/registry.tsx
git commit -m "feat(reading): register Story Time in game registry

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Seed the game record (fresh + existing DBs)

**Files:**
- Modify: `scripts/seed.ts`
- Modify: `scripts/update-games.ts`

`seed.ts` only runs on an empty DB; `update-games.ts` is the idempotent script for adding a game to an already-populated DB.

- [ ] **Step 1: Add to seed.ts**

In `scripts/seed.ts`, inside the `initialGames` array, add a new object after the `Read Aloud Camera` entry:

```typescript
  {
    title: "Story Time",
    description: "Read a fun story and answer questions out loud!",
    icon: "📚",
    category: "reading",
    difficulty: 2,
    isActive: true,
  },
```

- [ ] **Step 2: Add an idempotent block to update-games.ts**

In `scripts/update-games.ts`, inside the `updateGames()` function, after the existing per-game `if (!...) { await DatabaseService.createGame(...) }` blocks and before the function's final `console.log`/`catch`, add:

```typescript
    const storyTimeGame = existingGames.find(game => game.title === 'Story Time')
    if (!storyTimeGame) {
      await DatabaseService.createGame({
        title: 'Story Time',
        description: 'Read a fun story and answer questions out loud!',
        icon: '📚',
        category: 'reading',
        difficulty: 2,
        isActive: true,
      })
      console.log('Added new Story Time game')
    } else {
      console.log('Story Time game already exists')
    }
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Add the game to the running database**

Run: `npx tsx scripts/update-games.ts`
Expected: prints `Added new Story Time game` (or `already exists` on a re-run).

- [ ] **Step 5: Commit**

```bash
git add scripts/seed.ts scripts/update-games.ts
git commit -m "feat(reading): seed Story Time game record

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Typecheck + lint the whole change**

Run:
```bash
npx tsc --noEmit && npx eslint app/api/ai/generate-story/route.ts app/api/ai/reading-stt/route.ts app/api/ai/reading-judge/route.ts hooks/useAudioRecorder.ts components/game/ReadingStoryGame.tsx lib/games/registry.tsx lib/games/storyTime.ts
```
Expected: typecheck passes; eslint reports no errors (Tailwind canonical-class warnings OK).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build succeeds with no type/lint errors.

- [ ] **Step 3: Manual play-through**

Start the app (`npm run dev`), open it, select a child, and open **Story Time** from the home grid. Confirm:
  - Theme picker shows 6 tiles; tapping one shows "Writing your story…".
  - A story appears, one sentence per page; Back/Next and page dots navigate freely.
  - On the last page, the "Questions" button appears and opens the questions screen.
  - Tapping a mic prompts for microphone permission; recording then stopping shows "You said: …".
  - With all 3 answered, "Finish" shows "Checking your answers…" then a results screen with score /3 and per-question feedback.
  - "Play Again" returns to the theme picker.
  - Deny microphone permission once and confirm the friendly "Buddy needs the microphone" banner appears (no crash).

- [ ] **Step 4: Push**

```bash
git push origin main
```

---

## Self-Review

**Spec coverage:**
- Theme picker → generate fresh story → Task 1 (themes), Task 2 (route), Task 6 (theme phase). ✅
- Pure reading, no TTS → Task 6 reading phase has no audio playback. ✅
- ~8–10 pages, one simple sentence each, simple-sentence reading level → Task 1 constants + Task 2 prompt + validation. ✅
- Free page navigation, questions on last page → Task 6 reading phase (dots + Back/Next, Questions button on last page). ✅
- 3 questions, verbal, one attempt, AI-judged, score /3 → Task 3 (STT), Task 4 (judge), Task 6 (questions/results). ✅
- Mic blocked → friendly error + retry → Task 6 `micProblem` banner; recorder hook surfaces `denied`/`unsupported`. ✅
- Same look/feel → reuses `surface-card`, `cat-reading`, `ResultsScreen`, `LoadingScreen`, `Buddy`. ✅
- No DB schema change; register + seed → Task 7, Task 8. ✅
- Batched judging (one call) → Task 4 + Task 6 `finish`. ✅

**Placeholder scan:** No TBD/TODO; all steps contain full code or exact commands. ✅

**Type consistency:** `Story`, `StoryQuestion`, `JudgeResult`, `StoryTheme` defined in Task 1 and imported unchanged in Tasks 2, 4, 6. Route response shapes (`{ transcript }`, `{ results }`, `Story`) match the component's fetch parsing. `useAudioRecorder` returns `{ isSupported, isRecording, error, start, stop }`, used exactly so in Task 6. Registry adapter passes `{ userId, gameId, userAge, onGameComplete }`, matching `ReadingStoryGameProps`. ✅
