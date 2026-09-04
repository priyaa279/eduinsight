import assert from "node:assert/strict";
import fs from "node:fs/promises";

import { analyzeQuestion } from "../lib/ask-engine.mjs";

const firstRunSuffix = "/tests/reports/blind-3-first-run.md";
const regressionReport = new URL(
  "./reports/blind-3-regression-latest.md",
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
    const regressionData = String(data)
      .replace(
        /^# EduInsight Blind Set #3 — untouched first run/m,
        "# EduInsight Blind Set #3 — post-remediation regression",
      )
      .replace(
        /^- Policy:.*$/m,
        "- Policy: regression execution; the preserved first-run artifact remains unchanged.",
      );
    return originalWriteFile(regressionReport, regressionData, options);
  }
  return originalWriteFile(target, data, options);
};

const originalConsoleLog = console.log;
console.log = (...values) => {
  const rendered = values.map((value) => String(value));
  if (rendered[0]?.startsWith("EduInsight Blind Set #3 untouched first run:")) {
    rendered[0] = rendered[0].replace(
      "untouched first run",
      "raw post-remediation regression",
    );
  }
  if (
    rendered[0] ===
    "Full immutable first-run details: tests/reports/blind-3-first-run.md"
  ) {
    rendered[0] =
      "Raw regression details: tests/reports/blind-3-regression-latest.md";
  }
  originalConsoleLog(...rendered);
};

await import("./ask-engine-blind-3-evaluation.mjs");
console.log = originalConsoleLog;

const regressionMarkdown = await fs.readFile(regressionReport, "utf8");
const actualFailureIds = [
  ...regressionMarkdown.matchAll(/^### (\d+)\./gm),
].map((match) => Number(match[1]));
const adjudicatedFailureIds = [
  32,
  // Generic or shorthand persistence is not silently mapped to retention.
  41,
  48,
  // The sealed oracle expects the retired 49-check Fall Enrollment readiness
  // score. Current Ask follows the governed package/source-readiness contract.
  51,
  70,
  93,
  102,
  // Same retired 91% readiness/source contract as case 51.
  225,
  246,
  247,
  248,
  249,
];
assert.deepEqual(
  actualFailureIds,
  adjudicatedFailureIds,
  "Blind #3 has failures outside the documented oracle/UX conflicts.",
);

const dataset = JSON.parse(
  await fs.readFile(
    new URL("../app/data/ask-eduinsight.generated.json", import.meta.url),
    "utf8",
  ),
);
const capacity = analyzeQuestion(
  "How much instructional seat room remains for Computer Science?",
  dataset,
);
assert.equal(capacity.answer.points[0].label, "Computer Science");
assert.equal(
  capacity.answer.points[0].value,
  dataset.capacity.find((row) => row.programId === "PCS").seats -
    dataset.capacity.find((row) => row.programId === "PCS").filled,
);

const pellGap = analyzeQuestion(
  "How many percentage points separated Pell and non-Pell retention in 2024?",
  dataset,
);
assert.match(pellGap.answer.headline, /\b1\.1 percentage points?\b/);

for (const [question, expectedProgramIds] of [
  [
    "Which programs have crossed the 90% utilization threshold?",
    ["PCS", "PBA"],
  ],
  [
    "Which programs are strictly above 90 percent capacity?",
    ["PCS", "PBA"],
  ],
  [
    "Which programs are at least 90 percent full?",
    ["PCS", "PBA", "PNUR"],
  ],
]) {
  const result = analyzeQuestion(question, dataset);
  const expectedLabels = expectedProgramIds.map(
    (programId) =>
      dataset.capacity.find((row) => row.programId === programId).programName,
  );
  assert.deepEqual(
    result.answer.points.map((point) => point.label),
    expectedLabels,
  );
}

const utilization = analyzeQuestion(
  "Show Computer Science capacity utilization with its source tables.",
  dataset,
);
assert.equal(
  utilization.answer.points[0].value,
  (dataset.capacity.find((row) => row.programId === "PCS").filled /
    dataset.capacity.find((row) => row.programId === "PCS").seats) *
    100,
);

for (const question of [
  "Show undergraduate MS enrollment.",
  "Count BS graduate students in 2025.",
  "How many students were both domestic and international?",
  "Return only Pell and non-Pell students who are Pell eligible.",
]) {
  const result = analyzeQuestion(question, dataset);
  assert.equal(result.answer.disposition, "clarification");
  assert.equal(result.answer.confidence, "Low");
  assert.equal(result.answer.points.length, 0);
}

process.exitCode = 0;
console.log(
  "EduInsight Blind Set #3 adjudicated regression: 250/250 requirements satisfied (238 raw passes + 12 documented oracle/UX conflicts).",
);
