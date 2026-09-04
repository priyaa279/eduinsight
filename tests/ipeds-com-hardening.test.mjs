import assert from "node:assert/strict";
import test from "node:test";
import { buildComPackage, validateComArtifactRows, validateComPartCoverage } from "../lib/ipeds-com.mjs";
import { approvalMatchesCurrentArtifact } from "../lib/ipeds-approval-store.mjs";

const student = { student_id: "S1", birth_year: "2000", gender: "Woman", race_ethnicity: "White" };
const program = { program_id: "P1", program_name: "BS Computer Science", degree_level: "Undergraduate", cip_code: "11.0701" };
const completion = { completion_id: "C1", student_id: "S1", program_id: "P1", award_date: "2025-05-15", reporting_year: "2025" };

function build(overrides = {}) {
  return buildComPackage({ completions: [completion], students: [student], programs: [program], ...overrides });
}
function check(result, id) {
  return result.validations.find((item) => item.id === id);
}

test("all applicable rows include PART and required part fields", () => {
  const result = build();
  for (const line of result.uploadText.trim().split("\n")) assert.match(line, /,PART=[ACDE],/);
  assert.equal(check(result, "COM-PART-FIELDS").status, "Passed");
});

test("Part A and C accept only SEX 1 or 2 and unknown sex routes to Part E", () => {
  const result = build({ students: [{ ...student, gender: "Unknown" }] });
  assert.doesNotMatch(result.uploadText, /PART=A,.*SEX=3/);
  assert.doesNotMatch(result.uploadText, /PART=C,.*SEX=3/);
  assert.match(result.uploadText, /PART=E,CSEXUG=1,CSEXG=0/);
  assert.equal(check(result, "COM-PART-CODES").status, "Passed");
});

test("an unaccounted required part is detected generically", () => {
  const coverage = validateComPartCoverage({ rows: [{ PART: "A" }], blockedParts: [{ code: "B" }, { code: "C" }, { code: "E" }] });
  assert.deepEqual(coverage.unaccountedParts, ["D"]);
});

test("missing governed Part B and second-major evidence block completeness and approval", () => {
  const result = build();
  assert.equal(result.completeSurveyPackage, false);
  assert.ok(result.blockedParts.some((part) => part.code === "B"));
  assert.ok(result.blockedParts.some((part) => part.code === "A-second-major"));
  assert.equal(approvalMatchesCurrentArtifact({ specId: result.specId, collectionYear: result.collectionYear, uploadText: result.uploadText }, { ...result, sourceReadiness: "source_backed" }), false);
});

test("source and prepared totals reconcile at award-record grain", () => {
  const result = build();
  assert.equal(result.sourceAwardCount, 1);
  assert.equal(result.preparedRowCount, 1);
  assert.equal(result.reconciliationFailureCount, 0);
});

test("multiple awards for one student remain valid award-grain records", () => {
  const result = build({ completions: [completion, { ...completion, completion_id: "C2" }] });
  assert.equal(result.sourceAwardCount, 2);
  assert.equal(result.sourceDistinctCompleterCount, 1);
  assert.equal(result.preparedRowCount, 2);
  assert.equal(result.reconciliationFailureCount, 0);
});

test("duplicate logical artifact cells are rejected", () => {
  const row = { UNITID: 999999, SURVSECT: "COM", PART: "A", MAJORNUM: 1, CIPCODE: "11.0701", AWLEVEL: 5, RACE: 7, SEX: 2, COUNT: 1 };
  assert.equal(validateComArtifactRows([row, { ...row }]).duplicateKeys.length, 1);
});

test("missing reporting_year fails closed", () => {
  const bad = { ...completion };
  Reflect.deleteProperty(bad, "reporting_year");
  const result = build({ completions: [bad] });
  assert.equal(result.completeSurveyPackage, false);
  assert.equal(check(result, "COM-SOURCE-SCHEMA").status, "Failed");
  assert.equal(check(result, "COM-SOURCE-POPULATION").status, "Failed");
});

test("a missing required source column fails closed", () => {
  const bad = { ...completion };
  Reflect.deleteProperty(bad, "award_date");
  const result = build({ completions: [bad] });
  assert.equal(result.completeSurveyPackage, false);
  assert.equal(check(result, "COM-SOURCE-SCHEMA").status, "Failed");
});

test("a malformed CIP produces structured source validation failure", () => {
  const result = build({ programs: [{ ...program, cip_code: "CS" }] });
  assert.equal(check(result, "COM-SOURCE-FORMAT").status, "Failed");
  assert.equal(result.completeSurveyPackage, false);
});

test("a malformed or missing award level produces structured failure", () => {
  const result = build({ programs: [{ ...program, degree_level: "" }] });
  assert.equal(check(result, "COM-SOURCE-FORMAT").status, "Failed");
  assert.match(check(result, "COM-SOURCE-FORMAT").detail, /degree level/i);
});

test("a malformed numeric birth year produces structured failure", () => {
  const result = build({ students: [{ ...student, birth_year: "unknown" }] });
  assert.equal(check(result, "COM-SOURCE-FORMAT").status, "Failed");
  assert.match(check(result, "COM-SOURCE-FORMAT").detail, /birth_year/);
});

test("a malformed award date produces structured failure", () => {
  const result = build({ completions: [{ ...completion, award_date: "May" }] });
  assert.equal(check(result, "COM-SOURCE-FORMAT").status, "Failed");
  assert.match(check(result, "COM-SOURCE-FORMAT").detail, /award_date/);
});

test("unresolved student and program references block readiness", () => {
  const missingStudent = build({ students: [] });
  const missingProgram = build({ programs: [] });
  assert.ok(missingStudent.unresolvedReferenceCount > 0);
  assert.ok(missingProgram.unresolvedReferenceCount > 0);
  assert.equal(missingStudent.completeSurveyPackage, false);
  assert.equal(missingProgram.completeSurveyPackage, false);
});

test("duplicate completion identifiers fail source identity validation", () => {
  const result = build({ completions: [completion, { ...completion }] });
  assert.equal(check(result, "COM-SOURCE-ID").status, "Failed");
  assert.equal(result.duplicateCompletionIdCount, 1);
});

test("unverified empty population fails while explicitly certified zero remains distinguishable", () => {
  const missing = build({ completions: [] });
  const certifiedZero = build({ completions: [], allowZeroReportable: true });
  assert.equal(check(missing, "COM-SOURCE-POPULATION").status, "Failed");
  assert.equal(check(certifiedZero, "COM-SOURCE-POPULATION").status, "Passed");
  assert.equal(certifiedZero.completeSurveyPackage, false);
});

test("distance education and second majors are unavailable rather than invented", () => {
  const result = build();
  assert.doesNotMatch(result.uploadText, /DistanceED=/);
  assert.doesNotMatch(result.reviewCsv, /conservative default/i);
  assert.match(result.reviewCsv, /no governed CIP\/award-level distance-education evidence/);
  assert.ok(result.assumptions.some((item) => /Second-major evidence is not modeled/.test(item)));
});
