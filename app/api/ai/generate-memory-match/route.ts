import { NextResponse } from "next/server";
import { pickMemoryIcons } from "@/lib/games/memory-icons";

interface MemoryMatchCard {
  id: string;
  /** Lucide icon name (or "" for empty slot). Field name kept for
   * compatibility with client-side caches. */
  emoji: string;
  /** CSS color for the icon. Empty for empty slots. */
  color: string;
  isFlipped: boolean;
  isMatched: boolean;
  pairId: string;
}

interface MemoryMatchConfig {
  cards: MemoryMatchCard[];
  gridRows: number;
  gridCols: number;
  numPairs: number;
  timeLimit: number;
}


export async function POST(request: Request) {
  try {
    const { rows, cols, pairs } = await request.json();

    // Use provided configuration or fall back to defaults
    const gridRows = rows || 5;
    const gridCols = cols || 5;
    const totalSlots = gridRows * gridCols;
    const numPairs = pairs || Math.floor(totalSlots / 2);

    // Validate that we have enough slots for the pairs
    if (numPairs * 2 > totalSlots) {
      return NextResponse.json(
        {
          error: `Cannot fit ${numPairs} pairs (${numPairs * 2} cards) in a ${gridRows}x${gridCols} grid (${totalSlots} slots)`,
        },
        { status: 400 },
      );
    }

    // Pick a curated lucide icon set (with per-pair colors) instead of
    // the legacy emoji pool — emojis read poorly on the dark arcade
    // backdrop and locked the cards to the OS-rendered glyph palette.
    const selected = pickMemoryIcons(numPairs);

    const cards: MemoryMatchCard[] = [];
    for (let i = 0; i < numPairs; i++) {
      const pairId = `pair-${i}`;
      const icon = selected[i];

      cards.push(
        {
          id: `${pairId}-1`,
          // The legacy field name stays as "emoji" for shape-compat with
          // existing client state caches; the value is now the icon name.
          emoji: icon.name,
          color: icon.color,
          isFlipped: false,
          isMatched: false,
          pairId,
        },
        {
          id: `${pairId}-2`,
          emoji: icon.name,
          color: icon.color,
          isFlipped: false,
          isMatched: false,
          pairId,
        },
      );
    }

    // Add empty slots if needed to fill the grid
    const emptySlots = totalSlots - numPairs * 2;
    for (let i = 0; i < emptySlots; i++) {
      cards.push({
        id: `empty-${i}`,
        emoji: "",
        color: "",
        isFlipped: true,
        isMatched: true,
        pairId: `empty-${i}`,
      });
    }

    // Shuffle cards
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    const config: MemoryMatchConfig = {
      cards,
      gridRows,
      gridCols,
      numPairs,
      timeLimit: 300000, // 5 minutes
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error("Memory Match generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate memory match game" },
      { status: 500 },
    );
  }
}
