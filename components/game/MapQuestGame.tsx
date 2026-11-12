"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Compass, Flag, Footprints, Gem, Mountain,
  RotateCcw, Undo2,
} from "lucide-react";
import { useSfx } from "@/components/sound/SoundProvider";
import {
  MAP_DIRECTIONS, makeMapQuestRound, moveOnMap, type Direction, type MapQuestBoard,
} from "@/lib/games/mapQuest";
import { PracticeGame, type PracticeGameProps, type PracticeQuestionProps } from "./PracticeGame";
import practice from "./PracticeGame.module.css";
import styles from "./MapQuestGame.module.css";

const MODES = [
  { id: "easy", name: "Easy", detail: "4 × 4 arrows" },
  { id: "medium", name: "Medium", detail: "5 × 5 trail" },
  { id: "hard", name: "Hard", detail: "6 × 6 maze" },
] as const;

const ARROWS = { up: ArrowUp, right: ArrowRight, down: ArrowDown, left: ArrowLeft };
const CONTROL_DIRECTIONS: readonly Direction[] = ["up", "left", "down", "right"];
const KEY_DIRECTIONS: Partial<Record<string, Direction>> = {
  ArrowUp: "up", ArrowRight: "right", ArrowDown: "down", ArrowLeft: "left",
};

export default function MapQuestGame(props: PracticeGameProps) {
  return (
    <PracticeGame {...props} category="spatial" modes={MODES} makeRound={makeMapQuestRound}
      stepLabel="Trail" QuestionView={Trail} />
  );
}

