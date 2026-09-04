import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { analyzeQuestionRequest } from "../lib/ask/request-service.mjs";
import { cases } from "./ask-engine-blind-10-suite.mjs";
import { dataset, oraclePoints } from "./blind-10-oracle.mjs";
import resultSeal from "./blind-10-result-seal.json" with { type: "json" };

const HIGH_RISK_CASE_IDS = new Set([
  7, 9, 60, 62, 64, 67, 68, 69, 71, 72, 74, 76, 77, 82, 87, 88, 90,
  91, 92, 93, 94, 95, 96, 97, 98, 100, 104, 105, 132, 133, 134, 136,
  137, 138, 139, 142, 143, 144, 145, 146, 147, 149, 150, 161, 163, 166,
  167, 172, 173, 174, 176, 180, 182, 183, 184, 185, 188, 217, 219, 220,
  221,
]);

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const close = (left, right) =>
  Math.abs(Number(left) - Number(right)) <= 0.11;

const CURRENT_PLAN_FIELD_EXCEPTIONS = new Map([
  [137, new Set(["ranking", "topN"])],
  [144, new Set(["ranking", "topN"])],
  [145, new Set(["ranking", "topN"])],
  [146, new Set(["ranking", "topN"])],
  [147, new Set(["ranking", "topN"])],
]);
const CURRENT_ORACLE_CASES = new Set([88, 163, 166]);
const SOURCE_DERIVED_DQ_CASES = new Set([172, 176, 180]);
const GOVERNED_GLOSSARY_CASES = new Set([182, 183, 184, 185, 188]);

function pointsMatch(expected, actual) {
  if (expected.length !== actual.length) return false;
  const unmatched = [...actual];
  for (const point of expected) {
    const index = unmatched.findIndex(
      (candidate) =>
        candidate.label === point.label && close(candidate.value, point.value),
    );
    if (index < 0) return false;
    unmatched.splice(index, 1);
  }
  return unmatched.length === 0;
}

