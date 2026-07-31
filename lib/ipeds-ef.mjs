import fs from "node:fs";

const DEFAULT_SPEC = JSON.parse(
  fs.readFileSync(
    new URL(
      "../data/ipeds/specs/2025-26/fall-enrollment.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}

function toCsv(headers, rows) {
  return (
    [
      headers.join(","),
      ...rows.map((row) =>
        headers.map((header) => csvEscape(row[header])).join(","),
      ),
    ].join("\r\n") + "\r\n"
  );
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

function ageLine(isFullTime, age) {
  const bands = [
    [17, 1],
    [19, 2],
    [21, 3],
    [24, 4],
    [29, 5],
    [34, 6],
    [39, 7],
    [49, 8],
    [64, 9],
    [Infinity, 10],
  ];
  const base = bands.find(([upper]) => age <= upper)?.[1] ?? 10;
  return isFullTime ? base : base + 12;
}

function enrollmentLine(row) {
  const ft = row.isFullTime;
  if (row.level === "GR") return ft ? 11 : 25;
  if (row.isFirstTime && row.degreeSeeking) return ft ? 1 : 15;
  if (row.isTransfer && row.degreeSeeking) return ft ? 2 : 16;
  if (row.degreeSeeking) return ft ? 3 : 17;
  return ft ? 7 : 21;
}

function aggregate(rows, keys) {
  const cells = new Map();
  for (const row of rows) {
    const id = keys.map((key) => row[key]).join("|");
    const current = cells.get(id) ?? {
      ...Object.fromEntries(keys.map((key) => [key, row[key]])),
      COUNT: 0,
    };
    current.COUNT += 1;
    cells.set(id, current);
  }
  return [...cells.values()].sort((left, right) =>
    keys
      .map((key) => left[key])
      .join("|")
      .localeCompare(keys.map((key) => right[key]).join("|")),
  );
}

function keyValueLine(row, order) {
  return order.map((key) => `${key}=${row[key]}`).join(",");
}

export function buildEfPackage({
  studentTerms,
  students,
  programs,
  unitId = 999999,
  reportingTerm = DEFAULT_SPEC.reportingTerm,
  spec = DEFAULT_SPEC,
}) {
  const studentById = new Map(students.map((row) => [row.student_id, row]));
  const programById = new Map(programs.map((row) => [row.program_id, row]));
  const sourceRows = studentTerms.filter(
    (row) =>
      row.term_id === reportingTerm &&
      row.census_enrolled === "1" &&
      row.reportable === "1",
  );

  const preparedRows = sourceRows.map((termRow) => {
    const student = studentById.get(termRow.student_id);
    const program = programById.get(termRow.program_id);
    if (!student || !program) {
      return {
        sourceError: !student ? "Missing student" : "Missing program",
        StudentId: termRow.student_id,
      };
    }
    const gender = student.gender ?? "";
    const race = Number(spec.codeTables.race[student.race_ethnicity ?? ""] ?? 9);
    const sex = Number(spec.codeTables.sex[gender] ?? 3);
    const birthYear = Number(student.birth_year);
    return {
      UNITID: Number(unitId) || 999999,
      StudentId: termRow.student_id,
      level: termRow.level,
      studentLevel: spec.codeTables.studentLevel[termRow.level],
      isFullTime: termRow.attendance_status === "F",
      isFirstTime: student.entry_type === "First-time",
      isTransfer: student.entry_type === "Transfer",
      degreeSeeking: student.degree_seeking === "1",
      race,
      sex,
      age: Number(reportingTerm.slice(0, 4)) - birthYear,
      programName: program.program_name,
      cip: program.cip_code,
    };
  });
  const validPrepared = preparedRows.filter((row) => !row.sourceError);
  const knownSexRows = validPrepared.filter((row) => row.sex === 1 || row.sex === 2);

  const partA = aggregate(
    knownSexRows.map((row) => ({
      UNITID: row.UNITID,
      SURVSECT: spec.uploadCode,
      PART: "A",
      CIPCODE: "99.0000",
      LINE: enrollmentLine(row),
      RACE: row.race,
      SEX: row.sex,
    })),
    ["UNITID", "SURVSECT", "PART", "CIPCODE", "LINE", "RACE", "SEX"],
  );

  const partB = aggregate(
    knownSexRows.map((row) => ({
      UNITID: row.UNITID,
      SURVSECT: spec.uploadCode,
      PART: "B",
      LINE: ageLine(row.isFullTime, row.age),
      SLEVEL: row.studentLevel,
      SEX: row.sex,
    })),
    ["UNITID", "SURVSECT", "PART", "LINE", "SLEVEL", "SEX"],
  );

  const newNonDegreeCount = validPrepared.filter(
    (row) =>
      row.level === "UG" &&
      !row.degreeSeeking &&
      (row.isFirstTime || row.isTransfer),
  ).length;
  const partD = [
    {
      UNITID: Number(unitId) || 999999,
      SURVSECT: spec.uploadCode,
      PART: "D",
      COUNT: newNonDegreeCount,
    },
  ];

  const unknownRows = validPrepared.filter((row) => row.sex === 3);
  const partH = [
    {
      UNITID: Number(unitId) || 999999,
      SURVSECT: spec.uploadCode,
      PART: "H",
      EFSEXUG: unknownRows.filter((row) => row.level === "UG").length,
      EFSEXG: unknownRows.filter((row) => row.level === "GR").length,
    },
  ];

  const uploadRows = [
    ...partA.map((row) => ({
      row,
      order: spec.parts.A.keyOrder,
      part: "A",
    })),
    ...partB.map((row) => ({
      row,
      order: spec.parts.B.keyOrder,
      part: "B",
    })),
    ...partD.map((row) => ({
      row,
      order: spec.parts.D.keyOrder,
      part: "D",
    })),
    ...partH.map((row) => ({
      row,
      order: spec.parts.H.keyOrder,
      part: "H",
    })),
  ];
  const uploadText =
    uploadRows.map(({ row, order }) => keyValueLine(row, order)).join("\n") +
    "\n";

  const partATotal = partA.reduce((sum, row) => sum + row.COUNT, 0);
  const unknownTotal = partH[0].EFSEXUG + partH[0].EFSEXG;
  const sourceErrors = preparedRows.filter((row) => row.sourceError);
  const invalidRace = validPrepared.filter((row) => row.race < 1 || row.race > 9);
  const invalidSex = validPrepared.filter((row) => row.sex < 1 || row.sex > 3);
  const invalidLevel = validPrepared.filter(
    (row) => ![1, 3].includes(row.studentLevel),
  );
  const invalidAge = validPrepared.filter(
    (row) => !Number.isInteger(row.age) || row.age < 0 || row.age > 120,
  );
  const badCounts = uploadRows.filter(({ row }) =>
    Object.entries(row).some(
      ([key, value]) =>
        (key === "COUNT" || key.startsWith("EFSEX")) &&
        (!Number.isInteger(value) || value < 0),
    ),
  );
  const badLines = partA.filter(
    (row) => ![1, 2, 3, 7, 11, 15, 16, 17, 21, 25].includes(row.LINE),
  );

  const validations = [
    validation("EF-RACE", "RACE codes are in the valid 1–9 set", !invalidRace.length, invalidRace.length, `${invalidRace.length} invalid prepared rows`),
    validation("EF-SEX", "SEX/GenderDetail codes are in the valid 1–3 set", !invalidSex.length, invalidSex.length, `${invalidSex.length} invalid prepared rows`),
    validation("EF-LEVEL", "Student-level codes are valid", !invalidLevel.length, invalidLevel.length, `${invalidLevel.length} invalid prepared rows`),
    validation("EF-AGE", "Age values are structurally valid", !invalidAge.length, invalidAge.length, `${invalidAge.length} invalid prepared rows`),
    validation("EF-LINE", "Part A line codes are valid", !badLines.length, badLines.length, `${badLines.length} invalid cells`),
    validation("EF-COUNT", "All generated counts are nonnegative integers", !badCounts.length, badCounts.length, `${badCounts.length} invalid cells`),
    validation("EF-REFERENCE", "Every census row resolves to a student and program", !sourceErrors.length, sourceErrors.length, `${sourceErrors.length} unresolved rows`, "Reconciliation"),
    validation("EF-SOURCE", "Part A plus Part H reconciles to fall census source", partATotal + unknownTotal === validPrepared.length, Math.abs(partATotal + unknownTotal - validPrepared.length), `${partATotal} known-sex + ${unknownTotal} unknown-sex = ${validPrepared.length} prepared rows`, "Reconciliation"),
  ];

  const reviewRows = uploadRows.map(({ row, part }) => ({
    Part: part,
    ...row,
    ReviewStatus:
      part === "A" || part === "B" || part === "D" || part === "H"
        ? "Generated from governed fields"
        : "Manual review",
    Limitation:
      "This package contains EF Parts A, B, D, and H only; Parts C, E, F, and G are blocked and are not fabricated.",
  }));
  const reviewHeaders = [
    "Part",
    "UNITID",
    "SURVSECT",
    "CIPCODE",
    "LINE",
    "SLEVEL",
    "RACE",
    "SEX",
    "COUNT",
    "EFSEXUG",
    "EFSEXG",
    "ReviewStatus",
    "Limitation",
  ];

  const blockedParts = Object.entries(spec.parts)
    .filter(([, part]) => part.status === "blocked")
    .map(([code, part]) => ({
      code,
      description: part.description,
      missingFields: part.missingFields,
    }));

  return {
    specId: spec.specId,
    collectionYear: spec.collectionYear,
    verifiedAt: spec.verifiedAt,
    sourceUrl: spec.sourceUrl,
    fileStem: `${Number(unitId) || 999999}_EF_${spec.collectionYear}`,
    reportingTerm,
    unitId: Number(unitId) || 999999,
    sourceEnrollmentCount: sourceRows.length,
    preparedRowCount: validPrepared.length,
    cellCount: uploadRows.length,
    generatedParts: ["A", "B", "D", "H"],
    blockedParts,
    completeSurveyPackage: blockedParts.length === 0,
    uploadText,
    reviewCsv: toCsv(reviewHeaders, reviewRows),
    validations,
    structuralFailureCount: validations
      .filter((item) => item.category === "Structural")
      .reduce((sum, item) => sum + item.failedCount, 0),
    reconciliationFailureCount: validations
      .filter((item) => item.category === "Reconciliation")
      .reduce((sum, item) => sum + item.failedCount, 0),
    assumptions: [
      "Base Fall Enrollment cells are calculated from governed census records; supplemental parts are added only from their governed source contract.",
      "For the 2025 fall reporting year, Part A uses the all-program CIP 99.0000 row; selected-CIP reporting is not required in this odd-numbered year.",
      "Unknown sex records are excluded from Parts A/B and reported in Part H, following the 2025-26 structure.",
    ],
  };
}
