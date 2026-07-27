import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(projectRoot, "data", "sample-university-upload");

await fs.mkdir(outputDir, { recursive: true });

let seed = 20251014;
function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}

function pick(values) {
  return values[Math.floor(random() * values.length)];
}

function shuffle(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(headers, rows) {
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\r\n") + "\r\n";
}

async function writeCsv(fileName, headers, rows) {
  await fs.writeFile(path.join(outputDir, fileName), toCsv(headers, rows), "utf8");
}

const institution = [{
  institution_id: "AVU001",
  institution_name: "Atlas Valley University",
  institution_type: "Public four-year",
  ipeds_unitid: "SYNTH001",
  timezone: "America/Los_Angeles",
  data_classification: "Synthetic demonstration data",
}];

const terms = [
  ["2020FA", "2020-21", "Fall", "2020-08-24", "2020-09-14", "2020-12-18", 0],
  ["2021FA", "2021-22", "Fall", "2021-08-23", "2021-09-13", "2021-12-17", 0],
  ["2022FA", "2022-23", "Fall", "2022-08-22", "2022-09-12", "2022-12-16", 0],
  ["2023FA", "2023-24", "Fall", "2023-08-21", "2023-09-11", "2023-12-15", 0],
  ["2024FA", "2024-25", "Fall", "2024-08-26", "2024-09-16", "2024-12-20", 0],
  ["2025FA", "2025-26", "Fall", "2025-08-25", "2025-09-15", "2025-12-19", 1],
].map(([term_id, academic_year, season, start_date, census_date, end_date, is_current]) => ({
  term_id,
  academic_year,
  season,
  start_date,
  census_date,
  end_date,
  is_current,
}));

const programs = [
  ["PBA", "MS Business Analytics", "Graduate", "52.1301", "College of Business"],
  ["PCS", "MS Computer Science", "Graduate", "11.0701", "College of Computing"],
  ["PNUR", "MS Nursing", "Graduate", "51.3801", "College of Health"],
  ["PPA", "Master of Public Administration", "Graduate", "44.0401", "College of Public Service"],
  ["PENG", "BA English", "Undergraduate", "23.0101", "College of Arts and Sciences"],
  ["PBIO", "BS Biology", "Undergraduate", "26.0101", "College of Arts and Sciences"],
  ["PBUS", "BBA Business Administration", "Undergraduate", "52.0201", "College of Business"],
  ["PMATH", "BS Mathematics", "Undergraduate", "27.0101", "College of Arts and Sciences"],
  ["PEDU", "BS Education", "Undergraduate", "13.0101", "College of Education"],
  ["PCRJ", "BS Criminal Justice", "Undergraduate", "43.0104", "College of Public Service"],
  ["PPSY", "BA Psychology", "Undergraduate", "42.0101", "College of Arts and Sciences"],
  ["PGEN", "General Studies", "Undergraduate", "24.0102", "University Programs"],
].map(([program_id, program_name, degree_level, cip_code, college]) => ({
  program_id,
  program_name,
  degree_level,
  cip_code,
  college,
  active_from: "2020FA",
  active_to: "",
}));

const programById = new Map(programs.map((program) => [program.program_id, program]));
const undergraduatePrograms = programs.filter((program) => program.degree_level === "Undergraduate");
const genders = ["Woman", "Man", "Nonbinary", "Unknown"];
const races = [
  "American Indian or Alaska Native",
  "Asian",
  "Black or African American",
  "Hispanic or Latino",
  "Native Hawaiian or Other Pacific Islander",
  "Two or more races",
  "White",
  "Nonresident",
];
const residencies = ["In-state", "Out-of-state", "International"];

const headcounts = {
  "2020FA": 17580,
  "2021FA": 18120,
  "2022FA": 18715,
  "2023FA": 19018,
  "2024FA": 19234,
  "2025FA": 18426,
};

const targetRetention = {
  "2020FA": 0.70,
  "2021FA": 0.72,
  "2022FA": 0.71,
  "2023FA": 0.776,
  "2024FA": 0.784,
};

const specialProgramCounts = {
  "2020FA": { PBA: 180, PCS: 420, PNUR: 390, PPA: 450 },
  "2021FA": { PBA: 195, PCS: 475, PNUR: 410, PPA: 460 },
  "2022FA": { PBA: 215, PCS: 510, PNUR: 435, PPA: 475 },
  "2023FA": { PBA: 250, PCS: 560, PNUR: 470, PPA: 490 },
  "2024FA": { PBA: 500, PCS: 600, PNUR: 500, PPA: 500 },
  "2025FA": { PBA: 585, PCS: 678, PNUR: 540, PPA: 480 },
};

const students = new Map();
const cohorts = new Map();
const activeByTerm = new Map();
const studentTerms = [];
let nextStudentNumber = 1;

function createStudent(entryTermId, isFtft) {
  const studentId = `S${String(nextStudentNumber).padStart(7, "0")}`;
  nextStudentNumber += 1;
  const primaryProgram = pick(undergraduatePrograms);
  students.set(studentId, {
    student_id: studentId,
    birth_year: 1978 + Math.floor(random() * 29),
    gender: pick(genders),
    race_ethnicity: pick(races),
    residency: pick(residencies),
    first_generation: random() < 0.36 ? 1 : 0,
    pell_eligible: random() < 0.33 ? 1 : 0,
    entry_term_id: entryTermId,
    entry_type: isFtft ? "First-time" : random() < 0.22 ? "Transfer" : "Continuing/Other",
    degree_seeking: 1,
    ftft_cohort_term_id: isFtft ? entryTermId : "",
    primary_program_id: primaryProgram.program_id,
  });
  return studentId;
}

let previousActive = [];
for (let termIndex = 0; termIndex < terms.length; termIndex += 1) {
  const termId = terms[termIndex].term_id;
  const targetHeadcount = headcounts[termId];
  let active;

  if (termIndex === 0) {
    active = Array.from({ length: targetHeadcount }, () => createStudent(termId, false));
    const initialCohort = active.slice(0, 3000);
    for (const studentId of initialCohort) {
      const student = students.get(studentId);
      student.entry_type = "First-time";
      student.ftft_cohort_term_id = termId;
    }
    cohorts.set(termId, initialCohort);
  } else {
    const priorTermId = terms[termIndex - 1].term_id;
    const priorCohort = cohorts.get(priorTermId);
    const retainFromCohort = Math.round(priorCohort.length * targetRetention[priorTermId]);
    const cohortRetained = priorCohort.slice(0, retainFromCohort);
    const priorCohortSet = new Set(priorCohort);
    const otherCandidates = shuffle(previousActive.filter((studentId) => !priorCohortSet.has(studentId)));
    const totalReturningTarget = Math.floor(previousActive.length * 0.76);
    const otherReturning = otherCandidates.slice(
      0,
      Math.max(0, totalReturningTarget - cohortRetained.length),
    );
    const returning = [...cohortRetained, ...otherReturning];
    const newCount = targetHeadcount - returning.length;
    const newStudents = Array.from({ length: newCount }, (_, index) =>
      createStudent(termId, index < 3000),
    );
    const newCohort = newStudents.slice(0, 3000);
    cohorts.set(termId, newCohort);
    active = shuffle([...returning, ...newStudents]);
  }

  activeByTerm.set(termId, active);
  previousActive = active;

  const specialCounts = specialProgramCounts[termId] ?? {};
  const programAssignments = [];
  for (const [programId, count] of Object.entries(specialCounts)) {
    for (let i = 0; i < count; i += 1) programAssignments.push(programId);
  }
  const remainingCount = active.length - programAssignments.length;
  for (let i = 0; i < remainingCount; i += 1) {
    programAssignments.push(undergraduatePrograms[i % undergraduatePrograms.length].program_id);
  }

  const orderedActive = shuffle(active);
  let injectedFullTimeMismatch = 0;
  for (let i = 0; i < orderedActive.length; i += 1) {
    const studentId = orderedActive[i];
    const programId = programAssignments[i];
    const program = programById.get(programId);
    const level = program.degree_level === "Graduate" ? "GR" : "UG";
    const shouldBeFullTime = i % 5 !== 0;
    let attemptedCredits = shouldBeFullTime
      ? level === "UG"
        ? i % 2 === 0 ? 12 : 15
        : 9
      : level === "UG"
        ? 6
        : 3;
    let attendanceStatus = shouldBeFullTime ? "F" : "P";

    if (
      termId === "2025FA" &&
      level === "UG" &&
      injectedFullTimeMismatch < 146
    ) {
      attemptedCredits = 6;
      attendanceStatus = "F";
      injectedFullTimeMismatch += 1;
    }

    studentTerms.push({
      student_id: studentId,
      term_id: termId,
      program_id: programId,
      level,
      attempted_credits: attemptedCredits,
      attendance_status: attendanceStatus,
      census_enrolled: 1,
      reportable: 1,
      academic_status: random() < 0.93 ? "Good Standing" : "Academic Warning",
    });
  }
}

for (const studentId of activeByTerm.get("2025FA").slice(0, 119)) {
  students.get(studentId).race_ethnicity = "";
}

const sections = [];
const sectionEnrollments = [];
const currentActiveByProgram = new Map();
for (const row of studentTerms.filter((row) => row.term_id === "2025FA")) {
  if (!currentActiveByProgram.has(row.program_id)) currentActiveByProgram.set(row.program_id, []);
  currentActiveByProgram.get(row.program_id).push(row.student_id);
}

const targetFilledSeats = { PBA: 920, PCS: 860, PNUR: 780, PPA: 530 };
for (const programId of Object.keys(targetFilledSeats)) {
  const studentPool = currentActiveByProgram.get(programId);
  let enrollmentCursor = 0;
  const totalFilled = targetFilledSeats[programId];
  for (let sectionNumber = 1; sectionNumber <= 10; sectionNumber += 1) {
    const sectionId = `${programId}-2025FA-${String(sectionNumber).padStart(2, "0")}`;
    const sectionFilled = Math.floor(totalFilled / 10) + (sectionNumber <= totalFilled % 10 ? 1 : 0);
    sections.push({
      section_id: sectionId,
      term_id: "2025FA",
      program_id: programId,
      course_code: `${programId.slice(1)}-${500 + sectionNumber}`,
      modality: sectionNumber % 3 === 0 ? "Online" : "In person",
      section_capacity: 100,
      instructor_type: sectionNumber % 4 === 0 ? "Adjunct" : "Full-time",
    });
    const usedInSection = new Set();
    for (let seat = 0; seat < sectionFilled; seat += 1) {
      let studentId = studentPool[enrollmentCursor % studentPool.length];
      enrollmentCursor += 1;
      while (usedInSection.has(studentId)) {
        studentId = studentPool[enrollmentCursor % studentPool.length];
        enrollmentCursor += 1;
      }
      usedInSection.add(studentId);
      sectionEnrollments.push({
        section_id: sectionId,
        student_id: studentId,
        term_id: "2025FA",
        enrollment_status: "Enrolled",
        final_grade: "",
      });
    }
  }
}

const ipedsGroups = [
  { run: 1, count: 20, totalWeight: 45 },
  { run: 2, count: 5, totalWeight: 9 },
  { run: 3, count: 4, totalWeight: 7 },
  { run: 4, count: 6, totalWeight: 13 },
  { run: 5, count: 5, totalWeight: 5 },
  { run: 6, count: 6, totalWeight: 12 },
];
const ipedsChecks = [];
let checkNumber = 1;
const checkDefinitions = [];
for (const group of ipedsGroups) {
  for (let i = 0; i < group.count; i += 1) {
    checkDefinitions.push({
      check_id: `EF-${String(checkNumber).padStart(3, "0")}`,
      check_name: `Fall Enrollment validation ${checkNumber}`,
      first_passed_run: group.run,
      weight: group.totalWeight / group.count,
    });
    checkNumber += 1;
  }
}
for (let i = 0; i < 3; i += 1) {
  checkDefinitions.push({
    check_id: `EF-${String(checkNumber).padStart(3, "0")}`,
    check_name: `Year-over-year explanation required ${i + 1}`,
    first_passed_run: 99,
    weight: 3,
  });
  checkNumber += 1;
}
for (let run = 1; run <= 6; run += 1) {
  for (const check of checkDefinitions) {
    ipedsChecks.push({
      run_id: `EF-RUN-${run}`,
      run_sequence: run,
      survey_year: "2025-26",
      component: "Fall Enrollment",
      check_id: check.check_id,
      check_name: check.check_name,
      status: check.first_passed_run <= run ? "Passed" : "Review",
      weight: check.weight.toFixed(8),
      run_timestamp: `2025-10-${String(8 + run).padStart(2, "0")} 08:00`,
    });
  }
}

const snapshotDates = [
  "2025-09-09",
  "2025-09-16",
  "2025-09-23",
  "2025-09-30",
  "2025-10-07",
  "2025-10-14",
];
const openIssues = [
  ["DQ-1001", "Critical", "Full-time status conflicts with attempted credits", "UG_FT_CREDIT_THRESHOLD", 146, "Registrar"],
  ["DQ-1002", "High", "Fall headcount changed outside the expected band", "YOY_HEADCOUNT_VARIANCE", 808, "Institutional Research"],
  ["DQ-1003", "High", "Race and ethnicity value is missing", "DEMOGRAPHIC_COMPLETENESS", 119, "Admissions"],
  ["DQ-1004", "High", "Financial aid records lack term enrollment", "AID_WITHOUT_ENROLLMENT", 23, "Student Financial Services"],
  ["DQ-1005", "Medium", "Program CIP changed without a bridge record", "CIP_EFFECTIVE_DATING", 307, "Academic Affairs"],
];
for (let i = 6; i <= 27; i += 1) {
  openIssues.push([
    `DQ-${String(1000 + i).padStart(4, "0")}`,
    i <= 7 ? "Critical" : i <= 14 ? "High" : "Medium",
    `Synthetic governance exception ${i}`,
    `GOVERNANCE_RULE_${String(i).padStart(2, "0")}`,
    2 + ((i * 17) % 73),
    pick(["Registrar", "Admissions", "Financial Aid", "Academic Affairs", "Enterprise Systems"]),
  ]);
}

const qualityIssues = openIssues.map(([issue_id, severity, title, rule_id, affected_records, owner]) => ({
  issue_id,
  severity,
  title,
  rule_id,
  affected_records,
  owner,
  source_system: issue_id === "DQ-1001" ? "SIS student term" : "Enterprise data warehouse",
  status: "Open",
  opened_at: "2025-09-01 08:00",
  resolved_at: "",
}));

const resolutionGroups = [
  { count: 5, resolvedAt: "2025-09-12 12:00" },
  { count: 4, resolvedAt: "2025-09-19 12:00" },
  { count: 5, resolvedAt: "2025-09-26 12:00" },
  { count: 3, resolvedAt: "2025-10-03 12:00" },
  { count: 9, resolvedAt: "2025-10-10 12:00" },
];
let resolvedCounter = 1;
for (const group of resolutionGroups) {
  for (let i = 0; i < group.count; i += 1) {
    qualityIssues.push({
      issue_id: `DQ-R${String(resolvedCounter).padStart(3, "0")}`,
      severity: resolvedCounter % 4 === 0 ? "High" : "Medium",
      title: `Resolved synthetic exception ${resolvedCounter}`,
      rule_id: `RESOLVED_RULE_${String(resolvedCounter).padStart(2, "0")}`,
      affected_records: 1 + ((resolvedCounter * 13) % 51),
      owner: pick(["Registrar", "Admissions", "Financial Aid", "Academic Affairs"]),
      source_system: "Enterprise data warehouse",
      status: "Resolved",
      opened_at: "2025-09-01 08:00",
      resolved_at: group.resolvedAt,
    });
    resolvedCounter += 1;
  }
}

await Promise.all([
  writeCsv("institution.csv", Object.keys(institution[0]), institution),
  writeCsv("terms.csv", Object.keys(terms[0]), terms),
  writeCsv("programs.csv", Object.keys(programs[0]), programs),
  writeCsv("students.csv", Object.keys(students.values().next().value), [...students.values()]),
  writeCsv("student_terms.csv", Object.keys(studentTerms[0]), studentTerms),
  writeCsv("sections.csv", Object.keys(sections[0]), sections),
  writeCsv("section_enrollments.csv", Object.keys(sectionEnrollments[0]), sectionEnrollments),
  writeCsv("ipeds_validation_results.csv", Object.keys(ipedsChecks[0]), ipedsChecks),
  writeCsv("data_quality_issue_log.csv", Object.keys(qualityIssues[0]), qualityIssues),
]);

const manifest = {
  package_name: "Atlas Valley University synthetic upload",
  generated_at: "2025-10-14T09:42:00-07:00",
  deterministic_seed: 20251014,
  contains_real_student_data: false,
  files: [
    { file: "institution.csv", system: "Institution configuration", rows: institution.length },
    { file: "terms.csv", system: "SIS", rows: terms.length },
    { file: "programs.csv", system: "Curriculum catalog", rows: programs.length },
    { file: "students.csv", system: "SIS", rows: students.size },
    { file: "student_terms.csv", system: "SIS", rows: studentTerms.length },
    { file: "sections.csv", system: "SIS course schedule", rows: sections.length },
    { file: "section_enrollments.csv", system: "SIS registration", rows: sectionEnrollments.length },
    { file: "ipeds_validation_results.csv", system: "IPEDS validation engine", rows: ipedsChecks.length },
    { file: "data_quality_issue_log.csv", system: "Data quality agent", rows: qualityIssues.length },
  ],
};
await fs.writeFile(path.join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(JSON.stringify(manifest, null, 2));
