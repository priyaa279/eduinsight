import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DATA_QUALITY_RULES } from "../lib/data-quality-catalog.mjs";
import { buildComPackage } from "../lib/ipeds-com.mjs";
import { buildEfPackage } from "../lib/ipeds-ef.mjs";
import { loadIpedsSpecs } from "../lib/ipeds-specs.mjs";
import { buildIpedsSuite } from "../lib/ipeds-suite.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const uploadDir = path.join(projectRoot, "data", "sample-university-upload");
const processedDir = path.join(projectRoot, "data", "processed");
const appDataDir = path.join(projectRoot, "app", "data");
const ipedsPackageDir = path.join(processedDir, "ipeds", "2025-26");

await Promise.all([
  fs.mkdir(processedDir, { recursive: true }),
  fs.mkdir(appDataDir, { recursive: true }),
  fs.mkdir(ipedsPackageDir, { recursive: true }),
]);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const character = text[i];
    if (quoted) {
      if (character === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  const [headers, ...dataRows] = rows.filter((item) => item.some((value) => value !== ""));
  return dataRows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );
}

async function readCsv(fileName) {
  return parseCsv(await fs.readFile(path.join(uploadDir, fileName), "utf8"));
}

function requireColumns(fileName, rows, columns) {
  if (!rows.length) throw new Error(`${fileName} contains no data rows.`);
  const available = new Set(Object.keys(rows[0]));
  const missing = columns.filter((column) => !available.has(column));
  if (missing.length) {
    throw new Error(`${fileName} is missing required columns: ${missing.join(", ")}`);
  }
}

function requireUnique(fileName, rows, keyColumns) {
  const seen = new Set();
  for (const row of rows) {
    const key = keyColumns.map((column) => row[column]).join("|");
    if (seen.has(key)) {
      throw new Error(
        `${fileName} contains a duplicate ${keyColumns.join(" + ")} key: ${key}`,
      );
    }
    seen.add(key);
  }
}

function requireForeignKey(fileName, rows, column, parentFile, parentValues) {
  for (const row of rows) {
    if (!parentValues.has(row[column])) {
      throw new Error(
        `${fileName}.${column} contains ${row[column]}, which is not present in ${parentFile}.`,
      );
    }
  }
}

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatSignedPercent(value, digits = 1) {
  const prefix = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${prefix}${Math.abs(value * 100).toFixed(digits)}%`;
}

function formatSignedPoints(value, digits = 1) {
  const prefix = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${prefix}${Math.abs(value * 100).toFixed(digits)} pts`;
}

function toCsv(headers, rows) {
  const escape = (value) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\r\n") + "\r\n";
}

const [
  institutions,
  terms,
  programs,
  students,
  studentTerms,
  sections,
  sectionEnrollments,
  ipedsResults,
  qualityIssueLog,
  completions,
  financialAid,
] = await Promise.all([
  readCsv("institution.csv"),
  readCsv("terms.csv"),
  readCsv("programs.csv"),
  readCsv("students.csv"),
  readCsv("student_terms.csv"),
  readCsv("sections.csv"),
  readCsv("section_enrollments.csv"),
  readCsv("ipeds_validation_results.csv"),
  readCsv("data_quality_issue_log.csv"),
  readCsv("completions.csv"),
  readCsv("financial_aid.csv"),
]);

const contracts = {
  "institution.csv": ["institution_id", "institution_name", "data_classification"],
  "terms.csv": ["term_id", "academic_year", "season", "census_date", "is_current"],
  "programs.csv": ["program_id", "program_name", "degree_level", "cip_code"],
  "students.csv": ["student_id", "degree_seeking", "ftft_cohort_term_id"],
  "student_terms.csv": [
    "student_id",
    "term_id",
    "program_id",
    "level",
    "attempted_credits",
    "attendance_status",
    "census_enrolled",
    "reportable",
  ],
  "sections.csv": ["section_id", "term_id", "program_id", "section_capacity"],
  "section_enrollments.csv": ["section_id", "student_id", "term_id", "enrollment_status"],
  "ipeds_validation_results.csv": [
    "run_id",
    "run_sequence",
    "component",
    "check_id",
    "status",
    "weight",
  ],
  "data_quality_issue_log.csv": [
    "issue_id",
    "severity",
    "title",
    "affected_records",
    "status",
    "opened_at",
    "resolved_at",
  ],
  "completions.csv": [
    "completion_id",
    "student_id",
    "program_id",
    "award_date",
    "reporting_year",
  ],
  "financial_aid.csv": [
    "aid_record_id",
    "student_id",
    "term_id",
    "aid_year",
    "pell_eligible",
    "pell_recipient",
    "pell_amount",
  ],
};

for (const [fileName, requiredColumns] of Object.entries(contracts)) {
  const rows = {
    "institution.csv": institutions,
    "terms.csv": terms,
    "programs.csv": programs,
    "students.csv": students,
    "student_terms.csv": studentTerms,
    "sections.csv": sections,
    "section_enrollments.csv": sectionEnrollments,
    "ipeds_validation_results.csv": ipedsResults,
    "data_quality_issue_log.csv": qualityIssueLog,
    "completions.csv": completions,
    "financial_aid.csv": financialAid,
  }[fileName];
  requireColumns(fileName, rows, requiredColumns);
}

