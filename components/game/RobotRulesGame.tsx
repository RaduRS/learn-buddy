"use client";

import { useRef, useState, type PointerEvent } from "react";
import { ArrowRight, Bot, Check, Circle, Play, Star, X } from "lucide-react";
import { useSfx } from "@/components/sound/SoundProvider";
import { CONDITION_LABELS, PARCELS, ROBOT_JOBS, runRobotProgram, type Bin, type Condition, type RobotJob, type RobotProgram } from "@/lib/games/robotRules";
import { PracticeGame, type PracticeGameProps, type PracticeQuestionProps } from "./PracticeGame";
import practice from "./PracticeGame.module.css";
import styles from "./RobotRulesGame.module.css";

type Slot = keyof RobotProgram;
type Block = { kind: "condition"; value: Condition } | { kind: "action"; value: Bin };
type Drag = { id: number; x: number; y: number; moved: boolean };

const SLOTS: { id: Slot; label: string; placeholder: string }[] = [
  { id: "condition", label: "IF", placeholder: "Add a condition" },
  { id: "then", label: "THEN", placeholder: "Pick a bin" },
  { id: "else", label: "ELSE", placeholder: "Pick a bin" },
];
const ACTIONS: Block[] = [{ kind: "action", value: "blue" }, { kind: "action", value: "gold" }];
const MODES = [{ id: "standard", name: "Puzzles" }] as const;

function binLabel(bin: Bin) {
  return bin === "blue" ? "Blue bin" : "Gold bin";
}

function blockLabel(block: Block) {
  return block.kind === "condition" ? CONDITION_LABELS[block.value] : binLabel(block.value);
}

function accepts(slot: Slot, block: Block) {
  return slot === "condition" ? block.kind === "condition" : block.kind === "action";
}

export default function RobotRulesGame(props: PracticeGameProps) {
  return <PracticeGame {...props} category="spatial" modes={MODES} makeRound={() => [...ROBOT_JOBS]} stepLabel="Puzzle" QuestionView={RobotPuzzle} />;
}

