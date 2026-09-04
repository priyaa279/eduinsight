import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const suite = JSON.parse(
  fs.readFileSync(
    new URL("../app/data/ipeds-suite.generated.json", import.meta.url),
    "utf8",
  ),
);

test("every official NCES 2025-26 import layout has a generated package", () => {
  assert.deepEqual(
    Object.keys(suite.packages).sort(),
    suite.officialImportLayoutCodes.sort(),
  );
  assert.equal(suite.generatorCount, 11);
  assert.match(suite.nonImportable.IC, /no import layout/i);
  assert.match(suite.retired.AL, /discontinued/i);
});

test("the ingest pipeline materializes a text file and review CSV for every layout", () => {
  for (const pkg of Object.values(suite.packages)) {
    const outputDir = new URL("../data/processed/ipeds/2025-26/", import.meta.url);
    assert.equal(
      fs.readFileSync(new URL(`${pkg.fileStem}.txt`, outputDir), "utf8"),
      pkg.uploadText,
    );
    assert.equal(
      fs.readFileSync(new URL(`${pkg.fileStem}_review.csv`, outputDir), "utf8"),
      pkg.reviewCsv,
    );
  }
});

test("complete packages have zero structural and reconciliation failures", () => {
  for (const [code, pkg] of Object.entries(suite.packages)) {
    assert.ok(pkg.validations.length >= 8, `${code} must expose at least the common validation contract`);
    assert.equal(pkg.structuralFailureCount, 0, `${code} structural failures`);
    assert.equal(pkg.reconciliationFailureCount, 0, `${code} reconciliation failures`);
    assert.match(pkg.uploadText, /UNITID=999999/);
    assert.match(pkg.uploadText, /SURVSECT=/);
    assert.ok(pkg.reviewCsv.length > 20, `${code} must include a review CSV`);
  }
});

test("complete packages and governed partial files are explicitly distinguished", () => {
  assert.equal(suite.packages.C.completeSurveyPackage, false);
  assert.equal(suite.packages.C.sourceReadiness, "source_backed");
  assert.ok(suite.packages.C.blockedParts.some((part) => part.code === "B"));
  assert.equal(suite.packages.EF.completeSurveyPackage, true);
  assert.deepEqual(
    suite.packages.EF.generatedParts.sort(),
    ["A", "B", "C", "D", "E", "F", "G", "H"].sort(),
  );
  assert.equal(suite.packages.OM.completeSurveyPackage, false);
  assert.match(
    JSON.stringify(suite.packages.OM.blockedParts),
    /National Student Clearinghouse/i,
  );
  assert.match(suite.packages.OM.uploadText, /ENROLLED_UNKNOWN=/);
  for (const code of ["ADM", "CST", "HR"]) {
    assert.equal(suite.packages[code].completeSurveyPackage, true, `${code} must be a complete applicable package`);
    assert.equal(suite.packages[code].blockedParts.length, 0, `${code} must have no applicable blocker`);
  }
  assert.deepEqual(suite.packages.CST.notApplicableParts.map((part) => part.code), ["F"]);
  assert.match(suite.packages.ADM.uploadText, /PART=F/);
  assert.match(suite.packages.HR.uploadText, /PART=G2/);
  assert.match(suite.packages.HR.uploadText, /PART=H1/);
  for (const code of ["F", "OM"]) {
    assert.equal(suite.packages[code].completeSurveyPackage, false, `${code} must remain partial`);
    assert.ok(suite.packages[code].blockedParts.length > 0, `${code} must explain its blockers`);
  }
});

test("higher-risk synthetic domains carry visible submission caveats", () => {
  assert.match(suite.packages.ADM.caveats.join(" "), /derived from enrolled headcount/i);
  assert.match(suite.packages.F.caveats.join(" "), /general-ledger/i);
});
