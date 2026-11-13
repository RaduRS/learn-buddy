"use client";

import { useEffect, useReducer, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, Delete, Timer } from "lucide-react";
import { useSfx } from "@/components/sound/SoundProvider";
import { useScore } from "@/hooks/useScore";
import { makeFactDeck, ROUND_SECONDS, TABLES, updateSprint, type Sprint, type Table } from "@/lib/games/timesTableSprint";
import type { PracticeGameProps } from "./PracticeGame";
import { ResultsScreen } from "./ResultsScreen";
import practice from "./PracticeGame.module.css";
import styles from "./TimesTableSprintGame.module.css";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export default function TimesTableSprintGame(props: PracticeGameProps) {
  const { play } = useSfx();
  const [table, setTable] = useState<Table>("mixed");
  const [round, setRound] = useState<Sprint | null>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

  useEffect(() => {
    if (!round && returnFocus.current) startButton.current?.focus();
  }, [round]);

  function start() {
    play("tap");
    const deck = makeFactDeck(table);
    setRound({ deadline: Date.now() + ROUND_SECONDS * 1000, remaining: ROUND_SECONDS, finished: false,
      deck, index: 0, score: 0, answered: 0, last: null });
  }

  return (
    <section className={`${practice.game} ${styles.game}`} data-category="math" aria-label="Times Table Sprint">
      {round ? <TimedRound key={round.deadline} {...props} table={table} initial={round} onReplay={start}
        onChooseTable={() => { returnFocus.current = true; setRound(null); }} /> : (
        <>
          <div className={styles.intro}>
            <Timer size={36} aria-hidden="true" />
            <div><h2 className={practice.heading}>Ready to multiply?</h2><p>How many can you get right in {ROUND_SECONDS} seconds?</p></div>
          </div>
          <h3 className={styles.tableHeading}>Pick a times table</h3>
          <div className={styles.tables} role="group" aria-label="Times table">
            <button type="button" className={`${practice.secondary} ${styles.mixed}`} aria-pressed={table === "mixed"} onClick={() => setTable("mixed")}>Mix 1 to 10</button>
            {TABLES.map((number) => <button key={number} type="button" className={practice.secondary} aria-pressed={table === number}
              aria-label={`${number} times table`} onClick={() => setTable(number)}>{number}×</button>)}
          </div>
          <button type="button" ref={startButton} className={practice.primary} onClick={start}>Start Sprint<ArrowRight size={19} aria-hidden="true" /></button>
        </>
      )}
    </section>
  );
}

function TimedRound({ initial, table, gameId, onGameComplete, onReplay, onChooseTable, onExit }: PracticeGameProps & {
  initial: Sprint;
  table: Table;
  onReplay: () => void;
  onChooseTable: () => void;
}) {
  const { play } = useSfx();
  const { incrementScore } = useScore();
  const [state, dispatch] = useReducer(updateSprint, initial);
  const [input, setInput] = useState("");
  const field = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const recorded = useRef(false);
  const { deck, index, remaining, finished, score, answered, last } = state;
  const fact = deck[index];

  useEffect(() => { field.current?.focus({ preventScroll: true }); }, []);

  useEffect(() => {
    if (finished) return;
    const tick = () => dispatch({ type: "tick", now: Date.now() });
    const interval = window.setInterval(tick, 125);
    const deadline = window.setTimeout(tick, Math.max(0, initial.deadline - Date.now()));
    return () => { window.clearInterval(interval); window.clearTimeout(deadline); };
  }, [finished, initial.deadline]);

  useEffect(() => {
    if (!finished || recorded.current) return;
    recorded.current = true;
    results.current?.focus({ preventScroll: true });
    incrementScore(gameId, score);
    onGameComplete(score, answered);
  }, [finished, gameId, score, answered, incrementScore, onGameComplete]);

  function recordAnswer(answer: number | null) {
    const now = Date.now();
    if (now >= state.deadline) {
      dispatch({ type: "tick", now });
      return;
    }
    play(answer === fact.left * fact.right ? "correct" : "wrong");
    dispatch({ type: "answer", now, answer, nextDeck: index + 1 === deck.length ? makeFactDeck(table, fact) : undefined });
    setInput("");
    field.current?.focus({ preventScroll: true });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (input) recordAnswer(Number(input));
  }

  if (finished) {
    return <div className={styles.results} ref={results} tabIndex={-1} role="region" aria-label="Sprint results">
      <ResultsScreen category="math" score={score} total={answered || undefined} headline="Time’s Up!"
        message={answered ? `You got ${score} of ${answered} ${answered === 1 ? "question" : "questions"} right.` : "Ready for another go?"}
        onPlayAgain={onReplay} secondary={{ label: "Change Table", onClick: onChooseTable }} onHome={onExit} />
    </div>;
  }

  return (
    <form onSubmit={submit} aria-label="Timed multiplication">
      <div className={styles.stats}>
        <p data-low={remaining <= 10}><Timer size={20} aria-hidden="true" /> <strong role="timer">{remaining}s</strong></p>
        <p>{table === "mixed" ? "Mixed tables" : `${table} times table`}</p>
        <p><strong>{score}</strong> correct</p>
      </div>
      <progress className={styles.clock} aria-label="Time remaining" value={remaining} max={ROUND_SECONDS} />
      <div className={styles.playArea}>
        <div>
          <div className={styles.equation}>
            <label htmlFor="sprint-answer">{fact.left} × {fact.right} =</label>
            <input id="sprint-answer" ref={field} type="text" inputMode="none" autoComplete="off" maxLength={3}
              value={input} placeholder="?" onChange={(event) => setInput(event.target.value.replace(/\D/g, "").slice(0, 3))} />
          </div>
          <p className={`${practice.feedback} ${styles.feedback}`} role="status" data-correct={last?.correct}>
            {last && <>{last.correct && "Correct! "}{last.fact.left} × {last.fact.right} = {last.fact.left * last.fact.right}</>}
          </p>
        </div>
        <div>
          <div className={styles.keypad} role="group" aria-label="Number pad">
            {DIGITS.map((digit) => <button key={digit} className={practice.secondary} type="button" onClick={() => setInput((value) => (value + digit).slice(0, 3))}>{digit}</button>)}
            <button className={practice.secondary} type="button" onClick={() => recordAnswer(null)}>Skip</button>
            <button className={practice.secondary} type="button" onClick={() => setInput((value) => (value + "0").slice(0, 3))}>0</button>
            <button className={practice.secondary} type="button" aria-label="Delete last digit" onClick={() => setInput((value) => value.slice(0, -1))}><Delete size={23} aria-hidden="true" /></button>
          </div>
          <button type="submit" className={`${practice.primary} ${styles.submit}`} disabled={!input}>Submit Answer<Check size={19} aria-hidden="true" /></button>
        </div>
      </div>
    </form>
  );
}
