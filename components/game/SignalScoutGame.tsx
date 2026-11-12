"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import { DIRECTIONS, makeSignalRound, type SignalQuestion } from "@/lib/games/focusRounds";
import { ChoiceQuestion, PracticeGame, type PracticeGameProps, type PracticeQuestionProps } from "./PracticeGame";
import styles from "./FocusGames.module.css";

const ARROWS = { Up: ArrowUp, Right: ArrowRight, Down: ArrowDown, Left: ArrowLeft };

const MODES = [
  { id: "easy", name: "Easy", detail: "3 signals" },
  { id: "medium", name: "Medium", detail: "5 signals" },
  { id: "hard", name: "Hard", detail: "7 signals" },
] as const;

export default function SignalScoutGame(props: PracticeGameProps) {
  return <PracticeGame {...props} category="spatial" modes={MODES} makeRound={makeSignalRound} stepLabel="Signal" QuestionView={SignalPuzzle} />;
}

function SignalPuzzle({ question, advance, last }: PracticeQuestionProps<SignalQuestion>) {
  const middle = (question.signals.length - 1) / 2;
  return (
    <ChoiceQuestion heading="Where is the middle arrow pointing?" correctId={question.answer} advance={advance} last={last}
      choices={DIRECTIONS.map((direction) => {
        const Arrow = ARROWS[direction];
        return { id: direction, label: direction, visual: <Arrow size={19} aria-hidden="true" /> };
      })}>
      <div className={styles.signalPanel}>
        <ol className={styles.signals} aria-label="Signals">
          {question.signals.map((direction, index) => {
            const Arrow = ARROWS[direction];
            return (
              <li key={index} className={styles.signal} data-middle={index === middle}
                aria-label={`${index === middle ? "Middle arrow" : `Arrow ${index + 1}`} points ${direction.toLowerCase()}`}>
                <Arrow aria-hidden="true" strokeWidth={2.4} />
              </li>
            );
          })}
        </ol>
        <span className={styles.signalLabel}>Middle</span>
      </div>
    </ChoiceQuestion>
  );
}
