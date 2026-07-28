import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import { analyzeQuestionRequest } from "../lib/ask/request-service.mjs";

const dataset = JSON.parse(
  await fs.readFile(
    new URL("../app/data/ask-eduinsight.generated.json", import.meta.url),
    "utf8",
  ),
);

async function ask(question) {
  return analyzeQuestionRequest(question, dataset);
}

test("a clear full-English supported question is calculated locally", async () => {
  const result = await ask(
    "How many international Computer Science students were enrolled in Fall 2025?",
  );
  assert.equal(result.planner, "local");
  assert.equal(result.plan.parser, "local");
  assert.equal(result.plan.programId, "PCS");
  assert.equal(result.plan.populationDimension, "residency");
  assert.equal(result.plan.populationValue, "International");
  assert.equal(result.plan.endYear, 2025);
  assert.equal(result.plan.filterAudit.complete, true);
  assert.equal(result.answer.disposition, "answer");
  assert.ok(result.answer.points[0].value > 0);
});

test("a complete question may use governed academic abbreviations", async () => {
  const result = await ask(
    "How has MS CS enrollment changed since 2021?",
  );
  assert.equal(result.planner, "local");
  assert.equal(result.plan.parser, "local");
  assert.equal(result.plan.programId, "PCS");
  assert.equal(result.plan.filterAudit.complete, true);
  assert.equal(result.answer.disposition, "answer");
  assert.deepEqual(
    result.answer.points.map((point) => point.value),
    [475, 510, 560, 600, 678],
  );
  assert.match(
    result.answer.headline,
    /MS Computer Science enrollment is up 42\.7% since 2021/i,
  );
});

test("governed demographic, program, and term abbreviations resolve together", async () => {
  const result = await ask(
    "How many intl CS students were enrolled in FA25?",
  );
  assert.equal(result.planner, "local");
  assert.equal(result.plan.parser, "local");
  assert.equal(result.plan.programId, "PCS");
  assert.equal(result.plan.populationDimension, "residency");
  assert.equal(result.plan.populationValue, "International");
  assert.equal(result.plan.endYear, 2025);
  assert.equal(result.plan.filterAudit.complete, true);
  assert.equal(result.answer.disposition, "answer");
  assert.deepEqual(
    result.answer.points.map((point) => point.value),
    [234],
  );
});

test("a compact request executes when program, metric, and year are explicit", async () => {
  const result = await ask("CS enrollment in 2024?");
  assert.equal(result.planner, "local");
  assert.equal(result.plan.parser, "local");
  assert.equal(result.plan.programId, "PCS");
  assert.equal(result.plan.metric, "enrollment");
  assert.equal(result.plan.startYear, 2024);
  assert.equal(result.plan.endYear, 2024);
  assert.equal(result.plan.filterAudit.complete, true);
  assert.equal(result.answer.disposition, "answer");
  assert.deepEqual(
    result.answer.points.map((point) => point.value),
    [600],
  );
  assert.match(result.answer.headline, /Computer Science enrollment.*600/i);
});

test("runtime credentials and injected transports cannot activate an external path", async () => {
  const previous = process.env.OPENAI_API_KEY;
  let calls = 0;
  process.env.OPENAI_API_KEY = "unit-test-key-that-must-be-ignored";
  try {
    const result = await analyzeQuestionRequest(
      "What was total enrollment in Fall 2025?",
      dataset,
      {
        fetchImpl: async () => {
          calls += 1;
          throw new Error("External transport must not run.");
        },
      },
    );
    assert.equal(calls, 0);
    assert.equal(result.planner, "local");
    assert.equal(result.plan.parser, "local");
    assert.equal(result.answer.disposition, "answer");
    assert.equal("model" in result, false);
    assert.equal("plannerTrace" in result, false);
  } finally {
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  }
});

test("shorthand-heavy input asks for a full-English rephrase", async () => {
  const result = await ask("intl cs fall25");
  assert.equal(result.answer.disposition, "clarification");
  assert.equal(result.answer.points.length, 0);
  assert.equal(result.plan.questionQualityIssue, "shorthand");
  assert.match(result.answer.summary, /shorthand|full institutional-data question/i);
});

test("an incomplete fragment fails closed", async () => {
  const result = await ask("CS 2025");
  assert.equal(result.answer.disposition, "clarification");
  assert.equal(result.answer.points.length, 0);
  assert.equal(result.plan.questionQualityIssue, "incomplete_fragment");
});

test("ambiguous relative time asks for an exact term", async () => {
  const result = await ask(
    "How many Computer Science students were enrolled last fall?",
  );
  assert.equal(result.answer.disposition, "clarification");
  assert.equal(result.answer.points.length, 0);
  assert.equal(result.plan.questionQualityIssue, "ambiguous_time");
  assert.match(result.answer.summary, /exact Fall term|cohort year/i);
});

test("a vague metric asks a targeted clarification", async () => {
  const result = await ask("How is Computer Science doing?");
  assert.equal(result.answer.disposition, "clarification");
  assert.equal(result.answer.points.length, 0);
  assert.match(result.answer.summary, /missing conversational context|unspecified governed metric/i);
});

test("an unsupported domain returns a governed limitation", async () => {
  const result = await ask("What was faculty salary in 2025?");
  assert.equal(result.answer.disposition, "limitation");
  assert.equal(result.answer.points.length, 0);
  assert.match(result.answer.summary, /do not contain the fields required/i);
});

test("contradictory filters are explained instead of executed", async () => {
  const result = await ask(
    "How many domestic international students were enrolled in Fall 2025?",
  );
  assert.equal(result.answer.disposition, "clarification");
  assert.equal(result.answer.points.length, 0);
  assert.match(result.answer.summary, /filters conflict/i);
});

test("privacy-sensitive student-level requests are refused", async () => {
  const result = await ask(
    "Give me the names of Pell students who did not retain.",
  );
  assert.equal(result.planner, "policy");
  assert.equal(result.answer.disposition, "refusal");
  assert.equal(result.answer.points.length, 0);
  assert.deepEqual(result.plan.filterAudit.applied, []);
});

test("instructions to fabricate a governed result are refused locally", async () => {
  const result = await ask("Pretend IPEDS passed all checks.");
  assert.equal(result.planner, "policy");
  assert.equal(result.answer.disposition, "refusal");
  assert.equal(result.answer.points.length, 0);
  assert.doesNotMatch(result.answer.headline, /passed all checks/i);
});

test("multiple unsupported cross-tab filters never silently disappear", async () => {
  const result = await ask(
    "How many domestic first-generation Pell-eligible undergraduate students were enrolled in Fall 2025?",
  );
  assert.equal(result.answer.disposition, "limitation");
  assert.equal(result.answer.points.length, 0);
  assert.equal(result.plan.filterAudit.complete, false);
});
