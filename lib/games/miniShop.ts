import { shuffled } from "./shuffle";

export const UK_COINS = [1, 2, 5, 10, 20, 50, 100, 200] as const;
export type Coin = (typeof UK_COINS)[number];
export type ShopLevel = "easy" | "medium" | "hard";

const GOODS = [
  ["Apple", "🍎"], ["Banana", "🍌"], ["Pencil", "✏️"], ["Sticker", "⭐"],
  ["Bouncy ball", "🏀"], ["Notebook", "📒"], ["Toy car", "🚗"], ["Ruler", "📏"],
  ["Paintbrush", "🖌️"], ["Orange", "🍊"], ["Pear", "🍐"], ["Paper plane", "✈️"],
  ["Crayons", "🖍️"], ["Teddy bear", "🧸"], ["Ice lolly", "🍦"], ["Toy duck", "🐤"],
] as const;

const EXACT_PRICES = [6, 8, 12, 15, 18, 24, 27, 32, 35, 42, 48, 60, 65, 75, 110, 125];

const CHANGE_ORDERS = [
  [12, 20], [14, 20], [17, 20], [21, 50], [25, 50], [32, 50], [35, 50], [44, 50],
  [55, 100], [62, 100], [75, 100], [86, 100], [110, 200], [125, 200], [140, 200], [155, 200],
] as const;

export function money(pence: number): string {
  if (pence < 100) return `${pence}p`;
  return `£${pence % 100 === 0 ? pence / 100 : (pence / 100).toFixed(2)}`;
}

export function makeShopRound(level: ShopLevel) {
  const prices = level === "easy" ? UK_COINS : EXACT_PRICES;
  const orders = shuffled<readonly [number, number | null]>(
    level === "hard" ? CHANGE_ORDERS : prices.map((price) => [price, null]),
  );
  return shuffled(GOODS).slice(0, 8).map(([name, picture], index) => {
    const [price, paid] = orders[index];
    return { name, picture, price, paid, target: paid === null ? price : paid - price };
  });
}
