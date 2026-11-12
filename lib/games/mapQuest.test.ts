import assert from "node:assert/strict";
import test from "node:test";
import { MAP_QUEST_BOARDS, getMapTrailProgress, makeMapQuestRound, moveOnMap, type MapLevel } from "./mapQuest";

const levels: readonly MapLevel[] = ["easy", "medium", "hard"];

test("every Map Quest board has a reachable treasure with spare moves for exploration", () => {
  for (const [index, level] of levels.entries()) {
    const boards = MAP_QUEST_BOARDS[level];
    for (const board of boards) {
      const { start, treasure, size, rocks, maxMoves } = board;
      assert.equal(size, index + 4);
      assert.ok(start >= 0 && start < size * size && !rocks.has(start));
      assert.ok(treasure >= 0 && treasure < size * size && !rocks.has(treasure));
      assert.notEqual(start, treasure);

      // Expand all reachable cells one move at a time to verify the distance.
      let reached = new Set([start]);
      let distance = 0;
      while (!reached.has(treasure) && distance < maxMoves) {
        const next = new Set(reached);
        for (const cell of reached) {
          for (let neighbour = 0; neighbour < size * size; neighbour++) {
            const distance = Math.abs(Math.floor(cell / size) - Math.floor(neighbour / size))
              + Math.abs(cell % size - neighbour % size);
            if (distance === 1 && !rocks.has(neighbour)) next.add(neighbour);
          }
        }
        reached = next;
        distance++;
      }
      assert.ok(reached.has(treasure), level + " treasure exceeds the move limit");
      assert.equal(maxMoves - distance, [6, 4, 2][index]);
    }
    assert.equal(new Set(makeMapQuestRound(level)).size, 8);
  }
});

test("the final allowed move can win and undo restores an exhausted move", () => {
  const board = { maxMoves: 3, treasure: 5 };
  assert.deepEqual(getMapTrailProgress(board, [0, 4, 0, 4]), { remaining: 0, won: false, exhausted: true });
  assert.deepEqual(getMapTrailProgress(board, [0, 4, 0]), { remaining: 1, won: false, exhausted: false });
  assert.deepEqual(getMapTrailProgress(board, [0, 1, 0, 4]), { remaining: 0, won: false, exhausted: true });
  assert.deepEqual(getMapTrailProgress(board, [0, 1, 5]), { remaining: 1, won: true, exhausted: false });
  assert.deepEqual(getMapTrailProgress({ ...board, maxMoves: 4 }, [0, 1, 0, 4, 5]), { remaining: 0, won: true, exhausted: false });
  assert.deepEqual(getMapTrailProgress(board, [0, 1, 0, 4, 5]), { remaining: 0, won: false, exhausted: true });
});

test("moves cannot cross a rock or wrap from one edge to the other", () => {
  const board = { size: 4, rocks: new Set([6]) };
  assert.equal(moveOnMap(board, 5, "right"), null);
  assert.equal(moveOnMap(board, 3, "right"), null);
  assert.equal(moveOnMap(board, 4, "left"), null);
  assert.equal(moveOnMap(board, 1, "up"), null);
  assert.equal(moveOnMap(board, 14, "down"), null);
  assert.equal(moveOnMap(board, 5, "down"), 9);
});
