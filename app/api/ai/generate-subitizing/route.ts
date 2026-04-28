import { NextRequest, NextResponse } from "next/server";

/**
 * Subitizing pattern generator.
 *
 * NOTE on history: this route used to call the DeepSeek chat API to "design"
 * each pattern, but every meaningful field (object count, positions, colors,
 * shapes, sizes) was overridden locally on the response anyway. The only
 * thing the model contributed were short tip/encouragement strings — at the
 * cost of a 10-25s upstream request per question, which made the game feel
 * broken. We now generate everything locally so the round starts
 * instantly. Tips and encouragements rotate through a curated set so they
 * still feel varied to the player.
 */

interface SubitizingRequest {
  userAge: number;
  difficulty: number;
  questionNumber: number;
  previousCorrect?: boolean;
}

interface SubitizingObject {
  x: number;
  y: number;
  color: string;
  shape: "circle" | "square" | "triangle" | "star" | "heart";
  size: "small" | "medium" | "large";
}

interface SubitizingPattern {
  objects: SubitizingObject[];
  correctAnswer: number;
  difficulty: number;
  timeLimit: number;
  educationalTip?: string;
  encouragement?: string;
}

const SHAPES: SubitizingObject["shape"][] = [
  "circle", "square", "triangle", "star", "heart",
];
const COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1",
  "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8",
];
const SIZES: SubitizingObject["size"][] = ["small", "medium", "large"];
const ARRANGEMENTS = ["random", "line", "circle", "dice_pattern"] as const;

const TIPS = [
  "Look quickly and trust your first instinct!",
  "Your brain can spot small groups in a flash.",
  "Try noticing patterns instead of counting one by one.",
  "Two and three together can feel like five.",
  "Take a breath, then look. Your eyes know!",
];

const ENCOURAGEMENTS = [
  "You're doing great — keep going!",
  "Nice eye, Buddy is impressed!",
  "That's the spirit. One more!",
  "Look at you go!",
  "You're getting quicker every round.",
];

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const DICE_LAYOUTS: Record<number, { x: number; y: number }[]> = {
  1:  [{x:50,y:50}],
  2:  [{x:30,y:30},{x:70,y:70}],
  3:  [{x:30,y:30},{x:50,y:50},{x:70,y:70}],
  4:  [{x:30,y:30},{x:70,y:30},{x:30,y:70},{x:70,y:70}],
  5:  [{x:30,y:30},{x:70,y:30},{x:50,y:50},{x:30,y:70},{x:70,y:70}],
  6:  [{x:30,y:25},{x:70,y:25},{x:30,y:50},{x:70,y:50},{x:30,y:75},{x:70,y:75}],
  7:  [{x:20,y:20},{x:50,y:20},{x:80,y:20},{x:35,y:50},{x:65,y:50},{x:20,y:80},{x:80,y:80}],
  8:  [{x:25,y:20},{x:50,y:20},{x:75,y:20},{x:25,y:50},{x:75,y:50},{x:25,y:80},{x:50,y:80},{x:75,y:80}],
  9:  [{x:20,y:15},{x:50,y:15},{x:80,y:15},{x:20,y:45},{x:50,y:45},{x:80,y:45},{x:20,y:75},{x:50,y:75},{x:80,y:75}],
  10: [{x:15,y:15},{x:35,y:15},{x:55,y:15},{x:75,y:15},{x:25,y:40},{x:65,y:40},{x:15,y:65},{x:35,y:65},{x:55,y:65},{x:75,y:65}],
  11: [{x:10,y:10},{x:30,y:10},{x:50,y:10},{x:70,y:10},{x:90,y:10},{x:20,y:40},{x:40,y:40},{x:60,y:40},{x:80,y:40},{x:25,y:70},{x:75,y:70}],
  12: [{x:10,y:10},{x:30,y:10},{x:50,y:10},{x:70,y:10},{x:90,y:10},{x:10,y:40},{x:30,y:40},{x:50,y:40},{x:70,y:40},{x:90,y:40},{x:30,y:70},{x:70,y:70}],
};

function decorate(): Pick<SubitizingObject, "color" | "shape" | "size"> {
  return {
    color: pickRandom(COLORS),
    shape: pickRandom(SHAPES),
    size: pickRandom(SIZES),
  };
}

function buildObjects(numObjects: number, arrangement: typeof ARRANGEMENTS[number]): SubitizingObject[] {
  if (arrangement === "line") {
    return Array.from({ length: numObjects }, (_, i) => ({
      x: 20 + (i * 60) / Math.max(1, numObjects - 1),
      y: 50 + (Math.random() - 0.5) * 10,
      ...decorate(),
    }));
  }

  if (arrangement === "circle") {
    const centerX = 50, centerY = 50, radius = 25;
    return Array.from({ length: numObjects }, (_, i) => {
      const angle = (i * 2 * Math.PI) / numObjects;
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        ...decorate(),
      };
    });
  }

  if (arrangement === "dice_pattern" && DICE_LAYOUTS[numObjects]) {
    return DICE_LAYOUTS[numObjects].map((p) => ({
      x: p.x,
      y: p.y,
      ...decorate(),
    }));
  }

  // Random scatter — avoid duplicate cells.
  const used = new Set<string>();
  const objects: SubitizingObject[] = [];
  while (objects.length < numObjects) {
    let attempts = 0;
    let cellX = 0, cellY = 0, key = "";
    do {
      cellX = randInt(1, 8);
      cellY = randInt(1, 6);
      key = `${cellX}-${cellY}`;
      attempts++;
    } while (used.has(key) && attempts < 25);
    if (attempts >= 25) break;
    used.add(key);
    objects.push({
      x: cellX * 10 + Math.random() * 5,
      y: cellY * 10 + Math.random() * 5,
      ...decorate(),
    });
  }
  return objects;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<SubitizingRequest>;
    const questionNumber = body.questionNumber ?? 1;

    // Time limit shrinks slightly as the round progresses, with a floor.
    const timeLimit = Math.max(2400, 3600 - questionNumber * 90);

    // 5-12 inclusive — keeps the answer space within the 12 buttons we render.
    const numObjects = randInt(5, 12);
    const arrangement = pickRandom(ARRANGEMENTS);
    const objects = buildObjects(numObjects, arrangement);

    const pattern: SubitizingPattern = {
      objects,
      correctAnswer: objects.length,
      difficulty: Math.min(3, Math.ceil(objects.length / 4)),
      timeLimit,
      educationalTip: pickRandom(TIPS),
      encouragement: pickRandom(ENCOURAGEMENTS),
    };

    return NextResponse.json(pattern);
  } catch (error) {
    console.error("Error generating subitizing pattern:", error);
    return NextResponse.json(
      {
        objects: buildObjects(6, "dice_pattern"),
        correctAnswer: 6,
        difficulty: 2,
        timeLimit: 3000,
        educationalTip: TIPS[0],
        encouragement: ENCOURAGEMENTS[0],
      } satisfies SubitizingPattern,
      { status: 200 },
    );
  }
}
