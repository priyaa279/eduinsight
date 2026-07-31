import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const uploadDir = path.join(projectRoot, "data", "sample-university-upload");

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
      } else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  const [headers, ...data] = rows.filter((item) => item.some(Boolean));
  return data.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );
}

async function readCsv(name) {
  return parseCsv(await fs.readFile(path.join(uploadDir, name), "utf8"));
}

function raceSexCode(student) {
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
  const sex = student.gender === "Woman" ? 2 : student.gender === "Man" ? 1 : 3;
  return { race, sex };
}

const [institutions, students, studentTerms, aid] = await Promise.all([
  readCsv("institution.csv"),
  readCsv("students.csv"),
  readCsv("student_terms.csv"),
  readCsv("financial_aid.csv"),
]);

const unitId = Number(institutions[0].ipeds_unitid) || 999999;
const studentById = new Map(students.map((row) => [row.student_id, row]));
const aidByStudent = new Map(aid.map((row) => [row.student_id, row]));
const fall2025 = studentTerms.filter(
  (row) => row.term_id === "2025FA" && row.census_enrolled === "1" && row.reportable === "1",
);
const ugFall = fall2025.filter((row) => row.level === "UG");
const firstTimeUg = ugFall.filter((row) => studentById.get(row.student_id)?.entry_type === "First-time");

const employeeOccupations = [
  "Instructional",
  "Research",
  "Public service",
  "Management",
  "Business and financial operations",
  "Computer, engineering, and science",
  "Student and academic affairs",
  "Office and administrative support",
];
const employees = Array.from({ length: 540 }, (_, index) => {
  const instructional = index < 310;
  const fullTime = index % 5 !== 0;
  const sex = index % 3 === 0 ? 2 : 1;
  const race = (index % 8) + 1;
  const rank = instructional ? (index % 5) + 1 : 0;
  const salary = fullTime ? 56000 + (index % 9) * 6200 : 21000 + (index % 5) * 2800;
  const occupationCode = instructional ? 1 : (index % 7) + 2;
  return {
    employeeId: `E${String(index + 1).padStart(5, "0")}`,
    fullTime,
    instructional,
    occupation: employeeOccupations[occupationCode - 1],
    occupationCode,
    occupationCode2: Math.min(occupationCode, 14),
    occupationCode3: instructional ? 1 : occupationCode,
    occupationCode4: ((index % 3) + 1),
    occupationCode5: Math.min(occupationCode, 15),
    instructionalFunction: (index % 5) + 1,
    tenure: instructional ? (index % 4) + 1 : 0,
    rank,
    race,
    sex,
    raceEthnicitySex: (race - 1) * 2 + sex,
    months: fullTime ? 12 - (index % 4) : 9,
    salary,
    newHire: index % 17 === 0,
    graduateAssistant: !fullTime && index % 11 === 0,
    medicalSchool: false,
  };
});

const grBase = firstTimeUg.slice(0, Math.min(3000, firstTimeUg.length));
const grCohort = grBase.map((termRow, index) => {
  const student = studentById.get(termRow.student_id);
  const exclusionReason =
    index % 149 === 0
      ? "death_or_disability"
      : index % 211 === 0
        ? "armed_forces"
        : index % 307 === 0
          ? "foreign_aid_service"
          : index % 401 === 0
            ? "religious_mission"
            : "";
  const completed150 = !exclusionReason && index % 10 < 6;
  const completed200 = !exclusionReason && (completed150 || index % 10 === 6);
  const { race, sex } = raceSexCode(student);
  const aidRow = aidByStudent.get(termRow.student_id);
  return {
    studentId: termRow.student_id,
    race,
    sex,
    exclusionReason,
    completed150,
    completed200,
    stillEnrolled: !completed200 && index % 3 === 0,
    pellRecipient: aidRow?.pell_recipient === "1",
    directLoanRecipient: Number(aidRow?.federal_loan_amount || 0) > 0,
  };
});

