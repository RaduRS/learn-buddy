import { NextRequest, NextResponse } from "next/server";

const NEBIUS_API_URL = "https://api.tokenfactory.nebius.com/v1/chat/completions";
const OCR_MODELS = [
  "deepseek-ai/DeepSeek-VL2",
  "deepseek-ai/DeepSeek-VL2-Tiny",
  "Qwen/Qwen2.5-VL-72B-Instruct",
];

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

    const nebiusApiKey = process.env.NEBIUS_API_KEY;
    if (!nebiusApiKey) {
      return NextResponse.json(
        { error: "Nebius API key not configured for vision OCR" },
        { status: 500 },
      );
    }

    let modelResponseContent = "";
    let lastErrorStatus = 500;
    const modelErrors: string[] = [];

    for (const model of OCR_MODELS) {
      const ocrResponse = await fetch(NEBIUS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${nebiusApiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You extract text from images. Return only plain text in natural reading order. Do not add commentary.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Free OCR. Extract all readable text exactly.",
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
          max_tokens: 1800,
        }),
      });

      if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text();
        lastErrorStatus = ocrResponse.status;
        modelErrors.push(`${model}: ${errorText}`);
        continue;
      }

      const modelData = await ocrResponse.json();
      const rawContent = modelData?.choices?.[0]?.message?.content;
      modelResponseContent = extractMessageContent(rawContent).trim();
      if (modelResponseContent) {
        break;
      }
      modelErrors.push(`${model}: empty OCR output`);
    }

    if (!modelResponseContent) {
      console.error("Vision OCR model errors:", modelErrors.join(" | "));
      return NextResponse.json(
        { error: "Failed to extract text from image" },
        { status: lastErrorStatus >= 500 ? 502 : lastErrorStatus },
      );
    }

    return NextResponse.json({ text: modelResponseContent });
  } catch (error) {
    console.error("Error in reading OCR API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
