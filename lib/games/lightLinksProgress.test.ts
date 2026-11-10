import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceLightLinksBoard,
  loadLightLinksProgress,
  saveLightLinksProgress,
  selectLightLinksLevel,
} from "./lightLinksProgress";

const counts = [24, 24, 24, 24, 24, 24];

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

test("each child resumes their selected difficulty and independent board positions", () => {
  const storage = memoryStorage();
  let first = loadLightLinksProgress("child-a", counts, storage);
  first = advanceLightLinksBoard(first, counts);
  first = selectLightLinksLevel(first, 4, counts);
  first = advanceLightLinksBoard(first, counts);
  first = advanceLightLinksBoard(first, counts);
  assert.equal(saveLightLinksProgress("child-a", first, counts, storage), true);
  assert.deepEqual(loadLightLinksProgress("child-a", counts, storage), {
    levelIndex: 4, boardIndices: [1, 0, 0, 0, 2, 0],
  });
  assert.deepEqual(loadLightLinksProgress("child-b", counts, storage), {
    levelIndex: 0, boardIndices: [0, 0, 0, 0, 0, 0],
  });
  assert.equal(selectLightLinksLevel(first, 0, counts).boardIndices[0], 1);
});

test("advancing visits every board before repeating and leaves other difficulties alone", () => {
  let progress = loadLightLinksProgress("child", [3, 5], memoryStorage());
  const visited: number[] = [];
  for (let i = 0; i < 4; i++) {
    visited.push(progress.boardIndices[0]);
    progress = advanceLightLinksBoard(progress, [3, 5]);
  }
  assert.deepEqual(visited, [0, 1, 2, 0]);
  assert.equal(progress.boardIndices[1], 0);
});

test("saving the next board after completion keeps the current win screen state intact", () => {
  const storage = memoryStorage();
  const current = loadLightLinksProgress("child", counts, storage);
  const next = advanceLightLinksBoard(current, counts);
  saveLightLinksProgress("child", next, counts, storage);
  assert.equal(current.boardIndices[0], 0);
  assert.equal(loadLightLinksProgress("child", counts, storage).boardIndices[0], 1);
});

test("invalid saved values reset safely while valid positions survive catalogue growth", () => {
  const storage = memoryStorage();
  saveLightLinksProgress("child", {
    levelIndex: 2, boardIndices: [2, 5, 7, 0],
  }, [3, 6, 8, 3], storage);
  assert.deepEqual(loadLightLinksProgress("child", counts, storage), {
    levelIndex: 2, boardIndices: [2, 5, 7, 0, 0, 0],
  });
  saveLightLinksProgress("child", {
    levelIndex: 99, boardIndices: [-1, 2.5, 100, Number.NaN, 3, 7],
  }, counts, storage);
  assert.deepEqual(loadLightLinksProgress("child", counts, storage), {
    levelIndex: 0, boardIndices: [0, 0, 0, 0, 3, 7],
  });
});

test("corrupt, unavailable and denied browser storage never prevent play", () => {
  const initial = { levelIndex: 0, boardIndices: [0, 0, 0, 0, 0, 0] };
  for (const value of ["invalid json", "null", "[]", '{"version":9}', '{"version":1,"boardIndices":"wrong"}']) {
    const storage = { getItem: () => value, setItem: () => undefined };
    assert.deepEqual(loadLightLinksProgress("child", counts, storage), initial);
  }
  const denied = {
    getItem: () => { throw new Error("Storage disabled"); },
    setItem: () => { throw new Error("Storage full"); },
  };
  assert.deepEqual(loadLightLinksProgress("child", counts, denied), initial);
  assert.equal(saveLightLinksProgress("child", initial, counts, denied), false);
  assert.deepEqual(loadLightLinksProgress("child", counts, null), initial);
  assert.equal(saveLightLinksProgress("child", initial, counts, null), false);
  assert.equal(saveLightLinksProgress("", initial, counts, memoryStorage()), false);
});

test("invalid difficulty selections and empty catalogues remain safe", () => {
  const current = { levelIndex: 2, boardIndices: [0, 3, 4, 0, 0, 0] };
  assert.deepEqual(selectLightLinksLevel(current, -1, counts), current);
  assert.deepEqual(selectLightLinksLevel(current, 6, counts), current);
  assert.deepEqual(advanceLightLinksBoard(current, []), { levelIndex: 0, boardIndices: [] });
});
