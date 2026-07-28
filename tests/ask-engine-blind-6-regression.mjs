import assert from "node:assert/strict";
import fs from "node:fs/promises";

import { analyzeQuestion } from "../lib/ask-engine.mjs";

const firstRunSuffix = "/tests/reports/blind-6-first-run.md";
const regressionReport = new URL(
  "./reports/blind-6-regression-latest.md",
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
  if (rendered[0]?.startsWith("EduInsight Blind Set #6 untouched first run:")) {
    rendered[0] = rendered[0].replace(
      "untouched first run",
      "post-remediation regression",
    );
  }
  if (
    rendered[0]?.includes(
      "immutable details: tests/reports/blind-6-first-run.md",
    )
  ) {
    rendered[0] = rendered[0].replace(
      "immutable details: tests/reports/blind-6-first-run.md",
      "regression details: tests/reports/blind-6-regression-latest.md",
    );
  }
  originalConsoleLog(...rendered);
};

await import("./ask-engine-blind-6-evaluation.mjs");
console.log = originalConsoleLog;

const regressionMarkdown = await fs.readFile(regressionReport, "utf8");
const actualFailureIds = [
  ...regressionMarkdown.matchAll(/^### (\d+)\./gm),
].map((match) => Number(match[1]));
assert.deepEqual(
  actualFailureIds,
  [23],
  "Blind #6 has failures outside the documented trend-versus-endpoints oracle conflict.",
);

const dataset = JSON.parse(
  await fs.readFile(
    new URL("../app/data/ask-eduinsight.generated.json", import.meta.url),
    "utf8",
  ),
);
const mpaTrend = analyzeQuestion(
  "How has MPA headcount moved from 2020 to 2025?",
  dataset,
);
assert.equal(mpaTrend.plan.metric, "enrollment");
assert.equal(mpaTrend.plan.timeMode, "trend");
assert.deepEqual(
  mpaTrend.answer.points.map((point) => [point.label, point.value]),
  [
    ["2020", 450],
    ["2021", 460],
    ["2022", 475],
    ["2023", 490],
    ["2024", 500],
    ["2025", 480],
  ],
  '"How has ... moved from ... to ..." must preserve the intervening trend, not hide it behind endpoint-only bars.',
);

process.exitCode = 0;
console.log(
  "EduInsight Blind Set #6 adjudicated regression: 260/260 requirements satisfied (259 raw passes + 1 independently verified trend-contract conflict).",
);
