"use client";

import { ArrowDown, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUp, RotateCcw, RotateCw } from "lucide-react";
import { DIRECTIONS, makeSignalRound, type SignalQuestion } from "@/lib/games/focusRounds";
import { ChoiceQuestion, PracticeGame, type PracticeGameProps, type PracticeQuestionProps } from "./PracticeGame";
import styles from "./FocusGames.module.css";

const ARROWS = { Up: ArrowUp, Right: ArrowRight, Down: ArrowDown, Left: ArrowLeft };
const TURNS = { left: RotateCcw, right: RotateCw, around: ArrowLeftRight };

const MODES = [
  { id: "easy", name: "Easy", detail: "1 turn" },
  { id: "medium", name: "Medium", detail: "2 turns" },
  { id: "hard", name: "Hard", detail: "3 turns" },
] as const;

export default function SignalScoutGame(props: PracticeGameProps) {
  return <PracticeGame {...props} category="spatial" modes={MODES} makeRound={makeSignalRound} stepLabel="Signal" QuestionView={SignalPuzzle} />;
}

function SignalPuzzle({ question, advance, last }: PracticeQuestionProps<SignalQuestion>) {
  const Start = ARROWS[question.start];
  const explanation = question.turns.map((turn, index) => `Turn ${turn} to face ${question.headings[index].toLowerCase()}.`).join(" ");
  return (
    <ChoiceQuestion heading="Which way will you face?" correctId={question.answer} explanation={explanation} advance={advance} last={last}
      choices={DIRECTIONS.map((direction) => {
        const Arrow = ARROWS[direction];
        return { id: direction, label: direction, visual: <Arrow size={19} aria-hidden="true" /> };
      })}>
      <div className={styles.signalPanel}>
        <div className={styles.startSignal}>
          <span><Start size={30} aria-hidden="true" /></span>
          <p>Start facing <strong>{question.start.toLowerCase()}</strong></p>
        </div>
        <ol className={styles.turns} aria-label="Turns in order">
          {question.turns.map((turn, index) => {
            const Turn = TURNS[turn];
            return (
              <li key={index} className={styles.turn}>
                <span className={styles.step}>{index + 1}</span>
                <Turn size={22} aria-hidden="true" />
                <span>Turn {turn}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </ChoiceQuestion>
  );
}
