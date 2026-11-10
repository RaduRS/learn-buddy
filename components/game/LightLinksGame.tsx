"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { ArrowRight, Check, Lightbulb, RotateCcw, Sparkles, Star, Undo2 } from "lucide-react";
import { useSfx } from "@/components/sound/SoundProvider";
import { useScore } from "@/hooks/useScore";
import {
  beginLink,
  cellAt,
  cellsBetween,
  extendLink,
  getProgress,
  isLinked,
  LIGHT_LINKS_LEVELS,
  type GridPoint,
  type Links,
} from "@/lib/games/lightLinks";
import styles from "./LightLinksGame.module.css";

const PAIR_COLOURS = ["#ff92bb", "#78edce", "#ffd481", "#9db9ff", "#d6a4ff", "#ff9979", "#c5ee84"];

const SPARKS = [
  [-117, -70], [48, -98], [102, -52], [-52, -105], [-91, 55],
  [117, 32], [-35, 90], [62, 83], [9, -122], [129, -7], [-131, -12],
];

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

interface LightLinksProps {
  gameId: string;
  onGameComplete: (score: number, total: number) => void;
}

export default function LightLinksGame(props: LightLinksProps) {
  const [levelIndex, setLevelIndex] = useState(0);
  const [boardIndex, setBoardIndex] = useState(0);
  const level = LIGHT_LINKS_LEVELS[levelIndex];
  const { play } = useSfx();
  const gameRef = useRef<HTMLDivElement>(null);
  const focusNextBoard = useRef(false);

  useEffect(() => {
    if (!focusNextBoard.current) return;
    focusNextBoard.current = false;
    gameRef.current?.querySelector<HTMLButtonElement>("[data-cell='0']")?.focus();
  }, [boardIndex]);

  function selectLevel(index: number) {
    if (index === levelIndex) return;
    play("tap");
    setLevelIndex(index);
    setBoardIndex(0);
  }

  function nextBoard(fromKeyboard: boolean) {
    play("tap");
    focusNextBoard.current = fromKeyboard;
    setBoardIndex((previous) => (previous + 1) % level.boards.length);
  }

  return (
    <div ref={gameRef} className={styles.game}>
      <div className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>Light Lab</p>
          <h2 className={styles.heading}>Connect the Lights</h2>
          <p className={styles.subtitle}>Join matching numbers and light up every square.</p>
        </div>
        <div className={styles.difficulty} role="group" aria-label="Puzzle difficulty">
          {LIGHT_LINKS_LEVELS.map((item, index) => (
            <button
              key={item.label}
              type="button"
              className={styles.level}
              data-selected={index === levelIndex}
              aria-pressed={index === levelIndex}
              onClick={() => selectLevel(index)}
            >
              <strong>{item.label}</strong>
              <span>{item.size} × {item.size}</span>
            </button>
          ))}
        </div>
      </div>
      <LightLinksRound
        key={`${levelIndex}-${boardIndex}`}
        {...props}
        level={level}
        boardIndex={boardIndex}
        nextBoard={nextBoard}
      />
    </div>
  );
}

