import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import baselines from "../app/data/scenario-baselines.generated.json" with {
  type: "json",
};
import ipedsMarts from "../data/sample-university-upload/ipeds_marts.json" with {
  type: "json",
};
import {
  calculateEnrollmentMix,
  calculateFacultyAttrition,
  calculatePricingAndAid,
  calculateProgramCapacity,
  calculateRetentionImprovement,
  deriveFacultyStaffingPlanningRange,
} from "../lib/scenario-model.mjs";
import {
  financialDefinitionForMode,
  loadSavedScenarios,
  persistSavedScenarios,
  SAVED_SCENARIO_SCHEMA_VERSION,
} from "../lib/scenario-storage.mjs";

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
  const [headers, ...body] = rows;
  return body
    .filter((values) => values.some((value) => value !== ""))
    .map((values) =>
      Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
    );
}

function readUploadCsv(name) {
  return parseCsv(
    readFileSync(
      new URL(`../data/sample-university-upload/${name}`, import.meta.url),
      "utf8",
    ),
  );
}

const students = readUploadCsv("students.csv");
const studentTerms = readUploadCsv("student_terms.csv");
const financialAid = readUploadCsv("financial_aid.csv");
const programs = readUploadCsv("programs.csv");
const sections = readUploadCsv("sections.csv");
const sectionEnrollments = readUploadCsv("section_enrollments.csv");
const pageSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

function savedScenarioFixture(scenario) {
  return {
    schemaVersion: SAVED_SCENARIO_SCHEMA_VERSION,
    savedAt: "2026-08-23T00:00:00.000Z",
    financialDefinition: financialDefinitionForMode(scenario.mode),
    ...scenario,
  };
}

function rawRetentionBaseline() {
  const cohort = students.filter(
    (student) =>
      student.ftft_cohort_term_id === "2024FA" &&
      student.degree_seeking === "1",
  );
  const nextFall = new Set(
    studentTerms
      .filter(
        (row) =>
          row.term_id === "2025FA" &&
          row.census_enrolled === "1" &&
          row.reportable === "1",
      )
      .map((row) => row.student_id),
  );
  const retained = cohort.filter((student) => nextFall.has(student.student_id)).length;
  return { cohortSize: cohort.length, retained, rate: retained / cohort.length };
}

function rawProgramBaseline(programId) {
  const currentHeadcount = new Set(
    studentTerms
      .filter(
        (row) =>
          row.term_id === "2025FA" &&
          row.program_id === programId &&
          row.census_enrolled === "1" &&
          row.reportable === "1",
      )
      .map((row) => row.student_id),
  ).size;
  const currentSections = sections.filter(
    (section) =>
      section.term_id === "2025FA" && section.program_id === programId,
  );
  const sectionIds = new Set(currentSections.map((section) => section.section_id));
  const filledCourseSeats = sectionEnrollments.filter(
    (row) =>
      row.term_id === "2025FA" &&
      row.enrollment_status === "Enrolled" &&
      sectionIds.has(row.section_id),
  ).length;
  const courseSeatCapacity = currentSections.reduce(
    (total, section) => total + Number(section.section_capacity),
    0,
  );
  const program = programs.find((candidate) => candidate.program_id === programId);
  return {
    currentHeadcount,
    filledCourseSeats,
    courseSeatCapacity,
    sectionCount: currentSections.length,
    averageSectionCapacity: courseSeatCapacity / currentSections.length,
    tuitionAndFees:
      program?.degree_level === "Graduate"
        ? ipedsMarts.cost.graduateInStateTuition +
          ipedsMarts.cost.graduateRequiredFees
        : ipedsMarts.cost.undergraduateInStateTuition +
          ipedsMarts.cost.undergraduateRequiredFees,
  };
}

