"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Image from "next/image";
import { ArrowRight, Check, X } from "lucide-react";
import { ResultsScreen } from "@/components/game/ResultsScreen";
import { useSfx } from "@/components/sound/SoundProvider";
import { useScore } from "@/hooks/useScore";
import { CAR_LOGOS, type CarLogo } from "@/lib/games/carLogoBank";
import styles from "./CarLogoGame.module.css";

const ROUND_SIZE = 10;

function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function makeRound(deck: readonly CarLogo[], offset: number) {
  return {
    deck,
    offset,
    questions: deck.slice(offset, offset + ROUND_SIZE).map((logo) => {
      const distractors = shuffled(CAR_LOGOS.filter((item) => item.id !== logo.id)).slice(0, 3);
      return { logo, choices: shuffled([logo, ...distractors]) };
    }),
  };
}

interface CarLogoGameProps {
  gameId: string;
  onGameComplete: (score: number, total: number) => void;
  onExit: () => void;
}

export default function CarLogoGame({ gameId, onGameComplete, onExit }: CarLogoGameProps) {
  const { play } = useSfx();
  const { incrementScore } = useScore();
  const [round, setRound] = useState(() => makeRound([
    ...shuffled(CAR_LOGOS.slice(0, 30)),
    ...shuffled(CAR_LOGOS.slice(30)),
  ], 0));
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const answered = useRef(false);
  const completed = useRef(false);
  const focusTarget = useRef<HTMLElement | null>(null);
  const moveFocus = useRef(false);
  const question = round.questions[index];
  const total = round.questions.length;

  useEffect(() => {
    if (moveFocus.current) focusTarget.current?.focus({ preventScroll: true });
    moveFocus.current = false;
  }, [index, round]);

  function choose(choice: CarLogo) {
    if (!question || answered.current || logoFailed) return;
    answered.current = true;
    setSelected(choice.id);
    const correct = choice.id === question.logo.id;
    play(correct ? "correct" : "wrong");
    if (correct) setScore((current) => current + 1);
  }

  function advance(event: MouseEvent<HTMLButtonElement>) {
    if ((!selected && !logoFailed) || completed.current) return;
    moveFocus.current = event.detail === 0;
    if (index + 1 === total) {
      completed.current = true;
      incrementScore(gameId, score);
      onGameComplete(score, total);
    } else {
      play("tap");
    }
    answered.current = false;
    setSelected(null);
    setLogoFailed(false);
    setIndex(index + 1);
  }

  function playAgain() {
    play("tap");
    const nextOffset = round.offset + total;
    setRound(nextOffset < round.deck.length
      ? makeRound(round.deck, nextOffset)
      : makeRound(shuffled(CAR_LOGOS), 0));
    moveFocus.current = true;
    completed.current = false;
    setIndex(0);
    setScore(0);
  }

  if (!question) {
    return (
      <section className={styles.game} tabIndex={-1} aria-label="Round results" ref={(node) => { focusTarget.current = node; }}>
        <ResultsScreen category="memory" score={score} total={total} onPlayAgain={playAgain} onHome={onExit} />
      </section>
    );
  }

  const correct = selected === question.logo.id;
  const locked = Boolean(selected) || logoFailed;

  return (
    <section className={styles.game} aria-labelledby="car-logo-question">
      <div className={styles.meta}>
        <p>Question {index + 1} of {total}</p>
        <p>{score} correct</p>
      </div>
      <progress className={styles.progress} aria-label="Round progress" value={index + Number(locked)} max={total} />
      <h2 id="car-logo-question" className={styles.heading} tabIndex={-1} ref={(node) => { focusTarget.current = node; }}>
        Which car brand is this?
      </h2>
      <div className={styles.plate}>
        {logoFailed ? (
          <p className={styles.imageError}>This logo couldn’t load. You can skip to the next question.</p>
        ) : (
          <Image
            key={question.logo.id}
            className={styles.logo}
            src={question.logo.src}
            alt={selected ? `${question.logo.name} logo` : "Mystery car logo"}
            width={240}
            height={136}
            unoptimized
            loading="eager"
            onError={() => setLogoFailed(true)}
          />
        )}
      </div>

      <div className={styles.choices} role="group" aria-label="Choose a car brand">
        {question.choices.map((choice) => {
          const isAnswer = selected && choice.id === question.logo.id;
          const isMiss = !correct && selected === choice.id;
          return (
            <button
              key={choice.id}
              type="button"
              className={styles.choice}
              data-result={isAnswer ? "correct" : isMiss ? "wrong" : undefined}
              aria-disabled={locked}
              tabIndex={locked && selected !== choice.id ? -1 : undefined}
              onClick={() => choose(choice)}
            >
              <span translate="no">{choice.name}</span>
              {isAnswer && <Check size={19} aria-hidden="true" />}
              {isMiss && <X size={19} aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      <div className={styles.footer}>
        <p className={styles.feedback} role="status" data-correct={correct}>
          {selected && <>{correct ? "Correct! It’s " : "That’s "}<span translate="no">{question.logo.name}</span>.</>}
        </p>
        <button className={styles.next} type="button" onClick={advance} disabled={!locked}>
          {index + 1 === total ? "See Results" : logoFailed ? "Skip Logo" : "Next Logo"}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