function LightLinksRound({
  gameId,
  onGameComplete,
  level,
  boardIndex,
  nextBoard,
}: LightLinksProps & {
  level: (typeof LIGHT_LINKS_LEVELS)[number];
  boardIndex: number;
  nextBoard: (fromKeyboard: boolean) => void;
}) {
  const board = level.boards[boardIndex];
  const { size, routes, endpoints } = board;
  const { play } = useSfx();
  const { incrementScore } = useScore();
  const [links, setLinks] = useState<Links>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [history, setHistory] = useState<Links[]>([]);
  const [hint, setHint] = useState<{ pair: number; cells: readonly number[] } | null>(null);
  const [pulse, setPulse] = useState<{ pair: number; cell: number; sequence: number } | null>(null);
  const [focusCell, setFocusCell] = useState(0);
  const linksRef = useRef<Links>([]);
  const selectedRef = useRef<number | null>(null);
  const gesture = useRef<{ id: number; previous: Links; point: GridPoint | null } | null>(null);
  const scored = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const helpId = useId();
  const progress = getProgress(board, links);
  const litPairs = routes.map((_, pair) => isLinked(board, links, pair));
  const painted = new Map<number, number>();
  links.forEach((link, pair) => link?.forEach((cell) => painted.set(cell, pair)));
  const hintBlocker = hint?.cells
    .map((cell) => painted.get(cell))
    .find((pair) => pair !== undefined && pair !== hint.pair);

  function selectPair(pair: number | null) {
    if (selectedRef.current === pair) return;
    selectedRef.current = pair;
    setSelected(pair);
  }

  function showLinks(next: Links) {
    linksRef.current = next;
    setLinks(next);
  }

  function draw(next: Links, pair: number) {
    const previous = linksRef.current;
    showLinks(next);
    if (isLinked(board, previous, pair) || !isLinked(board, next, pair)) return;

    setPulse((last) => ({ pair, cell: next[pair]!.at(-1)!, sequence: (last?.sequence ?? 0) + 1 }));
    setHint(null);
    selectPair(null);
    if (!scored.current && getProgress(board, next).won) {
      scored.current = true;
      play("finish");
      incrementScore(gameId, level.stars);
      onGameComplete(level.stars, level.stars);
    } else {
      play("correct");
    }
  }

  function chooseCell(cell: number) {
    if (scored.current) return false;
    const current = linksRef.current;
    const pair = selectedRef.current;
    if (pair !== null) {
      const next = extendLink(board, current, pair, cell);
      if (next !== current) {
        draw(next, pair);
        return true;
      }
      if (!endpoints.has(cell) && !current[pair]?.includes(cell)) return false;
    }
    const start = beginLink(board, current, cell);
    if (!start) return false;
    if (pair !== start.pair) {
      play("tap");
      setHint((currentHint) => currentHint?.pair === start.pair ? currentHint : null);
    }
    selectPair(start.pair);
    if (start.links !== current) showLinks(start.links);
    return true;
  }

  function remember(previous: Links) {
    if (previous !== linksRef.current) setHistory((items) => [...items, previous]);
  }

  function pointOnBoard(event: PointerEvent<HTMLDivElement>): GridPoint {
    const rect = event.currentTarget.getBoundingClientRect();
    const point = {
      x: (event.clientX - rect.left) * size / rect.width,
      y: (event.clientY - rect.top) * size / rect.height,
    };
    return point;
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (gesture.current || !event.isPrimary || event.button !== 0) return;
    const point = pointOnBoard(event);
    const cell = cellAt(point, size);
    if (cell === null) return;
    const previous = linksRef.current;
    if (!chooseCell(cell)) return;
    setFocusCell(cell);
    gesture.current = { id: event.pointerId, previous, point };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = gesture.current;
    const pair = selectedRef.current;
    if (!drag || drag.id !== event.pointerId || pair === null || scored.current) return;
    const point = pointOnBoard(event);
    const currentCell = cellAt(point, size);
    const cells = drag.point
      ? cellsBetween(drag.point, point, size)
      : currentCell === null ? [] : [currentCell];
    let next = linksRef.current;
    for (const cell of cells) {
      next = extendLink(board, next, pair, cell);
      if (isLinked(board, next, pair)) break;
    }
    if (next !== linksRef.current) draw(next, pair);
    drag.point = currentCell === null ? null : point;
  }

  function endGesture(event: PointerEvent<HTMLDivElement>) {
    if (gesture.current?.id !== event.pointerId) return;
    remember(gesture.current.previous);
    gesture.current = null;
  }

  function keyboardStep(event: KeyboardEvent<HTMLButtonElement>, cell: number) {
    if (event.key === "Escape") {
      selectPair(null);
      return;
    }
    const direction = ARROWS[event.key];
    if (!direction) return;
    event.preventDefault();
    const row = Math.floor(cell / size) + direction[0];
    const col = cell % size + direction[1];
    if (row < 0 || row >= size || col < 0 || col >= size) return;
    const destination = row * size + col;
    setFocusCell(destination);
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-cell="${destination}"]`)?.focus();
  }

  function undo() {
    if (!history.length) return;
    showLinks(history.at(-1)!);
    setHistory(history.slice(0, -1));
    selectPair(null);
    setHint(null);
    setPulse(null);
    play("whoosh");
  }

  function reset() {
    const previous = linksRef.current;
    showLinks([]);
    remember(previous);
    selectPair(null);
    setHint(null);
    setPulse(null);
    play("whoosh");
  }

  function showHint() {
    const pair = selected !== null && !litPairs[selected] ? selected : litPairs.indexOf(false);
    const index = pair >= 0 ? pair : routes.findIndex((route, i) => links[i]?.length !== route.length);
    if (index < 0) return;
    const path = links[index] ?? [];
    const route = routes[index];
    const solution = path[0] === route.at(-1) ? [...route].reverse() : route;
    const mismatch = path.findIndex((cell, i) => cell !== solution[i]);
    const start = Math.max(0, (mismatch === -1 ? path.length : mismatch) - 1);
    setHint({ pair: index, cells: solution.slice(start, start + 3) });
    play("ding");
  }

  return (
    <div className={styles.layout}>
      <section className={styles.stage} aria-label="Play area">
        <div className={styles.boardFrame}>
          <div className={styles.board} data-won={progress.won} style={{ "--size": size } as CSSProperties}>
            <svg className={styles.routeSvg} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
              {links.map((path, pair) => {
                if (!path || path.length < 2) return null;
                const points = path.map((cell) => `${cell % size + 0.5},${Math.floor(cell / size) + 0.5}`).join(" ");
                return (
                  <g key={pair} color={PAIR_COLOURS[pair]} data-active={selected === pair} data-linked={litPairs[pair]}>
                    <polyline className={styles.routeGlow} points={points} />
                    <polyline className={styles.routeCore} points={points} />
                    <polyline className={styles.routeShine} points={points} />
                  </g>
                );
              })}
              {pulse && litPairs[pulse.pair] && (
                <g key={pulse.sequence} className={styles.ring} color={PAIR_COLOURS[pulse.pair]}>
                  <circle cx={pulse.cell % size + 0.5} cy={Math.floor(pulse.cell / size) + 0.5} r={0.39} />
                </g>
              )}
            </svg>
            <div
              ref={gridRef}
              className={styles.grid}
              role="grid"
              aria-label={`${size} by ${size} Light Links board`}
              aria-describedby={helpId}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={(event) => { onPointerMove(event); endGesture(event); }}
              onPointerCancel={endGesture}
              onLostPointerCapture={endGesture}
            >
              {Array.from({ length: size }, (_, row) => (
                <div className={styles.row} role="row" key={row}>
                  {Array.from({ length: size }, (_, col) => {
                    const cell = row * size + col;
                    const endpoint = endpoints.get(cell);
                    const owner = painted.get(cell);
                    const hinted = hint?.cells.includes(cell) ?? false;
                    const pair = endpoint ?? owner ?? (hinted ? hint?.pair : undefined);
                    const active = pair !== undefined && pair === selected;
                    const label = endpoint !== undefined
                      ? `Pair ${endpoint + 1} ${litPairs[endpoint] ? "linked endpoint" : "endpoint"}`
                      : owner === undefined ? "Empty square" : `Line ${owner + 1}`;
                    return (
                      <div role="gridcell" key={cell}>
                        <button
                          type="button"
                          className={styles.cell}
                          data-cell={cell}
                          data-hinted={hinted}
                          data-active={active}
                          data-linked={pair !== undefined && litPairs[pair]}
                          style={pair === undefined ? undefined : { "--pair": PAIR_COLOURS[pair] } as CSSProperties}
                          tabIndex={cell === focusCell ? 0 : -1}
                          aria-disabled={progress.won || undefined}
                          aria-label={`${label}, row ${row + 1}, column ${col + 1}${active ? ", selected" : ""}${hinted ? ", hint square" : ""}`}
                          onFocus={() => setFocusCell(cell)}
                          onKeyDown={(event) => keyboardStep(event, cell)}
                          onClick={(event) => {
                            if (event.detail !== 0 || gesture.current) return;
                            const previous = linksRef.current;
                            chooseCell(cell);
                            remember(previous);
                          }}
                        >
                          {hinted && hint && <span className={styles.hintCell} aria-hidden="true" style={{ "--pair": PAIR_COLOURS[hint.pair] } as CSSProperties} />}
                          {endpoint !== undefined && <span className={styles.endpoint} aria-hidden="true">{endpoint + 1}</span>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            {progress.won && (
              <div className={styles.sparks} aria-hidden="true">
                {SPARKS.map(([x, y], index) => (
                  <i className={styles.spark} key={index} style={{
                    "--spark-x": `${x}px`,
                    "--spark-y": `${y}px`,
                    "--spark-delay": `${index * 15}ms`,
                    "--pair": PAIR_COLOURS[index % PAIR_COLOURS.length],
                  } as CSSProperties} />
                ))}
              </div>
            )}
          </div>
          <div className={styles.boardCaption}>
            <span>{progress.won ? "All Squares Lit" : `Board ${boardIndex + 1} of ${level.boards.length}`}</span>
            <span>{size} × {size} Grid</span>
          </div>
        </div>
        <p id={helpId} className={styles.footer}>
          Drag from a number or tap one square at a time. Use arrow keys and Enter to play with a keyboard.
        </p>
      </section>

      <section className={styles.panel} aria-labelledby={`${helpId}-title`}>
        <p className={styles.panelLabel}>Board Progress</p>
        <h3 id={`${helpId}-title`} className={styles.panelTitle}>Lights On</h3>
        <div className={styles.stats}>
          <div className={styles.stat}><strong>{progress.connected}<span> / {routes.length}</span></strong><span>Pairs linked</span></div>
          <div className={styles.stat}><strong>{progress.filled}<span> / {size * size}</span></strong><span>Squares lit</span></div>
        </div>
        <p className="sr-only" role="status">{progress.connected} of {routes.length} pairs linked.</p>
        <div className={styles.progressList} role="group" aria-label="Number pairs">
          {litPairs.map((linked, pair) => (
            <span key={pair} className={styles.pairBadge} data-linked={linked} data-active={selected === pair}
              aria-label={`Pair ${pair + 1}: ${linked ? "linked" : "open"}`} role="img"
              style={{ "--pair": PAIR_COLOURS[pair] } as CSSProperties}>
              <span className={styles.pairNumber} aria-hidden="true">{pair + 1}</span>
              {linked && <Check size={12} aria-hidden="true" />}
            </span>
          ))}
        </div>
        <div className={styles.feedback} aria-live="polite">
          {progress.won ? (
            <div className={styles.win}>
              <Sparkles size={20} aria-hidden="true" />
              <div><strong>Board complete!</strong><span><Star size={14} fill="currentColor" aria-hidden="true" /> {level.stars} {level.stars === 1 ? "star" : "stars"} earned</span></div>
            </div>
          ) : (
            <p className={styles.panelHint}>
              {hint && hintBlocker !== undefined ? `Move line ${hintBlocker + 1} to free the highlighted squares for pair ${hint.pair + 1}.`
                : hint ? `Follow the highlighted squares for pair ${hint.pair + 1}.`
                : progress.connected === routes.length ? "All pairs linked. Try a longer route to fill the empty squares."
                  : "Keep your lines from crossing. Trace backwards to change your route."}
            </p>
          )}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.tool} onClick={showHint} disabled={progress.won}>
            <Lightbulb size={18} aria-hidden="true" /> Hint
          </button>
          <button type="button" className={styles.tool} onClick={undo} disabled={!history.length || progress.won}>
            <Undo2 size={18} aria-hidden="true" /> Undo
          </button>
          <button type="button" className={styles.tool} onClick={reset} disabled={!progress.filled || progress.won}>
            <RotateCcw size={16} aria-hidden="true" /> Reset
          </button>
        </div>
        <button type="button" className={styles.primary} data-won={progress.won} onClick={(event) => nextBoard(event.detail === 0)}>
          {progress.won ? "Next Board" : "Try Another Board"} <ArrowRight size={18} aria-hidden="true" />
        </button>
      </section>
    </div>
  );
}
