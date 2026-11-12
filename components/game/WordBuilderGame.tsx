"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Lightbulb, Volume2 } from "lucide-react";
import { useSfx } from "@/components/sound/SoundProvider";
import { makeWordRound, type WordQuestion } from "@/lib/games/wordBuilder";
import { PracticeGame, type PracticeGameProps, type PracticeQuestionProps } from "./PracticeGame";
import practice from "./PracticeGame.module.css";
import styles from "./WordBuilderGame.module.css";

const MODES = [
  { id: "easy", name: "Easy", detail: "Short words" },
  { id: "medium", name: "Medium", detail: "Letter pairs" },
  { id: "hard", name: "Hard", detail: "Trickier words" },
] as const;

export default function WordBuilderGame(props: PracticeGameProps) {
  return <PracticeGame {...props} category="reading" modes={MODES} makeRound={makeWordRound} stepLabel="Word"
    QuestionView={WordPuzzle} />;
}

function WordPuzzle({ question, advance, last }: PracticeQuestionProps<WordQuestion>) {
  const { play } = useSfx();
  const [picked, setPicked] = useState<number[]>([]);
  const [assisted, setAssisted] = useState(false);
  const [feedback, setFeedback] = useState<"right" | "wrong" | null>(null);
  const [audioError, setAudioError] = useState(false);
  const [hintMessage, setHintMessage] = useState("");
  const spoken = useRef<SpeechSynthesisUtterance | null>(null);
  const solved = feedback === "right";
  const { word, tiles } = question;

  useEffect(() => () => {
    if (spoken.current) {
      spoken.current.onend = null;
      spoken.current.onerror = null;
      window.speechSynthesis.cancel();
      spoken.current = null;
    }
  }, []);

  function hearWord() {
    if (!("speechSynthesis" in window)) {
      setAudioError(true);
      return;
    }
    setAudioError(false);
    if (spoken.current) spoken.current.onerror = null;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-GB";
    utterance.rate = 0.82;
    utterance.onerror = () => setAudioError(true);
    utterance.onend = () => { if (spoken.current === utterance) spoken.current = null; };
    spoken.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  function add(tile: number) {
    if (solved || picked.includes(tile) || picked.length >= word.length) return;
    play("tap");
    setFeedback(null);
    setHintMessage("");
    setPicked((current) => [...current, tile]);
  }

  function remove(slot: number) {
    if (solved || picked[slot] === undefined) return;
    play("tap");
    setFeedback(null);
    setHintMessage("");
    setPicked((current) => current.filter((_, index) => index !== slot));
  }

  function hint() {
    const mismatch = picked.findIndex((tile, index) => tiles[tile] !== word[index]);
    const prefix = picked.slice(0, mismatch < 0 ? picked.length : mismatch);
    if (prefix.length === word.length) return;
    const tile = tiles.findIndex((letter, index) => letter === word[prefix.length] && !prefix.includes(index));
    setPicked([...prefix, tile]);
    setAssisted(true);
    setFeedback(null);
    setHintMessage(`Hint placed ${tiles[tile].toUpperCase()} in space ${prefix.length + 1}.`);
    play("ding");
  }

  function check() {
    const right = picked.map((tile) => tiles[tile]).join("") === word;
    setHintMessage("");
    setFeedback(right ? "right" : "wrong");
    if (!right) setAssisted(true);
    play(right ? "correct" : "wrong");
  }

  return (
    <>
      <h2 className={practice.heading}>Build the word</h2>
      <div className={styles.clue}>
        <span className={styles.picture} aria-hidden="true">{question.picture}</span>
        <div>
          <p>{question.clue}</p>
          <button type="button" className={practice.secondary} onClick={hearWord}><Volume2 size={18} aria-hidden="true" /> Hear the Word</button>
          {audioError && <p className={styles.audioError} role="status">Audio is unavailable. Use the picture and clue.</p>}
        </div>
      </div>

      <div className={styles.slots} role="group" aria-label="Spelling slots" data-result={feedback}>
        {Array.from({ length: word.length }, (_, slot) => {
          const letter = tiles[picked[slot]];
          return <button key={slot} type="button" aria-disabled={!letter || solved} tabIndex={!letter || solved ? -1 : undefined} onClick={() => remove(slot)}
            aria-label={letter ? `Remove ${letter.toUpperCase()} from space ${slot + 1}` : `Empty space ${slot + 1}`}>
            {letter ?? <span aria-hidden="true">·</span>}
          </button>;
        })}
      </div>
      <div className={styles.tiles} role="group" aria-label="Letter tiles">
        {tiles.map((letter, index) => {
          const unavailable = solved || picked.includes(index) || picked.length === word.length;
          return <button key={index} type="button" aria-disabled={unavailable} tabIndex={unavailable ? -1 : undefined}
            aria-label={`Add ${letter.toUpperCase()}`} onClick={() => add(index)}>{letter}</button>;
        })}
      </div>

      <div className={practice.actions}>
        <button className={practice.secondary} type="button" onClick={hint}
          disabled={solved || (picked.length === word.length && picked.every((tile, index) => tiles[tile] === word[index]))}>
          <Lightbulb size={17} aria-hidden="true" /> Hint
        </button>
      </div>
      <p className={practice.feedback} role="status" data-correct={solved}>
        {solved ? `You spelled ${word}!` : feedback === "wrong" ? "Listen again and try moving the letters. Tap a letter in the word to take it out." : hintMessage}
      </p>
      {solved ? (
        <button className={practice.primary} type="button" onClick={() => advance(!assisted)}>
          {last ? "See Results" : "Next Word"}<ArrowRight size={18} aria-hidden="true" />
        </button>
      ) : (
        <button className={practice.primary} type="button" disabled={picked.length !== word.length} onClick={check}>
          Check Spelling<Check size={18} aria-hidden="true" />
        </button>
      )}
    </>
  );
}
