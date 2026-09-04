import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deriveEligibleCapacityPrograms } from "../lib/scenario-model.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const uploadDir = path.join(projectRoot, "data", "sample-university-upload");
const appDataDir = path.join(projectRoot, "app", "data");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
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
  const [headers, ...dataRows] = rows.filter((item) =>
    item.some((value) => value !== ""),
  );
  return dataRows.map((values) =>
    Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    ),
  );
}

async function readCsv(fileName) {
  return parseCsv(await fs.readFile(path.join(uploadDir, fileName), "utf8"));
}

const [
  commandCenter,
  askData,
  ipedsMarts,
  studentTerms,
  financialAid,
  programs,
  sections,
  sectionEnrollments,
] = await Promise.all([
  fs
    .readFile(path.join(appDataDir, "command-center.generated.json"), "utf8")
    .then(JSON.parse),
  fs
    .readFile(path.join(appDataDir, "ask-eduinsight.generated.json"), "utf8")
    .then(JSON.parse),
  fs
    .readFile(path.join(uploadDir, "ipeds_marts.json"), "utf8")
    .then(JSON.parse),
  readCsv("student_terms.csv"),
  readCsv("financial_aid.csv"),
  readCsv("programs.csv"),
  readCsv("sections.csv"),
  readCsv("section_enrollments.csv"),
]);

const termId = commandCenter.institution.currentTerm;
const currentStudentTerms = studentTerms.filter(
  (row) =>
    row.term_id === termId &&
    row.census_enrolled === "1" &&
    row.reportable === "1",
);
const distinctByLevel = (level) =>
  new Set(
    currentStudentTerms
      .filter((row) => row.level === level)
      .map((row) => row.student_id),
  ).size;
const currentHeadcountByProgram = new Map();
for (const row of currentStudentTerms) {
  const studentIds =
    currentHeadcountByProgram.get(row.program_id) ?? new Set();
  studentIds.add(row.student_id);
  currentHeadcountByProgram.set(row.program_id, studentIds);
}

const currentAid = financialAid.filter((row) => row.term_id === termId);
const pellEligibleStudents = currentAid.filter(
  (row) => row.pell_eligible === "1",
).length;

const currentSections = sections.filter((row) => row.term_id === termId);
const sectionById = new Map(
  currentSections.map((section) => [section.section_id, section]),
);
const capacityByProgram = new Map();
const sectionCountByProgram = new Map();
for (const section of currentSections) {
  capacityByProgram.set(
    section.program_id,
    (capacityByProgram.get(section.program_id) ?? 0) +
      Number(section.section_capacity),
  );
  sectionCountByProgram.set(
    section.program_id,
    (sectionCountByProgram.get(section.program_id) ?? 0) + 1,
  );
}
const filledByProgram = new Map();
for (const enrollment of sectionEnrollments.filter(
  (row) =>
    row.term_id === termId && row.enrollment_status === "Enrolled",
)) {
  const section = sectionById.get(enrollment.section_id);
  if (!section) continue;
  filledByProgram.set(
    section.program_id,
    (filledByProgram.get(section.program_id) ?? 0) + 1,
  );
}

const retention = askData.retention.at(-1)?.groups?.all;
if (!retention) {
  throw new Error("The current governed retention cohort is unavailable.");
}

const fullTimeInstructional = ipedsMarts.employees.filter(
  (employee) => employee.instructional && employee.fullTime,
);
const tenureCounts = {
  tenured: fullTimeInstructional.filter((employee) => employee.tenure === 1)
    .length,
  tenureTrack: fullTimeInstructional.filter(
    (employee) => employee.tenure === 2,
  ).length,
  other: fullTimeInstructional.filter((employee) =>
    [3, 4].includes(employee.tenure),
  ).length,
};

const cost = ipedsMarts.cost;
const enrollmentBaseline = {
  undergraduateHeadcount: distinctByLevel("UG"),
  graduateHeadcount: distinctByLevel("GR"),
  studentsPerSection: 24,
  sectionsPerFacultyFte: 8,
  sources: ["student_terms.csv", "terms.csv"],
};
const pricingBaseline = {
  undergraduateTuitionAndFees:
    cost.undergraduateInStateTuition + cost.undergraduateRequiredFees,
  graduateTuitionAndFees:
    cost.graduateInStateTuition + cost.graduateRequiredFees,
  basis: "Published in-state tuition and required fees",
  sources: ["ipeds_marts.json — modeled demonstration Cost contract"],
  limitation:
    "IPEDS Cost values are modeled demonstration inputs, not operational institutional finance data.",
};
const capacityProgramCandidates = programs.map((program) => {
  const capacity = capacityByProgram.get(program.program_id) ?? 0;
  const sectionCount = sectionCountByProgram.get(program.program_id) ?? 0;
  return {
    programId: program.program_id,
    name: program.program_name,
    currentHeadcount:
      currentHeadcountByProgram.get(program.program_id)?.size ?? 0,
    filledCourseSeats: filledByProgram.get(program.program_id) ?? 0,
    courseSeatCapacity: capacity,
    sectionCount,
    averageSectionCapacity: sectionCount ? capacity / sectionCount : 0,
    tuitionAndFees:
      program.degree_level === "Graduate"
        ? pricingBaseline.graduateTuitionAndFees
        : program.degree_level === "Undergraduate"
          ? pricingBaseline.undergraduateTuitionAndFees
          : null,
    memoryRecordId:
      program.program_id === "PCS" ? "analysis-cs-capacity" : null,
  };
});
const eligibleCapacityPrograms = deriveEligibleCapacityPrograms({
  enrollment: enrollmentBaseline,
  pricing: pricingBaseline,
  programs: capacityProgramCandidates,
});
const scenarioBaselines = {
  version: "scenario-baselines.v2025_26",
  generatedAt: commandCenter.generatedAt,
  institution: commandCenter.institution,
  enrollment: enrollmentBaseline,
  retention: {
    cohortYear: askData.retention.at(-1).cohortYear,
    cohortSize: retention.cohortSize,
    retained: retention.retained,
    rate: retention.rate,
    horizonYears: 4,
    sources: ["students.csv", "student_terms.csv", "terms.csv"],
  },
  pricing: pricingBaseline,
  aid: {
    pellEligibleStudents,
    sources: ["financial_aid.csv"],
    limitation:
      "The current upload identifies Pell eligibility but does not contain a governed institutional-grant award amount.",
  },
  programs: eligibleCapacityPrograms,
  faculty: {
    fullTimeInstructionalCount: fullTimeInstructional.length,
    tenureCounts,
    hireYearAvailable: fullTimeInstructional.every(
      (employee) => Number.isFinite(employee.hireYear),
    ),
    sectionsPerFacultyFteAssumption: 8,
    seatsPerSectionAssumption: 24,
    sources: ["ipeds_marts.json — modeled demonstration HR contract"],
    limitation:
      "The current HR source does not include hire_year, so retirement eligibility and timing cannot be modeled.",
    sourceLimitation:
      "IPEDS HR values are modeled demonstration inputs, not an operational human-resources source.",
  },
};

await fs.writeFile(
  path.join(appDataDir, "scenario-baselines.generated.json"),
  `${JSON.stringify(scenarioBaselines, null, 2)}\n`,
);

console.log(
  `Scenario baselines generated for ${termId}: ${scenarioBaselines.enrollment.undergraduateHeadcount} UG, ${scenarioBaselines.enrollment.graduateHeadcount} GR.`,
);
