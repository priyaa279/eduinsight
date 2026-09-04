import assert from "node:assert/strict";
import test from "node:test";

import { evaluateDataQuality } from "../lib/data-quality/evaluate.mjs";
import { loadDataQualityContext } from "./helpers/data-quality-context.mjs";

test("governed Data Quality evaluation is identical across 20 repeated runs", () => {
  const context = loadDataQualityContext();
  const baseline = evaluateDataQuality(context);
  for (let run = 2; run <= 20; run += 1) {
    assert.deepEqual(evaluateDataQuality(context), baseline, `run ${run} diverged`);
  }
});
