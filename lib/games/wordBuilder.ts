import { shuffled } from "./shuffle";

export type WordLevel = "easy" | "medium" | "hard";

const WORDS = {
  easy: [
    ["cat", "🐱", "An animal that purrs."], ["dog", "🐶", "A pet that barks."],
    ["pig", "🐷", "A farm animal that oinks."], ["sun", "☀️", "It lights up the sky in the daytime."],
    ["bed", "🛏️", "You sleep in it."], ["cup", "🥤", "You drink from it."],
    ["hat", "🎩", "You wear it on your head."], ["bus", "🚌", "It takes lots of people along the road."],
    ["fox", "🦊", "A wild animal with a bushy tail."], ["map", "🗺️", "It shows where places are."],
    ["pen", "🖊️", "You write with it using ink."], ["bat", "🦇", "A flying animal that comes out at night."],
    ["van", "🚐", "A vehicle that can carry boxes and tools."], ["box", "📦", "You put things inside it."],
    ["leg", "🦵", "A part of your body that helps you walk."], ["web", "🕸️", "A spider spins it."],
  ],
  medium: [
    ["ship", "🚢", "A big boat that sails across the sea."], ["fish", "🐟", "It swims and has fins."],
    ["duck", "🦆", "A bird that quacks."], ["chick", "🐤", "A baby chicken."],
    ["shell", "🐚", "You might find one on the beach."], ["shark", "🦈", "A large fish with sharp teeth."],
    ["moon", "🌙", "It shines in the night sky."], ["teeth", "🦷", "You use them to bite and chew."],
    ["book", "📖", "It has pages to read."], ["ring", "💍", "A piece of jewellery for your finger."],
    ["bell", "🔔", "It makes a ringing sound."], ["sock", "🧦", "You wear it inside your shoe."],
    ["wheel", "🛞", "It rolls and helps a vehicle move."], ["rain", "🌧️", "Drops of water that fall from clouds."],
    ["king", "👑", "A man who rules a kingdom."], ["star", "⭐", "A point of light in the night sky."],
  ],
  hard: [
    ["train", "🚆", "It carries people along tracks."], ["plane", "✈️", "It has wings and carries people through the air."],
    ["snail", "🐌", "It moves slowly and carries a shell."], ["bread", "🍞", "You can slice it to make toast."],
    ["sheep", "🐑", "A farm animal with a woolly coat."], ["boat", "⛵", "It floats and can take you across water."],
    ["cloud", "☁️", "It floats in the sky and may bring rain."], ["spoon", "🥄", "You use it to eat soup."],
    ["brush", "🖌️", "You use it to put paint on paper."], ["clock", "🕰️", "It tells you the time."],
    ["frog", "🐸", "An animal that hops and croaks."], ["drum", "🥁", "An instrument you hit to make a beat."],
    ["whale", "🐋", "A very large animal that lives in the sea."], ["crown", "👑", "A king or queen wears it."],
    ["light", "💡", "It helps you see in a dark room."], ["flower", "🌷", "It grows on a plant and has petals."],
  ],
} as const;

export function makeWordRound(level: WordLevel) {
  const extras = level === "easy" ? 1 : level === "medium" ? 2 : 3;
  return shuffled<readonly [string, string, string]>(WORDS[level]).slice(0, 8).map(([word, picture, clue]) => {
    const distractors = shuffled([..."abcdefghijklmnopqrstuvwxyz"].filter((letter) => !word.includes(letter))).slice(0, extras);
    return { word, picture, clue, tiles: shuffled([...word, ...distractors]) };
  });
}

export type WordQuestion = ReturnType<typeof makeWordRound>[number];
