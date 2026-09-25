import { NextRequest, NextResponse } from "next/server";
import { generateImage, ImageGenerationError } from "@/lib/ai/image";

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
    const { difficulty = 2, theme } = (await request.json()) as PuzzleRequest;

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 },
      );
    }

    // Determine grid size by difficulty: 1→2×2, 2→3×3, 3→4×4, 4→5×5
    const gridSize = Math.min(5, Math.max(2, difficulty + 1));

    // Child-friendly themes
    const defaultThemes = [
      "cute animals playing in a sunny park",
      "colorful hot air balloons floating over hills",
      "happy dinosaurs in a friendly jungle",
      "underwater coral reef with smiling tropical fish",
      "space adventure with friendly rockets, planets and stars",
      "cheerful farm scene with cows, pigs and chickens",
      "magical castle on a hill with rainbows and clouds",
      "cozy treehouse village with squirrels and birds",
      "snowy mountain village with penguins and igloos",
      "tropical beach with sandcastles, palm trees and crabs",
      "enchanted forest with friendly fairies and mushrooms",
      "construction site with diggers, cranes and trucks",
      "fire trucks and police cars in a cute town",
      "circus tent with happy clowns, elephants and balloons",
      "spring meadow with butterflies, bees and flowers",
      "candy land with lollipops, gumdrops and chocolate rivers",
      "pirate ship sailing on calm seas with friendly dolphins",
      "autumn forest with foxes, owls and pumpkins",
      "savanna with giraffes, zebras and lions cubs",
      "winter wonderland with reindeer, snowmen and pine trees",
    ];

    const chosenTheme =
      theme || defaultThemes[Math.floor(Math.random() * defaultThemes.length)];

    // Composition variety so identical themes still produce different images
    const compositionCues = [
      "wide cinematic landscape view",
      "close-up scene full of small details",
      "top-down storybook view",
      "playful diagonal composition with foreground characters",
      "centered illustration with soft background",
    ];
    const composition =
      compositionCues[Math.floor(Math.random() * compositionCues.length)];

    // Style variety (all kid-safe cartoon variants)
    const styleCues = [
      "vibrant cartoon illustration",
      "soft watercolor children's book style",
      "flat vector illustration",
      "cute Pixar-inspired 3D render",
      "warm crayon-textured cartoon",
    ];
    const style = styleCues[Math.floor(Math.random() * styleCues.length)];

    const prompt = `${chosenTheme}. ${composition}. ${style}. Child-friendly, colorful, safe, educational, bright and cheerful, suitable for kids. CRITICAL: ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO WRITING, NO CAPTIONS, NO TYPOGRAPHY anywhere in the image.`;

    const imageUrl = await generateImage(prompt, openaiApiKey);

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
    if (error instanceof ImageGenerationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error generating puzzle config:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
