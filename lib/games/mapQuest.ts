import { shuffled } from "./shuffle";

export type MapLevel = "easy" | "medium" | "hard";
export type Direction = "up" | "right" | "down" | "left";

export const MAP_DIRECTIONS: readonly Direction[] = ["up", "right", "down", "left"];

const OFFSETS: Record<Direction, readonly [number, number]> = {
  up: [-1, 0],
  right: [0, 1],
  down: [1, 0],
  left: [0, -1],
};

export interface MapQuestBoard {
  level: MapLevel;
  size: number;
  start: number;
  treasure: number;
  rocks: ReadonlySet<number>;
  route: readonly Direction[];
}

// S marks the start, T marks the treasure and # marks a rock.
const MAPS = {
  easy: [
    "..../T.../..../...S", "...T/..../..S./....", "...T/.S../..../....",
    "..T./..../..../...S", "S.../..../...T/....", "..S./..../..../.T..",
    ".S../...T/..../....", "...T/S.../..../....", "..../...S/..../.T..",
    "..../..../..S./T...", "..../..../S.../..T.", "T.../..../...S/....",
  ],
  medium: [
    "...../T..../#...S/#..../..###", ".#.#./...T#/S..##/...../.....",
    "#..#./.#..T/...../.S.#./.#...", "...S#/...../#..../.T..#/.##..",
    "..S../.####/...T./...../...#.", "#.#.S/..#../...#./...../#T...",
    "..#../.#..S/#..../T..#./#....", "##.../...../S...#/...../.##.T",
    "T..../.#.../..#../.S.../.###.", ".#.../.#T../.##../#..../....S",
    "...#./S..../.#.../..T.#/#..#.", "...T./#..../....#/....#/#S..#",
  ],
  hard: [
    "##..../....##/#T#..#/.#..../S...#./#..#..", "....#./.##.#S/..#.../.#.#.#/T..#../.##...",
    "....../.##..S/.T#.../#.#.##/##..##/......", "#....S/.#..#./#...../#.###./...#.#/...T#.",
    ".##.../###.../.#T.##/..#.../S.#.#./......", "T...../#.#.##/....#./.###.#/...S../##....",
    ".#..../S#..../...#../.#.##T/...#../#.###.", "#.#.#./.S#..#/.#T.../..#.../#...#./#...#.",
    "#..#../....../#.##.T/....##/.S##../.#.#..", "T...../.....#/..#.../##..#./..S#.#/#..###",
    "..####/#.#.../##...T/S#..../....#./..#...", ".##.#./#...S./#.#.#./..#..#/...#../....#T",
  ],
} as const;

export function moveOnMap(
  board: Pick<MapQuestBoard, "size" | "rocks">,
  from: number,
  direction: Direction,
): number | null {
  const [rowOffset, columnOffset] = OFFSETS[direction];
  const row = Math.floor(from / board.size) + rowOffset;
  const column = from % board.size + columnOffset;
  if (row < 0 || row >= board.size || column < 0 || column >= board.size) return null;
  const next = row * board.size + column;
  return board.rocks.has(next) ? null : next;
}

function readBoard(level: MapLevel, encoded: string): MapQuestBoard {
  const rows = encoded.split("/");
  const cells = rows.join("");
  const start = cells.indexOf("S");
  const treasure = cells.indexOf("T");
  const rocks = new Set<number>();
  for (let cell = 0; cell < cells.length; cell++) {
    if (cells[cell] === "#") rocks.add(cell);
  }
  const board = { level, size: rows.length, start, treasure, rocks };

  // Breadth-first search supplies the guide arrows and the shortest Hard route.
  const queue: { cell: number; route: Direction[] }[] = [{ cell: start, route: [] }];
  const visited = new Set([start]);
  for (let index = 0; index < queue.length; index++) {
    const { cell, route } = queue[index];
    if (cell === treasure) return { ...board, route };
    for (const direction of MAP_DIRECTIONS) {
      const next = moveOnMap(board, cell, direction);
      if (next === null || visited.has(next)) continue;
      visited.add(next);
      queue.push({ cell: next, route: [...route, direction] });
    }
  }
  throw new Error(`Unreachable Map Quest treasure: ${encoded}`);
}

export const MAP_QUEST_BOARDS: Readonly<Record<MapLevel, readonly MapQuestBoard[]>> = {
  easy: MAPS.easy.map((map) => readBoard("easy", map)),
  medium: MAPS.medium.map((map) => readBoard("medium", map)),
  hard: MAPS.hard.map((map) => readBoard("hard", map)),
};

export function makeMapQuestRound(level: MapLevel): MapQuestBoard[] {
  return shuffled(MAP_QUEST_BOARDS[level]).slice(0, 8);
}