const outcomeCohort = ugFall.slice(0, Math.min(4200, ugFall.length)).map((termRow, index) => {
  const aidRow = aidByStudent.get(termRow.student_id);
  const award =
    index % 10 < 6 ? "bachelors" : index % 10 === 6 ? "associates" : index % 10 === 7 ? "certificate" : "";
  return {
    studentId: termRow.student_id,
    attendance: termRow.attendance_status === "F" ? "full_time" : "part_time",
    entry: studentById.get(termRow.student_id)?.entry_type === "First-time" ? "first_time" : "non_first_time",
    recipientType:
      aidRow?.pell_recipient === "1"
        ? 1
        : Number(aidRow?.federal_loan_amount || 0) > 0
          ? 2
          : 3,
    exclusion: index % 257 === 0,
    award,
    completedAtInstitution: Boolean(award),
    stillEnrolledAtInstitution: !award && index % 2 === 0,
    outcomeUnknown: !award && index % 2 !== 0,
  };
});

const applicants = 12840;
const admitted = 8760;
const enrolled = firstTimeUg.length;
const admissionRaceSex = [];
for (let race = 1; race <= 9; race += 1) {
  for (let sex = 1; sex <= 2; sex += 1) {
    const weight = race === 7 ? 0.21 : race === 5 ? 0.17 : race === 4 ? 0.15 : 0.47 / 6;
    const sexWeight = sex === 1 ? 0.48 : 0.52;
    admissionRaceSex.push({
      race,
      sex,
      applicants: Math.round(applicants * weight * sexWeight),
      admitted: Math.round(admitted * weight * sexWeight),
      enrolled: Math.round(enrolled * weight * sexWeight),
    });
  }
}

const transferUg = ugFall.filter(
  (row) => studentById.get(row.student_id)?.entry_type === "Transfer",
);
const transferCells = new Map();
const transferUnknownSex = { applicants: 0, admitted: 0, enrolled: 0 };
for (const termRow of transferUg) {
  const student = studentById.get(termRow.student_id);
  const { race, sex } = raceSexCode(student);
  const modeled = {
    applicants: Math.max(1, Math.round(1 / 0.47)),
    admitted: Math.max(1, Math.round(1 / 0.72)),
    enrolled: 1,
  };
  if (sex === 3) {
    transferUnknownSex.applicants += modeled.applicants;
    transferUnknownSex.admitted += modeled.admitted;
    transferUnknownSex.enrolled += modeled.enrolled;
    continue;
  }
  const key = `${race}|${sex}`;
  const current = transferCells.get(key) ?? { race, sex, applicants: 0, admitted: 0, enrolled: 0 };
  current.applicants += modeled.applicants;
  current.admitted += modeled.admitted;
  current.enrolled += modeled.enrolled;
  transferCells.set(key, current);
}
const transferRaceSex = [...transferCells.values()];
const transferApplicants =
  transferRaceSex.reduce((sum, row) => sum + row.applicants, 0) +
  transferUnknownSex.applicants;
const transferAdmitted =
  transferRaceSex.reduce((sum, row) => sum + row.admitted, 0) +
  transferUnknownSex.admitted;

