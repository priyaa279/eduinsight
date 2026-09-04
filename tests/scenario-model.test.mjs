import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
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
  deriveScenarioEffect,
} from "../lib/scenario-model.mjs";
import {
  financialDefinitionForMode,
  loadSavedScenarios,
  persistSavedScenarios,
  SAVED_SCENARIO_SCHEMA_VERSION,
  SAVED_SCENARIOS_STORAGE_KEY,
} from "../lib/scenario-storage.mjs";

const pageSource = readFileSync(
  new URL("../app/page.tsx", import.meta.url),
  "utf8",
);
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const scenarioArtifactUrl = new URL(
  "../app/data/scenario-baselines.generated.json",
  import.meta.url,
);

function savedScenarioFixture(scenario) {
  return {
    schemaVersion: SAVED_SCENARIO_SCHEMA_VERSION,
    savedAt: "2026-08-23T00:00:00.000Z",
    financialDefinition: financialDefinitionForMode(scenario.mode),
    ...scenario,
  };
}

test("scenario baselines reconcile to the current governed Fall census", () => {
  assert.equal(baselines.enrollment.undergraduateHeadcount, 16143);
  assert.equal(baselines.enrollment.graduateHeadcount, 2283);
  assert.equal(
    baselines.enrollment.undergraduateHeadcount +
      baselines.enrollment.graduateHeadcount,
    18426,
  );
});

test("tuition baselines reconcile to the explicitly modeled IPEDS Cost inputs", () => {
  const expectedUndergraduateRate =
    ipedsMarts.cost.undergraduateInStateTuition +
    ipedsMarts.cost.undergraduateRequiredFees;
  const expectedGraduateRate =
    ipedsMarts.cost.graduateInStateTuition +
    ipedsMarts.cost.graduateRequiredFees;
  assert.equal(ipedsMarts.synthetic, true);
  assert.equal(expectedUndergraduateRate, 14_800);
  assert.equal(expectedGraduateRate, 16_530);
  assert.equal(baselines.pricing.undergraduateTuitionAndFees, expectedUndergraduateRate);
  assert.equal(baselines.pricing.graduateTuitionAndFees, expectedGraduateRate);
  assert.match(baselines.pricing.sources.join(" "), /modeled demonstration Cost contract/);
  assert.match(baselines.pricing.limitation, /not operational institutional finance data/i);
});

test("program capacity baselines use differentiated, plausible graduate schedules", () => {
  const capacities = baselines.programs.map(
    (program) => program.courseSeatCapacity,
  );
  const sectionCounts = baselines.programs.map(
    (program) => program.sectionCount,
  );
  assert.ok(new Set(capacities).size > 1);
  assert.ok(new Set(sectionCounts).size > 1);
  for (const program of baselines.programs) {
    const coursesPerStudent =
      program.filledCourseSeats / program.currentHeadcount;
    assert.ok(
      coursesPerStudent >= 2.5 && coursesPerStudent <= 4,
      `${program.programId} course load ${coursesPerStudent}`,
    );
    assert.ok(
      program.averageSectionCapacity >= 20 &&
        program.averageSectionCapacity <= 40,
      `${program.programId} section capacity ${program.averageSectionCapacity}`,
    );
  }
});

