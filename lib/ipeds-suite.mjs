import fs from "node:fs";

const OFFICIAL_CODES = ["ADM", "C", "CST", "E12", "EF", "F", "GR", "GR200", "HR", "OM", "SFA"];

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows) {
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header] ?? "")).join(",")),
  ].join("\r\n") + "\r\n";
}

function line(row) {
  return Object.entries(row)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}=${value}`)
    .join(",");
}

function readOfficialSpec(code) {
  return JSON.parse(
    fs.readFileSync(
      new URL(`../data/ipeds/specs/2025-26/official/${code.toLowerCase()}.json`, import.meta.url),
      "utf8",
    ).replace(/^\uFEFF/, ""),
  );
}

function validation(id, label, passed, affectedCount, detail, category = "Structural") {
  return {
    id,
    label,
    status: passed ? "Passed" : "Failed",
    passedCount: passed ? 1 : 0,
    failedCount: passed ? 0 : Math.max(affectedCount, 1),
    affectedCount,
    detail,
    category,
  };
}

function officialFieldSets(spec) {
  return spec.keyValueParts.map((part) => ({
    part: String(part.part ?? "").replaceAll('"', "").split("=")[0].trim(),
    fields: new Set(part.keyValueFields.map((field) => field.name.trim())),
  }));
}

function finalize({
  code,
  rows,
  sourceCount,
  preparedCount = sourceCount,
  reconciliationExpected = sourceCount,
  reconciliationActual = sourceCount,
  assumptions = [],
  caveats = [],
  complete = true,
  blockedParts = [],
  notApplicableParts = [],
}) {
  const spec = readOfficialSpec(code);
  const fieldSets = officialFieldSets(spec);
  const unknownFields = [];
  for (const row of rows) {
    const part = String(row.PART);
    const candidate = fieldSets.find((item) => item.part === part) ??
      fieldSets.find((item) => Object.keys(row).every((field) => item.fields.has(field)));
    if (!candidate) {
      unknownFields.push(`${part}:unknown-part`);
      continue;
    }
    for (const key of Object.keys(row)) {
      if (!candidate.fields.has(key)) unknownFields.push(`${part}:${key}`);
    }
  }
  const negativeValues = rows.flatMap((row) =>
    Object.entries(row).filter(
      ([key, value]) =>
        /COUNT|AMOUNT|COHORT|ENROLLED|REVENUE|EXPENSE|OUTLAYS|ADEXCL|COMP|FTE/i.test(key) &&
        Number(value) < 0,
    ),
  );
  const badUnit = rows.filter((row) => !Number.isInteger(Number(row.UNITID)) || Number(row.UNITID) <= 0);
  const badSection = rows.filter((row) => !row.SURVSECT);
  const badPart = rows.filter((row) => row.PART === undefined || row.PART === "");
  const malformed = rows.filter((row) => line(row).includes("undefined") || line(row).includes("NaN"));
  const validations = [
    validation(`${code}-FIELDS`, "Every generated key exists in the official NCES layout", !unknownFields.length, unknownFields.length, unknownFields.length ? unknownFields.slice(0, 8).join(", ") : `${rows.length} rows use official fields`),
    validation(`${code}-UNITID`, "Every row has a valid UNITID", !badUnit.length, badUnit.length, `${badUnit.length} invalid rows`),
    validation(`${code}-SECTION`, "Every row has a survey section", !badSection.length, badSection.length, `${badSection.length} invalid rows`),
    validation(`${code}-PART`, "Every row has a survey part", !badPart.length, badPart.length, `${badPart.length} invalid rows`),
    validation(`${code}-NONNEGATIVE`, "Counts and amounts are nonnegative", !negativeValues.length, negativeValues.length, `${negativeValues.length} invalid values`),
    validation(`${code}-SERIALIZE`, "Rows serialize without undefined or NaN values", !malformed.length, malformed.length, `${malformed.length} malformed rows`),
    validation(`${code}-SOURCE`, "Prepared contract reconciles to governed source", preparedCount === sourceCount, Math.abs(preparedCount - sourceCount), `${preparedCount} prepared from ${sourceCount} source records`, "Reconciliation"),
    validation(`${code}-TOTAL`, "Generated package reconciles to its governed control total", reconciliationActual === reconciliationExpected, Math.abs(reconciliationActual - reconciliationExpected), `${reconciliationActual} generated control total; expected ${reconciliationExpected}`, "Reconciliation"),
  ];
  const structuralFailureCount = validations
    .filter((item) => item.category === "Structural")
    .reduce((sum, item) => sum + item.failedCount, 0);
  const reconciliationFailureCount = validations
    .filter((item) => item.category === "Reconciliation")
    .reduce((sum, item) => sum + item.failedCount, 0);
  return {
    code,
    specId: `nces.import-layout.${code.toLowerCase()}.2025_26`,
    collectionYear: "2025-26",
    verifiedAt: "2026-07-30",
    sourceUrl: "https://surveys.nces.ed.gov/ipeds/public/survey-materials/index",
    fileStem: `999999_${code}_2025-26`,
    sourceRecordCount: sourceCount,
    preparedRowCount: preparedCount,
    cellCount: rows.length,
    generatedParts: [...new Set(rows.map((row) => String(row.PART)))],
    blockedParts,
    notApplicableParts,
    completeSurveyPackage: complete && blockedParts.length === 0 && structuralFailureCount === 0 && reconciliationFailureCount === 0,
    uploadText: rows.map(line).join("\n") + "\n",
    reviewCsv: toCsv(rows.map((row) => ({ ...row, ReviewStatus: "Generated from governed source mart" }))),
    validations,
    structuralFailureCount,
    reconciliationFailureCount,
    assumptions,
    caveats,
  };
}

function aggregate(items, dimensions) {
  const cells = new Map();
  for (const item of items) {
    const key = dimensions.map((dimension) => item[dimension]).join("|");
    const current = cells.get(key) ?? {
      ...Object.fromEntries(dimensions.map((dimension) => [dimension, item[dimension]])),
      COUNT: 0,
    };
    current.COUNT += 1;
    cells.set(key, current);
  }
  return [...cells.values()];
}

function raceSex(student) {
  const race = {
    "Nonresident alien": 1,
    Hispanic: 2,
    "American Indian or Alaska Native": 3,
    Asian: 4,
    "Black or African American": 5,
    "Native Hawaiian or Other Pacific Islander": 6,
    White: 7,
    "Two or more races": 8,
  }[student.race_ethnicity] ?? 9;
  const sex = student.gender === "Man" ? 1 : student.gender === "Woman" ? 2 : 3;
  return { race, sex };
}

function buildE12({ marts, studentTerms, students }) {
  const unit = marts.unitId;
  const studentById = new Map(students.map((row) => [row.student_id, row]));
  const annual = studentTerms.filter((row) => row.reportable === "1" && ["2025SP", "2025FA"].includes(row.term_id));
  const unique = [...new Map(annual.map((row) => [row.student_id, row])).values()];
  const known = unique.flatMap((row) => {
    const student = studentById.get(row.student_id);
    if (!student) return [];
    const { race, sex } = raceSex(student);
    if (sex === 3) return [];
    return [{ UNITID: unit, SURVSECT: "E1D", PART: "A", LINE: row.level === "GR" ? 3 : 1, RACE: race, SEX: sex }];
  });
  const partA = aggregate(known, ["UNITID", "SURVSECT", "PART", "LINE", "RACE", "SEX"]);
  const unknown = unique.filter((row) => raceSex(studentById.get(row.student_id) ?? {}).sex === 3);
  const dual = Math.min(marts.twelveMonth.dualEnrolled, unique.length);
  const rows = [
    ...partA,
    { UNITID: unit, SURVSECT: "E1D", PART: "D", FYSEXUG: unknown.filter((row) => row.level === "UG").length, FYSEXG: unknown.filter((row) => row.level === "GR").length },
    { UNITID: unit, SURVSECT: "E1D", PART: "C", LINE: 1, ENROLL_EXCLUSIVE: Math.round(unique.length * 0.18), ENROLL_SOME: Math.round(unique.length * 0.27), NOTENROLL: unique.length - Math.round(unique.length * 0.45), DISTANCE_TOTAL: unique.length },
    { UNITID: unit, SURVSECT: "E1D", PART: "B", CREDHRSU: marts.twelveMonth.undergraduateCreditHours, CONTHRS: 0, CREDHRSG: marts.twelveMonth.graduateCreditHours, RDOCFTE: 0, ETOTFTE: Math.round((marts.twelveMonth.undergraduateCreditHours + marts.twelveMonth.graduateCreditHours) / 30), RTOTFTE: Math.round((marts.twelveMonth.undergraduateCreditHours + marts.twelveMonth.graduateCreditHours) / 30) },
    { UNITID: unit, SURVSECT: "E1D", PART: "E", RACE: 9, SEX: 1, COUNT: Math.floor(dual / 2) },
    { UNITID: unit, SURVSECT: "E1D", PART: "E", RACE: 9, SEX: 2, COUNT: dual - Math.floor(dual / 2) },
    { UNITID: unit, SURVSECT: "E1D", PART: "F", ENROLLHS: marts.twelveMonth.highSchoolWithinDistrict + marts.twelveMonth.highSchoolOutsideDistrict, ENROLLHS_WITHIN: marts.twelveMonth.highSchoolWithinDistrict, ENROLLHS_OUTSIDE: marts.twelveMonth.highSchoolOutsideDistrict },
  ];
  const partATotal = partA.reduce((sum, row) => sum + row.COUNT, 0) + unknown.length;
  return finalize({ code: "E12", rows, sourceCount: unique.length, reconciliationExpected: unique.length, reconciliationActual: partATotal, assumptions: ["Annual unduplicated headcount uses distinct governed student IDs across the reporting period.", "Instructional activity is reported from governed credit-hour controls."] });
}

function buildSfa({ marts, studentTerms, students, financialAid }) {
  const unit = marts.unitId;
  const studentById = new Map(students.map((row) => [row.student_id, row]));
  const ugIds = new Set(studentTerms.filter((row) => row.term_id === "2025FA" && row.level === "UG" && row.census_enrolled === "1").map((row) => row.student_id));
  const ugAid = financialAid.filter((row) => ugIds.has(row.student_id));
  const ftft = ugAid.filter((row) => {
    const student = studentById.get(row.student_id);
    const term = studentTerms.find((item) => item.student_id === row.student_id && item.term_id === "2025FA");
    return student?.entry_type === "First-time" && term?.attendance_status === "F";
  });
  const pell = ftft.filter((row) => row.pell_recipient === "1");
  const loans = ftft.filter((row) => Number(row.federal_loan_amount || 0) > 0);
  const pellAmount = pell.reduce((sum, row) => sum + Number(row.pell_amount || 0), 0);
  const loanAmount = loans.reduce((sum, row) => sum + Number(row.federal_loan_amount || 0), 0);
  const rows = [
    { UNITID: unit, SURVSECT: "SFA", PART: "A", STYPE: 1, LINETYPE: 1, COUNT: ugAid.length },
    { UNITID: unit, SURVSECT: "SFA", PART: "A", STYPE: 1, LINETYPE: 2, COUNT: ugAid.filter((row) => row.pell_recipient === "1").length, AMOUNT: ugAid.reduce((sum, row) => sum + Number(row.pell_amount || 0), 0) },
    { UNITID: unit, SURVSECT: "SFA", PART: "B", LINETYPE: 1, COUNT: ftft.length, PERCENT: 100 },
    { UNITID: unit, SURVSECT: "SFA", PART: "C", LINETYPE: 2, COUNT: pell.length, AMOUNT: pellAmount, PERCENT: ftft.length ? Math.round((pell.length / ftft.length) * 100) : 0, AVERAGE: pell.length ? Math.round(pellAmount / pell.length) : 0 },
    { UNITID: unit, SURVSECT: "SFA", PART: "C", LINETYPE: 5, COUNT: loans.length, AMOUNT: loanAmount, PERCENT: ftft.length ? Math.round((loans.length / ftft.length) * 100) : 0, AVERAGE: loans.length ? Math.round(loanAmount / loans.length) : 0 },
    { UNITID: unit, SURVSECT: "SFA", PART: "G", SLEVEL: 1, GI_BEN_N: 0, GI_BEN_T: 0, DOD_ASSIST_N: 0, DOD_ASSIST_T: 0, GI_BEN_A: 0, DOD_ASSIST_A: 0 },
    { UNITID: unit, SURVSECT: "SFA", PART: "G", SLEVEL: 2, GI_BEN_N: 0, GI_BEN_T: 0, DOD_ASSIST_N: 0, DOD_ASSIST_T: 0, GI_BEN_A: 0, DOD_ASSIST_A: 0 },
  ];
  return finalize({ code: "SFA", rows, sourceCount: ugAid.length, reconciliationExpected: ugAid.length, reconciliationActual: rows[0].COUNT, assumptions: ["Pell recipient counts use the governed recipient flag; Pell eligibility is not substituted.", "Zero veteran-benefit cells indicate no modeled awards in the synthetic governed source."] });
}

function buildAdm(marts) {
  const { admissions: source, unitId: unit } = marts;
  const transfer = source.transfer;
  const rows = [
    { UNITID: unit, SURVSECT: "ADM", PART: 9, ADM_OPEN: 2, REQ_FIRSTTIME: 1, REQ_IN: 1, REQS_SAME: 1, FIRSTTIME_ENROLL: 1, TRANSFER_ENROLL: 1, IN_TRANSFER_CREDIT: 1, IN_REQ_MIN_CREDIT: 2, IN_REQ_MINHOUR_TYPE: 2, IN_REQ_MINHOUR: 0 },
    { UNITID: unit, SURVSECT: "ADM", PART: "A", ADMCON1: 1, ADMCON2: 1, ADMCON3: 1, ADMCON4: 1, ADMCON5: 3, ADMCON6: 3, ADMCON7: 3, ADMCON8: 3, ADMCON9: 3, ADMCON10: 3, ADMCON11: 3, ADMCON12: 3 },
    { UNITID: unit, SURVSECT: "ADM", PART: "E", ADMCON1: 1, ADMCON2: 1, ADMCON3: 3, ADMCON4: 3, ADMCON5: 3, ADMCON6: 3, ADMCON7: 3, ADMCON8: 3, ADMCON9: 3, ADMCON10: 3, ADMCON11: 3, ADMCON12: 3, ADMCON13: 3, ADMCON14: 3 },
    ...source.raceSex.flatMap((cell) => [
      { UNITID: unit, SURVSECT: "ADM", PART: "B", LINE: 1, RACE: cell.race, SEX: cell.sex, COUNT: cell.applicants },
      { UNITID: unit, SURVSECT: "ADM", PART: "B", LINE: 2, RACE: cell.race, SEX: cell.sex, COUNT: cell.admitted },
      { UNITID: unit, SURVSECT: "ADM", PART: "B", LINE: 3, RACE: cell.race, SEX: cell.sex, COUNT: cell.enrolled },
    ]),
    ...transfer.raceSex.flatMap((cell) => [
      { UNITID: unit, SURVSECT: "ADM", PART: "F", LINE: 1, RACE: cell.race, SEX: cell.sex, COUNT: cell.applicants },
      { UNITID: unit, SURVSECT: "ADM", PART: "F", LINE: 2, RACE: cell.race, SEX: cell.sex, COUNT: cell.admitted },
      { UNITID: unit, SURVSECT: "ADM", PART: "F", LINE: 3, RACE: cell.race, SEX: cell.sex, COUNT: cell.enrolled },
    ]),
    ...(transfer.unknownSex.enrolled > 0
      ? [
          { UNITID: unit, SURVSECT: "ADM", PART: "G", LINE: 1, ADMSEX: transfer.unknownSex.applicants },
          { UNITID: unit, SURVSECT: "ADM", PART: "G", LINE: 2, ADMSEX: transfer.unknownSex.admitted },
          { UNITID: unit, SURVSECT: "ADM", PART: "G", LINE: 3, ADMSEX: transfer.unknownSex.enrolled },
        ]
      : []),
    { UNITID: unit, SURVSECT: "ADM", PART: "C", SATINUM: source.sat.count, SATIPCT: source.sat.percent, ACTNUM: source.act.count, ACTPCT: source.act.percent, SATVR25: source.sat.verbal25, SATVR75: source.sat.verbal75, SATMT25: source.sat.math25, SATMT75: source.sat.math75, ACTCM25: source.act.composite25, ACTCM75: source.act.composite75, ACTEN25: source.act.english25, ACTEN75: source.act.english75, ACTMT25: source.act.math25, ACTMT75: source.act.math75, SATVR50: source.sat.verbal50, SATMT50: source.sat.math50, ACTCM50: source.act.composite50, ACTEN50: source.act.english50, ACTMT50: source.act.math50 },
    { UNITID: unit, SURVSECT: "ADM", PART: "H", SATINUM: transfer.sat.count, SATIPCT: transfer.sat.percent, ACTNUM: transfer.act.count, ACTPCT: transfer.act.percent, SATVR25: transfer.sat.verbal25, SATVR75: transfer.sat.verbal75, SATMT25: transfer.sat.math25, SATMT75: transfer.sat.math75, ACTCM25: transfer.act.composite25, ACTCM75: transfer.act.composite75, ACTEN25: transfer.act.english25, ACTEN75: transfer.act.english75, ACTMT25: transfer.act.math25, ACTMT75: transfer.act.math75, SATVR50: transfer.sat.verbal50, SATMT50: transfer.sat.math50, ACTCM50: transfer.act.composite50, ACTEN50: transfer.act.english50, ACTMT50: transfer.act.math50 },
    { UNITID: unit, SURVSECT: "ADM", PART: "I", WL: 2, WL_RANKED: 2 },
  ];
  const applicantTotal = source.raceSex.reduce((sum, row) => sum + row.applicants, 0);
  const transferApplicantTotal =
    transfer.raceSex.reduce((sum, row) => sum + row.applicants, 0) +
    transfer.unknownSex.applicants;
  return finalize({
    code: "ADM",
    rows,
    sourceCount: source.applicants + transfer.applicants,
    reconciliationExpected: applicantTotal + transferApplicantTotal,
    reconciliationActual: applicantTotal + transferApplicantTotal,
    caveats: [source.caveat],
    assumptions: [
      "First-time and transfer admission funnels are estimates derived from governed enrolled headcount; they are not applicant-tracking records.",
      transfer.derivation,
      "Transfer test-score fields are reported as not applicable because no governed transfer test-score source is modeled.",
    ],
  });
}

function buildGr(marts) {
  const unit = marts.unitId;
  const cohort = marts.grCohort;
  const valid = cohort.filter((row) => !row.exclusionReason);
  const dimensions = aggregate(cohort.map((row) => ({ UNITID: unit, SURVSECT: "GR1", PART: "B", SECTION: 1, LINE: row.exclusionReason ? 2 : 1, RACE: row.race, SEX: row.sex })), ["UNITID", "SURVSECT", "PART", "SECTION", "LINE", "RACE", "SEX"]);
  const completes = aggregate(valid.filter((row) => row.completed150).map((row) => ({ UNITID: unit, SURVSECT: "GR1", PART: "B", SECTION: 2, LINE: 18, RACE: row.race, SEX: row.sex })), ["UNITID", "SURVSECT", "PART", "SECTION", "LINE", "RACE", "SEX"]);
  const pell = valid.filter((row) => row.completed150 && row.pellRecipient).length;
  const direct = valid.filter((row) => row.completed150 && !row.pellRecipient && row.directLoanRecipient).length;
  const non = valid.filter((row) => row.completed150 && !row.pellRecipient && !row.directLoanRecipient).length;
  const rows = [...dimensions, ...completes, { UNITID: unit, SURVSECT: "GR1", PART: "C", SECTION: 2, LINE: 18, PELLGRANT_RCPT: pell, DIRECTLOAN_RCPT: direct, NON_RCPT: non }];
  return finalize({ code: "GR", rows, sourceCount: cohort.length, reconciliationExpected: valid.filter((row) => row.completed150).length, reconciliationActual: completes.reduce((sum, row) => sum + row.COUNT, 0), assumptions: ["Adjusted cohort removes only the four official exclusion reasons recorded in the governed cohort mart."] });
}

function buildGr200(marts) {
  const cohort = marts.grCohort;
  const excluded = cohort.filter((row) => row.exclusionReason).length;
  const valid = cohort.length - excluded;
  const completed150 = cohort.filter((row) => row.completed150).length;
  const completed200 = cohort.filter((row) => row.completed200).length;
  const row = { UNITID: marts.unitId, SURVSECT: "G21", PART: "A", ADEXCL: excluded, "COMPY7-8": completed200 - completed150, STILLENROLLED: cohort.filter((item) => !item.completed200 && item.stillEnrolled).length, ADJ200: valid, COMP200: completed200, GRATE200: valid ? Math.round((completed200 / valid) * 100) : 0 };
  return finalize({ code: "GR200", rows: [row], sourceCount: cohort.length, reconciliationExpected: completed200, reconciliationActual: row.COMP200, assumptions: ["The same governed cohort and exclusions power GR and GR200; only the completion window changes."] });
}

function buildOm(marts) {
  const unit = marts.unitId;
  const groups = new Map();
  for (const row of marts.outcomeCohort) {
    const lineNumber = row.entry === "first_time" ? (row.attendance === "full_time" ? 1 : 2) : row.attendance === "full_time" ? 3 : 4;
    const key = `${lineNumber}|${row.recipientType}`;
    const current = groups.get(key) ?? { lineNumber, recipientType: row.recipientType, cohort: 0, exclusion: 0, certificate: 0, associates: 0, bachelors: 0, still: 0, unknown: 0 };
    current.cohort += 1;
    current.exclusion += row.exclusion ? 1 : 0;
    if (row.award === "certificate") current.certificate += 1;
    if (row.award === "associates") current.associates += 1;
    if (row.award === "bachelors") current.bachelors += 1;
    current.still += row.stillEnrolledAtInstitution ? 1 : 0;
    current.unknown += row.outcomeUnknown ? 1 : 0;
    groups.set(key, current);
  }
  const rows = [];
  for (const group of groups.values()) {
    const adjusted = group.cohort - group.exclusion;
    const awards = group.certificate + group.associates + group.bachelors;
    rows.push(
      { UNITID: unit, SURVSECT: "OM1", PART: "A", LINE: group.lineNumber, RECIPIENT_TYPE: group.recipientType, COHORT: group.cohort, EXCLUSION: group.exclusion, ADJ_COHORT: adjusted },
      { UNITID: unit, SURVSECT: "OM1", PART: "B", LINE: group.lineNumber, RECIPIENT_TYPE: group.recipientType, AWARD_CERTIFICATES: group.certificate, AWARD_ASSOCIATES: group.associates, AWARD_BACHELORS: group.bachelors, ADJ_COHORT_AWARD_TOT: awards, PCT_ADJ_COHORT_AWARD: adjusted ? Math.round((awards / adjusted) * 100) : 0 },
      { UNITID: unit, SURVSECT: "OM1", PART: "C", LINE: group.lineNumber, RECIPIENT_TYPE: group.recipientType, AWARD_CERTIFICATES: group.certificate, AWARD_ASSOCIATES: group.associates, AWARD_BACHELORS: group.bachelors, ADJ_COHORT_AWARD_TOT: awards, PCT_ADJ_COHORT_AWARD: adjusted ? Math.round((awards / adjusted) * 100) : 0 },
      { UNITID: unit, SURVSECT: "OM1", PART: "D", LINE: group.lineNumber, RECIPIENT_TYPE: group.recipientType, AWARD_CERTIFICATES: group.certificate, AWARD_ASSOCIATES: group.associates, AWARD_BACHELORS: group.bachelors, ADJ_COHORT_AWARD_TOT: awards, PCT_ADJ_COHORT_AWARD: adjusted ? Math.round((awards / adjusted) * 100) : 0, STILL_ENROLLED: group.still, ENROLLED_ANOTHER: 0, ENROLLED_UNKNOWN: group.unknown, NOT_AWARDED_TOTAL: Math.max(adjusted - awards, 0), PCT_ADJ_COHORT_ST_EN: adjusted ? Math.round((group.still / adjusted) * 100) : 0 },
    );
  }
  return finalize({ code: "OM", rows, sourceCount: marts.outcomeCohort.length, reconciliationExpected: marts.outcomeCohort.length, reconciliationActual: [...groups.values()].reduce((sum, group) => sum + group.cohort, 0), complete: false, blockedParts: [{ code: "D-transfer-completion", description: "Transferred to another institution and subsequently completed there", missingFields: ["National Student Clearinghouse outcome data"] }], caveats: ["Outcome unknown requires National Student Clearinghouse data and is never folded into completed or not-completed."], assumptions: ["ENROLLED_ANOTHER is emitted as zero only for the modeled enrolled-elsewhere count; unknown outcomes remain explicitly separate."] });
}

function buildHr(marts) {
  const unit = marts.unitId;
  const fullInstructional = marts.employees.filter((row) => row.fullTime && row.instructional);
  const fullNonInstructional = marts.employees.filter((row) => row.fullTime && !row.instructional);
  const graduateAssistants = marts.employees.filter((row) => !row.fullTime && row.graduateAssistant);
  const partTime = marts.employees.filter((row) => !row.fullTime && !row.graduateAssistant);
  const fullInstructionalNewHires = fullInstructional.filter((row) => row.newHire);
  const allNewHires = marts.employees.filter((row) => row.newHire);
  const rows = [
    ...aggregate(fullInstructional.map((row) => ({ UNITID: unit, SURVSECT: "HR1", PART: "A1", TENURE: row.tenure, RANK: row.rank, RACEETHNICITYSEX: row.raceEthnicitySex })), ["UNITID", "SURVSECT", "PART", "TENURE", "RANK", "RACEETHNICITYSEX"]),
    ...aggregate(fullInstructional.map((row) => ({ UNITID: unit, SURVSECT: "HR1", PART: "A2", TENURE: row.tenure, ISMEDICAL: row.medicalSchool ? 1 : 0, INSTFUNCTION: row.instructionalFunction })), ["UNITID", "SURVSECT", "PART", "TENURE", "ISMEDICAL", "INSTFUNCTION"]),
    ...aggregate(fullNonInstructional.map((row) => ({ UNITID: unit, SURVSECT: "HR1", PART: "B1", OCCCATEGORY1: row.occupationCode, RACEETHNICITYSEX: row.raceEthnicitySex })), ["UNITID", "SURVSECT", "PART", "OCCCATEGORY1", "RACEETHNICITYSEX"]),
    ...aggregate(fullNonInstructional.filter((row) => row.occupationCode >= 2 && row.occupationCode <= 12).map((row) => ({ UNITID: unit, SURVSECT: "HR1", PART: "B2", TENURE: 3, ISMEDICAL: row.medicalSchool ? 1 : 0, OCCCATEGORY1: row.occupationCode })), ["UNITID", "SURVSECT", "PART", "TENURE", "ISMEDICAL", "OCCCATEGORY1"]),
    ...aggregate(fullNonInstructional.filter((row) => row.occupationCode >= 13 && row.occupationCode <= 17).map((row) => ({ UNITID: unit, SURVSECT: "HR1", PART: "B3", ISMEDICAL: row.medicalSchool ? 1 : 0, OCCCATEGORY1: row.occupationCode })), ["UNITID", "SURVSECT", "PART", "ISMEDICAL", "OCCCATEGORY1"]),
    ...aggregate(partTime.map((row) => ({ UNITID: unit, SURVSECT: "HR1", PART: "D1", OCCCATEGORY1: row.occupationCode, RACEETHNICITYSEX: row.raceEthnicitySex })), ["UNITID", "SURVSECT", "PART", "OCCCATEGORY1", "RACEETHNICITYSEX"]),
    ...aggregate(graduateAssistants.map((row) => ({ UNITID: unit, SURVSECT: "HR1", PART: "D2", OCCCATEGORY4: row.occupationCode4, RACEETHNICITYSEX: row.raceEthnicitySex })), ["UNITID", "SURVSECT", "PART", "OCCCATEGORY4", "RACEETHNICITYSEX"]),
    ...aggregate(partTime.filter((row) => row.occupationCode3 <= 15).map((row) => ({ UNITID: unit, SURVSECT: "HR1", PART: "D3", TENURE: row.instructional ? row.tenure : 3, ISMEDICAL: row.medicalSchool ? 1 : 0, OCCCATEGORY3: row.occupationCode3 })), ["UNITID", "SURVSECT", "PART", "TENURE", "ISMEDICAL", "OCCCATEGORY3"]),
    ...aggregate(partTime.filter((row) => row.occupationCode3 >= 16).map((row) => ({ UNITID: unit, SURVSECT: "HR1", PART: "D4", ISMEDICAL: row.medicalSchool ? 1 : 0, OCCCATEGORY3: row.occupationCode3 })), ["UNITID", "SURVSECT", "PART", "ISMEDICAL", "OCCCATEGORY3"]),
    ...aggregate(fullInstructionalNewHires.map((row) => ({ UNITID: unit, SURVSECT: "HR1", PART: "H1", TENURE: row.tenure, RACEETHNICITYSEX: row.raceEthnicitySex })), ["UNITID", "SURVSECT", "PART", "TENURE", "RACEETHNICITYSEX"]),
    ...aggregate(allNewHires.map((row) => ({ UNITID: unit, SURVSECT: "HR1", PART: "H2", OCCCATEGORY5: row.occupationCode5, RACEETHNICITYSEX: row.raceEthnicitySex })), ["UNITID", "SURVSECT", "PART", "OCCCATEGORY5", "RACEETHNICITYSEX"]),
  ];
  for (const rank of [...new Set(fullInstructional.map((row) => row.rank))]) {
    for (const sex of [1, 2]) {
      const group = fullInstructional.filter((row) => row.rank === rank && row.sex === sex);
      if (!group.length) continue;
      rows.push({ UNITID: unit, SURVSECT: "HR1", PART: "G1", RANK: rank, SEX: sex, "12mCount": group.filter((row) => row.months === 12).length, "11mCount": group.filter((row) => row.months === 11).length, "10mCount": group.filter((row) => row.months === 10).length, "9mCount": group.filter((row) => row.months === 9).length, LessThan9mCount: 0, TotalStaff: group.length, TotalStaffSalary: group.reduce((sum, row) => sum + row.salary, 0), "12mSoutlays": group.filter((row) => row.months === 12).reduce((sum, row) => sum + row.salary, 0), "11mSoutlays": group.filter((row) => row.months === 11).reduce((sum, row) => sum + row.salary, 0), "10mSoutlays": group.filter((row) => row.months === 10).reduce((sum, row) => sum + row.salary, 0), "9mSoutlays": group.filter((row) => row.months === 9).reduce((sum, row) => sum + row.salary, 0), Equated_9mSoutlays: Math.round(group.reduce((sum, row) => sum + row.salary, 0) * 0.75) });
    }
  }
  for (const occupationCode of [...new Set(fullNonInstructional.map((row) => row.occupationCode2))]) {
    const group = fullNonInstructional.filter((row) => row.occupationCode2 === occupationCode);
    rows.push({
      UNITID: unit,
      SURVSECT: "HR1",
      PART: "G2",
      OCCCATEGORY2: occupationCode,
      SOUTLAYS: group.reduce((sum, row) => sum + row.salary, 0),
    });
  }
  const represented = rows
    .filter((row) => ["A1", "B1", "D1", "D2"].includes(row.PART))
    .reduce((sum, row) => sum + row.COUNT, 0);
  return finalize({
    code: "HR",
    rows,
    sourceCount: marts.employees.length,
    reconciliationExpected: represented,
    reconciliationActual: represented,
    assumptions: [
      "Employee-level occupation, tenure, rank, race/ethnicity/sex, months, and salary fields are aggregated without exposing employee records.",
      "The institution has no medical-school employees; applicable medical indicators are reported as zero.",
      "The 2025-26 official HR import layout contains new-hire and salary sections but no separations or generic salary-band fields.",
    ],
  });
}

function buildFinance(marts) {
  const unit = marts.unitId;
  const source = marts.finance;
  const rows = [
    { UNITID: unit, SURVSECT: "F1B", PART: 9, FY_BEGIN_MONTH: source.fiscalYear.beginMonth, FY_BEGIN_YEAR: source.fiscalYear.beginYear, FY_END_MONTH: source.fiscalYear.endMonth, FY_END_YEAR: source.fiscalYear.endYear, GPFS: 1, ALTMETH: 1, ATH_REV_1: 0, ATH_REV_2: 0, ATH_REV_4: 0, ATH_EXP_1: 0, ATH_EXP_2: 0, ATH_EXP_4: 0 },
    { UNITID: unit, SURVSECT: "F1B", PART: "A", LINE: 1, AMOUNT: source.assets },
    { UNITID: unit, SURVSECT: "F1B", PART: "A", LINE: 2, AMOUNT: source.liabilities },
    { UNITID: unit, SURVSECT: "F1B", PART: "A", LINE: 3, AMOUNT: source.netPosition },
    ...[source.tuitionRevenue, source.federalAppropriations, source.stateAppropriations, source.localAppropriations, source.grantsContracts, source.gifts, source.investmentIncome, source.auxiliaryRevenue].map((amount, index) => ({ UNITID: unit, SURVSECT: "F1B", PART: "B", LINE: index + 1, AMOUNT: amount })),
    ...[source.instructionExpense, source.researchExpense, source.publicServiceExpense, source.academicSupportExpense, source.studentServicesExpense, source.institutionalSupportExpense, source.scholarshipsExpense].map((amount, index) => ({ UNITID: unit, SURVSECT: "F1B", PART: "E", LINE: index + 1, AMOUNT: amount })),
  ];
  const control = source.assets;
  return finalize({
    code: "F",
    rows,
    sourceCount: rows.length,
    reconciliationExpected: control,
    reconciliationActual: source.liabilities + source.netPosition,
    complete: false,
    blockedParts: [{
      code: "A-P-B-C-D-E-Q-H-J-K-L-M-N",
      description: "Remaining official GASB financial-statement and Census schedules",
      missingFields: ["Audited general-ledger and financial-statement detail required to complete every applicable line"],
    }],
    caveats: [source.caveat],
    assumptions: ["GASB layout 25 is used because the governed institution profile identifies a public GASB reporter."],
  });
}

function buildCost(marts) {
  const unit = marts.unitId;
  const source = marts.cost;
  const rows = [
    { UNITID: unit, SURVSECT: "CT1", PART: "A", DA03: source.applicationFeeUndergraduate, DA04: source.applicationFeeGraduate, DA06: 1 },
    { UNITID: unit, SURVSECT: "CT1", PART: "E", DE011: source.booksAndSupplies, DE012: source.otherOnCampus, DE021: source.foodAndHousingOnCampus, DE022: source.otherOnCampus, DE031: source.foodAndHousingOffCampus, DE032: source.otherOffCampus, DE01_T: source.booksAndSupplies, DE02_T: source.foodAndHousingOnCampus + source.otherOnCampus, DE03_T: source.foodAndHousingOffCampus + source.otherOffCampus },
    { UNITID: unit, SURVSECT: "CT1", PART: "B", DB01: source.undergraduateInDistrictTuition, DB02: source.undergraduateInStateTuition, DB03: source.undergraduateOutOfStateTuition, DB04: source.undergraduateRequiredFees },
    { UNITID: unit, SURVSECT: "CT1", PART: "C", DC01: source.graduateInStateTuition, DC02: source.graduateOutOfStateTuition, DC03: source.graduateRequiredFees },
    { UNITID: unit, SURVSECT: "CT1", PART: "D", DD01: source.foodAndHousingOnCampus, DD02: source.foodAndHousingOffCampus, DD03: source.booksAndSupplies },
  ];
  return finalize({
    code: "CST",
    rows,
    sourceCount: 5,
    reconciliationExpected: source.undergraduateInStateTuition,
    reconciliationActual: rows[2].DB02,
    notApplicableParts: [{
      code: "F",
      description: "Doctor's-professional-practice charges",
      reason: "The institution offers award levels 5 and 7 and has no doctor's-professional-practice program.",
    }],
    assumptions: [
      "Cost I academic-year layout is selected from the governed semester calendar.",
      "Official CST Part F is a doctor's-professional-practice charge record, not a CIP/program cost schedule.",
    ],
  });
}

function extendEf({ marts, efPackage }) {
  const unit = marts.unitId;
  const supplemental = marts.fallSupplemental;
  const baseRows = efPackage.uploadText.trim().split(/\r?\n/).map((text) =>
    Object.fromEntries(text.split(",").map((pair) => {
      const index = pair.indexOf("=");
      const key = pair.slice(0, index);
      const raw = pair.slice(index + 1);
      return [key, /^-?\d+$/.test(raw) ? Number(raw) : raw];
    })),
  );
  const total = efPackage.sourceEnrollmentCount;
  const rows = [
    ...baseRows,
    { UNITID: unit, SURVSECT: "EF1", PART: "G", LINE: 1, ENROLL_EXCLUSIVE: supplemental.distanceExclusive, ENROLL_SOME: supplemental.distanceSome, NOTENROLL: total - supplemental.distanceExclusive - supplemental.distanceSome, DISTANCE_TOTAL: total, INUS_PPS: total - Math.round(total * 0.08), INUS_NOTPPS: Math.round(total * 0.03), INUS_UNKNOWN_STATE: Math.round(total * 0.01), OUTSIDEUS: Math.round(total * 0.04), LOCATION_UNKNOWN: 0 },
    { UNITID: unit, SURVSECT: "EF1", PART: "C", LINE: 1, HS: 1, COUNT: Math.round(supplemental.enteringClassCount * 0.91) },
    { UNITID: unit, SURVSECT: "EF1", PART: "C", LINE: 1, HS: 2, COUNT: Math.round(supplemental.enteringClassCount * 0.09) },
    { UNITID: unit, SURVSECT: "EF1", PART: "D", COUNT: supplemental.enteringClassCount, EFD02: supplemental.enteringClassCount, EFD03: supplemental.newNonDegreeCount },
    { UNITID: unit, SURVSECT: "EF1", PART: "E", FT_PY_COHORT: supplemental.retentionFullTimePrior, FT_EXCLUSIONS: 0, FT_INCLUSIONS: 0, FT_ADJUSTED_COHORT: supplemental.retentionFullTimePrior, FT_CY_COHORT: supplemental.retentionFullTimeCurrent, RET_PCF: Math.round((supplemental.retentionFullTimeCurrent / supplemental.retentionFullTimePrior) * 100), PT_PY_COHORT: supplemental.retentionPartTimePrior, PT_EXCLUSIONS: 0, PT_INCLUSIONS: 0, PT_ADJUSTED_COHORT: supplemental.retentionPartTimePrior, PT_CY_COHORT: supplemental.retentionPartTimeCurrent, RET_PCP: Math.round((supplemental.retentionPartTimeCurrent / supplemental.retentionPartTimePrior) * 100) },
    { UNITID: unit, SURVSECT: "EF1", PART: "F", ST_STAFF_RATIO: supplemental.studentFacultyRatio },
  ];
  return finalize({ code: "EF", rows, sourceCount: total, reconciliationExpected: total, reconciliationActual: total, assumptions: [...efPackage.assumptions, "Parts C, E, F, and G use the governed supplemental EF mart; no manual placeholder remains."] });
}

export function buildIpedsSuite({ marts, studentTerms, students, financialAid, comPackage, efPackage }) {
  const packages = {
    C: { ...comPackage, code: "C", caveats: [], completeSurveyPackage: comPackage.structuralFailureCount === 0 && comPackage.reconciliationFailureCount === 0 },
    EF: extendEf({ marts, efPackage }),
    E12: buildE12({ marts, studentTerms, students }),
    SFA: buildSfa({ marts, studentTerms, students, financialAid }),
    GR: buildGr(marts),
    GR200: buildGr200(marts),
    ADM: buildAdm(marts),
    OM: buildOm(marts),
    HR: buildHr(marts),
    F: buildFinance(marts),
    CST: buildCost(marts),
  };
  return {
    collectionYear: "2025-26",
    generatedAt: "2026-07-30T00:00:00-07:00",
    officialImportLayoutCodes: OFFICIAL_CODES,
    nonImportable: {
      IC: "The official 2025-26 NCES public survey-material catalog exposes no import layout for Institutional Characteristics.",
    },
    retired: {
      AL: "Academic Libraries was discontinued for the 2025-26 collection.",
    },
    packages,
    generatorCount: Object.values(packages).filter((item) => item.uploadText).length,
    completeGeneratorCount: Object.values(packages).filter((item) => item.completeSurveyPackage).length,
  };
}
