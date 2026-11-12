import assert from "node:assert/strict";
import test from "node:test";
import { MAP_QUEST_BOARDS, makeMapQuestRound, moveOnMap, type MapLevel } from "./mapQuest";

const levels: readonly MapLevel[] = ["easy", "medium", "hard"];

test("every Map Quest board has a valid shortest route to its treasure", () => {
  for (const [index, level] of levels.entries()) {
    const boards = MAP_QUEST_BOARDS[level];
    for (const board of boards) {
      const { start, treasure, size, rocks } = board;
      assert.equal(size, index + 4);
      assert.ok(start >= 0 && start < size * size && !rocks.has(start));
      assert.ok(treasure >= 0 && treasure < size * size && !rocks.has(treasure));
      assert.notEqual(start, treasure);

      let position = start;
      for (const direction of board.route) {
        const next = moveOnMap(board, position, direction);
        assert.notEqual(next, null, level + " route steps onto a blocked square");
        position = next!;
      }
      assert.equal(position, treasure);

      // Expand all reachable cells one move at a time to verify the distance.
      let reached = new Set([start]);
      for (let step = 0; step < board.route.length; step++) {
        assert.ok(!reached.has(treasure), level + " guide skips a shorter route");
        const next = new Set(reached);
        for (const cell of reached) {
          for (let neighbour = 0; neighbour < size * size; neighbour++) {
            const distance = Math.abs(Math.floor(cell / size) - Math.floor(neighbour / size))
              + Math.abs(cell % size - neighbour % size);
            if (distance === 1 && !rocks.has(neighbour)) next.add(neighbour);
          }
        }
        reached = next;
      }
      assert.ok(reached.has(treasure));
    }
    assert.equal(new Set(makeMapQuestRound(level)).size, 8);
  }
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
