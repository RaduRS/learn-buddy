import assert from "node:assert/strict";
import test from "node:test";
import { makeLanternRound, makeSortRound, type AttentionLevel } from "./attentionGames";

const levels: AttentionLevel[] = ["easy", "medium", "hard"];

test("Lantern Grid shows eight distinct layouts with the expected number of lights", () => {
  const dimensions = [[3, 3], [4, 5], [5, 7]];
  for (const [index, level] of levels.entries()) {
    const round = makeLanternRound(level);
    assert.equal(round.length, 8);
    assert.equal(new Set(round.map(({ lit }) => lit.join(","))).size, 8);
    for (const { size, lit } of round) {
      assert.deepEqual([size, lit.length], dimensions[index]);
      assert.equal(new Set(lit).size, lit.length);
      assert.ok(lit.every((cell) => cell >= 0 && cell < size * size));
    }
  }
});

test("Switch Sort has one valid choice even when another card matches the inactive rule", () => {
  for (const level of levels) {
    const round = makeSortRound(level);
    assert.equal(round.length, 8);
    assert.equal(round.filter(({ rule }) => rule === "colour").length, level === "easy" ? 0 : 4);
    for (const { rule, target, answer, choices } of round) {
      assert.equal(choices.length, 4);
      assert.equal(new Set(choices).size, 4);
      assert.deepEqual(choices.filter((card) => card[rule] === target[rule]), [answer]);
      const alternate = rule === "shape" ? "colour" : "shape";
      assert.ok(choices.some((card) => card[alternate] === target[alternate] && card[rule] !== target[rule]));
    }
  }
});
