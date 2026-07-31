import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import baselines from "../app/data/scenario-baselines.generated.json" with {
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
  loadSavedScenarios,
  persistSavedScenarios,
  SAVED_SCENARIOS_STORAGE_KEY,
} from "../lib/scenario-storage.mjs";

const pageSource = readFileSync(
  new URL("../app/page.tsx", import.meta.url),
  "utf8",
);

test("scenario baselines reconcile to the current governed Fall census", () => {
  assert.equal(baselines.enrollment.undergraduateHeadcount, 16143);
  assert.equal(baselines.enrollment.graduateHeadcount, 2283);
  assert.equal(
    baselines.enrollment.undergraduateHeadcount +
      baselines.enrollment.graduateHeadcount,
    18426,
  );
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

test("enrollment mix applies independent UG and GR changes with different prices", () => {
  const result = calculateEnrollmentMix(baselines, {
    undergraduateChangePercent: 0,
    graduateChangePercent: 15,
  });
  assert.equal(result.comparison.headcountImpact, 342);
  assert.equal(result.comparison.annualRevenueImpact, 5653260);
});

test("retention improvement uses transparent four-year cohort stacking", () => {
  const result = calculateRetentionImprovement(baselines, { pointGain: 3 });
  assert.equal(result.metrics[0].value, 90);
  assert.deepEqual(result.series, [90, 180, 270, 360]);
  assert.equal(result.metrics[2].value, 900);
  assert.equal(result.metrics[3].value, 5328000);
  assert.equal(result.comparison.headcountImpact, 90);
  assert.equal(result.comparison.annualRevenueImpact, 1332000);
  assert.equal(result.comparison.capacitySeatImpact, -90);
  assert.equal(result.comparison.financialHorizonYears, 1);
});

test("pricing and aid separates gross pricing from additional grant cost", () => {
  const result = calculatePricingAndAid(baselines, {
    undergraduatePriceChangePercent: 5,
    graduatePriceChangePercent: 0,
    additionalGrantPerPellEligible: 1000,
  });
  assert.equal(result.metrics[0].value, 11945820);
  assert.equal(result.metrics[2].value, -6088000);
  assert.equal(result.comparison.annualRevenueImpact, 5857820);
  assert.equal(result.details.modeledNetPriceChange, -1000);
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
  assert.equal(result.comparison.capacitySeatImpact, -488);
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
  assert.equal(result.metrics[2].value, -40);
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
  assert.match(pageSource, /Year 1 financial effect/);
  assert.match(pageSource, /Year 1 headcount effect/);
  assert.doesNotMatch(pageSource, /Annual financial effect/);
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
  assert.deepEqual(deriveScenarioEffect("enrollment", growth.comparison), {
    tone: "positive",
    label: "Positive effect",
  });
  assert.deepEqual(deriveScenarioEffect("enrollment", decline.comparison), {
    tone: "negative",
    label: "Negative effect",
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
  const scenario = {
    id: "scenario-1",
    name: "Graduate growth",
    mode: "enrollment",
    result: calculateEnrollmentMix(baselines, {
      undergraduateChangePercent: 0,
      graduateChangePercent: 15,
    }),
  };
  persistSavedScenarios(storage, [scenario]);
  assert.ok(values.has(SAVED_SCENARIOS_STORAGE_KEY));
  assert.deepEqual(loadSavedScenarios(storage), [scenario]);
});

test("additional grant input is bounded in both UI and deterministic calculation", () => {
  const result = calculatePricingAndAid(baselines, {
    undergraduatePriceChangePercent: 0,
    graduatePriceChangePercent: 0,
    additionalGrantPerPellEligible: 100_000,
  });
  assert.equal(result.details.modeledNetPriceChange, -50_000);
  assert.match(pageSource, /max="50000"/);
});
