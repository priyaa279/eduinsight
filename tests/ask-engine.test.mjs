import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import {
  analyzeQuestion,
  planQuestionLocally,
} from "../lib/ask-engine.mjs";

const dataset = JSON.parse(
  await fs.readFile(
    new URL("../app/data/ask-eduinsight.generated.json", import.meta.url),
    "utf8",
  ),
);

test("a named program produces a program-specific enrollment calculation", () => {
  const result = analyzeQuestion(
    "How has MS Computer Science enrollment changed since 2021?",
    dataset,
  );
  assert.equal(result.plan.programId, "PCS");
  assert.equal(result.answer.points[0].value, 475);
  assert.equal(result.answer.points.at(-1).value, 678);
  assert.match(
    result.answer.headline,
    /MS Computer Science enrollment is up 42\.7%/,
  );
});

test("removing Computer Science recalculates all MS programs", () => {
  const result = analyzeQuestion(
    "How has MS enrollment changed since 2021?",
    dataset,
  );
  assert.equal(result.plan.programId, null);
  assert.equal(result.plan.programScope, "masters_of_science");
  assert.equal(result.answer.points[0].value, 1080);
  assert.equal(result.answer.points.at(-1).value, 1803);
  assert.doesNotMatch(result.answer.headline, /Computer Science/);
});

test("graduate enrollment includes every graduate program", () => {
  const result = analyzeQuestion("Show graduate enrollment since 2021", dataset);
  assert.equal(result.plan.degreeLevel, "Graduate");
  assert.equal(result.answer.points[0].value, 1540);
  assert.equal(result.answer.points.at(-1).value, 2283);
});

test("capacity questions calculate from sections and registrations", () => {
  const result = analyzeQuestion(
    "Which graduate program uses the most capacity?",
    dataset,
  );
  assert.equal(result.plan.metric, "capacity_utilization");
  assert.match(result.answer.headline, /MS Business Analytics/);
  assert.equal(result.answer.points[0].display, "92%");
});

test("course outcome questions report the exact missing source field", () => {
  const result = analyzeQuestion(
    "Which gateway course has the highest DFW rate?",
    dataset,
  );
  assert.equal(result.plan.metric, "course_outcomes");
  assert.equal(result.answer.points.length, 0);
  assert.match(result.answer.headline, /cannot be calculated/i);
  assert.match(result.answer.summary, /no final_grade values/i);
  assert.ok(result.answer.sources.includes("section_enrollments.csv"));
});

test("planner never carries a removed program into the next question", () => {
  const first = planQuestionLocally(
    "How many Computer Science students are enrolled?",
    dataset,
  );
  const second = planQuestionLocally(
    "How many MS students are enrolled?",
    dataset,
  );
  assert.equal(first.programId, "PCS");
  assert.equal(second.programId, null);
  assert.equal(second.programScope, "masters_of_science");
});

test("BS retention trends use BS programs and cohort years", () => {
  const result = analyzeQuestion(
    "How has BS retention changed since 2021?",
    dataset,
  );
  assert.equal(result.plan.metric, "retention");
  assert.equal(result.plan.programScope, "bachelors_of_science");
  assert.equal(result.plan.comparisonMode, "trend");
  assert.deepEqual(
    result.answer.points.map((point) => point.label),
    ["2021", "2022", "2023", "2024"],
  );
  assert.deepEqual(
    result.answer.points.map((point) => point.display),
    ["72.9%", "68.9%", "76.9%", "78.1%"],
  );
  assert.match(
    result.answer.headline,
    /BS-program first-year retention increased 5\.3 percentage points/,
  );
  assert.ok(result.answer.sources.includes("programs.csv"));
});

test("MS retention trends use MS programs and cohort years", () => {
  const result = analyzeQuestion(
    "How has MS retention changed since 2021?",
    dataset,
  );
  assert.equal(result.plan.metric, "retention");
  assert.equal(result.plan.programScope, "masters_of_science");
  assert.deepEqual(
    result.answer.points.map((point) => point.display),
    ["68.8%", "72.1%", "82.5%", "76.6%"],
  );
  assert.match(
    result.answer.headline,
    /MS-program first-year retention increased 7\.7 percentage points/,
  );
});

test("explicit subgroup comparisons show the subgroup against its matched cohort", () => {
  const result = analyzeQuestion(
    "Compare first-generation retention with the full cohort",
    dataset,
  );
  assert.equal(result.plan.comparisonMode, "groups");
  assert.deepEqual(
    result.answer.points.map((point) => point.label),
    ["Matched FTFT cohort", "First-generation students"],
  );
  assert.deepEqual(
    result.answer.points.map((point) => point.display),
    ["78.4%", "79.8%"],
  );
  assert.match(result.answer.headline, /1\.4 points above the matched cohort/);
});

test("a simple enrollment question uses the latest Fall census", () => {
  const result = analyzeQuestion("How many students are enrolled?", dataset);
  assert.equal(result.plan.metric, "enrollment");
  assert.equal(result.plan.timeMode, "latest");
  assert.deepEqual(result.answer.points, [
    { label: "2025", value: 18426, display: "18,426" },
  ]);
  assert.match(result.answer.headline, /18,426 students in 2025/);
});

test("enrollment can be broken down by residency", () => {
  const result = analyzeQuestion("Enrollment by residency in 2025", dataset);
  assert.equal(result.plan.groupBy, "residency");
  assert.deepEqual(
    result.answer.points.map((point) => point.label),
    ["International", "In-state", "Out-of-state"],
  );
  assert.equal(
    result.answer.points.reduce((sum, point) => sum + point.value, 0),
    18426,
  );
});

test("population filters and program ranking are applied together", () => {
  const result = analyzeQuestion(
    "Which program has the most international students?",
    dataset,
  );
  assert.equal(result.plan.populationValue, "International");
  assert.equal(result.plan.groupBy, "program");
  assert.equal(result.answer.points[0].label, "BS Education");
  assert.equal(result.answer.points[0].value, 707);
});

test("quality questions can group affected records by source", () => {
  const result = analyzeQuestion(
    "Which source system has the most affected records?",
    dataset,
  );
  assert.equal(result.plan.metric, "quality_issues");
  assert.equal(result.plan.measure, "affected_records");
  assert.equal(result.answer.points[0].label, "Enterprise data warehouse");
  assert.equal(result.answer.points[0].value, 2070);
});

test("IPEDS check-count questions display counts rather than readiness", () => {
  const result = analyzeQuestion("How many validation checks passed?", dataset);
  assert.equal(result.plan.metric, "ipeds_readiness");
  assert.equal(result.plan.checkStatus, "Passed");
  assert.deepEqual(result.answer.points, [
    { label: "Passed", value: 46, display: "46" },
  ]);
});

test("the data catalog describes supported governed domains", () => {
  const result = analyzeQuestion("What data is available?", dataset);
  assert.equal(result.plan.metric, "data_catalog");
  assert.match(result.answer.headline, /six governed analysis domains/i);
  assert.ok(result.answer.sources.includes("students.csv"));
});

test("unknown metrics return a source limitation instead of a reused answer", () => {
  const result = analyzeQuestion("What is the graduation rate?", dataset);
  assert.equal(result.plan.metric, "unsupported");
  assert.equal(result.answer.points.length, 0);
  assert.equal(result.answer.queryPlan, "unsupported");
});