test("retention baseline and modeled outputs reconcile independently to raw cohort records", () => {
  const raw = rawRetentionBaseline();
  assert.deepEqual(raw, { cohortSize: 3000, retained: 2352, rate: 0.784 });
  assert.equal(baselines.retention.cohortSize, raw.cohortSize);
  assert.equal(baselines.retention.retained, raw.retained);
  assert.equal(baselines.retention.rate, raw.rate);

  for (const pointGain of [0, 1, 3, 8]) {
    const result = calculateRetentionImprovement(baselines, { pointGain });
    const additionalPerCohort = Math.round(raw.cohortSize * (pointGain / 100));
    const series = Array.from(
      { length: baselines.retention.horizonYears },
      (_, index) => additionalPerCohort * (index + 1),
    );
    const cumulativeAddedStudentYears = series.reduce((sum, value) => sum + value, 0);
    const yearFourGrossTuition =
      series.at(-1) * baselines.pricing.undergraduateTuitionAndFees;
    assert.equal(
      result.summary,
      `${(raw.rate * 100).toFixed(1)}% → ${((raw.rate + pointGain / 100) * 100).toFixed(1)}% if the ${pointGain.toFixed(1)}-point gain holds`,
    );
    assert.equal(result.metrics[0].value, additionalPerCohort);
    assert.deepEqual(result.series, series);
    assert.equal(result.metrics[2].value, cumulativeAddedStudentYears);
    assert.equal(result.metrics[3].value, yearFourGrossTuition);
    assert.equal(
      result.supportingComparisons[0].display,
      `${raw.retained.toLocaleString()} current → ${(raw.retained + additionalPerCohort).toLocaleString()} modeled`,
    );
  }

  const example = calculateRetentionImprovement(baselines, { pointGain: 3 });
  assert.deepEqual(example.series, [90, 180, 270, 360]);
  assert.equal(example.metrics[2].label, "Cumulative added student-years (Years 1–4)");
  assert.equal(example.metrics[2].value, 900);
  assert.equal(example.metrics[3].value, 360 * 14_800);
  assert.match(example.assumptions.join(" "), /transfer-out, external persistence/i);
});

test("tuition and aid arithmetic, semantics, and zero state derive from modeled Cost plus governed Pell inputs", () => {
  const undergraduateRate =
    ipedsMarts.cost.undergraduateInStateTuition +
    ipedsMarts.cost.undergraduateRequiredFees;
  const graduateRate =
    ipedsMarts.cost.graduateInStateTuition +
    ipedsMarts.cost.graduateRequiredFees;
  const pellStudents = new Set(
    financialAid
      .filter((row) => row.term_id === "2025FA" && row.pell_eligible === "1")
      .map((row) => row.student_id),
  ).size;
  assert.equal(undergraduateRate, 14_800);
  assert.equal(graduateRate, 16_530);
  assert.equal(pellStudents, 6_088);

  const states = [
    { undergraduatePriceChangePercent: 5, graduatePriceChangePercent: 0, additionalGrantPerPellEligible: 0 },
    { undergraduatePriceChangePercent: -3, graduatePriceChangePercent: 0, additionalGrantPerPellEligible: 0 },
    { undergraduatePriceChangePercent: 0, graduatePriceChangePercent: 4, additionalGrantPerPellEligible: 0 },
    { undergraduatePriceChangePercent: 0, graduatePriceChangePercent: 0, additionalGrantPerPellEligible: 1000 },
    { undergraduatePriceChangePercent: 2, graduatePriceChangePercent: 3, additionalGrantPerPellEligible: 750 },
    { undergraduatePriceChangePercent: 0, graduatePriceChangePercent: 0, additionalGrantPerPellEligible: 0 },
  ];
  const baselineGrossTuition =
    baselines.enrollment.undergraduateHeadcount * undergraduateRate +
    baselines.enrollment.graduateHeadcount * graduateRate;

  for (const state of states) {
    const result = calculatePricingAndAid(baselines, state);
    const ugGrossChange =
      baselines.enrollment.undergraduateHeadcount *
      undergraduateRate *
      (state.undergraduatePriceChangePercent / 100);
    const grGrossChange =
      baselines.enrollment.graduateHeadcount *
      graduateRate *
      (state.graduatePriceChangePercent / 100);
    const addedAid = pellStudents * state.additionalGrantPerPellEligible;
    assert.equal(result.metrics[0].value, ugGrossChange);
    assert.equal(result.metrics[1].value, grGrossChange);
    assert.equal(result.metrics[2].value, addedAid);
    assert.equal(result.metrics[3].value, ugGrossChange + grGrossChange - addedAid);
    assert.equal(result.comparison.headcountImpact, 0);
    assert.equal(result.details.coveredStudents, pellStudents);
    assert.equal(
      result.details.modeledGrantOffsetPerPellEligibleStudent,
      state.additionalGrantPerPellEligible
        ? -state.additionalGrantPerPellEligible
        : 0,
    );
    assert.equal(
      result.details.additionalGrantShareOfBaselineGrossTuitionPercent,
      baselineGrossTuition ? (addedAid / baselineGrossTuition) * 100 : 0,
    );
  }

  const allZero = calculatePricingAndAid(baselines, states.at(-1));
  assert.deepEqual(allZero.metrics.map((metric) => metric.value), [0, 0, 0, 0]);
  assert.equal(allZero.details.additionalGrantShareOfBaselineGrossTuitionPercent, 0);
  assert.match(allZero.metrics[0].label, /aggregate gross tuition change/i);
  assert.match(allZero.metrics[3].label, /less modeled additional grant aid/i);
  assert.doesNotMatch(JSON.stringify(allZero), /discount-rate|net revenue|profit/i);
});

