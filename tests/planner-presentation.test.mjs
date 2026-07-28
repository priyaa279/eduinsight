import assert from "node:assert/strict";
import test from "node:test";

import { plannerModeLabel } from "../lib/ask/planner-presentation.mjs";

test("the UI identifies the deterministic local path", () => {
  assert.equal(plannerModeLabel("local"), "local deterministic planner");
});

test("the UI identifies the local privacy-policy gate", () => {
  assert.equal(plannerModeLabel("policy"), "local governed policy gate");
});

test("unknown planner values cannot advertise an external model", () => {
  assert.equal(plannerModeLabel("anything"), "local deterministic planner");
});
