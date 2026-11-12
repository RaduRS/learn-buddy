"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, RotateCcw, Undo2 } from "lucide-react";
import { ResultsScreen } from "@/components/game/ResultsScreen";
import { useSfx } from "@/components/sound/SoundProvider";
import { useScore } from "@/hooks/useScore";
import { makeShopRound, money, UK_COINS, type Coin, type ShopLevel } from "@/lib/games/miniShop";
import styles from "./MiniShopGame.module.css";

const LEVELS = [
  { id: "easy", name: "Easy", task: "One coin" },
  { id: "medium", name: "Medium", task: "Exact price" },
  { id: "hard", name: "Hard", task: "Give change" },
] as const;

interface MiniShopProps {
  gameId: string;
  onGameComplete: (score: number, total: number) => void;
  onExit: () => void;
}

export default function MiniShopGame({ gameId, onGameComplete, onExit }: MiniShopProps) {
  const { play } = useSfx();
  const { incrementScore } = useScore();
  const [level, setLevel] = useState<ShopLevel>("easy");
  const [orders, setOrders] = useState(() => makeShopRound("easy"));
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [checked, setChecked] = useState(false);
  const focus = useRef<HTMLElement | null>(null);
  const focusPending = useRef(false);
  const recorded = useRef(false);
  const order = orders[index];
  const sum = coins.reduce((total, coin) => total + coin, 0);
  const solved = checked && sum === order?.target;
  const selection = UK_COINS.flatMap((coin) => {
    const count = coins.filter((selected) => selected === coin).length;
    return count > 1 ? [`${count} × ${money(coin)}`] : count === 1 ? [money(coin)] : [];
  }).join(" + ");

  useEffect(() => {
    if (focusPending.current) focus.current?.focus({ preventScroll: true });
    focusPending.current = false;
  }, [index, orders]);

  function clearOrder() {
    setCoins([]);
    setAttempted(false);
    setChecked(false);
  }

  function startRound(nextLevel: ShopLevel, moveFocus = false) {
    play("tap");
    focusPending.current = moveFocus;
    recorded.current = false;
    setLevel(nextLevel);
    setOrders(makeShopRound(nextLevel));
    setIndex(0);
    setScore(0);
    clearOrder();
  }

  function pickCoin(coin: Coin) {
    if (solved) return;
    play("tap");
    setChecked(false);
    setCoins((current) => level === "easy" ? [coin] : [...current, coin]);
  }

  function editCoins(undoLast: boolean) {
    if (solved || !coins.length) return;
    play("tap");
    setChecked(false);
    setCoins((current) => undoLast ? current.slice(0, -1) : []);
  }

  function checkTotal() {
    if (solved || coins.length === 0) return;
    const correct = sum === order.target;
    setChecked(true);
    setAttempted(true);
    play(correct ? "correct" : "wrong");
    if (correct && !attempted) setScore((current) => current + 1);
  }

  function next(moveFocus: boolean) {
    if (!solved || recorded.current) return;
    focusPending.current = moveFocus;
    if (index + 1 === orders.length) {
      recorded.current = true;
      incrementScore(gameId, score);
      onGameComplete(score, orders.length);
    } else {
      play("tap");
    }
    clearOrder();
    setIndex(index + 1);
  }

  return (
    <section className={styles.shop} aria-label="Mini Shop game">
      <div className={styles.levels} role="group" aria-label="Shop difficulty">
        {LEVELS.map((choice) => (
          <button key={choice.id} type="button" aria-pressed={level === choice.id}
            onClick={() => { if (level !== choice.id) startRound(choice.id); }}>
            <strong>{choice.name}</strong><span>{choice.task}</span>
          </button>
        ))}
      </div>

      {!order ? (
        <div ref={(node) => { focus.current = node; }} tabIndex={-1} aria-label="Shop results" role="region">
          <ResultsScreen category="math" score={score} total={orders.length} headline="Shop Complete!"
            message="Your stars show how many orders you solved on the first try."
            onPlayAgain={() => startRound(level, true)} onHome={onExit} />
        </div>
      ) : (
        <>
          <div className={styles.progress}>
            <span>Customer {index + 1} of {orders.length}</span>
            <progress aria-label="Customers served" value={index + Number(solved)} max={orders.length} />
          </div>
          <div className={styles.receipt}>
            <span className={styles.picture} aria-hidden="true">{order.picture}</span>
            <div>
              <h2 ref={(node) => { focus.current = node; }} tabIndex={-1}>{order.name}</h2>
              <div className={styles.price}><span>Price</span><strong>{money(order.price)}</strong></div>
              {order.paid !== null && <div className={styles.price}><span>Customer paid</span><strong>{money(order.paid)}</strong></div>}
            </div>
          </div>

          <p className={styles.prompt}>
            {level === "easy" ? "Choose one coin to pay." : level === "medium" ? "Make the exact price." : "Choose coins to give the right change."}
          </p>
          <div className={styles.wallet} role="group" aria-label="UK coins">
            {UK_COINS.map((coin) => (
              <button key={coin} type="button" className={styles.coinButton}
                aria-label={level === "easy" ? `Choose ${money(coin)}` : `Add ${money(coin)}`}
                aria-pressed={level === "easy" ? coins[0] === coin : undefined}
                disabled={solved} onClick={() => pickCoin(coin)}>
                <span className={styles.coin} data-value={coin}>{money(coin)}</span>
              </button>
            ))}
          </div>
          <div className={styles.tray}>
            <div>
              <p className={styles.trayLabel}>{level === "hard" ? "Change tray" : "Payment tray"}</p>
              <strong aria-live="polite" aria-label={`Selected total ${money(sum)}`}>{money(sum)}</strong>
              {selection && <p className={styles.selected}>{selection}</p>}
            </div>
            <div className={styles.edit}>
              <button type="button" onClick={() => editCoins(true)} aria-label="Undo last coin" aria-disabled={solved || !coins.length}
                tabIndex={solved || !coins.length ? -1 : undefined}><Undo2 size={19} aria-hidden="true" /></button>
              <button type="button" onClick={() => editCoins(false)} aria-label="Clear selected coins" aria-disabled={solved || !coins.length}
                tabIndex={solved || !coins.length ? -1 : undefined}><RotateCcw size={18} aria-hidden="true" /></button>
            </div>
          </div>
          <p className={styles.feedback} role="status" data-solved={solved}>
            {solved ? (order.paid === null ? "That’s the exact price!" : `${money(order.paid)} − ${money(order.price)} = ${money(sum)} change.`)
              : checked ? (level === "easy" ? "Look for the coin with the same value as the price."
                : sum < order.target ? `Add ${money(order.target - sum)} more.`
                  : `That’s ${money(sum - order.target)} too much. Try undoing a coin.`) : null}
          </p>
          {solved ? (
            <button className={styles.action} type="button" onClick={(event) => next(event.detail === 0)}>
              {index + 1 === orders.length ? "See Results" : "Next Customer"}<ArrowRight size={19} aria-hidden="true" />
            </button>
          ) : (
            <button className={styles.action} type="button" disabled={!coins.length} onClick={checkTotal}>
              {level === "hard" ? "Check Change" : "Check Payment"}<Check size={19} aria-hidden="true" />
            </button>
          )}
        </>
      )}
    </section>
  );
}
