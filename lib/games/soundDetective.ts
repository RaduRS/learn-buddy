export type SoundCategory = "animals" | "instruments" | "everyday";

export interface SoundClip {
  id: string;
  label: string;
  category: SoundCategory;
  src: string;
  emoji: string;
  clue: string;
}

export const SOUND_CLIPS: readonly SoundClip[] = [
  { id: "dog", label: "Dog", category: "animals", src: "/sound-detective/dog.mp3", emoji: "🐕", clue: "Short, sharp calls that sound like ‘woof’." },
  { id: "cat", label: "Cat", category: "animals", src: "/sound-detective/cat.mp3", emoji: "🐈", clue: "A soft call that sounds like ‘miaow’." },
  { id: "cow", label: "Cow", category: "animals", src: "/sound-detective/cow.mp3", emoji: "🐄", clue: "A long, low call with a gentle wobble." },
  { id: "rooster", label: "Rooster", category: "animals", src: "/sound-detective/rooster.mp3", emoji: "🐓", clue: "A bright call in bursts that rises high." },
  { id: "sheep", label: "Sheep", category: "animals", src: "/sound-detective/sheep.mp3", emoji: "🐑", clue: "A wavering call that sounds like ‘baa’." },
  { id: "horse", label: "Horse", category: "animals", src: "/sound-detective/horse.mp3", emoji: "🐎", clue: "A high call with a shaking sound that falls lower." },
  { id: "duck", label: "Duck", category: "animals", src: "/sound-detective/duck.mp3", emoji: "🦆", clue: "Short, flat calls with a funny nasal sound near a pond." },
  { id: "frog", label: "Frog", category: "animals", src: "/sound-detective/frog.mp3", emoji: "🐸", clue: "A rough croaking call that repeats outdoors." },
  { id: "pig", label: "Pig", category: "animals", src: "/sound-detective/pig.mp3", emoji: "🐖", clue: "A short, low grunt that sounds like ‘oink’." },
  { id: "donkey", label: "Donkey", category: "animals", src: "/sound-detective/donkey.mp3", emoji: "🫏", clue: "A loud bray that changes between high and low sounds." },
  { id: "goat", label: "Goat", category: "animals", src: "/sound-detective/goat.mp3", emoji: "🐐", clue: "A group of animals making scratchy, nasal bleats." },
  { id: "owl", label: "Owl", category: "animals", src: "/sound-detective/owl.mp3", emoji: "🦉", clue: "A round, soft hoot like a bird calling at night." },
  { id: "piano", label: "Piano", category: "instruments", src: "/sound-detective/piano.mp3", emoji: "🎹", clue: "Several clear notes sound together, then fade away." },
  { id: "guitar", label: "Guitar", category: "instruments", src: "/sound-detective/guitar.mp3", emoji: "🎸", clue: "Plucked strings ring out with a twang." },
  { id: "flute", label: "Flute", category: "instruments", src: "/sound-detective/flute.mp3", emoji: "🪈", clue: "Smooth, airy notes that change pitch." },
  { id: "violin", label: "Violin", category: "instruments", src: "/sound-detective/violin.mp3", emoji: "🎻", clue: "Bright notes from a bow moving across strings." },
  { id: "drum", label: "Drum", category: "instruments", src: "/sound-detective/drum.mp3", emoji: "🥁", clue: "Sharp taps with a rattle behind them." },
  { id: "harmonica", label: "Harmonica", category: "instruments", src: "/sound-detective/harmonica.mp3", emoji: "🎶", clue: "A buzzy tune made by blowing through little holes." },
  { id: "triangle", label: "Triangle", category: "instruments", src: "/sound-detective/triangle.mp3", emoji: "🔺", clue: "One high, clear ring after a small piece of metal is struck." },
  { id: "tambourine", label: "Tambourine", category: "instruments", src: "/sound-detective/tambourine.mp3", emoji: "🪘", clue: "A tap followed by a jingle from little metal discs." },
  { id: "maracas", label: "Maracas", category: "instruments", src: "/sound-detective/maracas.mp3", emoji: "🪇", clue: "Dry rattles in a rhythm, like little seeds shaking inside a shell." },
  { id: "xylophone", label: "Xylophone", category: "instruments", src: "/sound-detective/xylophone.mp3", emoji: "🎼", clue: "A tune made by tapping wooden bars. Each tap has a different pitch." },
  { id: "saxophone", label: "Saxophone", category: "instruments", src: "/sound-detective/saxophone.mp3", emoji: "🎷", clue: "A deep, buzzy note that growls as the player blows." },
  { id: "trumpet", label: "Trumpet", category: "instruments", src: "/sound-detective/trumpet.mp3", emoji: "🎺", clue: "Short brass notes, each a little higher than the last." },
  { id: "doorbell", label: "Doorbell", category: "everyday", src: "/sound-detective/doorbell.mp3", emoji: "🔔", clue: "Bright ringing notes you might hear when a visitor arrives." },
  { id: "knock", label: "Knocking", category: "everyday", src: "/sound-detective/knock.mp3", emoji: "🚪", clue: "Short, hollow taps with pauses between them." },
  { id: "clock", label: "Clock", category: "everyday", src: "/sound-detective/clock.mp3", emoji: "🕰️", clue: "Quiet ticks spaced evenly apart." },
  { id: "keyboard", label: "Typing", category: "everyday", src: "/sound-detective/keyboard.mp3", emoji: "⌨️", clue: "Lots of little clicks in quick, uneven bursts." },
  { id: "water", label: "Pouring Water", category: "everyday", src: "/sound-detective/water.mp3", emoji: "💧", clue: "A soft splash and a bubbly, flowing sound." },
  { id: "telephone", label: "Telephone", category: "everyday", src: "/sound-detective/telephone.mp3", emoji: "☎️", clue: "A buzzing ring that keeps coming back until someone answers." },
  { id: "car-horn", label: "Car Horn", category: "everyday", src: "/sound-detective/car-horn.mp3", emoji: "🚗", clue: "Short, loud honks you might hear from the road." },
  { id: "scissors", label: "Scissors", category: "everyday", src: "/sound-detective/scissors.mp3", emoji: "✂️", clue: "Sharp snips and the rustle of paper." },
  { id: "washer", label: "Washing Machine", category: "everyday", src: "/sound-detective/washer.mp3", emoji: "🫧", clue: "A steady whir and rumble from a machine that spins." },
  { id: "thunder", label: "Thunder", category: "everyday", src: "/sound-detective/thunder.mp3", emoji: "⛈️", clue: "A deep roll that grows loud over the sound of rain." },
  { id: "door", label: "Closing Door", category: "everyday", src: "/sound-detective/door.mp3", emoji: "🚪", clue: "A creak followed by a clunk as something swings shut." },
  { id: "music-box", label: "Music Box", category: "everyday", src: "/sound-detective/music-box.mp3", emoji: "🎁", clue: "A little tune made of bright, tinkly notes." },
];
