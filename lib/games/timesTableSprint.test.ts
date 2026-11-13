import assert from "node:assert/strict";
import test from "node:test";
import { makeFactDeck, ROUND_SECONDS, TABLES, updateSprint, type Sprint } from "./timesTableSprint";

test("the mixed deck covers every fact up to 10 × 10 and each table stays in range", () => {
  const mixed = makeFactDeck("mixed");
  assert.equal(mixed.length, 100);
  assert.equal(new Set(mixed.map(({ left, right }) => `${left}:${right}`)).size, 100);
  for (const table of TABLES) {
    const deck = makeFactDeck(table, { left: table, right: 10 });
    assert.equal(deck.length, 10);
    assert.ok(deck.every(({ left, right }) => left === table && TABLES.includes(right as (typeof TABLES)[number])));
    assert.notEqual(deck[0].right, 10);
  }
});

test("the deadline accepts the last timely answer and rejects answers at or after expiry", () => {
  const state: Sprint = { deadline: 60000, remaining: ROUND_SECONDS, finished: false,
    deck: [{ left: 10, right: 10 }, { left: 2, right: 4 }], index: 0, score: 0, answered: 0, last: null };
  const answered = updateSprint(state, { type: "answer", now: 59999, answer: 100 });
  assert.equal(answered.score, 1);
  assert.equal(answered.remaining, 1);
  const expired = updateSprint(answered, { type: "answer", now: 60000, answer: 8 });
  assert.equal(expired.finished, true);
  assert.equal(expired.score, 1);
  assert.equal(expired.answered, 1);
  assert.equal(updateSprint(expired, { type: "tick", now: 61000 }), expired);
});
