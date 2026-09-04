import fs from "node:fs";

const DEFAULT_SPEC = JSON.parse(
  fs.readFileSync(new URL("../data/ipeds/specs/2025-26/completions.json", import.meta.url), "utf8"),
);
const OFFICIAL_LAYOUT = JSON.parse(
  fs.readFileSync(new URL("../data/ipeds/specs/2025-26/official/c.json", import.meta.url), "utf8").replace(/^\uFEFF/, ""),
);
const RACE_CODES = new Map(Object.entries(DEFAULT_SPEC.codeTables.race));
const SEX_CODES = new Map(Object.entries(DEFAULT_SPEC.codeTables.sex));
RACE_CODES.set("Nonresident", 1);
RACE_CODES.set("Hispanic or Latino", 2);
const RACE_FIELDS = new Map([[1, "CRACE17"], [2, "CRACE41"], [3, "CRACE42"], [4, "CRACE43"], [5, "CRACE44"], [6, "CRACE45"], [7, "CRACE46"], [8, "CRACE47"], [9, "CRACE23"]]);

export const VALID_AWLEVEL_CODES = new Set(DEFAULT_SPEC.codeTables.awardLevel.map(String));

const SOURCE_CONTRACTS = {
  completions: ["completion_id", "student_id", "program_id", "award_date", "reporting_year"],
  students: ["student_id", "birth_year", "gender", "race_ethnicity"],
  programs: ["program_id", "program_name", "degree_level", "cip_code"],
};
const PART_CONTRACTS = new Map(OFFICIAL_LAYOUT.keyValueParts.map((part) => {
  const code = part.title.match(/^Part\s+([^:]+)/i)?.[1]?.trim();
  return [code, { code, title: part.title, fields: part.keyValueFields.map((field) => field.name.trim()) }];
}));
const REQUIRED_FIELDS = {
  A: ["UNITID", "SURVSECT", "PART", "MAJORNUM", "CIPCODE", "AWLEVEL", "RACE", "SEX", "COUNT"],
  B: ["UNITID", "SURVSECT", "PART", "MAJORNUM", "CIPCODE", "AWLEVEL", "DistanceED"],
  C: ["UNITID", "SURVSECT", "PART", "RACE", "SEX", "COUNT"],
  D: ["UNITID", "SURVSECT", "PART", "CTLEVEL"],
  E: ["UNITID", "SURVSECT", "PART", "CSEXUG", "CSEXG"],
};
const LOGICAL_KEY_FIELDS = {
  A: ["PART", "MAJORNUM", "CIPCODE", "AWLEVEL", "RACE", "SEX"],
  B: ["PART", "MAJORNUM", "CIPCODE", "AWLEVEL"],
  C: ["PART", "RACE", "SEX"],
  D: ["PART", "CTLEVEL"],
  E: ["PART"],
};

