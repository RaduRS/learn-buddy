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
  size: number;
  start: number;
  treasure: number;
  rocks: ReadonlySet<number>;
  maxMoves: number;
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

export function getMapTrailProgress(
  board: Pick<MapQuestBoard, "maxMoves" | "treasure">,
  trail: readonly number[],
) {
  const moves = trail.length - 1;
  const remaining = Math.max(0, board.maxMoves - moves);
  const won = moves <= board.maxMoves && trail.at(-1) === board.treasure;
  return { remaining, won, exhausted: remaining === 0 && !won };
}

function readBoard(encoded: string): MapQuestBoard {
  const rows = encoded.split("/");
  const cells = rows.join("");
  const start = cells.indexOf("S");
  const treasure = cells.indexOf("T");
  const rocks = new Set<number>();
  for (let cell = 0; cell < cells.length; cell++) {
    if (cells[cell] === "#") rocks.add(cell);
  }
  const board = { size: rows.length, start, treasure, rocks };

  // The shortest route establishes a fair move limit for every map.
  const queue = [{ cell: start, distance: 0 }];
  const visited = new Set([start]);
  for (let index = 0; index < queue.length; index++) {
    const { cell, distance } = queue[index];
    if (cell === treasure) return { ...board, maxMoves: distance };
    for (const direction of MAP_DIRECTIONS) {
      const next = moveOnMap(board, cell, direction);
      if (next === null || visited.has(next)) continue;
      visited.add(next);
      queue.push({ cell: next, distance: distance + 1 });
    }
  }
  throw new Error(`Unreachable Map Quest treasure: ${encoded}`);
}

export const MAP_QUEST_BOARDS: Readonly<Record<MapLevel, readonly MapQuestBoard[]>> = {
  easy: MAPS.easy.map(readBoard),
  medium: MAPS.medium.map(readBoard),
  hard: MAPS.hard.map(readBoard),
};

export function makeMapQuestRound(level: MapLevel): MapQuestBoard[] {
  return shuffled(MAP_QUEST_BOARDS[level]).slice(0, 8);
}
