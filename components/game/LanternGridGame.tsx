"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { ArrowRight, Check, Lightbulb, X } from "lucide-react";
import { useSfx } from "@/components/sound/SoundProvider";
import { makeLanternRound, type LanternQuestion } from "@/lib/games/attentionGames";
import { PracticeGame, type PracticeGameProps, type PracticeQuestionProps } from "./PracticeGame";
import practice from "./PracticeGame.module.css";
import styles from "./LanternGridGame.module.css";

const MODES = [
  { id: "easy", name: "Easy", detail: "3 lanterns" },
  { id: "medium", name: "Medium", detail: "5 lanterns" },
  { id: "hard", name: "Hard", detail: "7 lanterns" },
] as const;

const ARROWS: Partial<Record<string, [number, number]>> = {
  ArrowUp: [-1, 0], ArrowRight: [0, 1], ArrowDown: [1, 0], ArrowLeft: [0, -1],
};

export default function LanternGridGame(props: PracticeGameProps) {
  return <PracticeGame {...props} category="memory" modes={MODES} makeRound={makeLanternRound} stepLabel="Board" QuestionView={LanternPuzzle} />;
}

function LanternPuzzle({ question, advance, last }: PracticeQuestionProps<LanternQuestion>) {
  const { play } = useSfx();
  const [phase, setPhase] = useState<"preview" | "recall" | "result">("preview");
  const [picked, setPicked] = useState<number[]>([]);
  const [focused, setFocused] = useState(0);
  const grid = useRef<HTMLDivElement>(null);
  const { size, lit } = question;
  const correctCount = picked.filter((cell) => lit.includes(cell)).length;
  const perfect = correctCount === lit.length;

  useEffect(() => {
    if (phase === "recall") grid.current?.querySelector<HTMLButtonElement>("[data-cell='0']")?.focus({ preventScroll: true });
  }, [phase]);

  function pick(cell: number) {
    if (phase !== "recall") return;
    if (picked.includes(cell)) setPicked(picked.filter((other) => other !== cell));
    else if (picked.length < lit.length) setPicked([...picked, cell]);
    else return;
    play("tap");
  }

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, row: number, col: number) {
    const move = ARROWS[event.key];
    if (!move || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    const y = row + move[0];
    const x = col + move[1];
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    grid.current?.querySelector<HTMLButtonElement>(`[data-cell='${y * size + x}']`)?.focus();
  }

  return (
    <>
      <h2 className={practice.heading}>{phase === "preview" ? "Remember the lanterns" : phase === "recall" ? "Where were the lanterns?" : "Look at the original pattern"}</h2>
      <div className={styles.boardFrame}>
        <div className={styles.board} role="grid" aria-label="Lantern grid" ref={grid} style={{ "--lantern-size": size } as CSSProperties}>
          {Array.from({ length: size }, (_, row) => (
            <div role="row" className={styles.row} key={row}>
              {Array.from({ length: size }, (_, col) => {
                const cell = row * size + col;
                const selected = picked.includes(cell);
                const isLit = phase !== "recall" && lit.includes(cell);
                const result = phase === "result" && selected ? (isLit ? "right" : "wrong") : undefined;
                const status = isLit ? (result === "right" ? "correct lantern" : "lit lantern") : result === "wrong" ? "wrong square" : "empty";
                const position = `Row ${row + 1}, column ${col + 1}`;
                return (
                  <div key={col} role="gridcell" aria-label={phase === "recall" ? undefined : `${position}, ${status}`}>
                    {phase === "recall" ? (
                      <button className={styles.tile} type="button" data-cell={cell} data-selected={selected}
                        aria-label={position} aria-pressed={selected} aria-disabled={!selected && picked.length === lit.length}
                        tabIndex={cell === focused ? 0 : -1} onFocus={() => setFocused(cell)} onClick={() => pick(cell)}
                        onKeyDown={(event) => moveFocus(event, row, col)}>
                        {selected && <Lightbulb aria-hidden="true" />}
                      </button>
                    ) : (
                      <span className={styles.tile} data-lit={isLit} data-result={result}>
                        {result === "right" ? <Check aria-hidden="true" /> : result === "wrong" ? <X aria-hidden="true" /> : isLit ? <Lightbulb aria-hidden="true" /> : null}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className={practice.feedback} role="status" data-correct={phase === "result" && perfect}>
        {phase === "preview" ? `${lit.length} lanterns are lit. Take a good look before you hide them.`
          : phase === "recall" ? `${picked.length} of ${lit.length} squares selected`
            : `You remembered ${correctCount} of ${lit.length} lanterns.`}
      </p>
      {phase === "preview" && <button className={practice.primary} type="button" onClick={() => { play("tap"); setPhase("recall"); }}>Hide Lanterns<ArrowRight size={18} aria-hidden="true" /></button>}
      {phase === "recall" && <button className={practice.primary} type="button" disabled={picked.length !== lit.length}
        onClick={() => { play(perfect ? "correct" : "wrong"); setPhase("result"); }}>Check My Squares<Check size={18} aria-hidden="true" /></button>}
      {phase === "result" && <button className={practice.primary} type="button" onClick={() => advance(perfect)}>{last ? "See Results" : "Next Board"}<ArrowRight size={18} aria-hidden="true" /></button>}
    </>
  );
}
