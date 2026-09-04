import assert from "node:assert/strict";
import test from "node:test";

import dataset from "../app/data/ask-eduinsight.generated.json" with { type: "json" };
import { analyzeQuestionRequest } from "../lib/ask/request-service.mjs";
import { withCurrentQualityLifecycle } from "../lib/data-quality/ask-lifecycle-overlay.mjs";

const unavailableDataset = await withCurrentQualityLifecycle(dataset, null);

test("D1 unavailable does not break unrelated Ask enrollment analytics", async () => {
  const result = await analyzeQuestionRequest(
    "What was total enrollment in Fall 2025?",
    unavailableDataset,
  );
  assert.equal(result.answer.disposition, "answer");
  assert.match(result.answer.headline, /18,426/);
});

test("D1 unavailable does not break evaluator-backed Data Quality rule counts", async () => {
  const result = await analyzeQuestionRequest(
    "How many Data Quality rules passed?",
    unavailableDataset,
  );
  assert.equal(result.answer.disposition, "answer");
  assert.match(result.answer.headline, /10 data-quality rules are PASS/i);
});

test("lifecycle-specific Ask returns a narrow persistence limitation when D1 is unavailable", async () => {
  const result = await analyzeQuestionRequest(
    "How many Data Quality findings are resolved?",
    unavailableDataset,
  );
  assert.equal(result.answer.disposition, "limitation");
  assert.match(result.answer.headline, /review lifecycle records are temporarily unavailable/i);
  assert.match(result.answer.summary, /source-derived rule results remain available/i);
});
