import assert from "node:assert/strict";
import test from "node:test";
import { ROBOT_JOBS, runRobotProgram, type Bin } from "./robotRules";

test("robot programs distinguish both sides of AND and OR", () => {
  assert.deepEqual(runRobotProgram({ condition: "red-and-star", then: "blue", else: "gold" }), ["blue", "gold", "gold", "gold"]);
  assert.deepEqual(runRobotProgram({ condition: "red-or-star", then: "blue", else: "gold" }), ["blue", "blue", "blue", "gold"]);
  assert.deepEqual(runRobotProgram({ condition: "purple-or-circle", then: "gold", else: "blue" }), ["blue", "gold", "gold", "gold"]);
});

test("every job can be solved from its blocks, including equivalent reversed branches", () => {
  const bins: Bin[] = ["blue", "gold"];
  for (const job of ROBOT_JOBS) {
    const programs = job.conditions.flatMap((condition) => bins.flatMap((then) => bins.map((otherwise) => ({ condition, then, else: otherwise }))));
    const solutions = programs.filter((program) => runRobotProgram(program).every((bin, index) => bin === job.targets[index]));
    assert.ok(solutions.length > 0, job.instruction);
    assert.ok(solutions.every((program) => program.then !== program.else));
  }
  assert.deepEqual(runRobotProgram({ condition: "circle", then: "gold", else: "blue" }), ROBOT_JOBS[0].targets);
});