test("program capacity chain reconciles raw program enrollment, registrations, capacity, sections, FTE, and tuition", () => {
  for (const programId of ["PCS", "PBA"]) {
    const raw = rawProgramBaseline(programId);
    const governed = baselines.programs.find((program) => program.programId === programId);
    assert.equal(governed.currentHeadcount, raw.currentHeadcount);
    assert.equal(governed.filledCourseSeats, raw.filledCourseSeats);
    assert.equal(governed.courseSeatCapacity, raw.courseSeatCapacity);
    assert.equal(governed.averageSectionCapacity, raw.averageSectionCapacity);

    for (const growthPercent of [0, 20, -10, 40]) {
      const result = calculateProgramCapacity(baselines, { programId, growthPercent });
      const headcountChange = Math.round(raw.currentHeadcount * (growthPercent / 100));
      const modeledHeadcount = raw.currentHeadcount + headcountChange;
      const modeledDemand = Math.round(raw.filledCourseSeats * (1 + growthPercent / 100));
      const remaining = raw.courseSeatCapacity - modeledDemand;
      const sectionsNeeded =
        remaining < 0 ? Math.ceil(Math.abs(remaining) / raw.averageSectionCapacity) : 0;
      assert.equal(result.metrics[0].value, modeledHeadcount);
      assert.equal(result.metrics[1].value, modeledDemand / raw.courseSeatCapacity);
      assert.equal(result.metrics[2].value, remaining);
      assert.equal(result.metrics[3].value, sectionsNeeded);
      assert.equal(result.comparison.headcountImpact, headcountChange);
      assert.equal(
        result.comparison.capacitySeatImpact,
        modeledDemand - raw.filledCourseSeats,
      );
      assert.equal(
        result.comparison.facultyFteImpact,
        Math.round((sectionsNeeded / baselines.enrollment.sectionsPerFacultyFte) * 10) / 10,
      );
      assert.equal(result.comparison.annualRevenueImpact, headcountChange * raw.tuitionAndFees);
    }
  }

  const pcs = calculateProgramCapacity(baselines, { programId: "PCS", growthPercent: 20 });
  assert.deepEqual(
    [pcs.metrics[0].value, pcs.comparison.headcountImpact, pcs.comparison.capacitySeatImpact],
    [814, 136, 488],
  );
  assert.equal(pcs.metrics[1].value, 2929 / 2520);
  assert.equal(pcs.metrics[2].value, -409);
  assert.equal(pcs.metrics[3].value, Math.ceil(409 / 35));
  assert.equal(pcs.comparison.facultyFteImpact, 1.5);
  assert.equal(pcs.comparison.annualRevenueImpact, 136 * 16_530);
  assert.match(pcs.supportingComparisons[0].display, /96\.9% current → 116\.2% modeled/);
  assert.match(pcs.supportingComparisons[1].display, /79 seats currently remaining → 409-seat modeled shortfall/);
  assert.equal(pcs.program.memoryRecordId, "analysis-cs-capacity");
  const otherProgram = calculateProgramCapacity(baselines, { programId: "PBA", growthPercent: 20 });
  assert.equal(otherProgram.program.memoryRecordId, null);
});

