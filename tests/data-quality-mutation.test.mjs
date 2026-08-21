import assert from "node:assert/strict";
import test from "node:test";

import { evaluateDataQuality } from "../lib/data-quality/evaluate.mjs";
import { loadDataQualityContext } from "./helpers/data-quality-context.mjs";

const evaluate = (context, ruleId) =>
  evaluateDataQuality(context).results.find((result) => result.ruleId === ruleId);

test("source mutation adds and removes a DQ-ENR-001 violation", () => {
  const context = loadDataQualityContext();
  const row = context.studentTerms.find(
    (candidate) =>
      candidate.term_id === context.currentTerm.term_id &&
      candidate.level === "UG" &&
      candidate.attendance_status === "F" &&
      Number(candidate.attempted_credits) >= 12,
  );
  assert.equal(evaluate(context, "DQ-ENR-001").violationCount, 146);
  row.attempted_credits = "6";
  assert.equal(evaluate(context, "DQ-ENR-001").violationCount, 147);
  row.attempted_credits = "12";
  assert.equal(evaluate(context, "DQ-ENR-001").violationCount, 146);
});

test("source mutation adds and removes a DQ-DEM-001 violation", () => {
  const context = loadDataQualityContext();
  const currentIds = new Set(
    context.currentStudentTermRows.map((row) => row.student_id),
  );
  const row = context.students.find(
    (candidate) => currentIds.has(candidate.student_id) && candidate.race_ethnicity.trim(),
  );
  assert.equal(evaluate(context, "DQ-DEM-001").violationCount, 119);
  const original = row.race_ethnicity;
  row.race_ethnicity = "";
  assert.equal(evaluate(context, "DQ-DEM-001").violationCount, 120);
  row.race_ethnicity = original;
  assert.equal(evaluate(context, "DQ-DEM-001").violationCount, 119);
});

test("source mutation adds and removes a DQ-COM-004 violation", () => {
  const context = loadDataQualityContext();
  const students = new Map(context.students.map((row) => [row.student_id, row]));
  const terms = new Map(context.terms.map((row) => [row.term_id, row]));
  const row = context.completions.find((candidate) => {
    const entryTerm = terms.get(students.get(candidate.student_id).entry_term_id);
    return candidate.award_date >= entryTerm.start_date;
  });
  assert.equal(evaluate(context, "DQ-COM-004").violationCount, 211);
  const original = row.award_date;
  row.award_date = "2019-01-01";
  assert.equal(evaluate(context, "DQ-COM-004").violationCount, 212);
  row.award_date = original;
  assert.equal(evaluate(context, "DQ-COM-004").violationCount, 211);
});

test("source mutation adds and removes a DQ-AID-001 violation", () => {
  const context = loadDataQualityContext();
  assert.equal(evaluate(context, "DQ-AID-001").violationCount, 0);
  context.financialAid.push({
    ...context.financialAid[0],
    aid_record_id: "AID-MUTATION",
    student_id: "S-NOT-ENROLLED",
  });
  assert.equal(evaluate(context, "DQ-AID-001").violationCount, 1);
  context.financialAid.pop();
  assert.equal(evaluate(context, "DQ-AID-001").violationCount, 0);
});

test("source mutation changes the DQ-X-004 observation, not an artifact count", () => {
  const context = loadDataQualityContext();
  assert.equal(evaluate(context, "DQ-X-004").evidence.currentValue, 18426);
  const row = context.currentStudentTermRows[0];
  row.reportable = "0";
  const mutated = evaluate(context, "DQ-X-004");
  assert.equal(mutated.evidence.currentValue, 18425);
  assert.equal(mutated.evidence.absoluteChange, -809);
  assert.equal(mutated.violationCount, 1);
  row.reportable = "1";
  assert.equal(evaluate(context, "DQ-X-004").evidence.currentValue, 18426);
});
