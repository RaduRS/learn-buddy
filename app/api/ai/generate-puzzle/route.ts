import { NextRequest, NextResponse } from "next/server";

interface PuzzleRequest {
  userAge: number;
  difficulty?: number; // 1-3
  theme?: string; // optional prompt theme
}

interface PuzzlePiece {
  id: string;
  row: number;
  col: number;
}

interface PuzzleConfig {
  imageUrl: string;
  gridSize: number; // e.g., 2,3,4
  pieces: PuzzlePiece[];
}

export async function POST(request: NextRequest) {
  try {
    const { theme } = (await request.json()) as PuzzleRequest;

    const nebiusApiKey = process.env.NEBIUS_API_KEY;
    if (!nebiusApiKey) {
      return NextResponse.json(
        { error: "Nebius API key not configured" },
        { status: 500 },
      );
    }

    // Determine grid size by difficulty
    // const gridSize = Math.min(4, Math.max(2, difficulty + 1)) // 1->2x2, 2->3x3, 3->4x4
    const gridSize = 5; // fixed to 5x5 as requested

    // Child-friendly themes
    const defaultThemes = [
      "cute animals in a sunny park",
      "colorful balloons and kites",
      "happy dinosaurs in a friendly forest",
      "underwater scene with smiling fish",
      "space adventure with friendly rockets and stars",
      "farm scene with cheerful animals",
    ];

    const chosenTheme =
      theme || defaultThemes[Math.floor(Math.random() * defaultThemes.length)];

    // Enhanced prompt suitable for kids and puzzles
    const prompt = `${chosenTheme}. Child-friendly, colorful, safe, educational, cartoon style, bright and cheerful, suitable for kids. CRITICAL: ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO WRITING, NO CAPTIONS, NO TYPOGRAPHY anywhere in the image.`;

    // Call Nebius image generation API
    const response = await fetch(
      "https://api.studio.nebius.ai/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${nebiusApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "black-forest-labs/flux-schnell",
          prompt,
          width: 768,
          height: 768,
          num_inference_steps: 4,
          negative_prompt:
            "text, words, letters, writing, captions, typography, adult content, violence, scary, dark, inappropriate",
          response_extension: "png",
          response_format: "b64_json",
          seed: -1,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Nebius API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to generate image" },
        { status: 500 },
      );
    }

    const data = await response.json();
    const imageBase64 = data?.data?.[0]?.b64_json;
    if (!imageBase64) {
      return NextResponse.json(
        { error: "Invalid image response" },
        { status: 500 },
      );
    }

    const imageUrl = `data:image/png;base64,${imageBase64}`;

    // Build puzzle pieces grid
    const pieces: PuzzlePiece[] = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        pieces.push({ id: `${r}-${c}`, row: r, col: c });
      }
    }

    // Shuffle initial order client-side; we just provide correct positions
    const config: PuzzleConfig = {
      imageUrl,
      gridSize,
      pieces,
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error generating puzzle config:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
