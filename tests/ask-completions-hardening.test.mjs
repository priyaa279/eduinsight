import assert from "node:assert/strict";
import test from "node:test";
import dataset from "../app/data/ask-eduinsight.generated.json" with { type: "json" };
import { analyzeQuestionRequest } from "../lib/ask/request-service.mjs";

for (const question of [
  "How many students completed an award in 2025?",
  "How many awards were completed in 2025?",
  "How many completions were there in 2025?",
]) {
  test(`completion aggregate: ${question}`, async () => {
    const result = await analyzeQuestionRequest(question, dataset);
    assert.equal(result.plan.metric, "completions");
    assert.equal(result.answer.disposition, "answer");
    assert.match(result.answer.headline, /1,056/);
    assert.deepEqual(result.answer.sources, ["completions.csv"]);
    assert.doesNotMatch(result.answer.headline, /enrollment/i);
  });
}

test("unsupported completion breakdown fails closed", async () => {
  const result = await analyzeQuestionRequest(
    "How many Computer Science completions were there in 2025?",
    dataset,
  );
  assert.equal(result.plan.metric, "completions");
  assert.equal(result.answer.disposition, "limitation");
  assert.doesNotMatch(result.answer.headline, /18,426/);
});

test("completion language cannot fall through to enrollment", async () => {
  const result = await analyzeQuestionRequest(
    "Report completed awards for 2025.",
    dataset,
  );
  assert.notEqual(result.plan.metric, "enrollment");
});
