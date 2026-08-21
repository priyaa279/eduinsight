import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const sourceOracle = fs.readFileSync(
  new URL("./data-quality-source-truth.test.mjs", import.meta.url),
  "utf8",
);
const sourceLoader = fs.readFileSync(
  new URL("./helpers/data-quality-context.mjs", import.meta.url),
  "utf8",
);

test("raw-source oracle is structurally isolated from production calculations", () => {
  const combined = `${sourceOracle}\n${sourceLoader}`;
  assert.doesNotMatch(combined, /from\s+["'][^"']*lib\/data-quality/);
  assert.doesNotMatch(combined, /lib\/data-quality\/rules/);
  assert.doesNotMatch(combined, /evaluateDataQuality|summarizeDataQuality/);
  assert.doesNotMatch(combined, /app\/data|data\/processed/);
  assert.match(sourceLoader, /data\/sample-university-upload/);
});