function validation(id, label, passed, affected, detail, category = "Structural") {
  return { id, label, status: passed ? "Passed" : "Failed", passedCount: passed ? 1 : 0, failedCount: passed ? 0 : Math.max(affected || 0, 1), affectedCount: affected, detail, category };
}
function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
function toCsv(headers, rows) {
  return [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\r\n") + "\r\n";
}
function requiredColumnIssues(rows, requiredColumns, sourceName) {
  if (!Array.isArray(rows)) return [`${sourceName} is not an array`];
  if (rows.length === 0) return [];
  return requiredColumns.flatMap((column) => {
    const affected = rows.filter((row) => !Object.hasOwn(row ?? {}, column) || row[column] === null || row[column] === undefined).length;
    return affected ? [`${sourceName}.${column}: ${affected} missing`] : [];
  });
}
function awardLevel(program) {
  const name = String(program?.program_name ?? "").trim();
  const degreeLevel = String(program?.degree_level ?? "").trim();
  if (!name || !degreeLevel) return null;
  if (/^phd\b/i.test(name)) return 17;
  if (degreeLevel === "Graduate") return 7;
  if (degreeLevel === "Undergraduate") return 5;
  return null;
}
function completerLevel(awlevel) {
  if (["1a", "1b", "2"].includes(String(awlevel))) return 2;
  if (["3", "4"].includes(String(awlevel))) return 3;
  if (String(awlevel) === "5") return 5;
  if (String(awlevel) === "6") return 6;
  if (String(awlevel) === "7") return 7;
  if (String(awlevel) === "8") return 8;
  if (["17", "18", "19"].includes(String(awlevel))) return 9;
  return null;
}
function raceCode(value) {
  const text = String(value ?? "").trim();
  return text ? (RACE_CODES.get(text) ?? null) : 9;
}
function sexCode(value) {
  const text = String(value ?? "").trim();
  return text ? (SEX_CODES.get(text) ?? null) : 3;
}
function validDate(value) {
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(text));
}
function addCount(map, key, seed) {
  const current = map.get(key) ?? { ...seed, COUNT: 0 };
  current.COUNT += 1;
  map.set(key, current);
}
function serializeRow(row) {
  const orderedFields = PART_CONTRACTS.get(String(row.PART))?.fields ?? Object.keys(row);
  return orderedFields
    .filter((field) => row[field] !== undefined && row[field] !== null && row[field] !== "")
    .filter((field) => !(row.PART === "D" && !["UNITID", "SURVSECT", "PART", "CTLEVEL"].includes(field) && Number(row[field]) === 0))
    .map((field) => `${field}=${row[field]}`)
    .join(",");
}
function logicalKey(row) {
  return (LOGICAL_KEY_FIELDS[row.PART] ?? ["PART"]).map((field) => `${field}=${row[field]}`).join("|");
}
function validateGeneratedRows(rows) {
  const missingFields = [];
  const unknownFields = [];
  const partCodeFailures = [];
  const malformedValues = [];
  const duplicateKeys = [];
  const seenKeys = new Set();
  for (const row of rows) {
    const part = String(row.PART ?? "");
    const contract = PART_CONTRACTS.get(part);
    if (!contract) {
      partCodeFailures.push(`${part || "missing"}: unknown part`);
      continue;
    }
    for (const field of REQUIRED_FIELDS[part] ?? []) {
      if (row[field] === undefined || row[field] === null || row[field] === "") missingFields.push(`${part}:${field}`);
    }
    for (const field of Object.keys(row)) if (!contract.fields.includes(field)) unknownFields.push(`${part}:${field}`);
    if (row.UNITID === undefined || !/^\d+$/.test(String(row.UNITID))) malformedValues.push(`${part}:UNITID`);
    if (row.SURVSECT !== "COM") malformedValues.push(`${part}:SURVSECT`);
    if (part === "A") {
      if (![1, 2].includes(Number(row.SEX))) partCodeFailures.push(`A:SEX=${row.SEX}`);
      if (!Number.isInteger(Number(row.RACE)) || Number(row.RACE) < 1 || Number(row.RACE) > 10) partCodeFailures.push(`A:RACE=${row.RACE}`);
      if (!VALID_AWLEVEL_CODES.has(String(row.AWLEVEL))) partCodeFailures.push(`A:AWLEVEL=${row.AWLEVEL}`);
      if (!/^\d{2}\.\d{4}$/.test(String(row.CIPCODE))) malformedValues.push(`A:CIPCODE=${row.CIPCODE}`);
    }
    if (part === "C") {
      if (![1, 2].includes(Number(row.SEX))) partCodeFailures.push(`C:SEX=${row.SEX}`);
      if (!Number.isInteger(Number(row.RACE)) || Number(row.RACE) < 1 || Number(row.RACE) > 10) partCodeFailures.push(`C:RACE=${row.RACE}`);
    }
    if (part === "D" && (!Number.isInteger(Number(row.CTLEVEL)) || Number(row.CTLEVEL) < 2 || Number(row.CTLEVEL) > 9)) partCodeFailures.push(`D:CTLEVEL=${row.CTLEVEL}`);
    for (const [field, value] of Object.entries(row)) {
      if (/COUNT|CSEX|CRACE|AGE/i.test(field) && (!Number.isInteger(Number(value)) || Number(value) < 0)) malformedValues.push(`${part}:${field}=${value}`);
    }
    const key = logicalKey(row);
    if (seenKeys.has(key)) duplicateKeys.push(key);
    seenKeys.add(key);
  }
  return { missingFields, unknownFields, partCodeFailures, malformedValues, duplicateKeys };
}

