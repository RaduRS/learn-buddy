import assert from "node:assert/strict";
import test from "node:test";
import { makeEchoRound } from "./focusRounds";

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
