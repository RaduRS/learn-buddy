// Story engine for the Build a Story game.
//
// The child picks a theme, then we ask DeepSeek for one short narration beat
// at a time. Each beat carries an image prompt so a picture can be generated
// lazily after the text and voice have already landed.

export const STORY_TARGET_BEATS = 8;

/** Fixed style suffix so every picture in a story looks like the same book. */
export const IMAGE_STYLE =
  "soft watercolour children's storybook illustration, warm friendly colours, " +
  "gentle rounded shapes, consistent characters, no text, no words, no letters";

export interface ThemeMeta {
  label: string;
  /** Where the story happens, fed to the model and the image prompt. */
  setting: string;
  /** A couple of friendly character ideas to keep pictures consistent. */
  characters: string;
  /** The child's role, used when naming the hero (e.g. "a brave child"). */
  heroRole: string;
  /** What the child's companion is (e.g. "dragon"), for the seed cast. */
  companionKind: string;
}

const THEMES: Record<string, ThemeMeta> = {
  dragons: {
    label: "Dragons",
    setting: "a hilly kingdom of sky castles and windy towers",
    characters: "a small brave child and one gentle, friendly dragon",
    heroRole: "a brave child",
    companionKind: "dragon",
  },
  space: {
    label: "Space",
    setting: "a friendly corner of space full of soft-shining planets",
    characters: "a curious child astronaut and one bouncy little robot",
    heroRole: "a curious child astronaut",
    companionKind: "little robot",
  },
  ocean: {
    label: "Ocean",
    setting: "a bright blue ocean with secret islands and coral reefs",
    characters: "a curious child and one smiling whale",
    heroRole: "a curious child",
    companionKind: "whale",
  },
  jungle: {
    label: "Jungle",
    setting: "a warm green jungle with tall trees and hidden trails",
    characters: "a curious child and one chatty parrot",
    heroRole: "a curious child",
    companionKind: "parrot",
  },
  robots: {
    label: "Robots",
    setting: "a tidy workshop town where helpful robots live",
    characters: "a curious child and one clanking, kind robot",
    heroRole: "a curious child",
    companionKind: "kind robot",
  },
  castle: {
    label: "Castle",
    setting: "a sunny castle with round towers and a moat of ducks",
    characters: "a kind young knight and the castle's friendly cook",
    heroRole: "a kind young knight",
    companionKind: "friendly cook",
  },
};

const FALLBACK_THEME: ThemeMeta = {
  label: "Adventure",
  setting: "a bright, friendly world of rolling hills",
  characters: "a curious child and one helpful animal friend",
  heroRole: "a curious child",
  companionKind: "animal friend",
};

export function themeMeta(themeId: string): ThemeMeta {
  return THEMES[themeId] ?? FALLBACK_THEME;
}

export function isKnownTheme(themeId: string): boolean {
  return themeId in THEMES;
}

// --- Story seed -----------------------------------------------------------
//
// Without this, every theme produced near-identical prompts, so the model kept
// reaching for the same few names (Mia, Luna, Pip, Max). By handing it an
// explicit, freshly-picked cast and a small surprise object each time, two
// stories in the same theme come out genuinely different. The seed is stored
// on the Story so every later beat keeps the same characters.

const HERO_NAMES = [
  "Nia", "Kofi", "Ada", "Juno", "Ravi", "Sofia", "Milo", "Zara", "Eli",
  "Priya", "Tomas", "Amara", "Kai", "Lucia", "Omar", "Freya", "Diego",
  "Nadia", "Yusuf", "Iris", "Bodhi", "Leila", "Hugo", "Mira", "Anya",
  "Theo", "Rosa", "Idris", "Wren", "Malik", "Sana", "Otto",
];

const COMPANION_NAMES: Record<string, string[]> = {
  dragons: ["Ember", "Cinder", "Snap", "Sooty", "Sparkle"],
  space: ["Bolt", "Pixel", "Beep", "Nova", "Ziggy"],
  ocean: ["Splash", "Pearl", "Bubbles", "Coral", "Fin"],
  jungle: ["Kiwi", "Mango", "Ruffle", "Bongo", "Pico"],
  robots: ["Cog", "Tinker", "Rusty", "Widget", "Clank"],
  castle: ["Petal", "Bramble", "Nib", "Dumpling", "Pipkin"],
};
const FALLBACK_COMPANION_NAMES = ["Sunny", "Pebble", "Noodle", "Twig", "Muffin"];

const SPARKS = [
  "a lost red mitten", "a runaway kite", "a hiccuping cloud", "a singing shell",
  "a tumbling pumpkin", "a very sleepy star", "a sneaky butterfly",
  "a giggling little bell", "a tiny blue umbrella", "a wobbly ladder",
  "a jar of fireflies", "a shining brass button", "a crumpled old map",
  "a bouncing glass marble", "a fluffy yellow scarf", "a broken music box",
];

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export interface StorySeed {
  /** One sentence naming the cast and the story's little surprise. */
  description: string;
}