test("faculty staffing chain uses modeled HR counts and keeps supply loss separate from enrollment", () => {
  const fullTimeInstructional = ipedsMarts.employees.filter(
    (employee) => employee.instructional && employee.fullTime,
  );
  assert.equal(fullTimeInstructional.length, 248);
  assert.equal(
    fullTimeInstructional.filter((employee) => Number.isFinite(employee.hireYear)).length,
    0,
  );
  const planningRange = deriveFacultyStaffingPlanningRange(
    baselines.faculty.fullTimeInstructionalCount,
  );
  for (const positionsNotReplaced of [0, 1, 5, planningRange.maximum, 0]) {
    const result = calculateFacultyAttrition(baselines, { positionsNotReplaced });
    const sectionsLost =
      positionsNotReplaced * baselines.faculty.sectionsPerFacultyFteAssumption;
    const seatCapacityChange = positionsNotReplaced
      ? -sectionsLost * baselines.faculty.seatsPerSectionAssumption
      : 0;
    assert.equal(result.metrics[0].value, positionsNotReplaced);
    assert.equal(result.metrics[0].display, positionsNotReplaced.toLocaleString());
    assert.equal(result.metrics[1].value, 248 - positionsNotReplaced);
    assert.equal(result.metrics[2].value, sectionsLost);
    assert.equal(result.metrics[2].display, sectionsLost.toLocaleString());
    assert.equal(result.metrics[3].value, seatCapacityChange);
    assert.equal(
      result.comparison.facultyFteImpact,
      positionsNotReplaced ? -positionsNotReplaced : 0,
    );
    assert.equal(result.comparison.headcountImpact, 0);
    assert.equal(result.comparison.annualRevenueImpact, 0);
  }
});

test("faculty staffing UI planning range is baseline-relative, disclosed, and shares one scale definition", () => {
  const baseline = baselines.faculty.fullTimeInstructionalCount;
  const planningRange = deriveFacultyStaffingPlanningRange(baseline);
  assert.deepEqual(planningRange, {
    minimum: 0,
    maximum: Math.round(baseline * 0.1),
    midpoint: Math.floor(Math.round(baseline * 0.1) / 2),
    step: 1,
  });
  assert.equal(baseline, 248);
  assert.equal(planningRange.maximum, 25);
  assert.equal(planningRange.midpoint, 12);
  assert.match(
    pageSource,
    /SCENARIO_CONTROL_METADATA\.faculty\.positions\.defaultValue/,
  );
  assert.match(
    pageSource,
    /min=\{facultyPlanningRange\.minimum\}[\s\S]*max=\{facultyPlanningRange\.maximum\}[\s\S]*step=\{facultyPlanningRange\.step\}/,
  );
  assert.match(
    pageSource,
    /<span>\{facultyPlanningRange\.minimum\}<\/span>[\s\S]*<span>\{facultyPlanningRange\.midpoint\}<\/span>[\s\S]*<span>\{facultyPlanningRange\.maximum\}<\/span>/,
  );
  assert.match(
    pageSource,
    /Planning range: up to \$\{facultyPlanningRange\.maximum\} positions/,
  );
  assert.match(pageSource, /~10% of the modeled/);
  assert.doesNotMatch(pageSource, /max="20"/);
  assert.doesNotMatch(
    pageSource,
    /<div className="range-labels"><span>0<\/span><span>10<\/span><span>20<\/span><\/div>/,
  );
});

test("faculty staffing planning maximum calculates correctly and the calculator retains its full-baseline clamp", () => {
  const baseline = baselines.faculty.fullTimeInstructionalCount;
  const planningMaximum = deriveFacultyStaffingPlanningRange(baseline).maximum;
  const result = calculateFacultyAttrition(baselines, {
    positionsNotReplaced: planningMaximum,
  });
  const expectedRemaining = baseline - planningMaximum;
  const expectedSectionsLost =
    planningMaximum * baselines.faculty.sectionsPerFacultyFteAssumption;
  const expectedSeatChange =
    -expectedSectionsLost * baselines.faculty.seatsPerSectionAssumption;
  assert.equal(result.metrics[0].value, planningMaximum);
  assert.equal(result.metrics[1].value, expectedRemaining);
  assert.equal(result.metrics[2].value, expectedSectionsLost);
  assert.equal(result.metrics[3].value, expectedSeatChange);
  assert.equal(result.comparison.facultyFteImpact, -planningMaximum);

  const clamped = calculateFacultyAttrition(baselines, {
    positionsNotReplaced: baseline + planningMaximum,
  });
  assert.equal(clamped.metrics[0].value, baseline);
  assert.equal(clamped.metrics[1].value, 0);
});