export function validateComArtifactRows(rows) {
  return validateGeneratedRows(rows);
}

export function validateComPartCoverage({
  rows,
  blockedParts = [],
  notApplicableParts = [],
}) {
  const generatedParts = [...new Set(rows.map((row) => String(row.PART)))];
  const accounted = new Set([
    ...generatedParts,
    ...blockedParts.map((part) => String(part.code)),
    ...notApplicableParts.map((part) => String(part.code)),
  ]);
  return {
    generatedParts,
    unaccountedParts: [...PART_CONTRACTS.keys()].filter(
      (part) => !accounted.has(part),
    ),
  };
}

function buildPartRows(validPrepared, unitId, reportingYear) {
  const partA = new Map();
  for (const item of validPrepared.filter((row) => [1, 2].includes(row.Sex))) {
    const key = [item.MajorNumber, item.MajorCip, item.DegreeLevel, item.RaceEthnicity, item.Sex].join("|");
    addCount(partA, key, { UNITID: unitId, SURVSECT: "COM", PART: "A", MAJORNUM: item.MajorNumber, CIPCODE: item.MajorCip, AWLEVEL: item.DegreeLevel, RACE: item.RaceEthnicity, SEX: item.Sex });
  }
  const uniqueCompleters = new Map();
  for (const row of validPrepared) {
    const existing = uniqueCompleters.get(row.StudentId);
    if (!existing || Number(row.DegreeLevel) > Number(existing.DegreeLevel)) uniqueCompleters.set(row.StudentId, row);
  }
  const partC = new Map();
  for (const item of [...uniqueCompleters.values()].filter((row) => [1, 2].includes(row.Sex))) {
    const key = [item.RaceEthnicity, item.Sex].join("|");
    addCount(partC, key, { UNITID: unitId, SURVSECT: "COM", PART: "C", RACE: item.RaceEthnicity, SEX: item.Sex });
  }
  const unknownCompleters = [...uniqueCompleters.values()].filter((row) => row.Sex === 3);
  const partE = unknownCompleters.length ? [{ UNITID: unitId, SURVSECT: "COM", PART: "E", CSEXUG: unknownCompleters.filter((row) => row.DegreeLevel === 5).length, CSEXG: unknownCompleters.filter((row) => row.DegreeLevel !== 5).length }] : [];
  const partDGroups = new Map();
  for (const item of [...uniqueCompleters.values()]) {
    const level = completerLevel(item.DegreeLevel);
    if (!level) continue;
    const group = partDGroups.get(level) ?? [];
    group.push(item);
    partDGroups.set(level, group);
  }
  const partD = [...partDGroups.entries()].map(([level, group]) => {
    const knownSex = group.filter((row) => [1, 2].includes(row.Sex));
    const row = { UNITID: unitId, SURVSECT: "COM", PART: "D", CTLEVEL: level, CRACE15: knownSex.filter((item) => item.Sex === 1).length, CRACE16: knownSex.filter((item) => item.Sex === 2).length };
    for (const [race, field] of RACE_FIELDS) row[field] = knownSex.filter((item) => item.RaceEthnicity === race).length;
    row.AGE1 = group.filter((item) => reportingYear - item.BirthYear < 18).length;
    row.AGE2 = group.filter((item) => { const age = reportingYear - item.BirthYear; return age >= 18 && age <= 24; }).length;
    row.AGE3 = group.filter((item) => { const age = reportingYear - item.BirthYear; return age >= 25 && age <= 39; }).length;
    row.AGE4 = group.filter((item) => reportingYear - item.BirthYear >= 40).length;
    row.AGE5 = group.filter((item) => !Number.isInteger(item.BirthYear)).length;
    return row;
  });
  return { rows: [...partA.values(), ...partC.values(), ...partE, ...partD], uniqueCompleters, partCounts: { A: partA.size, B: 0, C: partC.size, D: partD.length, E: partE.length } };
}

