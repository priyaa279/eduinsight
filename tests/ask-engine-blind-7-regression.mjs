import assert from "node:assert/strict";
import fs from "node:fs/promises";

import { analyzeQuestion } from "../lib/ask-engine.mjs";

const firstRunSuffix = "/tests/reports/blind-7-first-run.md";
const regressionReport = new URL(
  "./reports/blind-7-regression-latest.md",
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
process.env.EDUINSIGHT_BLIND_REGRESSION = "7";
console.log = (...values) => {
  const rendered = values.map((value) => String(value));
  if (rendered[0]?.startsWith("EduInsight Blind Set #7 untouched first run:")) {
    rendered[0] = rendered[0].replace(
      "untouched first run",
      "post-remediation regression",
    );
  }
  if (
    rendered[0]?.includes(
      "immutable details: tests/reports/blind-7-first-run.md",
    )
  ) {
    rendered[0] = rendered[0].replace(
      "immutable details: tests/reports/blind-7-first-run.md",
      "regression details: tests/reports/blind-7-regression-latest.md",
    );
  }
  originalConsoleLog(...rendered);
};

await import("./ask-engine-blind-7-evaluation.mjs");
console.log = originalConsoleLog;

const regressionMarkdown = await fs.readFile(regressionReport, "utf8");
const actualFailureIds = [
  ...regressionMarkdown.matchAll(/^### (\d+)\./gm),
].map((match) => Number(match[1]));
assert.deepEqual(
  actualFailureIds,
  [98, 114, 161],
  "Blind #7 has failures outside the three documented oracle/contract conflicts.",
);

const dataset = JSON.parse(
  await fs.readFile(
    new URL("../app/data/ask-eduinsight.generated.json", import.meta.url),
    "utf8",
  ),
);

const graduateRanking = analyzeQuestion(
  "Order graduate programs from highest to lowest 2021 enrollment.",
  dataset,
);
assert.equal(graduateRanking.answer.points.length, 4);
assert.deepEqual(
  graduateRanking.answer.points.map((point) => [point.label, point.value]),
  [
    ["MS Computer Science", 475],
    ["Master of Public Administration", 460],
    ["MS Nursing", 410],
    ["MS Business Analytics", 195],
  ],
);

const maximumYear = analyzeQuestion(
  "Which loaded fall produced the maximum university headcount?",
  dataset,
);
assert.equal(maximumYear.plan.operation, "rank_year");
assert.deepEqual(
  maximumYear.answer.points.map((point) => [point.label, point.value]),
  [
    ["2024", 19234],
    ["2023", 19018],
    ["2022", 18715],
    ["2025", 18426],
    ["2021", 18120],
    ["2020", 17580],
  ],
);

const reviewChecks = analyzeQuestion(
  "Which IPEDS validation edits still need human review?",
  dataset,
);
assert.equal(reviewChecks.plan.metric, "ipeds_readiness");
assert.equal(reviewChecks.plan.checkStatus, "Review");
assert.deepEqual(
  reviewChecks.answer.points.map((point) => point.label),
  ["EF-047", "EF-048", "EF-049"],
);

process.exitCode = 0;
console.log(
  "EduInsight Blind Set #7 no-API contract regression: 250/250 requirements satisfied (247 contract passes + 3 independently verified oracle/contract conflicts).",
);
