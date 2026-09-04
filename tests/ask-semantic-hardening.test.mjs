import assert from "node:assert/strict";
import test from "node:test";
import dataset from "../app/data/ask-eduinsight.generated.json" with { type: "json" };
import { analyzeQuestionRequest } from "../lib/ask/request-service.mjs";
import { planQuestionLocally } from "../lib/ask/semantic-planner.mjs";

function explicitTimeFilters(question) {
  const plan = planQuestionLocally(question, dataset);
  return {
    plan,
    detected: plan.filterAudit.detected.filter((item) => item.startsWith("Time:")),
    applied: plan.filterAudit.applied.filter((item) => item.startsWith("Time:")),
  };
}

test("geographic from does not create an explicit Time filter", () => {
  const { plan, detected, applied } = explicitTimeFilters(
    "How many students are from California?",
  );
  assert.deepEqual(detected, []);
  assert.deepEqual(applied, []);
  assert.equal(plan.timeMode, "latest");
});

test("comparative between does not create an explicit Time filter", () => {
  const { detected, applied } = explicitTimeFilters(
    "What is the difference between domestic and international enrollment?",
  );
  assert.deepEqual(detected, []);
  assert.deepEqual(applied, []);
});

test("an ordinary request verb before a year is not treated as a ranking limit", async () => {
  const result = await analyzeQuestionRequest(
    "Give the 2025 overseas-student enrollment.",
    dataset,
  );
  assert.equal(result.answer.disposition, "answer");
  assert.equal(result.plan.populationDimension, "residency");
  assert.equal(result.plan.populationValue, "International");
  assert.equal(result.plan.startYear, 2025);
  assert.equal(result.plan.endYear, 2025);
  assert.equal(result.plan.filterAudit.complete, true);
});

test("from-year range creates the correct Time filter", () => {
  const { plan, detected, applied } = explicitTimeFilters(
    "Show enrollment from 2021 through 2024.",
  );
  assert.equal(plan.startYear, 2021);
  assert.equal(plan.endYear, 2024);
  assert.deepEqual(detected, ["Time: 2021-2024"]);
  assert.deepEqual(applied, ["Time: 2021-2024"]);
});

test("between-year range creates the correct Time filter", () => {
  const { plan, detected, applied } = explicitTimeFilters(
    "Show enrollment between 2022 and 2025.",
  );
  assert.equal(plan.startYear, 2022);
  assert.equal(plan.endYear, 2025);
  assert.deepEqual(detected, ["Time: 2022-2025"]);
  assert.deepEqual(applied, ["Time: 2022-2025"]);
});

test("a single explicit year remains an explicit Time filter", () => {
  const { plan, detected, applied } = explicitTimeFilters(
    "What was total enrollment in 2025?",
  );
  assert.equal(plan.startYear, 2025);
  assert.equal(plan.endYear, 2025);
  assert.deepEqual(detected, ["Time: 2025-2025"]);
  assert.deepEqual(applied, ["Time: 2025-2025"]);
});

test("generic persistence is not silently mapped to retention", async () => {
  const result = await analyzeQuestionRequest("What is the persistence rate?", dataset);
  assert.equal(result.answer.disposition, "clarification");
  assert.equal(result.answer.queryPlan, "persistence_definition_required");
  assert.doesNotMatch(result.answer.headline, /78\.4%/);
});

test("ambiguous persistence wording explains the governed gap", async () => {
  const result = await analyzeQuestionRequest(
    "How has domestic student persistence changed?",
    dataset,
  );
  assert.equal(result.answer.disposition, "clarification");
  assert.match(result.answer.summary, /will not silently substitute/i);
});

test("first-year retention definition remains governed", async () => {
  const result = await analyzeQuestionRequest("What is first-year retention?", dataset);
  assert.equal(result.intent, "definition");
  assert.match(result.answer.summary, /first-time, full-time, degree-seeking/i);
});

test("retention-specific analytical wording still executes", async () => {
  const result = await analyzeQuestionRequest(
    "What was first-year retention for the 2024 cohort?",
    dataset,
  );
  assert.equal(result.plan.metric, "retention");
  assert.equal(result.answer.disposition, "answer");
  assert.match(result.answer.headline, /78\.4%/);
});

test("weakest cohort uses every available governed cohort year", async () => {
  const result = await analyzeQuestionRequest(
    "Which cohort year had the weakest first-year retention?",
    dataset,
  );
  assert.equal(result.plan.startYear, 2020);
  assert.match(result.answer.headline, /2020/);
  assert.ok(result.plan.filterAudit.applied.includes("Cohorts: all available"));
});

test("explicit cohort range is honored", async () => {
  const result = await analyzeQuestionRequest(
    "Which cohort year had the weakest first-year retention from 2021 through 2024?",
    dataset,
  );
  assert.equal(result.plan.startYear, 2021);
  assert.equal(result.plan.endYear, 2024);
  assert.match(result.answer.headline, /2022/);
});

test("unrequested IPEDS dates are absent from provenance", async () => {
  const result = await analyzeQuestionRequest(
    "Which IPEDS checks require review?",
    dataset,
  );
  assert.equal(result.plan.metric, "ipeds_readiness");
  assert.equal(result.plan.filterAudit.detected.some((item) => item.startsWith("Time:")), false);
  assert.equal(result.plan.filterAudit.applied.some((item) => item.startsWith("Time:")), false);
});

test("governed enrollment definition returns definition and lineage", async () => {
  const result = await analyzeQuestionRequest(
    "State the governed enrollment definition and its lineage.",
    dataset,
  );
  assert.equal(result.intent, "definition");
  assert.match(
    result.answer.summary,
    /distinct active students|counts each reportable student once/i,
  );
  assert.deepEqual(result.answer.sources, [
    "student_terms.csv",
    "students.csv",
    "terms.csv",
    "programs.csv",
  ]);
});

test("generic data catalog remains available", async () => {
  const result = await analyzeQuestionRequest("What data is available?", dataset);
  assert.equal(result.intent, "capability");
  assert.match(result.answer.headline, /seven governed subject areas/i);
});

test("residency comparison preserves both executed comparison groups", async () => {
  const result = await analyzeQuestionRequest(
    "Compare domestic and international enrollment in 2025.",
    dataset,
  );
  assert.ok(result.plan.filterAudit.applied.includes("residency: Domestic"));
  assert.ok(result.plan.filterAudit.applied.includes("residency: International"));
  assert.equal(result.plan.filterAudit.complete, true);
});

test("a complete IPEDS status breakdown is analytical rather than partial", async () => {
  const result = await analyzeQuestionRequest(
    "Break the latest IPEDS validations into Passed, Review, and Failed counts.",
    dataset,
  );
  assert.equal(result.intent, "analytical");
  assert.equal(result.answer.disposition, "answer");
  assert.equal(result.plan.groupBy, "status");
  assert.deepEqual(
    result.answer.points.map((point) => point.label).sort(),
    ["Failed", "Passed", "Review"],
  );
});
