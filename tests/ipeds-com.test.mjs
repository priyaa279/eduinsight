import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const packageData = JSON.parse(
  await readFile(new URL("../app/data/ipeds-com.generated.json", import.meta.url)),
);

test("COM upload is newline-terminated key-value data with the required key order", () => {
  assert.ok(packageData.uploadText.endsWith("\n"));
  for (const line of packageData.uploadText.trimEnd().split("\n")) {
    assert.match(
      line,
      /^UNITID=\d{6},SURVSECT=COM,MAJORNUM=1,CIPCODE=\d{2}\.\d{4},AWLEVEL=(?:1a|1b|2|3|4|5|6|7|8|17|18|19),RACE=[1-9],SEX=[1-3],COUNT=\d+$/,
    );
  }
});

test("COM output reconciles exactly to the governed source population", () => {
  assert.equal(packageData.structuralFailureCount, 0);
  assert.equal(packageData.reconciliationFailureCount, 0);
  assert.equal(packageData.preparedRowCount, packageData.sourceCompleterCount);
});

test("review CSV discloses distance-ed and second-major assumptions", () => {
  assert.match(packageData.reviewCsv, /DistanceEd_review_needed/);
  assert.match(packageData.reviewCsv, /conservative default/);
  assert.match(packageData.reviewCsv, /second majors are not modeled/);
});
