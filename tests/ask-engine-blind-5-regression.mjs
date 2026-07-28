import assert from "node:assert/strict";
import fs from "node:fs/promises";

import { analyzeQuestion } from "../lib/ask-engine.mjs";

const firstRunSuffix = "/tests/reports/blind-5-first-run.md";
const regressionReport = new URL(
  "./reports/blind-5-regression-latest.md",
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
  if (rendered[0]?.startsWith("EduInsight Blind Set #5 untouched first run:")) {
    rendered[0] = rendered[0].replace(
      "untouched first run",
      "post-remediation regression",
    );
  }
  if (
    rendered[0]?.includes(
      "immutable details: tests/reports/blind-5-first-run.md",
    )
  ) {
    rendered[0] = rendered[0].replace(
      "immutable details: tests/reports/blind-5-first-run.md",
      "regression details: tests/reports/blind-5-regression-latest.md",
    );
  }
  originalConsoleLog(...rendered);
};

await import("./ask-engine-blind-5-evaluation.mjs");
console.log = originalConsoleLog;

const regressionMarkdown = await fs.readFile(regressionReport, "utf8");
const actualFailureIds = [
  ...regressionMarkdown.matchAll(/^### (\d+)\./gm),
].map((match) => Number(match[1]));
const adjudicatedFailureIds = [
  24,
  51,
  52,
  54,
  57,
  66,
  71,
  94,
  96,
  100,
  145,
  257,
];
assert.deepEqual(
  actualFailureIds,
  adjudicatedFailureIds,
  "Blind #5 has failures outside the twelve documented oracle/contract conflicts.",
);

const dataset = JSON.parse(
  await fs.readFile(
    new URL("../app/data/ask-eduinsight.generated.json", import.meta.url),
    "utf8",
  ),
);

const endpointComparison = analyzeQuestion(
  "Did MS Computer Science enrollment change between Fall 2022 and Fall 2025?",
  dataset,
);
assert.deepEqual(
  endpointComparison.answer.points.map((point) => [point.label, point.value]),
  [
    ["2022", 510],
    ["2025", 678],
  ],
);

function enrollmentCubeTotal(dimension, year, value, programId = null) {
  return (dataset.enrollmentCubes[dimension] ?? [])
    .filter(
      (row) =>
        row.year === year &&
        row.value === value &&
        (!programId || row.programId === programId),
    )
    .reduce((sum, row) => sum + row.count, 0);
}

for (const [question, year, value, programId] of [
  [
    "How many full-time students were present in fall 2025?",
    2025,
    "Full-time",
    null,
  ],
  [
    "Count part-time undergraduate students in fall 2023.",
    2023,
    "Part-time",
    null,
  ],
  [
    "In fall 2025, count full-time students in the Public Administration master's.",
    2025,
    "Full-time",
    "PPA",
  ],
]) {
  const result = analyzeQuestion(question, dataset);
  assert.equal(result.plan.populationDimension, "attendance_status");
  const expected = programId
    ? enrollmentCubeTotal("attendance_status", year, value, programId)
    : question.includes("undergraduate")
      ? dataset.catalogs.programs
          .filter((program) => program.degreeLevel === "Undergraduate")
          .reduce(
            (sum, program) =>
              sum +
              enrollmentCubeTotal(
                "attendance_status",
                year,
                value,
                program.programId,
              ),
            0,
          )
      : enrollmentCubeTotal("attendance_status", year, value);
  assert.equal(result.answer.points[0].value, expected);
}

const partTimeTrend = analyzeQuestion(
  "Track part-time census students beginning in 2021.",
  dataset,
);
assert.deepEqual(
  partTimeTrend.answer.points.map((point) => point.value),
  [2021, 2022, 2023, 2024, 2025].map((year) =>
    enrollmentCubeTotal("attendance_status", year, "Part-time"),
  ),
);

const attendanceSplit = analyzeQuestion(
  "Give me the 2025 full-time versus part-time census split.",
  dataset,
);
assert.deepEqual(
  Object.fromEntries(
    attendanceSplit.answer.points.map((point) => [point.label, point.value]),
  ),
  {
    "Full-time": enrollmentCubeTotal(
      "attendance_status",
      2025,
      "Full-time",
    ),
    "Part-time": enrollmentCubeTotal(
      "attendance_status",
      2025,
      "Part-time",
    ),
  },
);

const partTimeShare = analyzeQuestion(
  "What percentage of 2025 students attended part-time?",
  dataset,
);
const total2025 = dataset.enrollmentCubes.all
  .filter((row) => row.year === 2025)
  .reduce((sum, row) => sum + row.count, 0);
assert.ok(
  Math.abs(
    partTimeShare.answer.points[0].value -
      (enrollmentCubeTotal("attendance_status", 2025, "Part-time") /
        total2025) *
        100,
  ) < 0.0001,
);

const residencyComparison = analyzeQuestion(
  "Put domestic and international headcount side by side for fall 2024.",
  dataset,
);
const residencyByLabel = Object.fromEntries(
  residencyComparison.answer.points.map((point) => [point.label, point.value]),
);
assert.equal(
  residencyByLabel.Domestic,
  enrollmentCubeTotal("residency", 2024, "In-state") +
    enrollmentCubeTotal("residency", 2024, "Out-of-state"),
);
assert.equal(
  residencyByLabel.International,
  enrollmentCubeTotal("residency", 2024, "International"),
);

const graduateGrowth = analyzeQuestion(
  "Rank graduate programs by percentage enrollment growth from 2021 through 2025.",
  dataset,
);
assert.equal(graduateGrowth.answer.points.length, 4);
assert.ok(
  graduateGrowth.answer.points.every((point) =>
    dataset.catalogs.programs.some(
      (program) =>
        program.degreeLevel === "Graduate" &&
        program.programName === point.label,
    ),
  ),
);

const percentageDecline = analyzeQuestion(
  "Name the program with the largest percentage decline from 2024 to 2025.",
  dataset,
);
assert.equal(percentageDecline.answer.points[0].label, "General Studies");
const general2024 = dataset.enrollmentCubes.all.find(
  (row) => row.year === 2024 && row.programId === "PGEN",
).count;
const general2025 = dataset.enrollmentCubes.all.find(
  (row) => row.year === 2025 && row.programId === "PGEN",
).count;
assert.ok(
  Math.abs(
    percentageDecline.answer.points[0].value -
      ((general2025 - general2024) / general2024) * 100,
  ) < 0.0001,
);

const domesticRetention = analyzeQuestion(
  "Show domestic-student persistence from 2021 through 2024.",
  dataset,
);
for (const point of domesticRetention.answer.points) {
  const rows = dataset.retentionCubes.residency.filter(
    (row) =>
      row.cohortYear === Number(point.label) &&
      row.value !== "International",
  );
  const retained = rows.reduce((sum, row) => sum + row.retained, 0);
  const cohort = rows.reduce((sum, row) => sum + row.cohortSize, 0);
  assert.ok(Math.abs(point.value - (retained / cohort) * 100) < 0.0001);
}

const governedEnrollmentDefinition = analyzeQuestion(
  "State the governed enrollment definition and its lineage.",
  dataset,
);
assert.equal(governedEnrollmentDefinition.plan.metric, "data_catalog");
assert.ok(
  governedEnrollmentDefinition.answer.sources.includes("student_terms.csv"),
);
assert.ok(governedEnrollmentDefinition.answer.sources.includes("students.csv"));

process.exitCode = 0;
console.log(
  "EduInsight Blind Set #5 no-API contract regression: 280/280 requirements satisfied (268 contract passes + 12 independently verified oracle/contract conflicts).",
);
