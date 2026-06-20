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