requireUnique("institution.csv", institutions, ["institution_id"]);
requireUnique("terms.csv", terms, ["term_id"]);
requireUnique("programs.csv", programs, ["program_id"]);
requireUnique("students.csv", students, ["student_id"]);
requireUnique("student_terms.csv", studentTerms, ["student_id", "term_id"]);
requireUnique("sections.csv", sections, ["section_id"]);
requireUnique("section_enrollments.csv", sectionEnrollments, ["section_id", "student_id"]);
requireUnique("ipeds_validation_results.csv", ipedsResults, ["run_id", "check_id"]);
requireUnique("data_quality_issue_log.csv", qualityIssueLog, ["issue_id"]);
requireUnique("completions.csv", completions, ["completion_id"]);
requireUnique("financial_aid.csv", financialAid, ["aid_record_id"]);

const studentIds = new Set(students.map((row) => row.student_id));
const termIds = new Set(terms.map((row) => row.term_id));
const programIds = new Set(programs.map((row) => row.program_id));
const sectionIds = new Set(sections.map((row) => row.section_id));
requireForeignKey("student_terms.csv", studentTerms, "student_id", "students.csv", studentIds);
requireForeignKey("student_terms.csv", studentTerms, "term_id", "terms.csv", termIds);
requireForeignKey("student_terms.csv", studentTerms, "program_id", "programs.csv", programIds);
requireForeignKey("completions.csv", completions, "student_id", "students.csv", studentIds);
requireForeignKey("completions.csv", completions, "program_id", "programs.csv", programIds);
requireForeignKey("financial_aid.csv", financialAid, "student_id", "students.csv", studentIds);
requireForeignKey("financial_aid.csv", financialAid, "term_id", "terms.csv", termIds);
requireForeignKey("sections.csv", sections, "term_id", "terms.csv", termIds);
requireForeignKey("sections.csv", sections, "program_id", "programs.csv", programIds);
requireForeignKey(
  "section_enrollments.csv",
  sectionEnrollments,
  "student_id",
  "students.csv",
  studentIds,
);
requireForeignKey(
  "section_enrollments.csv",
  sectionEnrollments,
  "section_id",
  "sections.csv",
  sectionIds,
);
requireForeignKey(
  "section_enrollments.csv",
  sectionEnrollments,
  "term_id",
  "terms.csv",
  termIds,
);

const fallTerms = terms
  .filter((term) => term.season === "Fall")
  .sort((a, b) => a.term_id.localeCompare(b.term_id));
if (fallTerms.filter((term) => term.is_current === "1").length !== 1) {
  throw new Error("terms.csv must contain exactly one current Fall term.");
}
const currentTerm = fallTerms.find((term) => term.is_current === "1") ?? fallTerms.at(-1);
const currentIndex = fallTerms.findIndex((term) => term.term_id === currentTerm.term_id);
const priorTerm = fallTerms[currentIndex - 1];
if (!priorTerm) throw new Error("A prior Fall term is required for command-center comparisons.");

const reportableRows = studentTerms.filter(
  (row) => row.census_enrolled === "1" && row.reportable === "1",
);
const studentTermsByTerm = new Map();
for (const term of fallTerms) {
  studentTermsByTerm.set(
    term.term_id,
    reportableRows.filter((row) => row.term_id === term.term_id),
  );
}

const headcountByTerm = fallTerms.map((term) => ({
  term_id: term.term_id,
  label: term.academic_year.slice(0, 4),
  value: new Set(studentTermsByTerm.get(term.term_id).map((row) => row.student_id)).size,
}));
const currentHeadcount = headcountByTerm.find((item) => item.term_id === currentTerm.term_id).value;
const priorHeadcount = headcountByTerm.find((item) => item.term_id === priorTerm.term_id).value;
const headcountDelta = (currentHeadcount - priorHeadcount) / priorHeadcount;

const studentById = new Map(students.map((student) => [student.student_id, student]));
const retentionHistory = [];
for (let i = 0; i < fallTerms.length - 1; i += 1) {
  const cohortTerm = fallTerms[i];
  const outcomeTerm = fallTerms[i + 1];
  const cohortIds = new Set(
    students
      .filter(
        (student) =>
          student.ftft_cohort_term_id === cohortTerm.term_id &&
          student.degree_seeking === "1",
      )
      .map((student) => student.student_id),
  );
  const nextFallIds = new Set(
    studentTermsByTerm.get(outcomeTerm.term_id).map((row) => row.student_id),
  );
  const retained = [...cohortIds].filter((studentId) => nextFallIds.has(studentId)).length;
  retentionHistory.push({
    cohort_term_id: cohortTerm.term_id,
    label: cohortTerm.academic_year.slice(0, 4),
    cohort_size: cohortIds.size,
    retained,
    rate: cohortIds.size ? retained / cohortIds.size : 0,
  });
}
const currentRetention = retentionHistory.at(-1);
const priorRetention = retentionHistory.at(-2);

const ipedsRunMap = new Map();
for (const result of ipedsResults) {
  if (!ipedsRunMap.has(result.run_id)) {
    ipedsRunMap.set(result.run_id, {
      run_id: result.run_id,
      run_sequence: Number(result.run_sequence),
      passed_weight: 0,
      total_weight: 0,
      passed_checks: 0,
      total_checks: 0,
      timestamp: result.run_timestamp,
    });
  }
  const run = ipedsRunMap.get(result.run_id);
  const weight = Number(result.weight);
  run.total_weight += weight;
  run.total_checks += 1;
  if (result.status === "Passed") {
    run.passed_weight += weight;
    run.passed_checks += 1;
  }
}
const ipedsRuns = [...ipedsRunMap.values()]
  .sort((a, b) => a.run_sequence - b.run_sequence)
  .map((run) => ({ ...run, readiness: run.passed_weight / run.total_weight }));
