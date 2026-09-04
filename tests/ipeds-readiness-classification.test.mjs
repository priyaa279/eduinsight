import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import suite from "../app/data/ipeds-suite.generated.json" with { type: "json" };
import efArtifact from "../app/data/ipeds-ef.generated.json" with { type: "json" };
import specs from "../app/data/ipeds-specs.generated.json" with { type: "json" };

test("every generated IPEDS package declares substantive source readiness", () => {
  const allowed = new Set(["source_backed", "modeled_demo", "source_gap"]);
  for (const [code, item] of Object.entries(suite.packages)) {
    assert.ok(allowed.has(item.sourceReadiness), `${code} source readiness`);
    assert.ok(item.sourceReadinessLabel);
    assert.ok(item.sourceReadinessDetail);
  }
});

test("modeled packages are not equivalent to source-backed Completions", () => {
  assert.equal(suite.packages.C.sourceReadiness, "source_backed");
  for (const code of ["EF", "E12", "SFA", "GR", "GR200", "ADM", "HR", "CST"]) {
    assert.equal(suite.packages[code].sourceReadiness, "modeled_demo", code);
  }
  assert.equal(suite.packages.OM.sourceReadiness, "source_gap");
  assert.equal(suite.packages.F.sourceReadiness, "source_gap");
});

test("EF generated package and versioned specification agree on modeled supplemental parts", () => {
  const ef = suite.packages.EF;
  assert.equal(ef.sourceReadiness, "modeled_demo");
  assert.equal(ef.sourceReadinessLabel, "Modeled demo package");
  assert.equal(ef.completeSurveyPackage, true);
  assert.deepEqual(ef.blockedParts, []);
  assert.deepEqual(ef.modeledParts.map((part) => part.code), ["C", "E", "F", "G"]);
  for (const part of ["C", "E", "F", "G"]) {
    assert.ok(ef.generatedParts.includes(part));
    assert.equal(specs.specifications.EF.parts[part].status, "modeled_demo");
  }
  assert.deepEqual(efArtifact, ef);
});

test("approval readiness separates structural completeness from source readiness", () => {
  assert.equal(suite.packages.C.completeSurveyPackage, false);
  assert.equal(suite.packages.C.sourceReadiness, "source_backed");
  assert.ok(suite.packages.C.completenessFailureCount > 0);
  assert.equal(suite.packages.EF.completeSurveyPackage, true);
  assert.equal(suite.packages.EF.sourceReadiness, "modeled_demo");
  for (const code of ["OM", "F"]) {
    assert.equal(suite.packages[code].completeSurveyPackage, false, code);
    assert.equal(suite.packages[code].sourceReadiness, "source_gap", code);
    assert.ok(suite.packages[code].blockedParts.length > 0, code);
  }
});

test("UI and API enforce source-backed approval while disclosing modeled EF sections", async () => {
  const [page, approvalRoute] = await Promise.all([
    fs.readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    fs.readFile(
      new URL("../app/api/ipeds/approvals/route.ts", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(page, /packageSourceBacked/);
  assert.match(page, /Modeled sections:/);
  assert.match(page, /generated from modeled demonstration inputs/);
  assert.match(
    approvalRoute,
    /approvalMatchesCurrentArtifact/,
  );
});
