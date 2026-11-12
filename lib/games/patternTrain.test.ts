import assert from "node:assert/strict";
import test from "node:test";
import { makePatternRound, type PatternQuestion } from "./patternTrain";

function assertChoices(question: PatternQuestion) {
  assert.equal(question.choices.length, 4);
  assert.equal(new Set(question.choices.map((choice) => choice.id)).size, 4);
  assert.equal(new Set(question.choices.map((choice) => choice.label)).size, 4);
  assert.ok(question.choices.some((choice) => choice.id === question.answer.id));
}

test("shape and colour rounds offer eight distinct repeating tracks with the correct next carriage", () => {
  for (const mode of ["easy", "medium"] as const) {
    const round = makePatternRound(mode);
    assert.equal(round.length, 8);
    assert.equal(new Set(round.map(({ track }) => track.map(({ id }) => id).join(","))).size, 8);
    for (const question of round) {
      assertChoices(question);
      const track = question.track.map(({ id }) => id);
      const groupSize = Number(question.instruction.match(/\d+/)?.[0]);
      assert.ok(mode === "easy" ? groupSize === 2 : groupSize === 3 || groupSize === 4);
      assert.ok(track.every((id, index) => id === track[index % groupSize]));
      assert.equal(question.answer.id, track[track.length % groupSize]);
    }
  }
});

test("counting rounds include every step in each direction and four choices at the endpoints", (t) => {
  for (const randomValue of [0, 0.99999]) {
    const random = t.mock.method(Math, "random", () => randomValue);
    try {
      const round = makePatternRound("hard");
      assert.equal(round.length, 8);
      const steps = round.map((question) => {
        assertChoices(question);
        const track = question.track.map((carriage) => Number(carriage.label));
        const step = track[1] - track[0];
        assert.ok(track.every((value, index) => value === track[0] + index * step));
        assert.equal(Number(question.answer.label), track.at(-1)! + step);
        assert.ok(question.choices.every(({ label }) => Number(label) >= 0 && Number(label) <= 100));
        return step;
      });
      assert.deepEqual(steps.sort((first, second) => first - second), [-10, -5, -3, -2, 2, 3, 5, 10]);
    } finally {
      random.mock.restore();
    }
  }
});
