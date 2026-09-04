import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { evaluateDataQuality, summarizeDataQuality } from "../lib/data-quality/evaluate.mjs";
import { loadDataQualityContext } from "./helpers/data-quality-context.mjs";

const uploadUrl = new URL("../data/sample-university-upload/", import.meta.url);
const context = loadDataQualityContext();
const evaluation = evaluateDataQuality(context);
const result = (ruleId) => evaluation.results.find((candidate) => candidate.ruleId === ruleId);

test("DQ-ENR-001 evaluator reconciles to a raw-row calculation", () => {
  const independent = context.studentTerms.filter(
    (row) =>
      row.term_id === context.currentTerm.term_id &&
      row.census_enrolled === "1" &&
      row.reportable === "1" &&
      row.level === "UG" &&
      row.attendance_status === "F" &&
      Number(row.attempted_credits) < 12,
  );
  assert.equal(independent.length, 146);
  assert.equal(result("DQ-ENR-001").violationCount, independent.length);
});

test("DQ-DEM-001 evaluator reconciles to a raw-row calculation", () => {
  const currentIds = new Set(context.currentStudentTermRows.map((row) => row.student_id));
  const independent = context.students.filter(
    (row) => currentIds.has(row.student_id) && !row.race_ethnicity.trim(),
  );
  assert.equal(independent.length, 119);
  assert.equal(result("DQ-DEM-001").violationCount, independent.length);
});

test("DQ-AID-001 evaluator reconciles to a raw-row anti-join", () => {
  const enrollmentKeys = new Set(
    context.studentTerms.map((row) => `${row.student_id}|${row.term_id}`),
  );
  const independent = context.financialAid.filter(
    (row) => !enrollmentKeys.has(`${row.student_id}|${row.term_id}`),
  );
  assert.equal(independent.length, 0);
  assert.equal(result("DQ-AID-001").status, "PASS");
  assert.equal(result("DQ-AID-001").violationCount, independent.length);
});

test("DQ-COM-004 evaluator reconciles to a raw-row date comparison", () => {
  const students = new Map(context.students.map((row) => [row.student_id, row]));
  const terms = new Map(context.terms.map((row) => [row.term_id, row]));
  const independent = context.completions.filter((row) => {
    const student = students.get(row.student_id);
    const term = student ? terms.get(student.entry_term_id) : null;
    return (
      term?.start_date &&
      new Date(`${row.award_date}T00:00:00Z`) <
        new Date(`${term.start_date}T00:00:00Z`)
    );
  });
  assert.equal(independent.length, 211);
  assert.equal(result("DQ-COM-004").violationCount, independent.length);
  assert.equal(result("DQ-COM-004").evidence.unresolvedRowsExcluded, 0);
});

test("DQ-X-004 evaluator reconciles to raw distinct census headcounts", () => {
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
      previousValue,
      currentValue,
      absoluteChange,
      percentChange,
    },
    {
      previousValue: 19234,
      currentValue: 18426,
      absoluteChange: -808,
      percentChange: -4.200894249766039,
    },
  );
  assert.equal(result("DQ-X-004").violationCount, 1);
  assert.equal(result("DQ-X-004").evidence.absoluteChange, absoluteChange);
  assert.equal(result("DQ-X-004").evidence.percentChange, percentChange);
});

test("active findings contain only evaluator failures", () => {
  assert.deepEqual(
    evaluation.activeFindings.map((finding) => finding.ruleId).sort(),
    ["DQ-COM-004", "DQ-DEM-001", "DQ-ENR-001", "DQ-X-004"],
  );
  assert.ok(evaluation.activeFindings.every((finding) => !/synthetic exception/i.test(finding.title)));
  assert.ok(!evaluation.activeFindings.some((finding) => finding.ruleId === "DQ-AID-001"));
  assert.ok(!evaluation.activeFindings.some((finding) => finding.ruleId === "DQ-X-007"));
  assert.equal(fs.existsSync(new URL("data_quality_issue_log.csv", uploadUrl)), false);
});

test("missing-schema rules are explicitly not evaluated and never become findings", () => {
  assert.equal(result("DQ-X-007").status, "NOT_EVALUATED");
  assert.match(result("DQ-X-007").reasonNotEvaluated, /historical CIP.*bridge/i);
  assert.equal(result("DQ-X-007").violationCount, null);
  assert.equal(
    evaluation.results.filter((candidate) => candidate.status === "NOT_EVALUATED").length,
    21,
  );
});

test("evaluation summary and severity totals reconcile", () => {
  const summary = summarizeDataQuality(evaluation.results, evaluation.activeFindings);
  assert.deepEqual(summary, {
    totalRules: 35,
    executed: 14,
    pass: 10,
    fail: 4,
    notEvaluated: 21,
    activeFindings: 4,
    dataDefects: 3,
    anomalies: 1,
  });
  assert.deepEqual(
    Object.fromEntries(
      ["Critical", "High", "Medium"].map((severity) => [
        severity,
        evaluation.activeFindings.filter((finding) => finding.severity === severity).length,
      ]),
    ),
    { Critical: 1, High: 3, Medium: 0 },
  );
});

test("Data Quality, Command Center, and Ask use the identical active finding set", () => {
  const commandCenter = JSON.parse(
    fs.readFileSync(new URL("../app/data/command-center.generated.json", import.meta.url), "utf8"),
  );
  const ask = JSON.parse(
    fs.readFileSync(new URL("../app/data/ask-eduinsight.generated.json", import.meta.url), "utf8"),
  );
  const evaluatedIds = evaluation.activeFindings.map((finding) => finding.issueId).sort();
  assert.deepEqual(commandCenter.qualityFindings.map((finding) => finding.issueId).sort(), evaluatedIds);
  assert.deepEqual(ask.qualityIssues.map((finding) => finding.issueId).sort(), evaluatedIds);
  assert.equal(commandCenter.kpis.openQualityIssues.value, evaluatedIds.length);
  assert.equal(commandCenter.qualityEvaluationSummary.activeFindings, evaluatedIds.length);
});

test("sidebar badge derives from the active summary", () => {
  const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /item\.id === "quality" && <em>\{qualitySummary\.active\}<\/em>/);
  assert.doesNotMatch(page, /item\.id === "quality" && <em>3<\/em>/);
});

test("evaluation is deterministic", () => {
  assert.deepEqual(
    evaluateDataQuality(loadDataQualityContext()),
    evaluateDataQuality(loadDataQualityContext()),
  );
});

test("every published sample satisfies its parent rule", () => {
  const byRule = new Map(evaluation.activeFindings.map((finding) => [finding.ruleId, finding]));
  assert.ok(
    byRule.get("DQ-ENR-001").sampleRows.every(
      (row) => row.term_id === "2025FA" && row.attendance_status === "F" && row.attempted_credits < 12,
    ),
  );
  assert.ok(
    byRule.get("DQ-DEM-001").sampleRows.every((row) => row.race_ethnicity === "(blank)"),
  );
  assert.ok(
    byRule.get("DQ-COM-004").sampleRows.every(
      (row) => new Date(row.award_date) < new Date(row.entry_term_start_date),
    ),
  );
  assert.deepEqual(byRule.get("DQ-X-004").sampleRows, []);
  assert.equal(byRule.get("DQ-X-004").affectedRecords, 0);
});
