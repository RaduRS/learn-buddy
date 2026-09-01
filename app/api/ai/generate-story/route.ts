// app/api/ai/generate-story/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  STORY_PAGE_MIN,
  STORY_PAGE_MAX,
  STORY_QUESTION_COUNT,
  STORY_FACT_COUNT,
  STORY_HISTORY_SIZE,
  type Story,
} from "@/lib/games/storyTime";

function parseJsonLoose(content: string): unknown {
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  }
  return JSON.parse(cleaned);
}

// Randomised story ingredients — a fresh combination every call so the model
// can't fall back on the same plot and cast each time.
const STORY_SHAPES = [
  "a small problem that gets solved",
  "a journey to somewhere new",
  "finding something that was lost",
  "making an unexpected new friend",
  "a big surprise",
  "learning to do something new after trying and failing",
  "a friendly race or contest",
  "helping someone who is stuck",
  "a little mystery to figure out",
  "a silly mix-up that gets sorted out",
  "building or making something together",
  "getting ready for a special day",
];

const STORY_TONES = ["funny", "exciting", "cosy and warm", "curious and wondering"];

// Common, easy-to-read initials for the hero's name.
const NAME_LETTERS = "ABCDEFGHJLMNOPRSTW";

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sanitizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim().slice(0, 60))
    .slice(0, STORY_HISTORY_SIZE);
}

function validateStory(story: Story): boolean {
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
  const validFacts =
    Array.isArray(story.facts) &&
    story.facts.length >= 1 &&
    story.facts.length <= STORY_FACT_COUNT + 1 &&
    story.facts.every((f) => typeof f === "string" && f.trim().length > 0);
  return Boolean(
    story.title &&
      typeof story.mainCharacter === "string" &&
      story.mainCharacter.trim().length > 0 &&
      validPages &&
      validQuestions &&
      validFacts,
  );
}

function buildPrompt(
  theme: string,
  factTopic: string,
  childAge: number,
  avoidTitles: string[],
  avoidCharacters: string[],
): string {
  const shape = pick(STORY_SHAPES);
  const tone = pick(STORY_TONES);
  const letter = NAME_LETTERS[Math.floor(Math.random() * NAME_LETTERS.length)];

  const avoidLines = [
    avoidCharacters.length > 0
      ? `- Do NOT use any of these character names (the child has met them already): ${avoidCharacters.join(", ")}.`
      : "",
    avoidTitles.length > 0
      ? `- The title must be different from all of these past stories: ${avoidTitles.join("; ")}.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `Write a short story for a ${childAge}-year-old child (UK Year 1) about ${theme}.

Make this story feel brand new:
- The plot is about ${shape}.
- The tone is ${tone}.
- Invent a fresh main character whose name starts with the letter ${letter}.
${avoidLines ? avoidLines + "\n" : ""}
Rules for the story:
- Between ${STORY_PAGE_MIN} and ${STORY_PAGE_MAX} pages. Each page is ONE simple sentence of about 6 to 10 words.
- Use common, easy words a 6-year-old can read. Avoid long or rare words.
- A clear beginning, middle, and happy ending.
- Completely kid-safe: no violence, nothing scary, no death.

Teach something real:
- Weave exactly ${STORY_FACT_COUNT} TRUE facts about ${factTopic} into the story itself, in simple words.
- The facts must be genuinely true in the real world (e.g. "an octopus has eight arms", "the Moon has no air").
- List those facts again in the "facts" array, each restated as one short simple sentence.

Then write exactly ${STORY_QUESTION_COUNT} very simple questions about the story.
- The first ${STORY_QUESTION_COUNT - 1} ask about something that literally happened (who, what, or where).
- The last question asks about one of the true facts the child just learned.
- For each question include a short correct answer of a few words.

Respond with ONLY a JSON object, no extra text, in this exact shape:
{
  "title": "short story title",
  "mainCharacter": "the main character's name",
  "pages": ["sentence one.", "sentence two."],
  "facts": ["true fact one.", "true fact two."],
  "questions": [
    { "q": "question text?", "expectedAnswer": "short answer" }
  ]
}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { theme, age } = body;

    if (!theme || typeof theme !== "string") {
      return NextResponse.json({ error: "Theme is required" }, { status: 400 });
    }
    const factTopic =
      typeof body.factTopic === "string" && body.factTopic.trim()
        ? body.factTopic.trim().slice(0, 160)
        : theme;
    const avoidTitles = sanitizeList(body.avoidTitles);
    const avoidCharacters = sanitizeList(body.avoidCharacters);
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

    // One retry with freshly rolled ingredients if the model returns a dud.
    for (let attempt = 0; attempt < 2; attempt++) {
      const prompt = buildPrompt(
        theme,
        factTopic,
        childAge,
        avoidTitles,
        avoidCharacters,
      );

      const response = await fetch(deepseekApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${deepseekApiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt }],
          temperature: 1.1,
          max_tokens: 1200,
        }),
      });

      if (!response.ok) {
        console.error("DeepSeek story error:", response.status);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) continue;

      let story: Story;
      try {
        story = parseJsonLoose(content) as Story;
      } catch {
        console.error("Failed to parse story JSON:", content);
        continue;
      }

      if (!validateStory(story)) {
        console.error("Story failed validation:", story);
        continue;
      }

      return NextResponse.json(story);
    }

    return NextResponse.json({ error: "Failed to generate story" }, { status: 502 });
  } catch (error) {
    console.error("Error generating story:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