test("enrollment mix reconciles the governed baseline through demand, sections, staffing, and gross tuition", () => {
  const undergraduatePercent = 0;
  const graduatePercent = 15;
  const result = calculateEnrollmentMix(baselines, {
    undergraduateChangePercent: undergraduatePercent,
    graduateChangePercent: graduatePercent,
  });
  const expectedUndergraduate = Math.round(
    baselines.enrollment.undergraduateHeadcount *
      (undergraduatePercent / 100),
  );
  const expectedGraduate = Math.round(
    baselines.enrollment.graduateHeadcount * (graduatePercent / 100),
  );
  const expectedTotal = expectedUndergraduate + expectedGraduate;
  const expectedSections =
    expectedTotal / baselines.enrollment.studentsPerSection;
  const expectedFacultyUnrounded =
    expectedSections / baselines.enrollment.sectionsPerFacultyFte;
  const expectedFacultyDisplayed =
    Math.round(expectedFacultyUnrounded * 10) / 10;
  const expectedGrossTuition =
    expectedUndergraduate * baselines.pricing.undergraduateTuitionAndFees +
    expectedGraduate * baselines.pricing.graduateTuitionAndFees;

  assert.equal(expectedUndergraduate, 0);
  assert.equal(expectedGraduate, 342);
  assert.equal(result.metrics.find((metric) => metric.label === "Undergraduate headcount change")?.value, expectedUndergraduate);
  assert.equal(result.metrics.find((metric) => metric.label === "Graduate headcount change")?.value, expectedGraduate);
  assert.equal(result.comparison.headcountImpact, expectedTotal);
  assert.equal(result.comparison.capacitySeatImpact, expectedTotal);
  assert.equal(result.comparison.capacityImpactKind, "student-seat-demand");
  assert.equal(result.metrics.find((metric) => metric.label === "Additional seat demand")?.value, expectedTotal);
  assert.equal(result.metrics.find((metric) => metric.label === "Additional section equivalents")?.value, expectedSections);
  assert.equal(expectedSections, 14.25);
  assert.equal(expectedFacultyUnrounded, 1.78125);
  assert.equal(result.comparison.facultyFteImpact, expectedFacultyDisplayed);
  assert.equal(result.comparison.annualRevenueImpact, expectedGrossTuition);
  assert.equal(expectedGrossTuition, 5_653_260);
  assert.equal(
    result.metrics.find((metric) => metric.label === "Annual gross tuition change")?.value,
    expectedGrossTuition,
  );
  assert.match(result.assumptions.join(" "), /Capacity assumption: 24 students per section/);
  assert.match(result.assumptions.join(" "), /Faculty staffing assumption: 8 sections per faculty FTE/);
  assert.match(result.assumptions.join(" "), /grants, discounts, and aid are excluded/i);
  assert.match(result.assumptions.join(" "), /modeled demonstration inputs/i);
  assert.doesNotMatch(result.metrics.map((metric) => metric.label).join(" "), /net revenue/i);
});

test("retention improvement uses transparent four-year cohort stacking", () => {
  const result = calculateRetentionImprovement(baselines, { pointGain: 3 });
  assert.equal(result.metrics[0].value, 90);
  assert.deepEqual(result.series, [90, 180, 270, 360]);
  assert.equal(result.metrics[2].value, 900);
  assert.equal(result.metrics[3].value, 5328000);
  assert.equal(result.comparison.headcountImpact, 90);
  assert.equal(result.comparison.annualRevenueImpact, 1332000);
  assert.equal(result.comparison.capacitySeatImpact, 90);
  assert.equal(result.comparison.financialHorizonYears, 1);
});

test("pricing and aid separates gross pricing from additional grant cost", () => {
  const result = calculatePricingAndAid(baselines, {
    undergraduatePriceChangePercent: 5,
    graduatePriceChangePercent: 0,
    additionalGrantPerPellEligible: 1000,
  });
  assert.equal(result.metrics[0].value, 11945820);
  assert.equal(result.metrics[2].value, 6088000);
  assert.equal(result.comparison.annualRevenueImpact, 5857820);
  assert.equal(result.details.modeledGrantOffsetPerPellEligibleStudent, -1000);
  assert.equal(result.details.coveredStudents, 6088);
});

test("program capacity scales governed course-seat demand and flags overflow", () => {
  const result = calculateProgramCapacity(baselines, {
    programId: "PCS",
    growthPercent: 20,
  });
  assert.equal(result.program.memoryRecordId, "analysis-cs-capacity");
  assert.equal(result.metrics[0].value, 814);
  assert.equal(result.metrics[1].value, 2929 / 2520);
  assert.equal(result.metrics[2].value, -409);
  assert.equal(result.metrics[3].value, 12);
  assert.equal(result.comparison.capacityImpactKind, "course-seat-demand");
  assert.equal(result.comparison.capacityImpactUnit, "course seats");
  assert.equal(result.comparison.capacitySeatImpact, 488);
  assert.match(result.assumptions.join(" "), /not unique students/i);
  assert.doesNotMatch(
    result.assumptions.join(" "),
    /every modeled program/i,
  );
});

