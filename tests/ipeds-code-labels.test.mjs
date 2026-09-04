import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import {
  buildCipVarianceDisplay,
  createIpedsProgramDisplayCatalog,
  resolveAwardLevelDisplay,
  resolveCipDisplay,
  resolveRaceEthnicityDisplay,
  resolveResidencyDisplay,
} from "../lib/ipeds-code-labels.mjs";
import commandCenter from "../app/data/command-center.generated.json" with {
  type: "json",
};
import comPackage from "../app/data/ipeds-com.generated.json" with {
  type: "json",
};

const catalog = commandCenter.referenceCatalogs.programs;
const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const approvalRoute = fs.readFileSync(
  new URL("../app/api/ipeds/approvals/route.ts", import.meta.url),
  "utf8",
);

test("known Computer Science CIP resolves to a readable primary label with official code support", () => {
  assert.deepEqual(resolveCipDisplay("11.0701", catalog), {
    family: "CIP",
    code: "11.0701",
    label: "Computer Science",
    primaryLabel: "Computer Science",
    supportingLabel: "Computer Science (CIP 11.0701)",
    mapped: true,
  });
});

test("a second governed CIP uses the same reusable resolver", () => {
  const display = buildCipVarianceDisplay("52.1301", catalog);
  assert.equal(
    display.prompt,
    "Business Analytics completions increased beyond the expected historical range.",
  );
  assert.match(display.supportingDetail, /Business Analytics \(CIP 52\.1301\)/);
});

test("unknown CIP preserves the official code without inventing a label", () => {
  const display = buildCipVarianceDisplay("99.9999", catalog);
  assert.equal(
    display.prompt,
    "CIP 99.9999 completions increased beyond the expected historical range.",
  );
  assert.equal(display.codeReference.mapped, false);
  assert.match(display.supportingDetail, /official code is retained/);
});

test("unknown award-level raw code is preserved without an invented label", () => {
  assert.deepEqual(resolveAwardLevelDisplay("99"), {
    family: "AWLEVEL", code: "99", label: "99", supportingLabel: "AWLEVEL 99", mapped: false,
  });
});

test("unknown race/ethnicity raw code is preserved without an invented label", () => {
  assert.deepEqual(resolveRaceEthnicityDisplay("77"), {
    family: "RACE", code: "77", label: "77", supportingLabel: "RACE 77", mapped: false,
  });
});

test("unknown residency raw code is preserved without an invented label", () => {
  assert.deepEqual(resolveResidencyDisplay("X"), {
    family: "RESIDENCY", code: "X", label: "X", supportingLabel: "RESIDENCY X", mapped: false,
  });
});

test("catalog is derived generically from governed program records", () => {
  const derived = createIpedsProgramDisplayCatalog([
    {
      program_id: "PX",
      program_name: "BS Environmental Science",
      degree_level: "Undergraduate",
      cip_code: "03.0104",
    },
  ]);
  assert.deepEqual(derived, [
    {
      programId: "PX",
      programName: "BS Environmental Science",
      degreeLevel: "Undergraduate",
      cipCode: "03.0104",
      fieldOfStudyName: "Environmental Science",
    },
  ]);
});

test("display mapping cannot mutate generated IPEDS package data", () => {
  const before = JSON.stringify(comPackage);
  buildCipVarianceDisplay("11.0701", catalog);
  assert.equal(JSON.stringify(comPackage), before);
  assert.match(comPackage.uploadText, /CIPCODE=11\.0701/);
});

test("institutional explanation UI renders readable labels with code provenance", () => {
  assert.match(page, /buildCipVarianceDisplay/);
  assert.match(page, /className="variance-reference"/);
  assert.doesNotMatch(
    page,
    /CIP 11\.0701 increased outside the expected historical range/,
  );
});

test("persisted approval explanations render verbatim without resolver rewriting", () => {
  const auditDrawer = page.slice(
    page.indexOf("function AuditDrawer("),
    page.indexOf("export default function EduInsightApp"),
  );
  assert.match(approvalRoute, /explanations: parseExplanations\(row\.explanationsJson\)/);
  assert.match(auditDrawer, /Object\.entries\(approval\.explanations\)/);
  assert.match(auditDrawer, /<small>\{explanation\}<\/small>/);
  assert.doesNotMatch(auditDrawer, /buildCipVarianceDisplay|resolveCipDisplay/);
});

test("display labeling leaves the approved IPEDS artifact fingerprint unchanged", () => {
  const before = crypto
    .createHash("sha256")
    .update(comPackage.uploadText)
    .digest("hex");
  resolveCipDisplay("11.0701", catalog);
  const after = crypto.createHash("sha256").update(comPackage.uploadText).digest("hex");
  assert.equal(after, before);
});