test("four hardened scenarios remain isolated, deterministic, and persist exact saved inputs and results", () => {
  const cases = [
    ["retention", { pointGain: 3 }, calculateRetentionImprovement(baselines, { pointGain: 3 })],
    [
      "pricing",
      { undergraduatePriceChangePercent: 2, graduatePriceChangePercent: 1, additionalGrantPerPellEligible: 500 },
      calculatePricingAndAid(baselines, { undergraduatePriceChangePercent: 2, graduatePriceChangePercent: 1, additionalGrantPerPellEligible: 500 }),
    ],
    ["capacity", { programId: "PCS", growthPercent: 20 }, calculateProgramCapacity(baselines, { programId: "PCS", growthPercent: 20 })],
    ["faculty", { positionsNotReplaced: 5 }, calculateFacultyAttrition(baselines, { positionsNotReplaced: 5 })],
  ];
  const scenarios = cases.flatMap(([mode, inputs, result]) => [
    savedScenarioFixture({ id: `${mode}-a`, name: `${mode} A`, mode, inputs, result }),
    savedScenarioFixture({ id: `${mode}-b`, name: `${mode} B`, mode, inputs: structuredClone(inputs), result: structuredClone(result) }),
  ]);
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  persistSavedScenarios(storage, scenarios);
  const restored = loadSavedScenarios(storage);
  assert.equal(restored.length, 8);
  assert.deepEqual(restored, scenarios);
  for (const [, , result] of cases) {
    assert.deepEqual(result, structuredClone(result));
  }
  assert.notDeepEqual(restored[0].result, restored[2].result);
});

test("UI semantics preserve zero bars, contextual comparisons, limitations, and the governed capacity link", () => {
  assert.match(pageSource, /SCENARIO_CONTROL_METADATA\.retention\.pointGain\.defaultValue/);
  assert.match(pageSource, /SCENARIO_CONTROL_METADATA\.capacity\.growth\.defaultValue/);
  assert.match(pageSource, /SCENARIO_CONTROL_METADATA\.faculty\.positions\.defaultValue/);
  assert.match(pageSource, /if \(mode === "retention"\)/);
  assert.match(pageSource, /if \(mode === "pricing"\)/);
  assert.match(pageSource, /if \(mode === "capacity"\)/);
  assert.match(pageSource, /if \(mode === "faculty"\)/);
  assert.match(pageSource, /value === 0 \? 0/);
  assert.match(pageSource, /deriveScenarioBarPresentation/);
  assert.match(pageSource, /bar\.widthPercent \?\? 0/);
  assert.match(pageSource, /Modeled grant offset per Pell-eligible student/);
  assert.match(pageSource, /Added grant aid as share of baseline gross tuition/);
  assert.match(pageSource, /result\.supportingComparisons/);
  assert.match(pageSource, /result\.program\?\.memoryRecordId/);
  assert.match(pageSource, /Open the governed Computer Science capacity review/);
  assert.match(pageSource, /Interpretation, not prediction/);
});

test("Enrollment Mix remains unchanged while the other four scenarios are hardened", () => {
  const result = calculateEnrollmentMix(baselines, {
    undergraduateChangePercent: 0,
    graduateChangePercent: 15,
  });
  const graduateChange = Math.round(
    baselines.enrollment.graduateHeadcount * 0.15,
  );
  assert.equal(graduateChange, 342);
  assert.equal(result.metrics[1].value, graduateChange);
  assert.equal(result.comparison.headcountImpact, graduateChange);
  assert.equal(
    result.comparison.annualRevenueImpact,
    graduateChange * baselines.pricing.graduateTuitionAndFees,
  );
});