test("faculty staffing refuses to infer retirements without hire-year data", () => {
  const result = calculateFacultyAttrition(baselines, {
    positionsNotReplaced: 5,
  });
  assert.equal(baselines.faculty.hireYearAvailable, false);
  assert.equal(result.metrics[1].value, 243);
  assert.equal(result.metrics[2].value, 40);
  assert.equal(result.comparison.capacitySeatImpact, -960);
  assert.match(result.assumptions.join(" "), /hire_year/i);
  assert.equal(result.comparison.capacityImpactKind, "course-seat-supply");
  assert.equal(result.comparison.facultyImpactKind, "faculty-supply");
});

test("all scenario comparison financial values use the same Year 1 horizon", () => {
  const results = [
    calculateEnrollmentMix(baselines, {
      undergraduateChangePercent: 0,
      graduateChangePercent: 15,
    }),
    calculateRetentionImprovement(baselines, { pointGain: 3 }),
    calculatePricingAndAid(baselines, {
      undergraduatePriceChangePercent: 5,
      graduatePriceChangePercent: 0,
      additionalGrantPerPellEligible: 0,
    }),
    calculateProgramCapacity(baselines, {
      programId: "PCS",
      growthPercent: 20,
    }),
    calculateFacultyAttrition(baselines, { positionsNotReplaced: 5 }),
  ];
  assert.deepEqual(
    results.map((result) => result.comparison.financialHorizonYears),
    [1, 1, 1, 1, 1],
  );
  assert.doesNotMatch(pageSource, /Year 1 tuition and aid change/);
  assert.match(pageSource, /Year 1 gross tuition change/);
  assert.match(pageSource, /Year 1 gross tuition change less modeled added grant aid/);
  assert.match(pageSource, /Year 1 headcount change/);
  assert.doesNotMatch(pageSource, /Year 1 financial effect/);
  assert.doesNotMatch(pageSource, /Annual financial effect/);
});

test("Scenario Lab labels deterministic changes without predictive or net-revenue claims", () => {
  assert.match(pageSource, /Modeled direct effect/);
  assert.doesNotMatch(pageSource, /direct modeled value/);
  assert.match(pageSource, /Interpretation, not prediction/);
  assert.match(pageSource, /behavioral response, price elasticity, yield/);
  assert.match(pageSource, /Tuition and grant aid modeled separately/);
  assert.doesNotMatch(pageSource, /Pricing held apart from grant aid/);
  assert.doesNotMatch(pageSource, /net revenue/i);
  assert.match(pageSource, /Faculty FTE requirement change/);
  assert.match(pageSource, /Added grant aid as share of baseline gross tuition/);
  assert.doesNotMatch(pageSource, /gross discount-rate effect/i);
});

test("all five scenario calculators are repeatable for identical governed inputs", () => {
  const calculations = [
    () => calculateEnrollmentMix(baselines, {
      undergraduateChangePercent: 0,
      graduateChangePercent: 15,
    }),
    () => calculateRetentionImprovement(baselines, { pointGain: 3 }),
    () => calculatePricingAndAid(baselines, {
      undergraduatePriceChangePercent: 5,
      graduatePriceChangePercent: 0,
      additionalGrantPerPellEligible: 1000,
    }),
    () => calculateProgramCapacity(baselines, {
      programId: "PCS",
      growthPercent: 20,
    }),
    () => calculateFacultyAttrition(baselines, { positionsNotReplaced: 5 }),
  ];
  for (const calculate of calculations) {
    assert.deepEqual(calculate(), calculate());
  }
});

