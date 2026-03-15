import { NextRequest, NextResponse } from "next/server";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

const extractMessageContent = (content: unknown) => {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (
          item &&
          typeof item === "object" &&
          "type" in item &&
          item.type === "text" &&
          "text" in item &&
          typeof item.text === "string"
        ) {
          return item.text;
        }
        return "";
      })
      .join("\n");
  }

  return "";
};

export async function POST(request: NextRequest) {
  try {
    const { imageDataUrl } = await request.json();

    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return NextResponse.json(
        { error: "Image is required" },
        { status: 400 },
      );
    }

    if (!imageDataUrl.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "Invalid image format" },
        { status: 400 },
      );
    }

    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekApiKey) {
      return NextResponse.json(
        { error: "DeepSeek API key not configured" },
        { status: 500 },
      );
    }

    const deepseekResponse = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "You extract text from images. Return only the exact readable text in natural reading order. If there is no readable text, return an empty response.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all readable text from this image. Return only plain text.",
              },
              {
                type: "image_url",
                image_url: {
                  url: imageDataUrl,
                },
              },
            ],
          },
        ],
        temperature: 0,
        max_tokens: 1500,
      }),
    });

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      console.error(
        "DeepSeek OCR error:",
        deepseekResponse.status,
        errorText,
      );
      return NextResponse.json(
        { error: "Failed to extract text from image" },
        { status: deepseekResponse.status >= 500 ? 502 : deepseekResponse.status },
      );
    }

    const deepseekData = await deepseekResponse.json();
    const rawContent = deepseekData?.choices?.[0]?.message?.content;
    const extractedText = extractMessageContent(rawContent).trim();

    return NextResponse.json({ text: extractedText });
  } catch (error) {
    console.error("Error in reading OCR API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