function Trail({ question: board, advance, last }: PracticeQuestionProps<MapQuestBoard>) {
  const { play } = useSfx();
  const [trail, setTrail] = useState([board.start]);
  const [wrongTurn, setWrongTurn] = useState(false);
  const [message, setMessage] = useState("");
  const mapRef = useRef<HTMLDivElement>(null);
  const moves = trail.length - 1;
  const position = trail[moves];
  const won = position === board.treasure;
  const guided = board.level !== "hard";
  const starTarget = board.route.length + 2;
  const earnedStar = guided ? !wrongTurn : moves <= starTarget;
  const visited = new Set(trail);
  const nearby = new Map<number, Direction>();
  for (const direction of MAP_DIRECTIONS) {
    const destination = moveOnMap(board, position, direction);
    if (destination !== null) nearby.set(destination, direction);
  }

  function move(direction: Direction) {
    if (won) return;
    if (guided && direction !== board.route[moves]) {
      setWrongTurn(true);
      setMessage(`Look at the next arrow. Try moving ${board.route[moves]}.`);
      play("wrong");
      return;
    }
    const destination = moveOnMap(board, position, direction);
    if (destination === null) {
      setMessage("That way is blocked. Try another direction.");
      play("wrong");
      return;
    }
    setTrail([...trail, destination]);
    setMessage("");
    play(destination === board.treasure ? "correct" : "tap");
  }

  function handleKeys(event: KeyboardEvent<HTMLDivElement>) {
    const direction = KEY_DIRECTIONS[event.key];
    if (event.altKey || event.ctrlKey || event.metaKey || !direction || won) return;
    event.preventDefault();
    move(direction);
  }

  function restart() {
    setTrail([board.start]);
    setWrongTurn(false);
    setMessage("");
    play("tap");
  }

  function undo() {
    if (moves === 0 || won) return;
    setTrail(trail.slice(0, -1));
    setMessage("");
    play("tap");
  }

  return (
    <div>
      <h2 className={practice.heading}>{guided ? "Follow the arrows" : "Find the treasure"}</h2>
      <div className={styles.layout}>
        <div>
          <div className={styles.map} role="grid" aria-label="Treasure map. Use the arrow keys to move."
            aria-rowcount={board.size} aria-colcount={board.size} tabIndex={0} ref={mapRef} onKeyDown={handleKeys}
            style={{ "--map-size": board.size } as CSSProperties}>
            {Array.from({ length: board.size }, (_, row) => (
              <div className={styles.row} role="row" key={row}>
                {Array.from({ length: board.size }, (_, column) => {
                  const cell = row * board.size + column;
                  const rock = board.rocks.has(cell);
                  const you = cell === position;
                  const treasure = cell === board.treasure;
                  const start = cell === board.start;
                  const direction = won ? undefined : nearby.get(cell);
                  const marker = you ? "You" : rock ? "Rock" : treasure ? "Treasure" : start ? "Start" : visited.has(cell) ? "Trail" : "Open path";
                  const location = `row ${row + 1}, column ${column + 1}`;
                  const icon = you ? <Compass /> : rock ? <Mountain /> : treasure ? <Gem /> : start ? <Flag /> : visited.has(cell) ? <Footprints /> : null;
                  return (
                    <div key={column} className={styles.cell} role="gridcell" aria-label={`${marker}, ${location}`}
                      data-marker={marker} data-nearby={Boolean(direction)} data-shade={(row + column) % 2 === 1}>
                      {direction ? (
                        <button type="button" tabIndex={-1} aria-label={`Move ${direction} to ${marker.toLowerCase()}, ${location}`}
                          onClick={() => { move(direction); mapRef.current?.focus({ preventScroll: true }); }}>
                          <span aria-hidden="true">{icon}</span>
                        </button>
                      ) : <span aria-hidden="true">{icon}</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className={styles.legend} aria-hidden="true">
            <span><Compass size={14} /> You</span><span><Gem size={14} /> Treasure</span>
            {board.rocks.size > 0 && <span><Mountain size={14} /> Rock</span>}
          </div>
        </div>

        <div className={styles.controls}>
          {guided ? (
            <ol className={styles.steps} aria-label="Directions to the treasure">
              {board.route.map((direction, index) => {
                const Arrow = ARROWS[direction];
                return <li key={index} aria-label={`Step ${index + 1}: ${direction}`} aria-current={index === moves ? "step" : undefined}
                  data-done={index < moves}><Arrow size={19} aria-hidden="true" /></li>;
              })}
            </ol>
          ) : (
            <div className={styles.target}>
              <p>Go around the rocks.</p>
              <p><strong>{moves}</strong> {moves === 1 ? "move" : "moves"} so far</p>
              <p>Earn a star in {starTarget} moves or fewer.</p>
            </div>
          )}
          <div className={styles.arrows} role="group" aria-label="Move around the map">
            {CONTROL_DIRECTIONS.map((direction) => {
              const Arrow = ARROWS[direction];
              return <button className={practice.secondary} key={direction} type="button" data-direction={direction}
                aria-label={`Move ${direction}`} disabled={won} onClick={() => move(direction)}>
                <Arrow size={19} aria-hidden="true" /><span>{direction}</span>
              </button>;
            })}
          </div>
          <div className={styles.actions}>
            {!guided && <button className={practice.secondary} type="button" onClick={undo} disabled={moves === 0 || won}>
              <Undo2 size={16} aria-hidden="true" /> Undo
            </button>}
            <button className={practice.secondary} type="button" onClick={restart} disabled={(moves === 0 && !message) || won}>
              <RotateCcw size={16} aria-hidden="true" /> Restart
            </button>
          </div>
          <p className={styles.feedback} role="status" data-won={won}>
            {won ? (earnedStar ? "Treasure found! You earned a star." : "Treasure found!") : message}
            {!won && !message && moves > 0 && (
              <span className="sr-only">
                Row {Math.floor(position / board.size) + 1}, column {position % board.size + 1}.
                {guided && ` Next, move ${board.route[moves]}.`}
              </span>
            )}
          </p>
          {won && <button className={practice.primary} type="button" onClick={() => advance(earnedStar)}>
            {last ? "See Results" : "Next Trail"}<ArrowRight size={18} aria-hidden="true" />
          </button>}
        </div>
      </div>
    </div>
  );
}