const currentIpedsRun = ipedsRuns.at(-1);
const priorIpedsRun = ipedsRuns.at(-2);
if (Math.abs(currentIpedsRun.total_weight - 100) >= 0.001) {
  throw new Error(
    `The current IPEDS run weights total ${currentIpedsRun.total_weight}; expected 100.`,
  );
}

const openQualityIssues = qualityIssueLog.filter((issue) => issue.status === "Open");
const criticalQualityIssues = openQualityIssues.filter((issue) => issue.severity === "Critical");
const snapshotDates = [
  "2025-09-09",
  "2025-09-16",
  "2025-09-23",
  "2025-09-30",
  "2025-10-07",
  "2025-10-14",
];
const qualityHistory = snapshotDates.map((date) => {
  const asOf = new Date(`${date}T23:59:59`);
  const open = qualityIssueLog.filter((issue) => {
    const opened = new Date(issue.opened_at.replace(" ", "T"));
    const resolved = issue.resolved_at
      ? new Date(issue.resolved_at.replace(" ", "T"))
      : null;
    return opened <= asOf && (!resolved || resolved > asOf);
  }).length;
  return { label: date.slice(5), value: open };
});
const priorWeekQuality = qualityHistory.at(-2).value;

const currentStudentTermRows = studentTermsByTerm.get(currentTerm.term_id);
const fullTimeCreditMismatch = currentStudentTermRows.filter(
  (row) =>
    row.level === "UG" &&
    row.attendance_status === "F" &&
    Number(row.attempted_credits) < 12,
).length;
const loggedMismatch = openQualityIssues.find(
  (issue) => issue.rule_id === "UG_FT_CREDIT_THRESHOLD",
);
if (!loggedMismatch) throw new Error("The quality issue log is missing UG_FT_CREDIT_THRESHOLD.");
if (Number(loggedMismatch.affected_records) !== fullTimeCreditMismatch) {
  throw new Error(
    `Quality reconciliation failed: SIS contains ${fullTimeCreditMismatch} full-time credit mismatches, but the issue log says ${loggedMismatch.affected_records}.`,
  );
}

const programById = new Map(programs.map((program) => [program.program_id, program]));
const currentProgramCounts = new Map();
const priorProgramCounts = new Map();
for (const row of currentStudentTermRows) {
  currentProgramCounts.set(row.program_id, (currentProgramCounts.get(row.program_id) ?? 0) + 1);
}
for (const row of studentTermsByTerm.get(priorTerm.term_id)) {
  priorProgramCounts.set(row.program_id, (priorProgramCounts.get(row.program_id) ?? 0) + 1);
}

const currentSections = sections.filter((section) => section.term_id === currentTerm.term_id);
const capacityByProgram = new Map();
const sectionById = new Map(currentSections.map((section) => [section.section_id, section]));
for (const section of currentSections) {
  capacityByProgram.set(
    section.program_id,
    (capacityByProgram.get(section.program_id) ?? 0) + Number(section.section_capacity),
  );
}
const filledByProgram = new Map();
for (const enrollment of sectionEnrollments.filter(
  (row) => row.term_id === currentTerm.term_id && row.enrollment_status === "Enrolled",
)) {
  const section = sectionById.get(enrollment.section_id);
  if (!section) continue;
  filledByProgram.set(
    section.program_id,
    (filledByProgram.get(section.program_id) ?? 0) + 1,
  );
}

const programSignals = programs
  .filter((program) => program.degree_level === "Graduate" && capacityByProgram.has(program.program_id))
  .map((program) => {
    const current = currentProgramCounts.get(program.program_id) ?? 0;
    const prior = priorProgramCounts.get(program.program_id) ?? 0;
    const growth = prior ? (current - prior) / prior : 0;
    const capacity = capacityByProgram.get(program.program_id);
    const filled = filledByProgram.get(program.program_id) ?? 0;
    return {
      programId: program.program_id,
      label: program.program_name
        .replace(/^MS /, "")
        .replace(/^Master of /, ""),
      currentHeadcount: current,
      priorHeadcount: prior,
      utilization: capacity ? filled / capacity : 0,
      utilizationDisplay: `${Math.round((filled / capacity) * 100)}%`,
      growth,
      delta: formatSignedPercent(growth, 0),
    };
  })
  .sort((a, b) => b.growth - a.growth);

const enrollmentSeries = programs.map((program) => ({
  programId: program.program_id,
  programName: program.program_name,
  degreeLevel: program.degree_level,
  points: fallTerms.map((term) => {
    const rows = studentTermsByTerm
      .get(term.term_id)
      .filter((row) => row.program_id === program.program_id);
    const residencyGroups = new Map();
    for (const row of rows) {
      const residency = studentById.get(row.student_id)?.residency || "Unknown";
      if (!residencyGroups.has(residency)) residencyGroups.set(residency, new Set());
      residencyGroups.get(residency).add(row.student_id);
    }
    return {
      termId: term.term_id,
      year: Number(term.term_id.slice(0, 4)),
      label: term.academic_year.slice(0, 4),
      total: new Set(rows.map((row) => row.student_id)).size,
      byResidency: Object.fromEntries(
        [...residencyGroups.entries()].map(([residency, ids]) => [residency, ids.size]),
      ),
    };
  }),
}));