test("scenario baseline artifact generation is byte-for-byte deterministic", () => {
  execFileSync(process.execPath, ["scripts/build-scenario-baselines.mjs"], {
    cwd: projectRoot,
  });
  const first = readFileSync(scenarioArtifactUrl, "utf8");
  execFileSync(process.execPath, ["scripts/build-scenario-baselines.mjs"], {
    cwd: projectRoot,
  });
  const second = readFileSync(scenarioArtifactUrl, "utf8");
  assert.equal(second, first);
});

test("cross-mode capacity and faculty comparisons fail closed in the UI contract", () => {
  assert.match(pageSource, /capacityComparisonCompatible/);
  assert.match(pageSource, /facultyComparisonCompatible/);
  assert.match(pageSource, /Not comparable/);
});

test("effect labels treat capacity consumption as a consequence, not the decision verdict", () => {
  const growth = calculateEnrollmentMix(baselines, {
    undergraduateChangePercent: 0,
    graduateChangePercent: 15,
  });
  const decline = calculateEnrollmentMix(baselines, {
    undergraduateChangePercent: -10,
    graduateChangePercent: 0,
  });
  assert.deepEqual(deriveScenarioEffect("enrollment", growth), {
    tone: "positive",
    label: "Modeled increase",
  });
  assert.deepEqual(deriveScenarioEffect("enrollment", decline), {
    tone: "negative",
    label: "Modeled decrease",
  });
});

test("saved scenarios persist through the browser-session storage contract", () => {
  const values = new Map();
  const storage = {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
  const scenario = savedScenarioFixture({
    id: "scenario-1",
    name: "Graduate growth",
    mode: "enrollment",
    inputs: {
      undergraduateChangePercent: 0,
      graduateChangePercent: 15,
    },
    assumptionSummary: "UG 0% · GR +15%",
    result: calculateEnrollmentMix(baselines, {
      undergraduateChangePercent: 0,
      graduateChangePercent: 15,
    }),
  });
  persistSavedScenarios(storage, [scenario]);
  assert.ok(values.has(SAVED_SCENARIOS_STORAGE_KEY));
  assert.deepEqual(loadSavedScenarios(storage), [scenario]);
});

test("saving multiple scenarios retains each scenario's inputs and displayed result", () => {
  const values = new Map();
  const storage = {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
  const firstResult = calculateEnrollmentMix(baselines, {
    undergraduateChangePercent: 0,
    graduateChangePercent: 15,
  });
  const secondResult = calculateEnrollmentMix(baselines, {
    undergraduateChangePercent: -2,
    graduateChangePercent: 5,
  });
  const scenarios = [
    savedScenarioFixture({
      id: "scenario-a",
      name: "Graduate growth",
      mode: "enrollment",
      inputs: { undergraduateChangePercent: 0, graduateChangePercent: 15 },
      assumptionSummary: "UG 0% · GR +15%",
      result: firstResult,
    }),
    savedScenarioFixture({
      id: "scenario-b",
      name: "Mixed change",
      mode: "enrollment",
      inputs: { undergraduateChangePercent: -2, graduateChangePercent: 5 },
      assumptionSummary: "UG -2% · GR +5%",
      result: secondResult,
    }),
  ];
  persistSavedScenarios(storage, scenarios);
  const restored = loadSavedScenarios(storage);
  assert.equal(restored.length, 2);
  assert.deepEqual(restored[0].inputs, scenarios[0].inputs);
  assert.deepEqual(restored[1].inputs, scenarios[1].inputs);
  assert.deepEqual(restored[0].result, firstResult);
  assert.deepEqual(restored[1].result, secondResult);
});

test("additional grant input is bounded in both UI and deterministic calculation", () => {
  const result = calculatePricingAndAid(baselines, {
    undergraduatePriceChangePercent: 0,
    graduatePriceChangePercent: 0,
    additionalGrantPerPellEligible: 100_000,
  });
  assert.equal(result.details.modeledGrantOffsetPerPellEligibleStudent, -50_000);
  assert.match(pageSource, /SCENARIO_CONTROL_METADATA\.pricing\.grant\.maximum/);
});
