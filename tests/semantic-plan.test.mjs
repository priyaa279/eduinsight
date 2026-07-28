import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import {
  executeQueryPlan,
  planQuestionLocally,
  semanticPlanSchema,
  validateSemanticPlan,
} from "../lib/ask-engine.mjs";

const dataset = JSON.parse(
  await fs.readFile(
    new URL("../app/data/ask-eduinsight.generated.json", import.meta.url),
    "utf8",
  ),
);

const semanticProjection = (plan) => ({
  metric: plan.metric,
  programId: plan.programId,
  programScope: plan.programScope,
  degreeLevel: plan.degreeLevel,
  startYear: plan.startYear,
  endYear: plan.endYear,
  populationDimension: plan.populationDimension,
  populationValue: plan.populationValue,
  groupBy: plan.groupBy,
  ranking: plan.ranking,
  measure: plan.measure,
  operation: plan.operation,
  topN: plan.topN,
  responseType: plan.responseType,
});

test("percentage-growth ranking resolves to one explicit semantic plan", () => {
  const plan = planQuestionLocally(
    "Show the top three graduate programs by percentage growth since 2021.",
    dataset,
  );
  assert.deepEqual(semanticProjection(plan), {
    metric: "enrollment",
    programId: null,
    programScope: "degree_level",
    degreeLevel: "Graduate",
    startYear: 2021,
    endYear: 2025,
    populationDimension: "all",
    populationValue: null,
    groupBy: "program",
    ranking: "highest",
    measure: "percentage_growth",
    operation: "program_change_percent",
    topN: 3,
    responseType: "answer",
  });
  assert.equal(plan.filterAudit.complete, true);
});

test("growth-ranking paraphrases produce the same semantic operation", () => {
  const questions = [
    "Which 3 graduate programs grew the fastest percentage-wise since 2021?",
    "Give the top 3 graduate programs by biggest percentage increase from 2021.",
    "Rank three graduate programs by largest growth rate since 2021.",
    "Show the top three graduate programs by percent growth from 2021.",
  ];
  const plans = questions.map((question) =>
    semanticProjection(planQuestionLocally(question, dataset)),
  );
  for (const plan of plans.slice(1)) assert.deepEqual(plan, plans[0]);
});

test("filter order does not change the resolved population", () => {
  const questions = [
    "Show international graduate Computer Science enrollment in 2025.",
    "Show 2025 Computer Science international graduate enrollment.",
    "For graduate students in Computer Science, how many were international in 2025?",
  ];
  const plans = questions.map((question) =>
    semanticProjection(planQuestionLocally(question, dataset)),
  );
  for (const plan of plans.slice(1)) assert.deepEqual(plan, plans[0]);
  assert.equal(plans[0].programId, "PCS");
  assert.equal(plans[0].populationDimension, "residency");
  assert.equal(plans[0].populationValue, "International");
});

test("count and percentage requests remain distinct in the semantic plan", () => {
  const count = planQuestionLocally(
    "How many international students were enrolled in 2025?",
    dataset,
  );
  const percentage = planQuestionLocally(
    "What percentage of students were international in 2025?",
    dataset,
  );
  assert.equal(count.measure, "count");
  assert.equal(count.operation, "standard");
  assert.equal(percentage.measure, "percentage");
  assert.equal(percentage.operation, "share");
});

test("retention comparison preserves cohort and subgroup semantics", () => {
  const plan = planQuestionLocally(
    "Compare Pell and non-Pell retention in 2024.",
    dataset,
  );
  assert.equal(plan.metric, "retention");
  assert.equal(plan.startYear, 2024);
  assert.equal(plan.endYear, 2024);
  assert.equal(plan.groupBy, "pell_eligible");
  assert.equal(plan.operation, "retention_pell_comparison");
  assert.equal(plan.measure, "percentage_point_difference");
});

test("unsupported, ambiguous, and privacy-sensitive requests are classified before execution", () => {
  const unsupported = planQuestionLocally(
    "What is the average student GPA?",
    dataset,
  );
  const ambiguous = planQuestionLocally("Which program is best?", dataset);
  const privateRequest = planQuestionLocally(
    "Give me the names of Pell students who did not retain.",
    dataset,
  );
  assert.equal(unsupported.responseType, "limitation");
  assert.equal(ambiguous.responseType, "clarification");
  assert.equal(privateRequest.responseType, "refusal");
});

test("unsupported cross-tabs fail closed with an explicit incomplete filter audit", () => {
  const plan = planQuestionLocally(
    "How many domestic first-generation Pell-eligible undergraduate students were enrolled in 2025?",
    dataset,
  );
  assert.equal(plan.responseType, "limitation");
  assert.equal(plan.filterAudit.complete, false);
  assert.match(plan.responseReason, /cannot safely combine/i);
});

test("the internal semantic schema covers derived plan fields", () => {
  const schema = semanticPlanSchema(dataset);
  for (const field of [
    "operation",
    "topN",
    "thresholdOperator",
    "responseType",
    "normalizedQuestion",
    "filterAudit",
  ]) {
    assert.ok(schema.required.includes(field));
    assert.ok(schema.properties[field]);
  }
});

test("a supported parsed plan passes contract validation", () => {
  const plan = planQuestionLocally(
    "Which five programs had the largest enrollment in 2025?",
    dataset,
  );
  assert.deepEqual(validateSemanticPlan(plan, dataset), {
    valid: true,
    errors: [],
  });
});

test("plan execution is independently testable from language interpretation", () => {
  const plan = planQuestionLocally(
    "Show the top three graduate programs by percentage growth since 2021.",
    dataset,
  );
  const answer = executeQueryPlan(plan, dataset);
  assert.equal(answer.points.length, 3);
  assert.ok(answer.points[0].value >= answer.points[1].value);
  assert.ok(answer.points[1].value >= answer.points[2].value);
});