const marts = {
  version: "atlas-valley-ipeds-marts.v2025_26",
  generatedAt: "2026-07-30T00:00:00-07:00",
  synthetic: true,
  unitId,
  institution: {
    name: institutions[0].institution_name,
    control: "Public",
    sector: "4-year degree-granting",
    calendarSystem: "Semester",
    financeStandard: "GASB",
    missionUrl: "https://www.atlasvalley.example/mission",
    awardLevels: [5, 7],
    hasTenureSystem: true,
    address: "100 University Way",
    city: "Atlas Valley",
    state: "CA",
    zip: "90001",
  },
  cost: {
    applicationFeeUndergraduate: 65,
    applicationFeeGraduate: 75,
    undergraduateInDistrictTuition: 12960,
    undergraduateInStateTuition: 12960,
    undergraduateOutOfStateTuition: 31740,
    undergraduateRequiredFees: 1840,
    graduateInStateTuition: 14880,
    graduateOutOfStateTuition: 28620,
    graduateRequiredFees: 1650,
    booksAndSupplies: 1240,
    foodAndHousingOnCampus: 14760,
    otherOnCampus: 3380,
    foodAndHousingOffCampus: 15420,
    otherOffCampus: 4210,
  },
  admissions: {
    caveat: "Estimated admissions funnel — derived from enrolled headcount, not a real applicant-tracking source. Replace it with governed applicant records before an actual submission.",
    openAdmission: false,
    applicants,
    admitted,
    enrolled,
    raceSex: admissionRaceSex,
    sat: { count: 1180, percent: 37, verbal25: 560, verbal50: 620, verbal75: 680, math25: 570, math50: 635, math75: 700 },
    act: { count: 640, percent: 20, composite25: 23, composite50: 27, composite75: 30, english25: 22, english50: 26, english75: 30, math25: 22, math50: 27, math75: 30 },
    transfer: {
      derivation: "Back-solved from the governed Fall 2025 transfer-enrollee population using documented admission and yield assumptions.",
      applicants: transferApplicants,
      admitted: transferAdmitted,
      enrolled: transferUg.length,
      raceSex: transferRaceSex,
      unknownSex: transferUnknownSex,
      sat: { count: 0, percent: 0, verbal25: -2, verbal50: -2, verbal75: -2, math25: -2, math50: -2, math75: -2 },
      act: { count: 0, percent: 0, composite25: -2, composite50: -2, composite75: -2, english25: -2, english50: -2, english75: -2, math25: -2, math50: -2, math75: -2 },
    },
  },
  finance: {
    caveat: "Realistic synthetic GASB summary; replace with an audited general-ledger or financial-statement extract before an actual submission.",
    fiscalYear: { beginMonth: 7, beginYear: 2024, endMonth: 6, endYear: 2025 },
    assets: 684200000,
    liabilities: 214500000,
    netPosition: 469700000,
    tuitionRevenue: 238400000,
    federalAppropriations: 18500000,
    stateAppropriations: 162000000,
    localAppropriations: 12400000,
    grantsContracts: 94700000,
    gifts: 38200000,
    investmentIncome: 17100000,
    auxiliaryRevenue: 68800000,
    instructionExpense: 241000000,
    researchExpense: 89500000,
    publicServiceExpense: 32600000,
    academicSupportExpense: 62400000,
    studentServicesExpense: 47500000,
    institutionalSupportExpense: 71100000,
    scholarshipsExpense: 53600000,
  },
  employees,
  grCohort,
  outcomeCohort,
  fallSupplemental: {
    newNonDegreeCount: Math.round(ugFall.length * 0.018),
    enteringClassCount: firstTimeUg.length,
    studentFacultyRatio: Math.round(ugFall.length / employees.filter((row) => row.instructional && row.fullTime).length),
    distanceExclusive: Math.round(fall2025.length * 0.18),
    distanceSome: Math.round(fall2025.length * 0.27),
    retentionFullTimePrior: 2600,
    retentionFullTimeCurrent: 2106,
    retentionPartTimePrior: 400,
    retentionPartTimeCurrent: 276,
  },
  twelveMonth: {
    summerParticipants: Math.round(fall2025.length * 0.22),
    undergraduateCreditHours: ugFall.reduce((sum, row) => sum + Number(row.attempted_credits || 0), 0) * 2 + 51500,
    graduateCreditHours: fall2025.filter((row) => row.level === "GR").reduce((sum, row) => sum + Number(row.attempted_credits || 0), 0) * 2 + 28400,
    dualEnrolled: Math.round(ugFall.length * 0.035),
    highSchoolWithinDistrict: Math.round(ugFall.length * 0.018),
    highSchoolOutsideDistrict: Math.round(ugFall.length * 0.009),
  },
};

await fs.writeFile(
  path.join(uploadDir, "ipeds_marts.json"),
  `${JSON.stringify(marts, null, 2)}\n`,
  "utf8",
);

const manifestPath = path.join(uploadDir, "manifest.json");
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
manifest.files = [
  ...manifest.files.filter((item) => item.file !== "ipeds_marts.json"),
  {
    file: "ipeds_marts.json",
    system: "IPEDS governed source marts",
    rows: employees.length + grCohort.length + outcomeCohort.length,
  },
];
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify({
    file: "ipeds_marts.json",
    employees: employees.length,
    grCohort: grCohort.length,
    outcomeCohort: outcomeCohort.length,
  }),
);