export function pickStorySeed(themeId: string): StorySeed {
  const t = themeMeta(themeId);
  const hero = pick(HERO_NAMES);
  const companion =
    pick(COMPANION_NAMES[themeId] ?? FALLBACK_COMPANION_NAMES);
  const spark = pick(SPARKS);
  return {
    description:
      `the hero (${t.heroRole}) is named ${hero}, the ${t.companionKind} ` +
      `is named ${companion}, and the story's little surprise is ${spark}`,
  };
}

/** One prior line of the story, fed back to the model for continuity. */
export interface BeatHistoryLine {
  speaker: "ai" | "child";
  text: string;
}

export interface ParsedBeat {
  text: string;
  imagePrompt: string;
  title?: string;
}

const BASE_RULES = `You are telling a story OUT LOUD to a young child (about 5 or 6 years old).
- Write ONE beat: one or two very short sentences, about 8 to 16 words total.
- Use simple, common words a 6-year-old knows. No long or rare words.
- Warm, playful and calm. Always kid-safe: nothing scary, no violence, no death.
- Keep the same characters and place throughout the whole story.
- Use the EXACT character names you are given. Never swap in a different name.`;

function seedBlock(seed: StorySeed | null): string {
  if (!seed) return "";
  return `\nFor THIS story only: ${seed.description}. Use these names exactly.`;
}

function historyBlock(history: BeatHistoryLine[]): string {
  if (history.length === 0) return "";
  const lines = history
    .map((h) => (h.speaker === "child" ? `The child said: "${h.text}"` : `You said: "${h.text}"`))
    .join("\n");
  return `\nThe story so far:\n${lines}\n`;
}

export function buildFirstBeatPrompt(
  themeId: string,
  age: number,
  seed: StorySeed | null = null,
): string {
  const t = themeMeta(themeId);
  return `${BASE_RULES}

Start a brand new story for a ${age}-year-old. The story happens in ${t.setting}, with ${t.characters}.${seedBlock(seed)}

Write the FIRST beat: introduce the characters and the place, and give a tiny hint of something fun about to happen.
Also invent a short, friendly title (three to five words) for the whole story. Make the title fresh and specific to this story.

Respond with ONLY a JSON object, no extra text:
{
  "title": "short story title",
  "text": "the first beat, one or two short sentences",
  "imagePrompt": "a scene description for an illustrator: who and what we see right now, and where"
}`;
}

export function buildNextBeatPrompt(
  themeId: string,
  age: number,
  history: BeatHistoryLine[],
  childIdea: string | null,
  isFinal: boolean,
  seed: StorySeed | null = null,
): string {
  const t = themeMeta(themeId);

  const interjection = childIdea
    ? `
The child just jumped in and said: "${childIdea}".
Start this beat by warmly agreeing with them in a few words (for example "Ooh yes, green!" or "What a good idea!"), then weave their idea straight into the story so the next picture shows it. Always say yes unless the idea is scary or unsafe, in which case gently steer it somewhere kind and keep the mood happy.`
    : "";

  const ending = isFinal
    ? `\nThis is the LAST beat, so bring the story to a happy, snug ending and finish with the words "The end."`
    : "";

  return `${BASE_RULES}

The story happens in ${t.setting}, with ${t.characters}. The child is ${age} years old.${seedBlock(seed)}
${historyBlock(history)}${interjection}
Write the NEXT beat of the story, carrying on from the story so far.${ending}

Respond with ONLY a JSON object, no extra text:
{
  "text": "the next beat, one or two short sentences",
  "imagePrompt": "a scene description for an illustrator: who and what we see right now, and where"
}`;
}

/** Coerce a loose model response into a validated beat, or null if unusable. */
export function parseBeat(content: string): ParsedBeat | null {
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  }

  let raw: unknown;
  try {
    raw = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      raw = JSON.parse(match[0]);
    } catch {
      return null;
    }
  }

  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const text = typeof obj.text === "string" ? obj.text.trim() : "";
  const imagePrompt =
    typeof obj.imagePrompt === "string" ? obj.imagePrompt.trim() : "";
  if (!text || !imagePrompt) return null;

  const title = typeof obj.title === "string" ? obj.title.trim().slice(0, 60) : undefined;
  return { text: text.slice(0, 400), imagePrompt: imagePrompt.slice(0, 500), title };
}

/** Compose the full image prompt: scene + locked-in storybook style. */
export function composeImagePrompt(scenePrompt: string): string {
  return `${IMAGE_STYLE}. Scene: ${scenePrompt}`;
}
