import assert from "node:assert/strict";
import test from "node:test";
import { makeEchoRound, makeSignalRound, DIRECTIONS } from "./focusRounds";

test("Signal Scout follows relative turns and balances the final directions", () => {
  const clockwise = { Up: "Right", Right: "Down", Down: "Left", Left: "Up" } as const;
  for (const [level, count] of [["easy", 1], ["medium", 2], ["hard", 3]] as const) {
    const round = makeSignalRound(level);
    assert.equal(round.length, 8);
    assert.equal(new Set(round.map(({ start, turns }) => [start, ...turns].join(" "))).size, 8);
    for (const direction of DIRECTIONS) assert.equal(round.filter(({ answer }) => answer === direction).length, 2);
    for (const { start, turns, headings, answer } of round) {
      assert.equal(turns.length, count);
      let facing = start;
      for (const [index, turn] of turns.entries()) {
        facing = turn === "right" ? clockwise[facing] : turn === "around" ? clockwise[clockwise[facing]] : clockwise[clockwise[clockwise[facing]]];
        assert.equal(headings[index], facing);
      }
      assert.equal(answer, facing);
    }
  }
});

test("Echo Cards compares against the actual one-back or two-back history", () => {
  for (const level of ["easy", "medium", "hard"] as const) {
    const round = makeEchoRound(level);
    const expectedDistance = level === "hard" ? 2 : 1;
    const history = [...round[0].warmup];
    assert.equal(history.length, expectedDistance);
    assert.equal(round.filter(({ symbol, comparison }) => symbol === comparison).length, 4);
    assert.equal(round.length, 8);
    round.forEach(({ symbol, comparison, distance, warmup }, index) => {
      assert.equal(distance, expectedDistance);
      assert.equal(comparison, history.at(-expectedDistance));
      if (index > 0) assert.deepEqual(warmup, []);
      history.push(symbol);
    });
  }
});
