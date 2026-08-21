import assert from "node:assert/strict";
import test from "node:test";

import { loadDataQualityContext } from "./helpers/data-quality-context.mjs";

// This file is the isolated source oracle. It imports no production evaluator,
// rule module, generated artifact, or production calculation helper.
const context = loadDataQualityContext();

test("raw source truth: DQ-ENR-001", () => {
  const scope = context.studentTerms.filter(
    (row) =>
      row.term_id === context.currentTerm.term_id &&
      row.census_enrolled === "1" &&
      row.reportable === "1" &&
      row.level === "UG" &&
      row.attendance_status === "F",
  );
  const violations = scope.filter((row) => Number(row.attempted_credits) < 12);
  assert.deepEqual(
    { term: context.currentTerm.term_id, scopedRows: scope.length, violations: violations.length },
    { term: "2025FA", scopedRows: 12943, violations: 146 },
  );
});

test("raw source truth: DQ-DEM-001", () => {
  const currentIds = new Set(
    context.currentStudentTermRows.map((row) => row.student_id),
  );
  const violations = context.students.filter(
    (row) => currentIds.has(row.student_id) && !row.race_ethnicity.trim(),
  );
  assert.deepEqual(
    { scopedStudents: currentIds.size, violations: violations.length },
    { scopedStudents: 18426, violations: 119 },
  );
});

test("raw source truth and single-career semantics: DQ-COM-004", () => {
  const students = new Map(
    context.students.map((row) => [row.student_id, row]),
  );
  const terms = new Map(context.terms.map((row) => [row.term_id, row]));
  const firstEnrollment = new Map();
  for (const row of context.studentTerms) {
    const existing = firstEnrollment.get(row.student_id);
    if (!existing || row.term_id < existing) {
      firstEnrollment.set(row.student_id, row.term_id);
    }
  }
  const entryMismatches = context.students.filter(
    (row) => firstEnrollment.get(row.student_id) !== row.entry_term_id,
  );
  const violations = context.completions.filter((row) => {
    const student = students.get(row.student_id);
    const entryTerm = student ? terms.get(student.entry_term_id) : null;
    return Boolean(
      entryTerm?.start_date &&
        row.award_date &&
        row.award_date < entryTerm.start_date,
    );
  });
  const violationsWithEarlierEnrollment = violations.filter((row) =>
    context.studentTerms.some(
      (termRow) =>
        termRow.student_id === row.student_id &&
        termRow.term_id < students.get(row.student_id).entry_term_id,
    ),
  );
  assert.deepEqual(
    {
      completionRows: context.completions.length,
      entryContractMismatches: entryMismatches.length,
      violations: violations.length,
      violationsWithEarlierEnrollment: violationsWithEarlierEnrollment.length,
      violationEntryTerms: [...new Set(violations.map((row) => students.get(row.student_id).entry_term_id))],
    },
    {
      completionRows: 1056,
      entryContractMismatches: 0,
      violations: 211,
      violationsWithEarlierEnrollment: 0,
      violationEntryTerms: ["2025FA"],
    },
  );
});

test("raw source truth: DQ-AID-001", () => {
  const enrollmentKeys = new Set(
    context.studentTerms.map((row) => `${row.student_id}|${row.term_id}`),
  );
  const violations = context.financialAid.filter(
    (row) => !enrollmentKeys.has(`${row.student_id}|${row.term_id}`),
  );
  assert.deepEqual(
    { scopedAidRows: context.financialAid.length, violations: violations.length },
    { scopedAidRows: 18426, violations: 0 },
  );
});

test("raw source truth: DQ-X-004", () => {
  const count = (termId) =>
    new Set(
      context.studentTerms
        .filter(
          (row) =>
            row.term_id === termId &&
            row.census_enrolled === "1" &&
            row.reportable === "1",
        )
        .map((row) => row.student_id),
    ).size;
  const previousValue = count(context.priorTerm.term_id);
  const currentValue = count(context.currentTerm.term_id);
  const absoluteChange = currentValue - previousValue;
  const percentChange = (absoluteChange / previousValue) * 100;
  assert.deepEqual(
    {
      previousTerm: context.priorTerm.term_id,
      currentTerm: context.currentTerm.term_id,
      previousValue,
      currentValue,
      absoluteChange,
      percentChange,
    },
    {
      previousTerm: "2024FA",
      currentTerm: "2025FA",
      previousValue: 19234,
      currentValue: 18426,
      absoluteChange: -808,
      percentChange: -4.200894249766039,
    },
  );
});
