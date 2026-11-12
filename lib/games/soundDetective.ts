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
  { id: "piano", label: "Piano", category: "instruments", src: "/sound-detective/piano.mp3", emoji: "🎹", clue: "Several clear notes sound together, then fade away." },
  { id: "guitar", label: "Guitar", category: "instruments", src: "/sound-detective/guitar.mp3", emoji: "🎸", clue: "Plucked strings ring out with a twang." },
  { id: "flute", label: "Flute", category: "instruments", src: "/sound-detective/flute.mp3", emoji: "🪈", clue: "Smooth, airy notes that change pitch." },
  { id: "violin", label: "Violin", category: "instruments", src: "/sound-detective/violin.mp3", emoji: "🎻", clue: "Bright notes from a bow moving across strings." },
  { id: "drum", label: "Drum", category: "instruments", src: "/sound-detective/drum.mp3", emoji: "🥁", clue: "Sharp taps with a rattle behind them." },
  { id: "harmonica", label: "Harmonica", category: "instruments", src: "/sound-detective/harmonica.mp3", emoji: "🎶", clue: "A buzzy tune made by blowing through little holes." },
  { id: "doorbell", label: "Doorbell", category: "everyday", src: "/sound-detective/doorbell.mp3", emoji: "🔔", clue: "Bright ringing notes you might hear when a visitor arrives." },
  { id: "knock", label: "Knocking", category: "everyday", src: "/sound-detective/knock.mp3", emoji: "🚪", clue: "Short, hollow taps with pauses between them." },
  { id: "clock", label: "Clock", category: "everyday", src: "/sound-detective/clock.mp3", emoji: "🕰️", clue: "Quiet ticks spaced evenly apart." },
  { id: "keyboard", label: "Typing", category: "everyday", src: "/sound-detective/keyboard.mp3", emoji: "⌨️", clue: "Lots of little clicks in quick, uneven bursts." },
  { id: "water", label: "Pouring Water", category: "everyday", src: "/sound-detective/water.mp3", emoji: "💧", clue: "A soft splash and a bubbly, flowing sound." },
  { id: "telephone", label: "Telephone", category: "everyday", src: "/sound-detective/telephone.mp3", emoji: "☎️", clue: "A buzzing ring that keeps coming back until someone answers." },
];
