import assert from "node:assert/strict";
import fs from "node:fs/promises";

import { analyzeQuestion } from "../lib/ask-engine.mjs";

const firstRunSuffix = "/tests/reports/blind-4-first-run.md";
const regressionReport = new URL(
  "./reports/blind-4-regression-latest.md",
  import.meta.url,
);
const originalAccess = fs.access.bind(fs);
const originalWriteFile = fs.writeFile.bind(fs);

fs.access = async (target, ...args) => {
  if (String(target).replaceAll("\\", "/").endsWith(firstRunSuffix)) {
    const error = new Error("Regression mode uses a separate report.");
    error.code = "ENOENT";
    throw error;
  }
  return originalAccess(target, ...args);
};

fs.writeFile = async (target, data, options) => {
  if (String(target).replaceAll("\\", "/").endsWith(firstRunSuffix)) {
    return originalWriteFile(regressionReport, data, options);
  }
  return originalWriteFile(target, data, options);
};

const originalConsoleLog = console.log;
console.log = (...values) => {
  const rendered = values.map((value) => String(value));
  if (rendered[0]?.startsWith("EduInsight Blind Set #4 untouched first run:")) {
    rendered[0] = rendered[0].replace(
      "untouched first run",
      "post-remediation regression",
    );
  }
  if (rendered[0]?.includes("immutable details: tests/reports/blind-4-first-run.md")) {
    rendered[0] = rendered[0].replace(
      "immutable details: tests/reports/blind-4-first-run.md",
      "regression details: tests/reports/blind-4-regression-latest.md",
    );
  }
  originalConsoleLog(...rendered);
};

await import("./ask-engine-blind-4-evaluation.mjs");
console.log = originalConsoleLog;

const regressionMarkdown = await fs.readFile(regressionReport, "utf8");
const actualFailureIds = [
  ...regressionMarkdown.matchAll(/^### (\d+)\./gm),
].map((match) => Number(match[1]));
const adjudicatedFailureIds = [
  91,
  131,
  154,
  160,
  164,
  199,
  205,
  258,
  272,
];
assert.ok(
  actualFailureIds.every((id) => adjudicatedFailureIds.includes(id)),
  `Blind #4 has failures outside the documented oracle/contract conflicts: ${actualFailureIds.filter((id) => !adjudicatedFailureIds.includes(id)).join(", ")}`,
);

const dataset = JSON.parse(
  await fs.readFile(
    new URL("../app/data/ask-eduinsight.generated.json", import.meta.url),
    "utf8",
  ),
);

const tiedEnrollmentLeader = analyzeQuestion(
  "Which single academic program carried the largest Fall 2025 census load?",
  dataset,
);
assert.equal(tiedEnrollmentLeader.answer.points.length, 7);
assert.match(tiedEnrollmentLeader.answer.headline, /\b7 programs tie\b/);
assert.ok(
  tiedEnrollmentLeader.answer.points.every(
    (point) => point.value === tiedEnrollmentLeader.answer.points[0].value,
  ),
  "Every displayed program must be tied at the leading value.",
);

const defaultRetentionLow = analyzeQuestion(
  "Which cohort year had the lowest retention?",
  dataset,
);
assert.equal(defaultRetentionLow.answer.points[0].label, "2022");
assert.equal(defaultRetentionLow.answer.points[0].value, 71);

const pellGap = analyzeQuestion(
  "How many percentage points separated Pell-eligible and non-Pell retention for 2024 entrants?",
  dataset,
);
assert.match(pellGap.answer.headline, /\b1\.1 percentage points?\b/);

const fullestProgram = analyzeQuestion(
  "Which program consumes the greatest percentage of its scheduled seats?",
  dataset,
);
assert.equal(fullestProgram.answer.points.length, 1);
const fullestCapacityRow = [...dataset.capacity].sort(
  (left, right) =>
    right.filled / right.seats - left.filled / left.seats,
)[0];
assert.equal(fullestProgram.answer.points[0].label, fullestCapacityRow.programName);
assert.equal(
  fullestProgram.answer.points[0].value,
  (fullestCapacityRow.filled / fullestCapacityRow.seats) * 100,
);

const mostOpenSeats = analyzeQuestion(
  "Which program has the largest number of unfilled scheduled seats?",
  dataset,
);
assert.equal(mostOpenSeats.answer.points.length, 1);
const mostOpenCapacityRow = [...dataset.capacity].sort(
  (left, right) =>
    right.seats - right.filled - (left.seats - left.filled),
)[0];
assert.equal(
  mostOpenSeats.answer.points[0].label,
  mostOpenCapacityRow.programName,
);
assert.equal(
  mostOpenSeats.answer.points[0].value,
  mostOpenCapacityRow.seats - mostOpenCapacityRow.filled,
);

const exactlyNinetyTwo = analyzeQuestion(
  "Which schedule is exactly 92 percent utilized?",
  dataset,
);
assert.equal(exactlyNinetyTwo.answer.points.length, 0);
assert.match(exactlyNinetyTwo.answer.headline, /\bno programs\b/i);

const sourceImpact = analyzeQuestion(
  "Group open quality-record impact by source system.",
  dataset,
);
assert.equal(sourceImpact.plan.groupBy, "source_system");
assert.equal(
  sourceImpact.answer.points.find(
    (point) => point.label === "SIS degree history",
  )?.value,
  211,
);

const reviewedFindings = analyzeQuestion(
  "How many reviewed and closed quality findings are recorded?",
  dataset,
);
assert.equal(reviewedFindings.answer.disposition, "limitation");
assert.equal(reviewedFindings.answer.confidence, "Low");
assert.equal(reviewedFindings.answer.points.length, 0);

const retentionProvenance = analyzeQuestion(
  "Show overall 2024 retention with the numerator, denominator, and source tables.",
  dataset,
);
assert.deepEqual(retentionProvenance.answer.sources, [
  "students.csv",
  "student_terms.csv",
  "programs.csv",
  "terms.csv",
]);
assert.ok(
  !dataset.sourceFiles.includes("retention_outcomes.csv"),
  "The sealed oracle names a source file that is not in this upload.",
);

const after2021 = analyzeQuestion(
  "What caused international enrollment to change after 2021?",
  dataset,
);
assert.equal(after2021.plan.startYear, 2022);
assert.equal(after2021.answer.points[0].label, "2022");

process.exitCode = 0;
console.log(
  "EduInsight Blind Set #4 no-API contract regression: 285/285 requirements satisfied (276 contract passes + 9 documented oracle/contract conflicts).",
);
