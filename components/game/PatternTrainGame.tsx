"use client";

import type { CSSProperties } from "react";
import { TrainFront } from "lucide-react";
import { ChoiceQuestion, PracticeGame, type PracticeGameProps, type PracticeQuestionProps } from "@/components/game/PracticeGame";
import { makePatternRound, type Carriage, type PatternQuestion } from "@/lib/games/patternTrain";
import styles from "./PatternTrainGame.module.css";

const MODES = [
  { id: "easy", name: "Easy", detail: "Shapes or colours" },
  { id: "medium", name: "Medium", detail: "Longer patterns" },
  { id: "hard", name: "Hard", detail: "Skip counting" },
] as const;

function ShapeMark({ carriage }: { carriage: Carriage }) {
  if (carriage.kind === "number") return null;
  return <span className={styles.shape} data-colour={carriage.colour} data-shape={carriage.shape} aria-hidden="true" />;
}

export default function PatternTrainGame(props: PracticeGameProps) {
  return (
    <PracticeGame {...props} category="math" modes={MODES} makeRound={makePatternRound} stepLabel="Train"
      QuestionView={TrainPuzzle}
    />
  );
}

function TrainPuzzle({ question, advance, last }: PracticeQuestionProps<PatternQuestion>) {
  return (
    <ChoiceQuestion heading="Which carriage comes next?" advance={advance} last={last}
      choices={question.choices.map((choice) => ({
        id: choice.id,
        label: choice.label,
        visual: choice.kind === "shape" ? <ShapeMark carriage={choice} /> : undefined,
      }))}
      correctId={question.answer.id} explanation={question.explanation}>
      <div className={styles.trainYard}>
        <p className={styles.instruction}>
          <TrainFront size={20} aria-hidden="true" /> {question.instruction}
        </p>
        <ol className={styles.track} aria-label="Carriage pattern"
          style={{ "--carriage-count": question.track.length + 1 } as CSSProperties}>
          {question.track.map((carriage, index) => (
            <li className={styles.carriage} data-kind={carriage.kind} key={`${carriage.id}-${index}`}>
              <ShapeMark carriage={carriage} />
              <span className={styles.label}>{carriage.label}</span>
            </li>
          ))}
          <li className={`${styles.carriage} ${styles.missing}`} aria-label="Missing carriage">
            <span aria-hidden="true">?</span>
          </li>
        </ol>
      </div>
    </ChoiceQuestion>
  );
}