export function buildComPackage({ completions, students, programs, unitId = 999999, reportingYear = 2025, spec = DEFAULT_SPEC, allowZeroReportable = false }) {
  const safeCompletions = Array.isArray(completions) ? completions : [];
  const safeStudents = Array.isArray(students) ? students : [];
  const safePrograms = Array.isArray(programs) ? programs : [];
  const normalizedUnitId = Number(unitId) || 999999;
  const schemaIssues = [
    ...requiredColumnIssues(completions, SOURCE_CONTRACTS.completions, "completions"),
    ...requiredColumnIssues(students, SOURCE_CONTRACTS.students, "students"),
    ...requiredColumnIssues(programs, SOURCE_CONTRACTS.programs, "programs"),
  ];
  const duplicateCompletionIds = [];
  const seenCompletionIds = new Set();
  for (const row of safeCompletions) {
    const id = String(row?.completion_id ?? "").trim();
    if (!id) continue;
    if (seenCompletionIds.has(id)) duplicateCompletionIds.push(id);
    seenCompletionIds.add(id);
  }
  const studentById = new Map(safeStudents.map((row) => [String(row.student_id ?? "").trim(), row]));
  const programById = new Map(safePrograms.map((row) => [String(row.program_id ?? "").trim(), row]));
  const malformedSource = [];
  const sourceRows = [];
  for (const completion of safeCompletions) {
    const sourceId = String(completion?.completion_id ?? "").trim() || "unknown";
    const yearText = String(completion?.reporting_year ?? "").trim();
    if (!/^\d{4}$/.test(yearText)) {
      malformedSource.push(`${sourceId}: invalid reporting_year`);
      continue;
    }
    if (Number(yearText) === Number(reportingYear)) sourceRows.push(completion);
  }
  const preparedRows = sourceRows.map((completion) => {
    const sourceId = String(completion.completion_id ?? "").trim() || "unknown";
    const studentId = String(completion.student_id ?? "").trim();
    const programId = String(completion.program_id ?? "").trim();
    const student = studentById.get(studentId);
    const program = programById.get(programId);
    const errors = [];
    if (!student) errors.push("Missing student reference");
    if (!program) errors.push("Missing program reference");
    if (!validDate(completion.award_date)) errors.push("Malformed award_date");
    if (student) {
      if (raceCode(student.race_ethnicity) === null) errors.push("Unmapped race/ethnicity");
      if (sexCode(student.gender) === null) errors.push("Unmapped sex value");
      const birthYear = Number(student.birth_year);
      if (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > reportingYear) errors.push("Malformed birth_year");
    }
    if (program) {
      if (!/^\d{2}\.\d{4}$/.test(String(program.cip_code ?? ""))) errors.push("Malformed CIP code");
      if (!awardLevel(program)) errors.push("Missing or unsupported degree level");
    }
    if (errors.length) return { sourceError: errors.join("; "), sourceId, completion };
    return { Unitid: normalizedUnitId, CompletionId: sourceId, StudentId: studentId, RaceEthnicity: raceCode(student.race_ethnicity), Sex: sexCode(student.gender), DegreeLevel: awardLevel(program), CompleterLevel: completerLevel(awardLevel(program)), MajorNumber: 1, MajorCip: String(program.cip_code), ProgramName: program.program_name, BirthYear: Number(student.birth_year) };
  });
  const sourceErrors = preparedRows.filter((row) => row.sourceError);
  const validPrepared = preparedRows.filter((row) => !row.sourceError);
  const { rows, uniqueCompleters, partCounts } = buildPartRows(validPrepared, normalizedUnitId, reportingYear);
  const generatedValidation = validateGeneratedRows(rows);
  const generatedParts = [...new Set(rows.map((row) => row.PART))].sort();
  const blockedParts = [
    { code: "B", description: "Distance-education availability by CIP and award level is required by the captured layout but is not present in the governed synthetic source.", missingFields: ["governed distance-education program evidence"] },
    { code: "A-second-major", description: "Second-major reporting cannot be evaluated from the current first-major-only completion source.", missingFields: ["governed second-major completion evidence"] },
  ];
  const requiredParts = [...PART_CONTRACTS.keys()];
  const notApplicableParts = [];
  const { unaccountedParts } = validateComPartCoverage({
    rows,
    blockedParts,
    notApplicableParts,
  });
  const emptyPopulationFailure = sourceRows.length === 0 && !allowZeroReportable;
  const knownSexAwardCount = validPrepared.filter((row) => [1, 2].includes(row.Sex)).length;
  const partATotal = rows.filter((row) => row.PART === "A").reduce((sum, row) => sum + row.COUNT, 0);
  const knownSexCompleters = [...uniqueCompleters.values()].filter((row) => [1, 2].includes(row.Sex)).length;
  const partCTotal = rows.filter((row) => row.PART === "C").reduce((sum, row) => sum + row.COUNT, 0);
  const unknownSexCompleters = [...uniqueCompleters.values()].filter((row) => row.Sex === 3).length;
  const partETotal = rows.filter((row) => row.PART === "E").reduce((sum, row) => sum + row.CSEXUG + row.CSEXG, 0);
  const validations = [
    validation("COM-SOURCE-SCHEMA", "Required completion, student, and program source fields are present", schemaIssues.length === 0, schemaIssues.length, schemaIssues.length ? schemaIssues.join("; ") : "Required source schema is present", "Source"),
    validation("COM-SOURCE-FORMAT", "Required source values use valid dates, years, codes, and references", malformedSource.length === 0 && sourceErrors.length === 0, malformedSource.length + sourceErrors.length, malformedSource.length || sourceErrors.length ? [...malformedSource, ...sourceErrors.map((row) => `${row.sourceId}: ${row.sourceError}`)].slice(0, 12).join("; ") : `${sourceRows.length} reportable source rows passed source validation`, "Source"),
    validation("COM-SOURCE-ID", "Completion identifiers are present and unique", duplicateCompletionIds.length === 0 && sourceRows.every((row) => String(row.completion_id ?? "").trim()), duplicateCompletionIds.length + sourceRows.filter((row) => !String(row.completion_id ?? "").trim()).length, duplicateCompletionIds.length ? `${duplicateCompletionIds.length} duplicate completion identifiers` : "Completion identifiers are unique", "Source"),
    validation("COM-SOURCE-POPULATION", "A reportable source population exists or is explicitly certified as zero", !emptyPopulationFailure, emptyPopulationFailure ? 1 : 0, emptyPopulationFailure ? "No reportable source rows were produced; an unverified empty result cannot become a complete package" : sourceRows.length ? `${sourceRows.length} reportable award/completion records` : "Zero reportable records were explicitly allowed by the caller", "Source"),
    validation("COM-PART-FIELDS", "Every generated row contains the required fields for its official part", generatedValidation.missingFields.length === 0, generatedValidation.missingFields.length, generatedValidation.missingFields.length ? generatedValidation.missingFields.join(", ") : `${rows.length} rows contain their part-specific required identifiers and values`),
    validation("COM-PART-CODES", "Generated codes are valid for their specific official part", generatedValidation.partCodeFailures.length === 0, generatedValidation.partCodeFailures.length, generatedValidation.partCodeFailures.length ? generatedValidation.partCodeFailures.join(", ") : "Part A/C use SEX 1–2; award, race, and completer-level codes are valid"),
    validation("COM-PART-FIELDS-OFFICIAL", "Generated fields belong to their captured official part layout", generatedValidation.unknownFields.length === 0, generatedValidation.unknownFields.length, generatedValidation.unknownFields.length ? generatedValidation.unknownFields.join(", ") : "All generated fields occur in their captured official part"),
    validation("COM-VALUE", "Generated numeric and CIP values are well formed", generatedValidation.malformedValues.length === 0, generatedValidation.malformedValues.length, generatedValidation.malformedValues.length ? generatedValidation.malformedValues.join(", ") : "Generated values are well formed"),
    validation("COM-DUPLICATE-CELL", "Generated multipart output contains no duplicate logical cells", generatedValidation.duplicateKeys.length === 0, generatedValidation.duplicateKeys.length, generatedValidation.duplicateKeys.length ? generatedValidation.duplicateKeys.join(", ") : `${rows.length} unique logical rows`),
    validation("COM-REQUIRED-PARTS", "Every captured official part is generated or explicitly blocked by missing evidence", unaccountedParts.length === 0, unaccountedParts.length, unaccountedParts.length ? `Unaccounted parts: ${unaccountedParts.join(", ")}` : `Generated ${generatedParts.join(", ")}; Part B is explicitly blocked`, "Completeness"),
    validation("COM-PACKAGE-EVIDENCE", "All evidence required for a complete keyholder-review package is available", blockedParts.length === 0, blockedParts.length, blockedParts.map((item) => `${item.code}: ${item.description}`).join("; "), "Completeness"),
    validation("COM-PREPARED", "Prepared award records reconcile to valid reportable source awards", validPrepared.length === sourceRows.length, Math.abs(validPrepared.length - sourceRows.length), `${validPrepared.length} prepared award records; ${sourceRows.length} reportable source award records`, "Reconciliation"),
    validation("COM-PART-A", "Part A counts reconcile to prepared awards with reportable binary sex codes", partATotal === knownSexAwardCount, Math.abs(partATotal - knownSexAwardCount), `${partATotal} Part A awards; ${knownSexAwardCount} comparable prepared awards`, "Reconciliation"),
    validation("COM-PART-C", "Part C counts reconcile to distinct known-sex completers", partCTotal === knownSexCompleters, Math.abs(partCTotal - knownSexCompleters), `${partCTotal} Part C completers; ${knownSexCompleters} comparable distinct completers`, "Reconciliation"),
    validation("COM-PART-E", "Part E unknown-sex counts reconcile to distinct unknown-sex completers", partETotal === unknownSexCompleters, Math.abs(partETotal - unknownSexCompleters), `${partETotal} Part E completers; ${unknownSexCompleters} comparable distinct completers`, "Reconciliation"),
  ];
  const structuralFailureCount = validations.filter((item) => ["Structural", "Source"].includes(item.category)).reduce((sum, item) => sum + item.failedCount, 0);
  const reconciliationFailureCount = validations.filter((item) => item.category === "Reconciliation").reduce((sum, item) => sum + item.failedCount, 0);
  const completenessFailureCount = validations.filter((item) => item.category === "Completeness").reduce((sum, item) => sum + item.failedCount, 0);
  const completeSurveyPackage = structuralFailureCount === 0 && reconciliationFailureCount === 0 && completenessFailureCount === 0;
  const uploadText = rows.length ? `${rows.sort((a, b) => logicalKey(a).localeCompare(logicalKey(b))).map(serializeRow).join("\n")}\n` : "";
  const reviewRows = rows.map((row) => ({ ...row, EvidenceStatus: row.PART === "A" ? "Source-derived synthetic award record" : "Source-derived synthetic completer aggregate", DistanceEducationStatus: "Unavailable — no governed CIP/award-level distance-education evidence", SecondMajorStatus: "Unavailable — current source models first-major completion evidence only" }));
  const reviewHeaders = [...new Set(reviewRows.flatMap((row) => Object.keys(row)))];
  return {
    specId: spec.specId,
    collectionYear: spec.collectionYear,
    verifiedAt: spec.verifiedAt,
    sourceUrl: spec.sourceUrl,
    fileStem: `${normalizedUnitId}_COM_${spec.collectionYear}`,
    reportingYear,
    unitId: normalizedUnitId,
    sourceAwardCount: sourceRows.length,
    sourceCompleterCount: uniqueCompleters.size,
    sourceDistinctCompleterCount: uniqueCompleters.size,
    preparedRowCount: validPrepared.length,
    cellCount: rows.length,
    partCellCounts: partCounts,
    generatedParts,
    requiredParts,
    blockedParts,
    notApplicableParts,
    completeSurveyPackage,
    uploadText,
    reviewCsv: toCsv(reviewHeaders, reviewRows),
    validations,
    structuralFailureCount,
    reconciliationFailureCount,
    completenessFailureCount,
    unresolvedReferenceCount: sourceErrors.filter((row) => /reference/i.test(row.sourceError)).length,
    duplicateCompletionIdCount: duplicateCompletionIds.length,
    duplicateLogicalCellCount: generatedValidation.duplicateKeys.length,
    assumptions: [
      "Distance education is not modeled per CIP/award level; Part B remains unavailable and no DistanceED value is invented.",
      "Second-major evidence is not modeled; generated Part A rows use MajorNumber=1 and keyholder-review readiness remains blocked.",
      "Unknown-sex source records are excluded from Parts A/C and reported as distinct completers in Part E, following the captured multipart layout.",
    ],
  };
}