const enrollmentCubeMaps = Object.fromEntries(
  [
    "all",
    "residency",
    "gender",
    "race_ethnicity",
    "first_generation",
    "pell_eligible",
    "attendance_status",
    "academic_status",
  ].map((dimension) => [dimension, new Map()]),
);
for (const term of fallTerms) {
  for (const row of studentTermsByTerm.get(term.term_id)) {
    const student = studentById.get(row.student_id);
    const program = programById.get(row.program_id);
    if (!student || !program) continue;
    const year = Number(term.term_id.slice(0, 4));
    const dimensionValues = {
      all: "All students",
      residency: student.residency || "Unknown",
      gender: student.gender || "Unknown",
      race_ethnicity: student.race_ethnicity || "Unknown",
      first_generation:
        student.first_generation === "1"
          ? "First-generation"
          : "Continuing-generation",
      pell_eligible:
        student.pell_eligible === "1" ? "Pell-eligible" : "Non-Pell",
      attendance_status:
        row.attendance_status === "F"
          ? "Full-time"
          : row.attendance_status === "P"
            ? "Part-time"
            : "Unknown",
      academic_status: row.academic_status || "Unknown",
    };
    for (const [dimension, value] of Object.entries(dimensionValues)) {
      const key = `${year}|${program.program_id}|${value}`;
      const map = enrollmentCubeMaps[dimension];
      const cell = map.get(key) ?? {
        year,
        programId: program.program_id,
        value,
        count: 0,
      };
      cell.count += 1;
      map.set(key, cell);
    }
  }
}
const enrollmentCubes = Object.fromEntries(
  Object.entries(enrollmentCubeMaps).map(([dimension, map]) => [
    dimension,
    [...map.values()],
  ]),
);

const retentionGroupDefinitions = {
  all: () => true,
  first_generation: (student) => student.first_generation === "1",
  continuing_generation: (student) => student.first_generation !== "1",
  pell_eligible: (student) => student.pell_eligible === "1",
  non_pell: (student) => student.pell_eligible !== "1",
};

function summarizeRetentionPopulation(populationStudents, nextFallIds) {
  return {
    groups: Object.fromEntries(
      Object.entries(retentionGroupDefinitions).map(([group, predicate]) => {
        const members = populationStudents.filter(predicate);
        const retained = members.filter((student) =>
          nextFallIds.has(student.student_id),
        ).length;
        return [
          group,
          {
            cohortSize: members.length,
            retained,
            rate: members.length ? round(retained / members.length, 4) : 0,
          },
        ];
      }),
    ),
  };
}

const retentionSeries = [];
const retentionCubeMaps = Object.fromEntries(
  [
    "all",
    "residency",
    "gender",
    "race_ethnicity",
    "first_generation",
    "pell_eligible",
  ].map((dimension) => [dimension, new Map()]),
);
for (let i = 0; i < fallTerms.length - 1; i += 1) {
  const cohortTerm = fallTerms[i];
  const outcomeTerm = fallTerms[i + 1];
  const cohortStudents = students.filter(
    (student) =>
      student.ftft_cohort_term_id === cohortTerm.term_id &&
      student.degree_seeking === "1",
  );
  const nextFallIds = new Set(
    studentTermsByTerm.get(outcomeTerm.term_id).map((row) => row.student_id),
  );
  const cohortProgramByStudent = new Map(
    studentTermsByTerm
      .get(cohortTerm.term_id)
      .map((row) => [row.student_id, programById.get(row.program_id)]),
  );
  const populationFor = (predicate) =>
    cohortStudents.filter((student) => {
      const program = cohortProgramByStudent.get(student.student_id);
      return program ? predicate(program) : false;
    });

  for (const student of cohortStudents) {
    const program = cohortProgramByStudent.get(student.student_id);
    if (!program) continue;
    const cohortYear = Number(cohortTerm.term_id.slice(0, 4));
    const dimensionValues = {
      all: "All FTFT students",
      residency: student.residency || "Unknown",
      gender: student.gender || "Unknown",
      race_ethnicity: student.race_ethnicity || "Unknown",
      first_generation:
        student.first_generation === "1"
          ? "First-generation"
          : "Continuing-generation",
      pell_eligible:
        student.pell_eligible === "1" ? "Pell-eligible" : "Non-Pell",
    };
    for (const [dimension, value] of Object.entries(dimensionValues)) {
      const key = `${cohortYear}|${program.program_id}|${value}`;
      const map = retentionCubeMaps[dimension];
      const cell = map.get(key) ?? {
        cohortYear,
        programId: program.program_id,
        value,
        cohortSize: 0,
        retained: 0,
      };
      cell.cohortSize += 1;
      if (nextFallIds.has(student.student_id)) cell.retained += 1;
      map.set(key, cell);
    }
  }

  const allPopulation = summarizeRetentionPopulation(cohortStudents, nextFallIds);
  retentionSeries.push({
    cohortTermId: cohortTerm.term_id,
    cohortYear: Number(cohortTerm.term_id.slice(0, 4)),
    outcomeTermId: outcomeTerm.term_id,
    groups: allPopulation.groups,
    populations: {
      all: allPopulation,
      masters_of_science: summarizeRetentionPopulation(
        populationFor((program) => program.program_name.startsWith("MS ")),
        nextFallIds,
      ),
      bachelors_of_science: summarizeRetentionPopulation(
        populationFor((program) => program.program_name.startsWith("BS ")),
        nextFallIds,
      ),
      graduate: summarizeRetentionPopulation(
        populationFor((program) => program.degree_level === "Graduate"),
        nextFallIds,
      ),
      undergraduate: summarizeRetentionPopulation(
        populationFor((program) => program.degree_level === "Undergraduate"),
        nextFallIds,
      ),
      programs: Object.fromEntries(
        programs.map((program) => [
          program.program_id,
          summarizeRetentionPopulation(
            populationFor(
              (candidate) => candidate.program_id === program.program_id,
            ),
            nextFallIds,
          ),
        ]),
      ),
    },
  });
}