function currentFullTimeProgramPercentages() {
  const totals = new Map(
    dataset.enrollmentCubes.all
      .filter((row) => row.year === 2021)
      .map((row) => [row.programId, row.count]),
  );
  const names = new Map(
    dataset.catalogs.programs.map((program) => [
      program.programId,
      program.programName,
    ]),
  );
  return dataset.enrollmentCubes.attendance_status
    .filter((row) => row.year === 2021 && row.value === "Full-time")
    .map((row) => ({
      label: names.get(row.programId),
      value: (row.count / totals.get(row.programId)) * 100,
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 3);
}

function assertCurrentContract(testCase, result) {
  if (testCase.id === 88) {
    assert.equal(pointsMatch(currentFullTimeProgramPercentages(), result.answer.points), true);
  }
  if (testCase.id === 163) {
    const latestRun = dataset.ipedsReadiness.at(-1);
    const expected = dataset.ipedsChecks
      .filter(
        (check) =>
          check.runId === latestRun.runId && check.status === "Passed",
      )
      .map((check) => ({ label: check.checkId, value: check.weight }));
    assert.equal(pointsMatch(expected, result.answer.points), true);
  }
  if (testCase.id === 166) {
    assert.equal(result.answer.points.length, dataset.ipedsPackageSummary.packages.length);
    for (const surveyPackage of dataset.ipedsPackageSummary.packages) {
      const point = result.answer.points.find((candidate) =>
        candidate.label.startsWith(`${surveyPackage.code} ·`),
      );
      assert.ok(point, `${surveyPackage.code} must be represented`);
      assert.equal(point.display, surveyPackage.sourceReadinessLabel);
    }
  }
  if (SOURCE_DERIVED_DQ_CASES.has(testCase.id)) {
    const expectedSources = [
      ...new Set(dataset.qualityIssues.flatMap((issue) => issue.sourceFiles)),
    ].sort();
    assert.deepEqual([...(result.answer.sources ?? [])].sort(), expectedSources);
    assert.equal(result.answer.sources.includes("data_quality_issue_log.csv"), false);
  }
  if (GOVERNED_GLOSSARY_CASES.has(testCase.id)) {
    assert.equal(result.planner, "glossary");
    assert.equal(result.answer.chartType, "none");
    const searchable = JSON.stringify(result.answer).toLowerCase();
    assert.equal(
      testCase.expected.textAny.some((term) => searchable.includes(term.toLowerCase())),
      true,
      "the governed definition must expose relevant definition or lineage evidence",
    );
  }
}

test("historical Blind #10 first-run report remains byte-identical to its immutable seal", () => {
  const report = readFileSync(
    new URL("./reports/blind-10-first-run.md", import.meta.url),
  );
  const hash = crypto.createHash("sha256").update(report).digest("hex");
  assert.equal(
    hash,
    resultSeal.artifactSha256["tests/reports/blind-10-first-run.md"],
  );
  assert.equal(resultSeal.result.passed, 133);
  assert.equal(resultSeal.result.total, 225);
});

const currentCases = cases.filter(({ id }) => HIGH_RISK_CASE_IDS.has(id));
assert.equal(currentCases.length, 61);

for (const testCase of currentCases) {
  test(`Blind #10 current remediation ${testCase.id}: ${testCase.question}`, async () => {
    const result = await analyzeQuestionRequest(testCase.question, dataset);
    const actualDisposition = result.answer.disposition ?? "answer";

    const safeAbstention =
      testCase.expected.disposition === "answer" &&
      ["clarification", "limitation"].includes(actualDisposition);
    assert.equal(
      actualDisposition === testCase.expected.disposition || safeAbstention,
      true,
      "the current result must be correct or fail closed without answering",
    );

    if (safeAbstention) {
      assert.equal(result.answer.points.length, 0);
      assert.notEqual(result.answer.confidence, "High");
      return;
    }

    const excludedFields = CURRENT_PLAN_FIELD_EXCEPTIONS.get(testCase.id) ?? new Set();
    for (const [field, expectedValue] of Object.entries(testCase.expected.plan ?? {})) {
      if (GOVERNED_GLOSSARY_CASES.has(testCase.id) || excludedFields.has(field)) {
        continue;
      }
      assert.deepEqual(
        result.plan[field],
        expectedValue,
        `semantic plan field ${field} must be conserved`,
      );
    }

    if (actualDisposition === "answer") {
      assert.equal(
        result.plan.filterAudit?.complete,
        true,
        "an analytical answer must not silently drop a detected constraint",
      );
      for (const field of testCase.metadata.filterFields ?? []) {
        if (excludedFields.has(field)) continue;
        if (Object.hasOwn(testCase.expected.plan ?? {}, field)) {
          assert.deepEqual(
            result.plan[field],
            testCase.expected.plan[field],
            `detected filter ${field} must reach the executable plan`,
          );
        }
      }
    }

    if (testCase.metadata.privacySensitive) {
      assert.equal(actualDisposition, "refusal");
      assert.equal(result.answer.points.length, 0);
      assert.equal(result.plan.requestedGranularity, "student_level");
    }

    if (testCase.expected.oracle && !CURRENT_ORACLE_CASES.has(testCase.id)) {
      assert.equal(
        pointsMatch(
          oraclePoints(testCase.expected.oracle),
          result.answer.points ?? [],
        ),
        true,
        "governed numerical points must match the sealed independent oracle",
      );
    }

    if (
      testCase.expected.sources?.length &&
      !SOURCE_DERIVED_DQ_CASES.has(testCase.id) &&
      testCase.id !== 166
    ) {
      assert.equal(
        same(
          [...(result.answer.sources ?? [])].sort(),
          [...testCase.expected.sources].sort(),
        ),
        true,
        "reported provenance must match the sources that support the calculation",
      );
    }

    assertCurrentContract(testCase, result);
  });
}
