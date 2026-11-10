import { LIGHT_LINKS_BOARDS } from "./lightLinksBoards";

export type Links = readonly (readonly number[] | undefined)[];

export interface Board {
  size: number;
  routes: readonly (readonly number[])[];
  endpoints: ReadonlyMap<number, number>;
}

export interface GridPoint {
  x: number;
  y: number;
}

interface Level {
  label: string;
  size: number;
  stars: number;
  boards: readonly Board[];
}

function level(
  label: string,
  size: number,
  stars: number,
  solutions: readonly (readonly (readonly number[])[])[],
): Level {
  return {
    label,
    size,
    stars,
    boards: solutions.map((routes) => {
      const endpoints = new Map<number, number>();
      routes.forEach((route, pair) => {
        endpoints.set(route[0], pair);
        endpoints.set(route[route.length - 1], pair);
      });
      return { size, routes, endpoints };
    }),
  };
}

export const LIGHT_LINKS_LEVELS: readonly Level[] = [
  level("Easy", 4, 1, LIGHT_LINKS_BOARDS[4]),
  level("Medium", 5, 2, LIGHT_LINKS_BOARDS[5]),
  level("Hard", 6, 3, LIGHT_LINKS_BOARDS[6]),
  level("Expert", 7, 4, LIGHT_LINKS_BOARDS[7]),
  level("Master", 8, 5, LIGHT_LINKS_BOARDS[8]),
  level("Legend", 9, 6, LIGHT_LINKS_BOARDS[9]),
];

function replaceLink(links: Links, pair: number, path: readonly number[]): Links {
  const next = [...links];
  next[pair] = path;
  return next;
}

export function beginLink(board: Board, links: Links, cell: number): { links: Links; pair: number } | null {
  const endpoint = board.endpoints.get(cell);
  if (endpoint !== undefined) {
    const path = links[endpoint];
    return { links: path?.length === 1 && path[0] === cell ? links : replaceLink(links, endpoint, [cell]), pair: endpoint };
  }

  const pair = links.findIndex((path) => path?.includes(cell));
  if (pair < 0) return null;
  const path = links[pair]!;
  const index = path.indexOf(cell);
  return { links: index === path.length - 1 ? links : replaceLink(links, pair, path.slice(0, index + 1)), pair };
}

export function isLinked(board: Board, links: Links, pair: number): boolean {
  const path = links[pair];
  if (!path || path.length < 2) return false;
  const end = path[path.length - 1];
  return end !== path[0] && board.endpoints.get(end) === pair;
}

export function extendLink(board: Board, links: Links, pair: number, cell: number): Links {
  const path = links[pair];
  if (!path || !Number.isInteger(cell) || cell < 0 || cell >= board.size ** 2) return links;

  const last = path[path.length - 1];
  const dx = Math.abs(cell % board.size - last % board.size);
  const dy = Math.abs(Math.floor(cell / board.size) - Math.floor(last / board.size));
  if (dx + dy !== 1) return links;

  const index = path.indexOf(cell);
  if (index >= 0) return replaceLink(links, pair, path.slice(0, index + 1));
  if (isLinked(board, links, pair)) return links;

  const endpoint = board.endpoints.get(cell);
  if (endpoint !== undefined && endpoint !== pair) return links;
  if (links.some((other, id) => id !== pair && other?.includes(cell))) return links;
  return replaceLink(links, pair, [...path, cell]);
}

export function getProgress(board: Board, links: Links) {
  let filled = 0;
  let connected = 0;
  links.forEach((path, pair) => {
    filled += path?.length ?? 0;
    if (isLinked(board, links, pair)) connected++;
  });
  return { filled, connected, won: connected === board.routes.length && filled === board.size ** 2 };
}

export function cellAt({ x, y }: GridPoint, size: number): number | null {
  if (!(x >= 0 && x < size && y >= 0 && y < size)) return null;
  return Math.floor(y) * size + Math.floor(x);
}

/** Find every square crossed by a pointer segment, even between sparse events. */
export function cellsBetween(from: GridPoint, to: GridPoint, size: number): number[] {
  const first = cellAt(from, size);
  const last = cellAt(to, size);
  if (first === last || !Number.isFinite(to.x) || !Number.isFinite(to.y)) return [];
  if (first === null) return last === null ? [] : [last];

  let col = first % size;
  let row = Math.floor(first / size);
  const targetCol = Math.floor(to.x);
  const targetRow = Math.floor(to.y);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  // Compare the time at which the segment hits each next cell boundary.
  const intervalX = 1 / Math.abs(dx);
  const intervalY = 1 / Math.abs(dy);
  let timeX = dx === 0 ? Infinity : ((stepX > 0 ? col + 1 : col) - from.x) / dx;
  let timeY = dy === 0 ? Infinity : ((stepY > 0 ? row + 1 : row) - from.y) / dy;
  const cells: number[] = [];
  while (col !== targetCol || row !== targetRow) {
    // A simultaneous crossing out of the grid has no next in-bounds cell.
    if (timeX === timeY && cellAt({ x: col + stepX, y: row + stepY }, size) === null) break;
    if (col !== targetCol && (row === targetRow || timeX <= timeY)) {
      col += stepX;
      timeX += intervalX;
    } else {
      row += stepY;
      timeY += intervalY;
    }
    if (col < 0 || col >= size || row < 0 || row >= size) break;
    cells.push(row * size + col);
  }
  return cells;
}
