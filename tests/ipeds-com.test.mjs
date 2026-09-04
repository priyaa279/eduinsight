import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const packageData = JSON.parse(
  await readFile(new URL("../app/data/ipeds-com.generated.json", import.meta.url)),
);

test("COM upload is newline-terminated multipart key-value data", () => {
  assert.ok(packageData.uploadText.endsWith("\n"));
  for (const line of packageData.uploadText.trimEnd().split("\n")) {
    assert.match(line, /^UNITID=\d{6},SURVSECT=COM,PART=[ACDE],/);
  }
});

test("COM generated rows obey the captured part-specific sex contract", () => {
  const lines = packageData.uploadText.trimEnd().split("\n");
  assert.ok(lines.some((line) => line.includes("PART=A")));
  assert.ok(lines.some((line) => line.includes("PART=C")));
  assert.ok(lines.some((line) => line.includes("PART=D")));
  assert.ok(lines.some((line) => line.includes("PART=E")));
  assert.ok(lines.filter((line) => /PART=(?:A|C),/.test(line)).every((line) => /SEX=(?:1|2)(?:,|$)/.test(line)));
  assert.ok(lines.every((line) => !/PART=A,.*SEX=3(?:,|$)/.test(line)));
});

test("COM source awards reconcile at award grain while package evidence remains incomplete", () => {
  assert.equal(packageData.structuralFailureCount, 0);
  assert.equal(packageData.reconciliationFailureCount, 0);
  assert.equal(packageData.preparedRowCount, packageData.sourceAwardCount);
  assert.equal(packageData.sourceAwardCount, 1056);
  assert.equal(packageData.completeSurveyPackage, false);
  assert.ok(packageData.completenessFailureCount > 0);
});

test("review CSV discloses unavailable distance-ed and second-major evidence", () => {
  assert.match(packageData.reviewCsv, /DistanceEducationStatus/);
  assert.match(packageData.reviewCsv, /Unavailable/);
  assert.doesNotMatch(packageData.reviewCsv, /conservative default/i);
  assert.match(packageData.assumptions.join(" "), /Second-major evidence is not modeled/);
});
