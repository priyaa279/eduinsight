import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { buildEfPackage } from "../lib/ipeds-ef.mjs";
import { loadIpedsSpecs } from "../lib/ipeds-specs.mjs";

function parseCsv(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const headers = header.split(",");
  return lines.map((line) =>
    Object.fromEntries(
      line.split(",").map((value, index) => [headers[index], value]),
    ),
  );
}

async function readCsv(name) {
  return parseCsv(
    await fs.readFile(
      new URL(`../data/sample-university-upload/${name}`, import.meta.url),
      "utf8",
    ),
  );
}

test("versioned survey catalog contains the 12 live 2025-26 components", () => {
  const specs = loadIpedsSpecs();
  assert.equal(specs.collectionYear, "2025-26");
  assert.equal(specs.surveys.length, 12);
  assert.deepEqual(
    specs.surveys.map((survey) => survey.code),
    ["IC", "C", "E12", "CST", "ADM", "GR", "GR200", "OM", "SFA", "EF", "F", "HR"],
  );
  assert.equal(specs.retired[0].code, "AL");
});

test("EF package produces governed key-value parts and exact source reconciliation", async () => {
  const [studentTerms, students, programs] = await Promise.all([
    readCsv("student_terms.csv"),
    readCsv("students.csv"),
    readCsv("programs.csv"),
  ]);
  const result = buildEfPackage({
    studentTerms,
    students,
    programs,
    unitId: 999999,
    reportingTerm: "2025FA",
  });
  assert.deepEqual(result.generatedParts, ["A", "B", "D", "H"]);
  assert.deepEqual(result.blockedParts.map((part) => part.code), ["C", "E", "F", "G"]);
  assert.equal(result.completeSurveyPackage, false);
  assert.equal(result.structuralFailureCount, 0);
  assert.equal(result.reconciliationFailureCount, 0);
  assert.match(
    result.uploadText,
    /^UNITID=999999,SURVSECT=EF1,PART=A,CIPCODE=99\.0000,LINE=\d+,RACE=\d,SEX=[12],COUNT=\d+/,
  );
  assert.match(result.uploadText, /SURVSECT=EF1,PART=H,EFSEXUG=\d+,EFSEXG=\d+/);
  assert.match(result.reviewCsv, /Parts C, E, F, and G are blocked/);
});

test("SFA source model exposes Pell-recipient separately from Pell eligibility", async () => {
  const rows = await readCsv("financial_aid.csv");
  assert.ok(rows.length > 0);
  assert.ok("pell_eligible" in rows[0]);
  assert.ok("pell_recipient" in rows[0]);
  assert.ok(rows.some((row) => row.pell_eligible === "1" && row.pell_recipient === "0"));
});
