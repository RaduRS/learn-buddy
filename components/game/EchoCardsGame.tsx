"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Cloud, Heart, Leaf, Moon, Snowflake, Star, Sun, Zap } from "lucide-react";
import { useSfx } from "@/components/sound/SoundProvider";
import { makeEchoRound, type EchoQuestion, type EchoSymbol } from "@/lib/games/focusRounds";
import { ChoiceQuestion, PracticeGame, type PracticeGameProps, type PracticeQuestionProps } from "./PracticeGame";
import practice from "./PracticeGame.module.css";
import styles from "./FocusGames.module.css";

const ICONS = { Sun, Moon, Star, Cloud, Heart, Leaf, Lightning: Zap, Snowflake };
const MODES = [
  { id: "easy", name: "Easy", detail: "Last card" },
  { id: "medium", name: "Medium", detail: "More symbols" },
  { id: "hard", name: "Hard", detail: "Two cards back" },
] as const;

const ANSWERS = [{ id: "same", label: "Same" }, { id: "different", label: "Different" }] as const;

export default function EchoCardsGame(props: PracticeGameProps) {
  return <PracticeGame {...props} category="memory" modes={MODES} makeRound={makeEchoRound} stepLabel="Card" QuestionView={EchoPuzzle} />;
}

function PictureCard({ symbol }: { symbol: EchoSymbol }) {
  const Icon = ICONS[symbol];
  return <div className={styles.pictureCard} data-symbol={symbol}>
    <Icon strokeWidth={1.9} aria-hidden="true" /><span>{symbol}</span>
  </div>;
}

function EchoPuzzle({ question, advance, last }: PracticeQuestionProps<EchoQuestion>) {
  const { play } = useSfx();
  const [started, setStarted] = useState(question.warmup.length === 0);
  const moveFocus = useRef(false);
  const focus = useRef<HTMLDivElement>(null);
  const compareWith = question.distance === 1 ? "the last card" : "the card two places back";
  const comparison = question.comparison === "Lightning" ? "lightning" : `a ${question.comparison.toLowerCase()}`;

  useEffect(() => {
    if (started && moveFocus.current) focus.current?.focus({ preventScroll: true });
  }, [started]);

  if (!started) {
    return (
      <>
        <h2 className={practice.heading}>{question.distance === 1 ? "Remember this card" : "Remember these two cards"}</h2>
        <div className={styles.echoPanel}>
          {question.warmup.map((symbol, index) => (
            <div key={index} className={styles.warmup}>
              {question.distance === 2 && <span>{index === 0 ? "First" : "Second"}</span>}
              <PictureCard symbol={symbol} />
            </div>
          ))}
        </div>
        <p className={practice.feedback}>{question.distance === 1 ? "Compare the next card with this one." : "The next card goes third. Compare it with the first one."}</p>
        <button className={practice.primary} type="button" onClick={() => { play("tap"); moveFocus.current = true; setStarted(true); }}>
          Start Round<ArrowRight size={18} aria-hidden="true" />
        </button>
      </>
    );
  }

  return (
    <div ref={focus} tabIndex={-1} role="region" aria-label="Compare cards">
      <ChoiceQuestion heading={`Does this match ${compareWith}?`} choices={ANSWERS}
        correctId={question.symbol === question.comparison ? "same" : "different"}
        explanation={`The card to remember showed ${comparison}.`}
        advance={advance} last={last}>
        <div className={styles.echoPanel}><PictureCard symbol={question.symbol} /></div>
      </ChoiceQuestion>
    </div>
  );
}
