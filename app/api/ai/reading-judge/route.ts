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
