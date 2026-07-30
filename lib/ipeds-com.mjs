import fs from "node:fs";

const DEFAULT_SPEC = JSON.parse(
  fs.readFileSync(
    new URL("../data/ipeds/specs/2025-26/completions.json", import.meta.url),
    "utf8",
  ),
);

const RACE_CODES = new Map(Object.entries(DEFAULT_SPEC.codeTables.race));
const SEX_CODES = new Map(Object.entries(DEFAULT_SPEC.codeTables.sex));

export const VALID_AWLEVEL_CODES = new Set(
  DEFAULT_SPEC.codeTables.awardLevel.map(String),
);

function awardLevel(program) {
  if (/^phd\b/i.test(program.program_name)) return 17;
  if (program.degree_level === "Graduate") return 7;
  if (program.degree_level === "Undergraduate") return 5;
  throw new Error(`No governed AWLEVEL mapping for ${program.program_name}.`);
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(headers, rows) {
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\r\n") + "\r\n";
}

function validation(id, label, passed, affected, detail, category = "Structural") {
  return {
    id,
    label,
    status: passed ? "Passed" : "Failed",
    passedCount: passed ? 1 : 0,
    failedCount: passed ? 0 : affected || 1,
    affectedCount: affected,
    detail,
    category,
  };
}

export function buildComPackage({
  completions,
  students,
  programs,
  unitId = 999999,
  reportingYear = 2025,
  spec = DEFAULT_SPEC,
}) {
  const studentById = new Map(students.map((row) => [row.student_id, row]));
  const programById = new Map(programs.map((row) => [row.program_id, row]));
  const sourceRows = completions.filter(
    (row) => Number(row.reporting_year) === Number(reportingYear),
  );
  const preparedRows = sourceRows.map((completion) => {
    const student = studentById.get(completion.student_id);
    const program = programById.get(completion.program_id);
    if (!student || !program) {
      return {
        sourceError: !student ? "Missing student" : "Missing program",
        completion,
      };
    }
    return {
      Unitid: Number(unitId) || 999999,
      StudentId: completion.student_id,
      RaceEthnicity: RACE_CODES.get(student.race_ethnicity ?? "") ?? 9,
      Sex: SEX_CODES.get(student.gender ?? "") ?? 3,
      GenderDetail: SEX_CODES.get(student.gender ?? "") ?? 3,
      DegreeLevel: awardLevel(program),
      MajorNumber: 1,
      MajorCip: String(program.cip_code),
      DistanceEd: 2,
      DistanceEd31: null,
      DistanceEd32: null,
      ProgramName: program.program_name,
    };
  });
  const validPrepared = preparedRows.filter((row) => !row.sourceError);
  const cells = new Map();
  for (const row of validPrepared) {
    const key = [
      row.MajorNumber,
      row.MajorCip,
      row.DegreeLevel,
      row.RaceEthnicity,
      row.Sex,
    ].join("|");
    const current = cells.get(key) ?? {
      majorNumber: row.MajorNumber,
      cip: row.MajorCip,
      awlevel: row.DegreeLevel,
      race: row.RaceEthnicity,
      sex: row.Sex,
      count: 0,
    };
    current.count += 1;
    cells.set(key, current);
  }
  const aggregatedCells = [...cells.values()].sort((a, b) =>
    [a.majorNumber, a.cip, a.awlevel, a.race, a.sex]
      .join("|")
      .localeCompare([b.majorNumber, b.cip, b.awlevel, b.race, b.sex].join("|")),
  );
  const uploadText =
    aggregatedCells
      .map(
        (cell) =>
          `UNITID=${Number(unitId) || 999999},SURVSECT=COM,MAJORNUM=${cell.majorNumber},CIPCODE=${cell.cip},AWLEVEL=${cell.awlevel},RACE=${cell.race},SEX=${cell.sex},COUNT=${cell.count}`,
      )
      .join("\n") + "\n";
  const raceLabels = new Map([...RACE_CODES].map(([label, code]) => [code, label || "Race/ethnicity unknown"]));
  const sexLabels = new Map([[1, "Men"], [2, "Women"], [3, "Unknown sex"]]);
  const awardLabels = new Map([[5, "Bachelor's"], [7, "Master's"], [17, "Doctor's — research/scholarship"]]);
  const reviewRows = aggregatedCells.map((cell) => ({
    MajorNumber: cell.majorNumber,
    CIP: cell.cip,
    AwardLevel: cell.awlevel,
    AwardLevelLabel: awardLabels.get(cell.awlevel) ?? "Review",
    RaceEthnicityCode: cell.race,
    RaceEthnicityLabel: raceLabels.get(cell.race) ?? "Race/ethnicity unknown",
    SexCode: cell.sex,
    SexLabel: sexLabels.get(cell.sex) ?? "Unknown sex",
    Count: cell.count,
    DistanceEd: 2,
    DistanceEd_review_needed:
      "YES — conservative default; confirm distance-education status per CIP/award level",
    MajorNumber_review:
      "MajorNumber=1; second majors are not modeled in the current governed source",
  }));
  const reviewCsv = toCsv(Object.keys(reviewRows[0] ?? {
    MajorNumber: "", CIP: "", AwardLevel: "", AwardLevelLabel: "",
    RaceEthnicityCode: "", RaceEthnicityLabel: "", SexCode: "", SexLabel: "",
    Count: "", DistanceEd: "", DistanceEd_review_needed: "", MajorNumber_review: "",
  }), reviewRows);

  const badRace = aggregatedCells.filter((cell) => cell.race < 1 || cell.race > 9);
  const badSex = aggregatedCells.filter((cell) => cell.sex < 1 || cell.sex > 3);
  const badAward = aggregatedCells.filter((cell) => !VALID_AWLEVEL_CODES.has(String(cell.awlevel)));
  const negative = aggregatedCells.filter((cell) => cell.count < 0);
  const malformedCip = aggregatedCells.filter((cell) => !/^\d{2}\.\d{4}$/.test(cell.cip));
  const cellTotal = aggregatedCells.reduce((sum, cell) => sum + cell.count, 0);
  const distinctCompleters = new Set(validPrepared.map((row) => row.StudentId)).size;
  const sourceErrors = preparedRows.filter((row) => row.sourceError);
  const validations = [
    validation("COM-RACE", "RACE codes are in the valid 1–9 set", !badRace.length, badRace.length, `${badRace.length} invalid cells`),
    validation("COM-SEX", "SEX codes are in the valid 1–3 set", !badSex.length, badSex.length, `${badSex.length} invalid cells`),
    validation("COM-AWLEVEL", "AWLEVEL uses the official valid set", !badAward.length, badAward.length, `${badAward.length} invalid cells`),
    validation("COM-COUNT", "Counts are nonnegative integers", !negative.length, negative.length, `${negative.length} invalid cells`),
    validation("COM-CIP", "CIP codes use numeric xx.xxxx format", !malformedCip.length, malformedCip.length, `${malformedCip.length} malformed cells`),
    validation("COM-REFERENCE", "Every source row resolves to a student and program", !sourceErrors.length, sourceErrors.length, `${sourceErrors.length} unresolved source rows`, "Reconciliation"),
    validation("COM-PREPARED", "Output total reconciles to prepared rows", cellTotal === validPrepared.length, Math.abs(cellTotal - validPrepared.length), `${cellTotal} output counts; ${validPrepared.length} prepared rows`, "Reconciliation"),
    validation("COM-SOURCE", "Output total reconciles to distinct source completers", cellTotal === distinctCompleters, Math.abs(cellTotal - distinctCompleters), `${cellTotal} output counts; ${distinctCompleters} distinct completers`, "Reconciliation"),
  ];
  return {
    specId: spec.specId,
    collectionYear: spec.collectionYear,
    verifiedAt: spec.verifiedAt,
    sourceUrl: spec.sourceUrl,
    fileStem: `${Number(unitId) || 999999}_COM_${spec.collectionYear}`,
    reportingYear,
    unitId: Number(unitId) || 999999,
    sourceCompleterCount: distinctCompleters,
    preparedRowCount: validPrepared.length,
    cellCount: aggregatedCells.length,
    uploadText,
    reviewCsv,
    validations,
    structuralFailureCount: validations
      .filter((item) => item.category === "Structural")
      .reduce((sum, item) => sum + item.failedCount, 0),
    reconciliationFailureCount: validations
      .filter((item) => item.category === "Reconciliation")
      .reduce((sum, item) => sum + item.failedCount, 0),
    assumptions: [
      "Distance education is not modeled per CIP/award level. Every cell is conservatively coded DistanceEd=2 and flagged for manual review.",
      "Second majors are not modeled. MajorNumber is always 1.",
    ],
  };
}