const retentionCubes = Object.fromEntries(
  Object.entries(retentionCubeMaps).map(([dimension, map]) => [
    dimension,
    [...map.values()].map((cell) => ({
      ...cell,
      rate: cell.cohortSize ? round(cell.retained / cell.cohortSize, 4) : 0,
    })),
  ]),
);

const sectionEnrollmentRowsBySection = new Map();
for (const enrollment of sectionEnrollments) {
  if (!sectionEnrollmentRowsBySection.has(enrollment.section_id)) {
    sectionEnrollmentRowsBySection.set(enrollment.section_id, []);
  }
  sectionEnrollmentRowsBySection.get(enrollment.section_id).push(enrollment);
}
const sectionFacts = sections.map((section) => {
  const program = programById.get(section.program_id);
  const enrollments = sectionEnrollmentRowsBySection.get(section.section_id) ?? [];
  const filled = enrollments.filter(
    (enrollment) => enrollment.enrollment_status === "Enrolled",
  ).length;
  const grades = enrollments
    .map((enrollment) => enrollment.final_grade?.trim())
    .filter(Boolean);
  const dfwCount = grades.filter((grade) =>
    /^(D|F|W)([+-])?$/i.test(grade),
  ).length;
  return {
    sectionId: section.section_id,
    termId: section.term_id,
    year: Number(section.term_id.slice(0, 4)),
    programId: section.program_id,
    programName: program?.program_name ?? section.program_id,
    degreeLevel: program?.degree_level ?? "Unknown",
    courseCode: section.course_code,
    modality: section.modality,
    instructorType: section.instructor_type,
    seats: Number(section.section_capacity),
    filled,
    utilization: Number(section.section_capacity)
      ? round(filled / Number(section.section_capacity), 4)
      : 0,
    gradedCount: grades.length,
    dfwCount,
    dfwRate: grades.length ? round(dfwCount / grades.length, 4) : null,
  };
});

function sampleRowsForRule(ruleId) {
  if (ruleId === "UG_FT_CREDIT_THRESHOLD") {
    return studentTerms
      .filter(
        (row) =>
          row.level === "UG" &&
          row.attendance_status === "F" &&
          Number(row.attempted_credits) < 12,
      )
      .slice(0, 5)
      .map((row) => ({
        student_id: row.student_id,
        term_id: row.term_id,
        program_id: row.program_id,
        attempted_credits: Number(row.attempted_credits),
        attendance_status: row.attendance_status,
      }));
  }
  if (ruleId === "DEMOGRAPHIC_COMPLETENESS") {
    return students
      .filter((row) => !row.race_ethnicity)
      .slice(0, 5)
      .map((row) => ({
        student_id: row.student_id,
        entry_term_id: row.entry_term_id,
        primary_program_id: row.primary_program_id,
        race_ethnicity: row.race_ethnicity || "(blank)",
      }));
  }
  if (ruleId === "AID_WITHOUT_ENROLLMENT") {
    return qualityIssueLog
      .filter((row) => row.rule_id === ruleId)
      .slice(0, 1)
      .map((row) => ({
        issue_id: row.issue_id,
        source_system: row.source_system,
        affected_records: Number(row.affected_records),
        note: "The current upload contains an aggregate finding; row-level aid records were not supplied.",
      }));
  }
  if (ruleId === "CIP_EFFECTIVE_DATING") {
    return programs.slice(0, 3).map((row) => ({
      program_id: row.program_id,
      program_name: row.program_name,
      cip_code: row.cip_code,
      active_from: row.active_from,
      active_to: row.active_to || "(current)",
    }));
  }
  return qualityIssueLog
    .filter((row) => row.rule_id === ruleId)
    .slice(0, 3)
    .map((row) => ({
      issue_id: row.issue_id,
      source_system: row.source_system,
      affected_records: Number(row.affected_records),
      status: row.status,
    }));
}

const qualityFindings = qualityIssueLog.map((issue, index) => ({
  issueId: issue.issue_id,
  severity: issue.severity,
  title: issue.title,
  description:
    issue.rule_id === "UG_FT_CREDIT_THRESHOLD"
      ? "Undergraduate students are coded full-time with fewer than 12 attempted credits in the governed census snapshot."
      : `The governed ${issue.source_system} check found records that violate ${issue.rule_id}.`,
  ruleId: issue.rule_id,
  affectedRecords: Number(issue.affected_records),
  owner: issue.owner,
  sourceSystem: issue.source_system,
  status: issue.status,
  lifecycleStatus:
    issue.status === "Resolved"
      ? "Resolved"
      : index % 5 === 0
        ? "Investigating"
        : index % 7 === 0
          ? "Reviewed"
          : "New",
  openedAt: issue.opened_at,
  resolvedAt: issue.resolved_at,
  sampleRows: sampleRowsForRule(issue.rule_id),
}));

