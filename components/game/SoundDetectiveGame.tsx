"use client";

import { useEffect, useRef, useState } from "react";
import { AudioLines, Play, Square, Volume2 } from "lucide-react";
import { SOUND_CLIPS, type SoundCategory } from "@/lib/games/soundDetective";
import { shuffled } from "@/lib/games/shuffle";
import { ChoiceQuestion, PracticeGame, type PracticeGameProps, type PracticeQuestionProps } from "./PracticeGame";
import practice from "./PracticeGame.module.css";
import styles from "./SoundDetectiveGame.module.css";

const MODES = [
  { id: "animals", name: "Animals", detail: "Calls and cries" },
  { id: "instruments", name: "Instruments", detail: "Music sounds" },
  { id: "everyday", name: "Everyday", detail: "Sounds around us" },
] as const;

function makeSoundRound(category: SoundCategory) {
  const pack = SOUND_CLIPS.filter((clip) => clip.category === category);
  return shuffled(pack).map((clip) => ({
    clip,
    choices: shuffled([clip, ...shuffled(pack.filter((other) => other.id !== clip.id)).slice(0, 3)]),
  }));
}

export default function SoundDetectiveGame(props: PracticeGameProps) {
  return (
    <>
      <PracticeGame {...props} category="music" modes={MODES} modeLabel="Sound pack" makeRound={makeSoundRound}
        QuestionView={SoundPuzzle} />
      <div className={styles.credits}><a href="/sound-detective/NOTICE.txt">Sound credits</a></div>
    </>
  );
}

function SoundPuzzle({ question, advance, last }: PracticeQuestionProps<ReturnType<typeof makeSoundRound>[number]>) {
  const { clip, choices } = question;
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [heard, setHeard] = useState(false);
  const [failed, setFailed] = useState(false);
  const [readClue, setReadClue] = useState(false);

  useEffect(() => {
    const audio = ref.current;
    return () => { audio?.pause(); };
  }, []);

  function playback() {
    const audio = ref.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    setFailed(false);
    if (audio.error) audio.load();
    audio.currentTime = 0;
    void audio.play().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFailed(true);
    });
  }

  return (
    <ChoiceQuestion heading="What made that sound?" choices={choices.map((choice) => ({ ...choice, visual: choice.emoji }))}
      correctId={clip.id} advance={advance} last={last} ready={(heard && !failed) || readClue} canSkip={failed}>
      <div className={styles.listen} data-playing={playing}>
        <div className={styles.wave} aria-hidden="true"><AudioLines size={56} strokeWidth={1.6} /></div>
        <div>
          <button type="button" className={practice.secondary} onClick={playback}>
            {playing ? <Square size={17} aria-hidden="true" /> : heard ? <Volume2 size={19} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
            {playing ? "Stop Sound" : heard ? "Replay Sound" : "Play Sound"}
          </button>
          <p className={practice.hint} role="status">{failed ? "The sound couldn’t load. Try playing it again or skip this question." : "Listen as many times as you like."}</p>
          <details className={styles.clue} onToggle={(event) => { if (event.currentTarget.open) setReadClue(true); }}>
            <summary>Read a Clue</summary>
            <p>{clip.clue}</p>
          </details>
        </div>
        {/* The clue above is a text alternative to this short, non-speech recording. */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio ref={ref} src={clip.src} preload="metadata" onPlaying={() => { setPlaying(true); setHeard(true); setFailed(false); }}
          onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => { setFailed(true); setPlaying(false); }} />
      </div>
    </ChoiceQuestion>
  );
}
