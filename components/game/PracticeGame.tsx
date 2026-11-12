"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { ResultsScreen } from "@/components/game/ResultsScreen";
import { useSfx } from "@/components/sound/SoundProvider";
import { useScore } from "@/hooks/useScore";
import type { CategoryKey } from "@/lib/games/categories";
import styles from "./PracticeGame.module.css";

export interface PracticeGameProps {
  gameId: string;
  onGameComplete: (score: number, total: number) => void;
  onExit: () => void;
}

export interface PracticeQuestionProps<Question> {
  question: Question;
  advance: (earnedStar: boolean) => void;
  last: boolean;
}

interface Mode<Id extends string> {
  id: Id;
  name: string;
  detail?: string;
}

export function PracticeGame<Id extends string, Question>({
  gameId, onGameComplete, onExit, category, modes, makeRound, QuestionView,
  stepLabel = "Question", modeLabel = "Difficulty",
}: PracticeGameProps & {
  category: CategoryKey;
  modes: readonly [Mode<Id>, ...Mode<Id>[]];
  makeRound: (mode: Id) => Question[];
  QuestionView: ComponentType<PracticeQuestionProps<Question>>;
  stepLabel?: string;
  modeLabel?: string;
}) {
  const { play } = useSfx();
  const { incrementScore } = useScore();
  const [mode, setMode] = useState(modes[0].id);
  const [round, setRound] = useState(() => makeRound(modes[0].id));
  const [roundNumber, setRoundNumber] = useState(0);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const advanced = useRef(-1);
  const focus = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);
  const last = index + 1 === round.length;

  useEffect(() => {
    if (moveFocus.current) focus.current?.focus({ preventScroll: true });
    moveFocus.current = false;
  }, [index, roundNumber]);

  function start(nextMode: Id, focusQuestion = false) {
    play("tap");
    advanced.current = -1;
    moveFocus.current = focusQuestion;
    setMode(nextMode);
    setRound(makeRound(nextMode));
    setRoundNumber((current) => current + 1);
    setIndex(0);
    setScore(0);
  }

  function advance(earnedStar: boolean) {
    if (advanced.current === index || index >= round.length) return;
    advanced.current = index;
    const nextScore = score + Number(earnedStar);
    if (last) {
      incrementScore(gameId, nextScore);
      onGameComplete(nextScore, round.length);
    } else {
      play("tap");
    }
    moveFocus.current = true;
    setScore(nextScore);
    setIndex(index + 1);
  }

  return (
    <section className={styles.game} data-category={category}>
      <div className={styles.levels} role="group" aria-label={modeLabel}>
        {modes.map((item) => (
          <button type="button" key={item.id} aria-pressed={item.id === mode} onClick={() => { if (item.id !== mode) start(item.id); }}>
            <strong>{item.name}</strong>{item.detail && <span>{item.detail}</span>}
          </button>
        ))}
      </div>
      {index < round.length && (
        <div className={styles.progress}>
          <span>{stepLabel} {index + 1} of {round.length}</span>
          <progress aria-label="Round progress" value={index} max={round.length} />
        </div>
      )}
      <div ref={focus} tabIndex={-1} className={styles.focusRegion} role="region"
        aria-label={index < round.length ? `${stepLabel} ${index + 1} of ${round.length}` : "Round results"}>
        {index < round.length ? (
          <QuestionView key={`${roundNumber}-${index}`} question={round[index]} advance={advance} last={last} />
        ) : (
          <ResultsScreen score={score} total={round.length} category={category} headline="Round Complete!"
            onPlayAgain={() => start(mode, true)} onHome={onExit} />
        )}
      </div>
    </section>
  );
}

interface Choice {
  id: string;
  label: string;
  visual?: ReactNode;
}

export function ChoiceQuestion({ heading, children, choices, correctId, explanation, advance, last, ready = true, canSkip = false }: {
  heading: string;
  children?: ReactNode;
  choices: readonly Choice[];
  correctId: string;
  explanation?: string;
  advance: (earnedStar: boolean) => void;
  last: boolean;
  ready?: boolean;
  canSkip?: boolean;
}) {
  const { play } = useSfx();
  const [selected, setSelected] = useState<string | null>(null);
  const isCorrect = selected === correctId;
  const correct = choices.find((choice) => choice.id === correctId);
  const locked = Boolean(selected) || !ready;
  return (
    <>
      <h2 className={styles.heading}>{heading}</h2>
      {children}
      <div className={styles.choices} role="group" aria-label="Answer choices">
        {choices.map((choice) => {
          const revealed = selected && choice.id === correctId;
          const wrong = !isCorrect && choice.id === selected;
          return (
            <button className={styles.choice} type="button" key={choice.id} aria-disabled={locked}
              tabIndex={locked && choice.id !== selected ? -1 : undefined}
              data-result={revealed ? "correct" : wrong ? "wrong" : undefined}
              onClick={() => {
                if (locked) return;
                setSelected(choice.id);
                play(choice.id === correctId ? "correct" : "wrong");
              }}>
              {choice.visual && <span aria-hidden="true">{choice.visual}</span>}
              <span>{choice.label}</span>
              {revealed && <Check className={styles.mark} size={18} aria-hidden="true" />}
              {wrong && <X className={styles.mark} size={18} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <p className={styles.feedback} role="status" data-correct={isCorrect}>
        {selected && <>{isCorrect ? "That’s right!" : `The answer is ${correct?.label}.`} {explanation}</>}
      </p>
      <button className={styles.primary} type="button" disabled={!selected && !canSkip} onClick={() => advance(isCorrect)}>
        {!selected && canSkip ? "Skip Question" : last ? "See Results" : "Next Question"}<ArrowRight size={18} aria-hidden="true" />
      </button>
    </>
  );
}