const firedByImplementationRule = new Map();
for (const finding of qualityFindings) {
  firedByImplementationRule.set(
    finding.ruleId,
    (firedByImplementationRule.get(finding.ruleId) ?? 0) + finding.affectedRecords,
  );
}
const qualityRuleCatalog = DATA_QUALITY_RULES.map((rule) => ({
  ...rule,
  enabled: [
    "UG_FT_CREDIT_THRESHOLD",
    "DEMOGRAPHIC_COMPLETENESS",
    "AID_WITHOUT_ENROLLMENT",
    "CIP_EFFECTIVE_DATING",
    "YOY_HEADCOUNT_VARIANCE",
    "REFERENTIAL_INTEGRITY",
  ].includes(rule.implementationRule),
  lastFiredCount: firedByImplementationRule.get(rule.implementationRule) ?? 0,
  coverage:
    firedByImplementationRule.has(rule.implementationRule)
      ? "Covered under live rule"
      : [
            "UG_FT_CREDIT_THRESHOLD",
            "DEMOGRAPHIC_COMPLETENESS",
            "AID_WITHOUT_ENROLLMENT",
            "CIP_EFFECTIVE_DATING",
            "YOY_HEADCOUNT_VARIANCE",
            "REFERENTIAL_INTEGRITY",
          ].includes(rule.implementationRule)
        ? "Covered — no current finding"
        : "Cataloged — implementation pending",
}));

const ipedsComPackage = buildComPackage({
  completions,
  students,
  programs,
  unitId: Number(institutions[0].ipeds_unitid) || 999999,
  reportingYear: 2025,
});
const ipedsEfPackage = buildEfPackage({
  studentTerms,
  students,
  programs,
  unitId: Number(institutions[0].ipeds_unitid) || 999999,
  reportingTerm: "2025FA",
});
const ipedsMarts = JSON.parse(
  await fs.readFile(path.join(uploadDir, "ipeds_marts.json"), "utf8"),
);
const ipedsSuite = buildIpedsSuite({
  marts: ipedsMarts,
  studentTerms,
  students,
  financialAid,
  comPackage: ipedsComPackage,
  efPackage: ipedsEfPackage,
});
const ipedsSpecs = loadIpedsSpecs();

const askEduInsightDataset = {
  generatedAt: "2025-10-14T09:42:00-07:00",
  dataBoundary: institutions[0].data_classification,
  institution: {
    id: institutions[0].institution_id,
    name: institutions[0].institution_name,
  },
  catalogs: {
    years: fallTerms.map((term) => Number(term.term_id.slice(0, 4))),
    programs: programs.map((program) => ({
      programId: program.program_id,
      programName: program.program_name,
      degreeLevel: program.degree_level,
      college: program.college,
      cipCode: program.cip_code,
    })),
    residencies: [...new Set(students.map((student) => student.residency))].sort(),
    genders: [...new Set(students.map((student) => student.gender || "Unknown"))].sort(),
    raceEthnicities: [
      ...new Set(students.map((student) => student.race_ethnicity || "Unknown")),
    ].sort(),
    academicStatuses: [
      ...new Set(studentTerms.map((row) => row.academic_status || "Unknown")),
    ].sort(),
    colleges: [...new Set(programs.map((program) => program.college))].sort(),
    modalities: [...new Set(sections.map((section) => section.modality))].sort(),
    courses: [...new Set(sections.map((section) => section.course_code))].sort(),
  },
  enrollment: enrollmentSeries,
  enrollmentCubes,
  retention: retentionSeries,
  retentionCubes,
  ipedsReadiness: ipedsRuns.map((run) => ({
    runId: run.run_id,
    sequence: run.run_sequence,
    readiness: round(run.readiness, 4),
    passedChecks: run.passed_checks,
    totalChecks: run.total_checks,
    timestamp: run.timestamp,
  })),
  qualityIssues: qualityFindings,
  qualityRuleCatalog,
  ipedsChecks: ipedsResults.map((result) => ({
    runId: result.run_id,
    sequence: Number(result.run_sequence),
    surveyYear: result.survey_year,
    component: result.component,
    checkId: result.check_id,
    checkName: result.check_name,
    status: result.status,
    weight: Number(result.weight),
    timestamp: result.run_timestamp,
  })),
  capacity: programs
    .filter((program) => capacityByProgram.has(program.program_id))
    .map((program) => ({
      programId: program.program_id,
      programName: program.program_name,
      degreeLevel: program.degree_level,
      seats: capacityByProgram.get(program.program_id),
      filled: filledByProgram.get(program.program_id) ?? 0,
      utilization:
        (filledByProgram.get(program.program_id) ?? 0) /
        capacityByProgram.get(program.program_id),
    })),
  sections: sectionFacts,
  sourceFiles: [
    "students.csv",
    "student_terms.csv",
    "terms.csv",
    "programs.csv",
    "sections.csv",
    "section_enrollments.csv",
    "ipeds_validation_results.csv",
    "data_quality_issue_log.csv",
    "completions.csv",
    "financial_aid.csv",
  ],
};

