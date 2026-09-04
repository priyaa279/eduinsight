import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateDataQuality,
  summarizeDataQuality,
} from "../lib/data-quality/evaluate.mjs";
import { loadDataQualityContext } from "./helpers/data-quality-context.mjs";

const resultFor = (evaluation, ruleId) =>
  evaluation.results.find((result) => result.ruleId === ruleId);

function assertSourceInvalid(evaluation, ruleId) {
  const result = resultFor(evaluation, ruleId);
  assert.equal(result.status, "NOT_EVALUATED");
  assert.equal(result.reasonCode, "SOURCE_INVALID");
  assert.ok(result.evaluationErrors.length > 0);
  return result;
}

test("empty financial-aid evidence cannot produce a false DQ-AID-001 PASS", () => {
  const context = loadDataQualityContext();
  context.financialAid = [];
  assertSourceInvalid(evaluateDataQuality(context), "DQ-AID-001");
});

test("missing attempted_credits cannot produce a false DQ-ENR-001 PASS", () => {
  const context = loadDataQualityContext();
  for (const row of context.studentTerms) delete row.attempted_credits;
  assertSourceInvalid(evaluateDataQuality(context), "DQ-ENR-001");
});

test("missing award_date cannot produce a false DQ-COM-004 PASS", () => {
  const context = loadDataQualityContext();
  for (const row of context.completions) delete row.award_date;
  assertSourceInvalid(evaluateDataQuality(context), "DQ-COM-004");
});

test("empty section evidence cannot produce a false DQ-CRS-001 PASS", () => {
  const context = loadDataQualityContext();
  context.sections = [];
  assertSourceInvalid(evaluateDataQuality(context), "DQ-CRS-001");
});

test("missing race_ethnicity cannot manufacture 18,426 violations", () => {
  const context = loadDataQualityContext();
  for (const row of context.students) delete row.race_ethnicity;
  const invalid = assertSourceInvalid(evaluateDataQuality(context), "DQ-DEM-001");
  assert.equal(invalid.violationCount, null);
});

test("malformed students collection is isolated and does not crash unrelated rules", () => {
  const context = loadDataQualityContext();
  context.students = null;
  const evaluation = evaluateDataQuality(context);
  assertSourceInvalid(evaluation, "DQ-DEM-001");
  assert.equal(resultFor(evaluation, "DQ-AID-001").status, "PASS");
  assert.equal(resultFor(evaluation, "DQ-CRS-001").status, "PASS");
});

test("nonnumeric attempted credits are surfaced instead of silently omitted", () => {
  const context = loadDataQualityContext();
  context.studentTerms[0].attempted_credits = "not-a-number";
  const invalid = assertSourceInvalid(evaluateDataQuality(context), "DQ-ENR-001");
  assert.match(invalid.reasonNotEvaluated, /finite parseable number/i);
});

test("malformed completion date is surfaced instead of reducing 211 to 210", () => {
  const context = loadDataQualityContext();
  context.completions[0].award_date = "not-a-date";
  const invalid = assertSourceInvalid(evaluateDataQuality(context), "DQ-COM-004");
  assert.equal(invalid.violationCount, null);
  assert.match(invalid.reasonNotEvaluated, /valid YYYY-MM-DD date/i);
});

test("unexpected input-access exceptions are isolated as structured evaluation errors", () => {
  const context = loadDataQualityContext();
  Object.defineProperty(context.studentTerms[0], "attempted_credits", {
    configurable: true,
    get() {
      throw new Error("test getter failure");
    },
  });
  const evaluation = evaluateDataQuality(context);
  const invalid = resultFor(evaluation, "DQ-ENR-001");
  assert.equal(invalid.status, "NOT_EVALUATED");
  assert.equal(invalid.reasonCode, "EVALUATION_ERROR");
  assert.match(invalid.evaluationErrors[0].message, /test getter failure/);
  assert.equal(resultFor(evaluation, "DQ-AID-001").status, "PASS");
});

test("unexpected evaluator exceptions are recorded without stopping unaffected rules", () => {
  const context = loadDataQualityContext();
  const originalFilter = context.studentTerms.filter.bind(context.studentTerms);
  let calls = 0;
  context.studentTerms.filter = (predicate) => {
    calls += 1;
    if (calls === 1) return originalFilter(predicate);
    throw new Error("test evaluator failure");
  };
  const evaluation = evaluateDataQuality(context);
  const invalid = resultFor(evaluation, "DQ-ENR-001");
  assert.equal(invalid.status, "NOT_EVALUATED");
  assert.equal(invalid.reasonCode, "EVALUATION_ERROR");
  assert.equal(invalid.evaluationErrors[0].code, "EVALUATOR_EXCEPTION");
  assert.match(invalid.evaluationErrors[0].message, /test evaluator failure/);
  assert.equal(resultFor(evaluation, "DQ-AID-001").status, "PASS");
  assert.equal(resultFor(evaluation, "DQ-CRS-001").status, "PASS");
});

test("valid governed sources retain the verified 10/4/21 result and four findings", () => {
  const evaluation = evaluateDataQuality(loadDataQualityContext());
  assert.deepEqual(
    summarizeDataQuality(evaluation.results, evaluation.activeFindings),
    {
      totalRules: 35,
      executed: 14,
      pass: 10,
      fail: 4,
      notEvaluated: 21,
      activeFindings: 4,
      dataDefects: 3,
      anomalies: 1,
    },
  );
  assert.deepEqual(
    Object.fromEntries(
      evaluation.activeFindings.map((finding) => [finding.ruleId, finding.affectedRecords]),
    ),
    {
      "DQ-ENR-001": 146,
      "DQ-DEM-001": 119,
      "DQ-COM-004": 211,
      "DQ-X-004": 0,
    },
  );
});
