"use client";

import { Circle, Diamond, Square, Triangle } from "lucide-react";
import { makeSortRound, type SortCard, type SortQuestion } from "@/lib/games/attentionGames";
import { ChoiceQuestion, PracticeGame, type PracticeGameProps, type PracticeQuestionProps } from "./PracticeGame";
import styles from "./SwitchSortGame.module.css";

const MODES = [
  { id: "easy", name: "Easy", detail: "Shape rule" },
  { id: "medium", name: "Medium", detail: "Take turns" },
  { id: "hard", name: "Hard", detail: "Mixed rules" },
] as const;

const SHAPES = { Circle, Square, Triangle, Diamond };

function cardLabel(card: SortCard) {
  return `${card.colour} ${card.shape.toLowerCase()}`;
}

function Mark({ card }: { card: SortCard }) {
  const Shape = SHAPES[card.shape];
  return <span className={styles.mark} data-colour={card.colour} aria-hidden="true"><Shape size="100%" fill="currentColor" strokeWidth={1.6} /></span>;
}

export default function SwitchSortGame(props: PracticeGameProps) {
  return <PracticeGame {...props} category="spatial" modes={MODES} makeRound={makeSortRound} stepLabel="Card" QuestionView={SortPuzzle} />;
}

function SortPuzzle({ question, advance, last }: PracticeQuestionProps<SortQuestion>) {
  const { target, rule, answer, choices } = question;
  return (
    <ChoiceQuestion heading={`Match the ${rule}`} choices={choices.map((card) => ({ id: cardLabel(card), label: cardLabel(card), visual: <Mark card={card} /> }))}
      correctId={cardLabel(answer)} explanation={`Both cards ${rule === "shape" ? `show a ${target.shape.toLowerCase()}` : `are ${target.colour.toLowerCase()}`}.`}
      advance={advance} last={last}>
      <div className={styles.station}>
        <div className={styles.target}><Mark card={target} /><span>{cardLabel(target)}</span></div>
      </div>
    </ChoiceQuestion>
  );
}
