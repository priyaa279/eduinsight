import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import {
  analyzeQuestion,
  semanticPlanSchema,
  validateSemanticPlan,
} from "../lib/ask-engine.mjs";

const dataset = JSON.parse(
  await fs.readFile(
    new URL("../app/data/ask-eduinsight.generated.json", import.meta.url),
    "utf8",
  ),
);

test("the executable semantic plan contract permits only the local parser", () => {
  const schema = semanticPlanSchema(dataset);
  assert.deepEqual(schema.properties.parser.enum, ["local"]);
  assert.equal(schema.additionalProperties, false);
});

test("a clear local plan retains every recognized constraint", () => {
  const result = analyzeQuestion(
    "How many international Computer Science students were enrolled in Fall 2025?",
    dataset,
  );
  assert.equal(result.plan.parser, "local");
  assert.equal(result.plan.programId, "PCS");
  assert.equal(result.plan.populationValue, "International");
  assert.equal(result.plan.endYear, 2025);
  assert.equal(result.plan.filterAudit.complete, true);
  assert.equal(validateSemanticPlan(result.plan, dataset).valid, true);
});

test("a plan with an unapplied recognized filter is invalid", () => {
  const result = analyzeQuestion(
    "How many domestic first-generation Pell-eligible undergraduate students were enrolled in Fall 2025?",
    dataset,
  );
  assert.equal(result.plan.filterAudit.complete, false);
  assert.equal(result.answer.disposition, "limitation");
  assert.equal(result.answer.points.length, 0);
});

test("question-quality rejections never reach deterministic execution", () => {
  for (const question of [
    "intl cs fall25",
    "CS 2025",
    "How many Computer Science students were enrolled last fall?",
  ]) {
    const result = analyzeQuestion(question, dataset);
    assert.equal(result.answer.disposition, "clarification", question);
    assert.equal(result.answer.points.length, 0, question);
  }
});

test("privacy policy is enforced before any aggregate answer", () => {
  const result = analyzeQuestion(
    "Give me row-level Pell records for Computer Science.",
    dataset,
  );
  assert.equal(result.answer.disposition, "refusal");
  assert.equal(result.answer.points.length, 0);
  assert.equal(result.answer.queryPlan, "privacy_refusal");
});
