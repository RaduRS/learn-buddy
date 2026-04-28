import { NextRequest, NextResponse } from "next/server";

const NEBIUS_API_URL =
  "https://api.tokenfactory.nebius.com/v1/chat/completions";
const OPENAI_RESPONSES_API_URL = "https://api.openai.com/v1/responses";
const OCR_MODELS = ["Qwen/Qwen2.5-VL-72B-Instruct"];
const OPENAI_OCR_MODEL = "gpt-4.1-nano";
const OCR_SYSTEM_PROMPT =
  "You extract text from images for reading practice. Return only markdown text in natural reading order. Ignore partial words or cut-off text near image edges and corners. Prioritize complete, fully visible lines. Use markdown structure only when visually clear: # for main title, ## for subtitle, plain paragraphs with a blank line between paragraphs. Do not add commentary.";
const OCR_USER_PROMPT =
  "Free OCR. Extract only complete, fully visible text. Skip cut-off edge text. Output only markdown text.";

const sanitizeOcrText = (text: string) => {
  const withoutCodeFences = text
    .replace(/^```(?:markdown|md|text)?\s*/i, "")
    .replace(/\s*```$/i, "");
  return withoutCodeFences.trim();
};

const extractOpenAIResponsesText = (payload: unknown) => {
  if (
    payload &&
    typeof payload === "object" &&
    "output_text" in payload &&
    typeof payload.output_text === "string"
  ) {
    return payload.output_text;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "output" in payload &&
    Array.isArray(payload.output)
  ) {
    return payload.output
      .flatMap((item) => {
        if (
          item &&
          typeof item === "object" &&
          "content" in item &&
          Array.isArray(item.content)
        ) {
          return item.content
            .map((part: unknown) =>
              part &&
              typeof part === "object" &&
              "text" in part &&
              typeof part.text === "string"
                ? part.text
                : "",
            )
            .filter(Boolean);
        }
        return [];
      })
      .join("\n");
  }

  return "";
};

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
    const { imageDataUrl, provider } = await request.json();

    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    if (!imageDataUrl.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "Invalid image format" },
        { status: 400 },
      );
    }

    const selectedProvider = provider === "nebius" ? "nebius" : "openai-nano";

    if (selectedProvider === "openai-nano") {
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        return NextResponse.json(
          { error: "OpenAI API key not configured for OCR" },
          { status: 500 },
        );
      }

      const openaiResponse = await fetch(OPENAI_RESPONSES_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: OPENAI_OCR_MODEL,
          input: [
            {
              role: "system",
              content: [
                {
                  type: "input_text",
                  text: OCR_SYSTEM_PROMPT,
                },
              ],
            },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: OCR_USER_PROMPT,
                },
                {
                  type: "input_image",
                  image_url: imageDataUrl,
                },
              ],
            },
          ],
          temperature: 0,
          max_output_tokens: 1800,
        }),
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error("OpenAI OCR error:", openaiResponse.status, errorText);
        return NextResponse.json(
          { error: "Failed to extract text from image" },
          {
            status: openaiResponse.status >= 500 ? 502 : openaiResponse.status,
          },
        );
      }

      const openaiData = await openaiResponse.json();
      const rawContent = extractOpenAIResponsesText(openaiData);
      const extractedText = sanitizeOcrText(rawContent.trim());
      return NextResponse.json({ text: extractedText });
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
              content: OCR_SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: OCR_USER_PROMPT,
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
      modelResponseContent = sanitizeOcrText(
        extractMessageContent(rawContent).trim(),
      );
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
