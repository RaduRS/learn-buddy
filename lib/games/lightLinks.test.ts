import assert from "node:assert/strict";
import test from "node:test";
import {
  beginLink,
  cellsBetween,
  extendLink,
  getProgress,
  LIGHT_LINKS_LEVELS,
  type Links,
} from "./lightLinks";

const board = LIGHT_LINKS_LEVELS[0].boards[0];

test("six growing difficulties offer at least 24 boards each", () => {
  assert.deepEqual(LIGHT_LINKS_LEVELS.map((level) => level.size), [4, 5, 6, 7, 8, 9]);
  for (const level of LIGHT_LINKS_LEVELS) {
    assert.ok(level.boards.length >= 24, `${level.label} needs more boards`);
    assert.equal(level.stars, level.size - 3);
  }
});

test("board layouts remain distinct after rotating, reflecting or renumbering pairs", () => {
  for (const level of LIGHT_LINKS_LEVELS) {
    const seen = new Set<string>();
    for (const puzzle of level.boards) {
      const keys: string[] = [];
      for (let transform = 0; transform < 8; transform++) {
        const transformCell = (cell: number) => {
          let x = cell % puzzle.size;
          let y = Math.floor(cell / puzzle.size);
          if (transform >= 4) x = puzzle.size - 1 - x;
          for (let turn = 0; turn < transform % 4; turn++) {
            [x, y] = [puzzle.size - 1 - y, x];
          }
          return y * puzzle.size + x;
        };
        keys.push(puzzle.routes.map((route) =>
          [transformCell(route[0]), transformCell(route.at(-1)!)].sort((a, b) => a - b).join(","),
        ).sort().join(";"));
      }
      const key = keys.sort()[0];
      assert.ok(!seen.has(key), `${level.label} repeats an endpoint layout`);
      seen.add(key);
      assert.equal(puzzle.endpoints.size, puzzle.routes.length * 2);
      assert.equal(new Set(puzzle.routes.flat()).size, puzzle.size ** 2);
      assert.ok(puzzle.routes.flat().every((cell) => Number.isInteger(cell) && cell >= 0 && cell < puzzle.size ** 2));
    }
  }
});

test("lines stay on the grid, cannot cross, and can retrace their own cells", () => {
  const first = beginLink(board, [], 4)!;
  const withCorner = extendLink(board, first.links, first.pair, 0);
  assert.equal(extendLink(board, withCorner, first.pair, 5), withCorner, "diagonal move");
  const linked = extendLink(board, withCorner, first.pair, 1);
  assert.equal(extendLink(board, linked, first.pair, 2), linked, "completed line cannot extend");
  assert.deepEqual(extendLink(board, linked, first.pair, 0)[first.pair], [4, 0]);

  const second = beginLink(board, linked, 6)!;
  assert.equal(extendLink(board, second.links, second.pair, 5), second.links, "another endpoint");
  const throughTwo = extendLink(board, second.links, second.pair, 2);
  assert.equal(extendLink(board, throughTwo, second.pair, 1), throughTwo, "another painted cell");
  const atEdge = beginLink(board, [], 3)!;
  assert.equal(extendLink(board, atEdge.links, atEdge.pair, 4), atEdge.links, "no row wrapping");
});

test("a fast swipe traces every square between pointer events", () => {
  assert.deepEqual(cellsBetween({ x: 0.5, y: 1.5 }, { x: 3.5, y: 1.5 }, 4), [5, 6, 7]);
  assert.deepEqual(cellsBetween({ x: 3.5, y: 1.5 }, { x: 0.5, y: 1.5 }, 4), [6, 5, 4]);
  assert.deepEqual(cellsBetween({ x: 0.5, y: 0.7 }, { x: 2.5, y: 1.6 }, 4), [1, 5, 6]);
});

test("a swipe leaving any edge keeps the last squares it crossed", () => {
  assert.deepEqual(cellsBetween({ x: 1.5, y: 1.5 }, { x: 5, y: 1.5 }, 4), [6, 7]);
  assert.deepEqual(cellsBetween({ x: 2.5, y: 1.5 }, { x: -1, y: 1.5 }, 4), [5, 4]);
  assert.deepEqual(cellsBetween({ x: 1.5, y: 2.5 }, { x: 1.5, y: -1 }, 4), [5, 1]);
  assert.deepEqual(cellsBetween({ x: 1.5, y: 1.5 }, { x: 1.5, y: 5 }, 4), [9, 13]);
  assert.deepEqual(cellsBetween({ x: 1.5, y: 0.5 }, { x: 4.5, y: 2 }, 4), [2, 6, 7]);
  assert.deepEqual(cellsBetween({ x: 1.5, y: 2.5 }, { x: 3.5, y: 4.5 }, 4), [10, 14]);
});

test("swipes between two points outside the board do not paint a route", () => {
  assert.deepEqual(cellsBetween({ x: -1, y: 1.5 }, { x: 5, y: 1.5 }, 4), []);
});

test("every board can be solved in either direction and requires a full grid", () => {
  for (const level of LIGHT_LINKS_LEVELS) {
    for (const puzzle of level.boards) {
      for (const reverse of [false, true]) {
        let links: Links = [];
        for (const solution of puzzle.routes) {
          const [first, ...rest] = reverse ? [...solution].reverse() : solution;
          const started = beginLink(puzzle, links, first)!;
          links = started.links;
          for (const cell of rest) {
            const next = extendLink(puzzle, links, started.pair, cell);
            assert.notEqual(next, links, `blocked square ${cell} on a ${puzzle.size}×${puzzle.size} board`);
            links = next;
          }
        }
        assert.equal(getProgress(puzzle, links).won, true);
      }
    }
  }

  const endpointsOnly = board.routes.map((route) => [route[0], route.at(-1)!]);
  assert.equal(getProgress(board, endpointsOnly).won, false);
});