function RobotPuzzle({ question, advance, last }: PracticeQuestionProps<RobotJob>) {
  const { play } = useSfx();
  const [program, setProgram] = useState<Partial<RobotProgram>>({});
  const [selected, setSelected] = useState<Block | null>(null);
  const [dragging, setDragging] = useState<Block | null>(null);
  const [output, setOutput] = useState<Bin[] | null>(null);
  const [notice, setNotice] = useState("");
  const board = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const ignoreClick = useRef(false);
  const mismatch = output?.findIndex((bin, index) => bin !== question.targets[index]);
  const solved = mismatch === -1;
  const { condition, then, else: otherwise } = program;
  const activeBlock = dragging ?? selected;

  function putBlock(slot: Slot, block: Block) {
    if (solved) return;
    if (!accepts(slot, block)) {
      setNotice(block.kind === "condition" ? "Put the condition in IF." : "Put the bin in THEN or ELSE.");
      return;
    }
    if (block.kind === "condition") setProgram((current) => ({ ...current, condition: block.value }));
    else setProgram((current) => ({ ...current, [slot]: block.value }));
    setSelected(null);
    setOutput(null);
    setNotice(`${blockLabel(block)} added to ${slot === "condition" ? "IF" : slot.toUpperCase()}.`);
    play("tap");
  }

  function tapSlot(slot: Slot) {
    if (solved) return;
    if (selected) putBlock(slot, selected);
    else if (program[slot]) {
      setProgram((current) => ({ ...current, [slot]: undefined }));
      setOutput(null);
      setNotice(`${slot === "condition" ? "IF" : slot.toUpperCase()} slot cleared.`);
    } else setNotice("Choose a block from the tray first.");
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0 || solved) return;
    ignoreClick.current = false;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>, block: Block) {
    const gesture = drag.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    if (!gesture.moved) {
      if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < 7) return;
      gesture.moved = true;
      setDragging(block);
    }
    if (ghost.current) ghost.current.style.transform = `translate3d(${event.clientX + 12}px, ${event.clientY + 12}px, 0)`;
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>, block: Block) {
    const gesture = drag.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    drag.current = null;
    setDragging(null);
    if (!gesture.moved) return;
    ignoreClick.current = true;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-code-slot]");
    const slot = SLOTS.find(({ id }) => id === target?.dataset.codeSlot)?.id;
    if (slot && target && board.current?.contains(target)) putBlock(slot, block);
    else setNotice("Drop the block in a program slot.");
  }

  function cancelDrag(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    setDragging(null);
  }

  function run() {
    if (!condition || !then || !otherwise || solved) return;
    const bins = runRobotProgram({ condition, then, else: otherwise });
    const incorrect = bins.findIndex((bin, index) => bin !== question.targets[index]);
    setOutput(bins);
    setSelected(null);
    play(incorrect === -1 ? "correct" : "wrong");
    if (incorrect === -1) setNotice("All four parcels sorted correctly!");
    else {
      const parcel = PARCELS[incorrect];
      setNotice(`The ${parcel.colour} ${parcel.shape} went to the ${binLabel(bins[incorrect]).toLowerCase()}. It needs the ${binLabel(question.targets[incorrect]).toLowerCase()}.`);
    }
  }

  function palette(blocks: readonly Block[]) {
    return blocks.map((block) => (
      <button key={block.value} type="button" className={styles.block} data-block={block.value} data-kind={block.kind}
        aria-pressed={selected?.value === block.value} disabled={solved}
        onPointerDown={startDrag} onPointerMove={(event) => moveDrag(event, block)}
        onPointerUp={(event) => endDrag(event, block)} onPointerCancel={cancelDrag} onLostPointerCapture={cancelDrag}
        onClick={(event) => {
          if (event.detail > 0 && ignoreClick.current) { ignoreClick.current = false; return; }
          setSelected(selected?.value === block.value ? null : block);
          setNotice("");
          play("tap");
        }}>{blockLabel(block)}</button>
    ));
  }

  return (
    <div ref={board} className={styles.game}>
      <h2 className={practice.heading}>Code the sorter</h2>
      <div className={styles.brief}><Bot size={31} aria-hidden="true" /><p>{question.instruction}</p></div>

      <div className={styles.parcels} role="group" aria-label="Test parcels">
        {PARCELS.map((parcel, index) => {
          const Shape = parcel.shape === "star" ? Star : Circle;
          const sent = output?.[index];
          const correct = sent === question.targets[index];
          return <div className={styles.parcel} key={`${parcel.colour}-${parcel.shape}`}>
            <Shape data-colour={parcel.colour} size={18} fill="currentColor" aria-hidden="true" />
            <span>{parcel.colour} {parcel.shape}</span>
            {sent && <strong data-correct={correct}>{correct ? <Check size={13} aria-hidden="true" /> : <X size={13} aria-hidden="true" />}{binLabel(sent)}</strong>}
          </div>;
        })}
      </div>

      <div className={styles.workbench} data-solved={solved}>
        <div className={styles.program} role="group" aria-label="Your program">
          {SLOTS.map(({ id, label, placeholder }) => {
            const current = id === "condition" ? condition && CONDITION_LABELS[condition] : program[id] && binLabel(program[id]);
            return <div className={styles.line} key={id}>
              <span className={styles.keyword}>{label}</span>
              <button className={styles.slot} type="button" data-code-slot={id} data-filled={Boolean(current)}
                data-target={activeBlock ? accepts(id, activeBlock) : false}
                aria-label={`${label} slot, ${current ?? "empty"}`} disabled={solved} onClick={() => tapSlot(id)}>
                {current ?? placeholder}
              </button>
            </div>;
          })}
        </div>
        {!solved && <div className={styles.tray}>
          <div className={styles.blocks} role="group" aria-label="Condition blocks">{palette(question.conditions.map((value) => ({ kind: "condition", value })))}</div>
          <div className={styles.blocks} role="group" aria-label="Bin blocks">{palette(ACTIONS)}</div>
        </div>}
      </div>
      {!solved && <p className={practice.hint}>{selected ? `Choose a slot for ${blockLabel(selected).toLowerCase()}.` : "Drag a block to a slot, or tap the block and then the slot."}</p>}
      <p className={practice.feedback} role="status" data-correct={solved}>{notice}</p>
      {solved ? (
        <button className={practice.primary} type="button" onClick={() => advance(true)}>{last ? "See Results" : "Next Puzzle"}<ArrowRight size={18} aria-hidden="true" /></button>
      ) : (
        <button className={practice.primary} type="button" disabled={!condition || !then || !otherwise} onClick={run}>Run Program<Play size={18} aria-hidden="true" /></button>
      )}
      <div ref={ghost} className={styles.ghost} data-visible={Boolean(dragging)} aria-hidden="true">{dragging && blockLabel(dragging)}</div>
    </div>
  );
}