const brief = [
  {
    priority: 1,
    severity: "critical",
    title: `${fullTimeCreditMismatch} full-time classifications look wrong`,
    subtitle: "Data Quality Agent · reconciled to SIS upload",
    destination: "quality",
    affectedRecords: fullTimeCreditMismatch,
    sourceFiles: ["student_terms.csv", "data_quality_issue_log.csv"],
  },
  {
    priority: 2,
    severity: "warning",
    title: `Fall headcount is ${Math.abs(headcountDelta * 100).toFixed(1)}% below last year`,
    subtitle: "Silent Error Monitor · census comparison",
    destination: "quality",
    affectedRecords: Math.abs(currentHeadcount - priorHeadcount),
    sourceFiles: ["student_terms.csv", "terms.csv"],
  },
  {
    priority: 3,
    severity: "calm",
    title: `Fall Enrollment is ${Math.round(currentIpedsRun.readiness * 100)}% submission-ready`,
    subtitle: `IPEDS Agent · ${currentIpedsRun.passed_checks} of ${currentIpedsRun.total_checks} checks passed`,
    destination: "ipeds",
    affectedRecords: 0,
    sourceFiles: ["ipeds_validation_results.csv"],
  },
];

const commandCenter = {
  generatedAt: "2025-10-14T09:42:00-07:00",
  pipelineVersion: "1.0.0",
  dataBoundary: institutions[0].data_classification,
  institution: {
    id: institutions[0].institution_id,
    name: institutions[0].institution_name,
    currentTerm: currentTerm.term_id,
    currentTermLabel: `${currentTerm.season} ${currentTerm.academic_year.slice(0, 4)}`,
    censusDate: currentTerm.census_date,
  },
  briefDate: "Oct 14, 2025",
  activeAgents: 5,
  qualityFindings,
  qualityRuleCatalog,
  ipedsComPackage,
  ipedsEfPackage,
  ipedsSuite,
  ipedsSpecs,
  kpis: {
    fallHeadcount: {
      label: "Fall headcount",
      value: currentHeadcount,
      display: currentHeadcount.toLocaleString("en-US"),
      comparisonValue: priorHeadcount,
      delta: round(headcountDelta, 5),
      deltaDisplay: formatSignedPercent(headcountDelta, 1),
      context: "as of census",
      trend: headcountByTerm.map((item) => item.value),
      sources: ["student_terms.csv", "terms.csv"],
    },
    firstYearRetention: {
      label: "First-year retention",
      value: round(currentRetention.rate, 4),
      display: `${(currentRetention.rate * 100).toFixed(1)}%`,
      comparisonValue: round(priorRetention.rate, 4),
      delta: round(currentRetention.rate - priorRetention.rate, 4),
      deltaDisplay: formatSignedPoints(currentRetention.rate - priorRetention.rate, 1),
      context: `${currentRetention.cohort_term_id.slice(0, 4)} FTFT cohort`,
      trend: retentionHistory.map((item) => round(item.rate * 100, 1)),
      sources: ["students.csv", "student_terms.csv", "terms.csv"],
    },
    ipedsReadiness: {
      label: "IPEDS readiness",
      value: round(currentIpedsRun.readiness, 4),
      display: `${Math.round(currentIpedsRun.readiness * 100)}%`,
      comparisonValue: round(priorIpedsRun.readiness, 4),
      delta: round(currentIpedsRun.readiness - priorIpedsRun.readiness, 4),
      deltaDisplay: formatSignedPoints(
        currentIpedsRun.readiness - priorIpedsRun.readiness,
        0,
      ),
      context: "Fall Enrollment",
      trend: ipedsRuns.map((run) => round(run.readiness * 100, 1)),
      sources: ["ipeds_validation_results.csv"],
    },
    openQualityIssues: {
      label: "Open quality issues",
      value: openQualityIssues.length,
      display: String(openQualityIssues.length),
      comparisonValue: priorWeekQuality,
      delta: openQualityIssues.length - priorWeekQuality,
      deltaDisplay: `${openQualityIssues.length - priorWeekQuality} this week`,
      context: `${criticalQualityIssues.length} critical`,
      trend: qualityHistory.map((item) => item.value),
      sources: ["data_quality_issue_log.csv"],
    },
  },
  brief,
  programSignals,
  activity: [
    {
      status: "complete",
      activity: "Reconciled Fall census snapshot",
      detail: `${studentTerms.length.toLocaleString("en-US")} student-term rows · source lineage retained`,
      time: "9:42",
    },
    {
      status: "complete",
      activity: "Validated Fall Enrollment package",
      detail: `${currentIpedsRun.passed_checks} checks passed · ${currentIpedsRun.total_checks - currentIpedsRun.passed_checks} need review`,
      time: "8:17",
    },
    {
      status: "complete",
      activity: "Evaluated data-quality rules",
      detail: `${openQualityIssues.length} open findings · ${fullTimeCreditMismatch} record-level mismatches reconciled`,
      time: "7:54",
    },
  ],
  audit: {
    runId: "RUN-2025-10-14-0942",
    steps: [
      {
        label: "Source upload",
        detail: `${Object.keys(contracts).length} files · ${students.length.toLocaleString("en-US")} students · ${studentTerms.length.toLocaleString("en-US")} student-term rows`,
      },
      {
        label: "Schema validation",
        detail: "All required files and columns passed",
      },
      {
        label: "Metric transformation",
        detail: "Command-center semantic rules v1.0.0",
      },
      {
        label: "Cross-source reconciliation",
        detail: `${fullTimeCreditMismatch} SIS mismatches agree with the issue log`,
      },
      {
        label: "Published result",
        detail: `${currentHeadcount.toLocaleString("en-US")} Fall students · generated 2025-10-14 09:42`,
      },
    ],
  },
  sourceManifest: [
    { file: "institution.csv", rows: institutions.length, role: "Institution context" },
    { file: "terms.csv", rows: terms.length, role: "Term and census definitions" },
    { file: "programs.csv", rows: programs.length, role: "Program hierarchy and CIP codes" },
    { file: "students.csv", rows: students.length, role: "Student cohort and demographic attributes" },
    { file: "student_terms.csv", rows: studentTerms.length, role: "Official enrollment snapshots" },
    { file: "sections.csv", rows: sections.length, role: "Course capacity" },
    { file: "section_enrollments.csv", rows: sectionEnrollments.length, role: "Filled seats" },
    { file: "ipeds_validation_results.csv", rows: ipedsResults.length, role: "IPEDS readiness" },
    { file: "data_quality_issue_log.csv", rows: qualityIssueLog.length, role: "Open and resolved findings" },
    { file: "completions.csv", rows: completions.length, role: "IPEDS Completions source population" },
    { file: "financial_aid.csv", rows: financialAid.length, role: "Financial aid and Pell-recipient source population" },
  ],
};

const validationReport = {
  status: "passed",
  generatedAt: commandCenter.generatedAt,
  checks: [
    { check: "required_files", status: "passed", files: Object.keys(contracts).length },
    { check: "required_columns", status: "passed" },
    { check: "unique_source_keys", status: "passed" },
    { check: "referential_integrity", status: "passed" },
    { check: "current_headcount", status: "passed", value: currentHeadcount },
    { check: "prior_headcount", status: "passed", value: priorHeadcount },
    { check: "retention_cohort", status: "passed", value: currentRetention.rate },
    { check: "full_time_credit_mismatch_reconciliation", status: "passed", value: fullTimeCreditMismatch },
    { check: "ipeds_weight_total", status: Math.abs(currentIpedsRun.total_weight - 100) < 0.001 ? "passed" : "failed", value: currentIpedsRun.total_weight },
  ],
};

await Promise.all([
  ...Object.values(ipedsSuite.packages).flatMap((surveyPackage) => [
    fs.writeFile(
      path.join(ipedsPackageDir, `${surveyPackage.fileStem}.txt`),
      surveyPackage.uploadText,
      "utf8",
    ),
    fs.writeFile(
      path.join(ipedsPackageDir, `${surveyPackage.fileStem}_review.csv`),
      surveyPackage.reviewCsv,
      "utf8",
    ),
  ]),
  fs.writeFile(
    path.join(processedDir, "command-center.json"),
    `${JSON.stringify(commandCenter, null, 2)}\n`,
    "utf8",
  ),
  fs.writeFile(
    path.join(appDataDir, "command-center.generated.json"),
    `${JSON.stringify(commandCenter, null, 2)}\n`,
    "utf8",
  ),
  fs.writeFile(
    path.join(appDataDir, "ask-eduinsight.generated.json"),
    `${JSON.stringify(askEduInsightDataset, null, 2)}\n`,
    "utf8",
  ),
  fs.writeFile(
    path.join(appDataDir, "ipeds-com.generated.json"),
    `${JSON.stringify(ipedsComPackage, null, 2)}\n`,
    "utf8",
  ),
  fs.writeFile(
    path.join(appDataDir, "ipeds-ef.generated.json"),
    `${JSON.stringify(ipedsEfPackage, null, 2)}\n`,
    "utf8",
  ),
  fs.writeFile(
    path.join(appDataDir, "ipeds-suite.generated.json"),
    `${JSON.stringify(ipedsSuite, null, 2)}\n`,
    "utf8",
  ),
  fs.writeFile(
    path.join(appDataDir, "ipeds-specs.generated.json"),
    `${JSON.stringify(ipedsSpecs, null, 2)}\n`,
    "utf8",
  ),
  fs.writeFile(
    path.join(processedDir, "validation-report.json"),
    `${JSON.stringify(validationReport, null, 2)}\n`,
    "utf8",
  ),
  fs.writeFile(
    path.join(processedDir, "command-center-kpis.csv"),
    toCsv(
      ["metric", "current_value", "comparison_value", "delta", "display"],
      [
        {
          metric: "fall_headcount",
          current_value: currentHeadcount,
          comparison_value: priorHeadcount,
          delta: headcountDelta,
          display: commandCenter.kpis.fallHeadcount.display,
        },
        {
          metric: "first_year_retention",
          current_value: currentRetention.rate,
          comparison_value: priorRetention.rate,
          delta: currentRetention.rate - priorRetention.rate,
          display: commandCenter.kpis.firstYearRetention.display,
        },
        {
          metric: "ipeds_readiness",
          current_value: currentIpedsRun.readiness,
          comparison_value: priorIpedsRun.readiness,
          delta: currentIpedsRun.readiness - priorIpedsRun.readiness,
          display: commandCenter.kpis.ipedsReadiness.display,
        },
        {
          metric: "open_quality_issues",
          current_value: openQualityIssues.length,
          comparison_value: priorWeekQuality,
          delta: openQualityIssues.length - priorWeekQuality,
          display: commandCenter.kpis.openQualityIssues.display,
        },
      ],
    ),
    "utf8",
  ),
]);

console.log(JSON.stringify({
  validation: validationReport,
  commandCenter: {
    headcount: commandCenter.kpis.fallHeadcount,
    retention: commandCenter.kpis.firstYearRetention,
    ipedsReadiness: commandCenter.kpis.ipedsReadiness,
    openQualityIssues: commandCenter.kpis.openQualityIssues,
    fullTimeCreditMismatch,
    programSignals,
  },
}, null, 2));
