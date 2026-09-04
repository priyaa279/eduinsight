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
  SCENARIO_CONTROL_METADATA,
} from "../lib/scenario-model.mjs";
import {
  financialDefinitionForMode,
  isSavedScenario,
  loadSavedScenarioState,
  persistSavedScenarios,
  SAVED_SCENARIO_SCHEMA_VERSION,
  SAVED_SCENARIOS_STORAGE_KEY,
  SCENARIO_NAME_MAX_LENGTH,
} from "../lib/scenario-storage.mjs";

const pageSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const fixedTimestamp = "2026-08-23T00:00:00.000Z";

function cloneBaselines() {
  return structuredClone(baselines);
}

function assertUnavailable(result, dependencyPattern) {
  assert.equal(result.status, "unavailable");
  assert.match(result.summary, /Scenario unavailable/i);
  assert.match(result.missingDependency, dependencyPattern);
  assert.equal("metrics" in result, false);
  assert.equal("comparison" in result, false);
}

function validSavedScenario(overrides = {}) {
  const mode = overrides.mode ?? "enrollment";
  const inputs = overrides.inputs ?? {
    undergraduateChangePercent: 0,
    graduateChangePercent: 15,
  };
  const result = overrides.result ??
    calculateEnrollmentMix(baselines, inputs);
  return {
    schemaVersion: SAVED_SCENARIO_SCHEMA_VERSION,
    id: "scenario-valid",
    name: "Graduate growth",
    mode,
    savedAt: fixedTimestamp,
    financialDefinition: financialDefinitionForMode(mode),
    inputs,
    assumptionSummary: "Governed test fixture",
    result,
    ...overrides,
  };
}

test("missing undergraduate and graduate enrollment baselines fail closed", () => {
  for (const [field, value] of [
    ["undergraduateHeadcount", null],
    ["graduateHeadcount", undefined],
    ["undergraduateHeadcount", Number.NaN],
    ["graduateHeadcount", Number.POSITIVE_INFINITY],
  ]) {
    const source = cloneBaselines();
    source.enrollment[field] = value;
    const result = calculateEnrollmentMix(source, {
      undergraduateChangePercent: 0,
      graduateChangePercent: 15,
    });
    assertUnavailable(result, new RegExp(field));
  }
});

test("missing retention numerator denominator or rate fails closed", () => {
  for (const field of ["cohortSize", "retained", "rate"]) {
    const source = cloneBaselines();
    source.retention[field] = null;
    const result = calculateRetentionImprovement(source, { pointGain: 3 });
    assertUnavailable(result, new RegExp(field));
  }
});

test("missing undergraduate or graduate tuition fails closed", () => {
  for (const field of [
    "undergraduateTuitionAndFees",
    "graduateTuitionAndFees",
  ]) {
    const source = cloneBaselines();
    source.pricing[field] = null;
    const result = calculatePricingAndAid(source, {
      undergraduatePriceChangePercent: 2,
      graduatePriceChangePercent: 2,
      additionalGrantPerPellEligible: 0,
    });
    assertUnavailable(result, new RegExp(field));
  }
});

test("missing Pell population fails closed", () => {
  const source = cloneBaselines();
  source.aid.pellEligibleStudents = null;
  assertUnavailable(
    calculatePricingAndAid(source, {
      undergraduatePriceChangePercent: 0,
      graduatePriceChangePercent: 0,
      additionalGrantPerPellEligible: 500,
    }),
    /pellEligibleStudents/,
  );
});

test("missing faculty baseline fails closed", () => {
  const source = cloneBaselines();
  source.faculty.fullTimeInstructionalCount = null;
  assertUnavailable(
    calculateFacultyAttrition(source, { positionsNotReplaced: 5 }),
    /fullTimeInstructionalCount/,
  );
});

test("missing Program Capacity fields fail closed without crashing", () => {
  const cases = [
    ["currentHeadcount", /currentHeadcount/],
    ["filledCourseSeats", /filledCourseSeats/],
    ["courseSeatCapacity", /courseSeatCapacity/],
    ["averageSectionCapacity", /averageSectionCapacity/],
  ];
  for (const [field, pattern] of cases) {
    const source = cloneBaselines();
    source.programs.find((program) => program.programId === "PCS")[field] = null;
    assertUnavailable(
      calculateProgramCapacity(source, { programId: "PCS", growthPercent: 20 }),
      pattern,
    );
  }
});

test("unknown Program Capacity IDs never fall back to another program", () => {
  const result = calculateProgramCapacity(baselines, {
    programId: "UNKNOWN",
    growthPercent: 20,
  });
  assertUnavailable(result, /programId/);
  assert.doesNotMatch(result.summary, /Business Analytics|Computer Science/);
});

test("empty Program Capacity evidence fails closed", () => {
  const source = cloneBaselines();
  source.programs = [];
  assertUnavailable(
    calculateProgramCapacity(source, { programId: "PCS", growthPercent: 20 }),
    /programs/,
  );
});

test("zero capacity is unavailable rather than misleading zero-percent utilization", () => {
  const source = cloneBaselines();
  source.programs.find((program) => program.programId === "PCS").courseSeatCapacity = 0;
  const result = calculateProgramCapacity(source, {
    programId: "PCS",
    growthPercent: 20,
  });
  assertUnavailable(result, /courseSeatCapacity/);
  assert.doesNotMatch(result.summary, /0% utilization/i);
});

test("direct Enrollment calls cannot produce negative populations", () => {
  const result = calculateEnrollmentMix(baselines, {
    undergraduateChangePercent: -250,
    graduateChangePercent: -500,
  });
  assert.notEqual(result.status, "unavailable");
  assert.equal(
    baselines.enrollment.undergraduateHeadcount + result.metrics[0].value,
    0,
  );
  assert.equal(
    baselines.enrollment.graduateHeadcount + result.metrics[1].value,
    0,
  );
});

test("direct Tuition calls cannot produce negative modeled prices", () => {
  const result = calculatePricingAndAid(baselines, {
    undergraduatePriceChangePercent: -250,
    graduatePriceChangePercent: -500,
    additionalGrantPerPellEligible: -500,
  });
  assert.notEqual(result.status, "unavailable");
  assert.equal(
    result.metrics[0].value,
    -baselines.enrollment.undergraduateHeadcount *
      baselines.pricing.undergraduateTuitionAndFees,
  );
  assert.equal(result.details.modeledGrantOffsetPerPellEligibleStudent, 0);
});

test("direct Program Capacity calls cannot produce negative headcount demand or utilization", () => {
  const result = calculateProgramCapacity(baselines, {
    programId: "PCS",
    growthPercent: -500,
  });
  assert.notEqual(result.status, "unavailable");
  assert.equal(result.metrics[0].value, 0);
  assert.equal(result.metrics[1].value, 0);
  assert.ok(result.comparison.capacitySeatImpact <= 0);
});

test("Retention remains bounded between zero and one hundred percent", () => {
  const below = calculateRetentionImprovement(baselines, { pointGain: -50 });
  const above = calculateRetentionImprovement(baselines, { pointGain: 999 });
  assert.match(below.summary, /78\.4% → 78\.4%/);
  assert.match(above.summary, /78\.4% → 100\.0%/);
});

test("Faculty direct calls remain bounded by the complete baseline", () => {
  const result = calculateFacultyAttrition(baselines, {
    positionsNotReplaced: 999,
  });
  assert.equal(result.metrics[0].value, 248);
  assert.equal(result.metrics[1].value, 0);
});

test("saved-scenario contract rejects unknown mode and stale schema", () => {
  assert.equal(isSavedScenario(validSavedScenario()), true);
  assert.equal(isSavedScenario(validSavedScenario({ mode: "unknown" })), false);
  assert.equal(isSavedScenario(validSavedScenario({ schemaVersion: 1 })), false);
});

test("saved-scenario contract rejects missing null and non-finite result fields", () => {
  const missing = validSavedScenario();
  delete missing.result.comparison.headcountImpact;
  assert.equal(isSavedScenario(missing), false);

  const withNull = validSavedScenario();
  withNull.result.comparison.capacitySeatImpact = null;
  assert.equal(isSavedScenario(withNull), false);

  const withInfinity = validSavedScenario();
  withInfinity.result.metrics[0].value = Number.POSITIVE_INFINITY;
  assert.equal(isSavedScenario(withInfinity), false);
});

test("saved-scenario contract rejects malformed comparison semantics", () => {
  const invalidUnit = validSavedScenario();
  invalidUnit.result.comparison.capacityImpactKind = "none";
  invalidUnit.result.comparison.capacityImpactUnit = "student seats";
  assert.equal(isSavedScenario(invalidUnit), false);

  const invalidFinancialDefinition = validSavedScenario({
    financialDefinition: "gross-tuition-less-modeled-aid",
  });
  assert.equal(isSavedScenario(invalidFinancialDefinition), false);
});

test("invalid or outdated saved data is skipped with a concise message", () => {
  const values = new Map([
    [SAVED_SCENARIOS_STORAGE_KEY, JSON.stringify([{ id: "legacy" }])],
  ]);
  const state = loadSavedScenarioState({
    getItem: (key) => values.get(key) ?? null,
  });
  assert.deepEqual(state.scenarios, []);
  assert.match(state.message, /invalid or outdated/i);
});

test("sessionStorage write failure is returned and cannot claim success", () => {
  const result = persistSavedScenarios(
    {
      setItem() {
        throw new Error("quota");
      },
    },
    [validSavedScenario()],
  );
  assert.equal(result.ok, false);
  assert.match(result.message, /could not be saved/i);
  assert.match(pageSource, /if \(!persisted\.ok\)[\s\S]*setStorageMessage/);
  assert.match(pageSource, /setSavedScenarios\(nextScenarios\)/);
});

test("scenario names have one modest UI and contract limit", () => {
  assert.equal(SCENARIO_NAME_MAX_LENGTH, 80);
  assert.match(pageSource, /maxLength=\{SCENARIO_NAME_MAX_LENGTH\}/);
  assert.equal(
    isSavedScenario(
      validSavedScenario({ name: "x".repeat(SCENARIO_NAME_MAX_LENGTH + 1) }),
    ),
    false,
  );
});

test("same-scenario comparison is blocked clearly", () => {
  assert.match(pageSource, /sameScenarioSelected/);
  assert.match(pageSource, /Choose two different saved scenarios to compare\./);
  assert.match(pageSource, /disabled=\{scenario\.id === compareB\}/);
  assert.match(pageSource, /disabled=\{scenario\.id === compareA\}/);
});

test("Program Capacity discloses the FTE planning assumption and retains program-specific section sizes", () => {
  const pcs = calculateProgramCapacity(baselines, {
    programId: "PCS",
    growthPercent: 20,
  });
  const pba = calculateProgramCapacity(baselines, {
    programId: "PBA",
    growthPercent: 20,
  });
  assert.match(pcs.assumptions.join(" "), /Planning assumption: 8 sections per faculty FTE/);
  assert.match(pcs.assumptions.join(" "), /current 35-seat average/);
  assert.match(pba.assumptions.join(" "), /current 30-seat average/);
});

test("signed zero and ambiguous naked units are normalized", () => {
  const enrollment = calculateEnrollmentMix(baselines, {
    undergraduateChangePercent: 0,
    graduateChangePercent: 0,
  });
  assert.equal(enrollment.metrics[0].display, "0");
  assert.equal(enrollment.metrics[3].display, "0 seats");
  assert.equal(enrollment.metrics[4].display, "0.00 section equivalents");
  const faculty = calculateFacultyAttrition(baselines, {
    positionsNotReplaced: 0,
  });
  assert.equal(faculty.metrics[3].display, "0 seats");
  assert.equal(faculty.comparison.facultyFteImpact, 0);
  assert.equal(Object.is(faculty.comparison.facultyFteImpact, -0), false);
});

test("planning metadata classifies defaults and ranges without policy claims", () => {
  assert.equal(
    SCENARIO_CONTROL_METADATA.enrollment.undergraduate.defaultClassification,
    "Neutral baseline",
  );
  assert.match(
    SCENARIO_CONTROL_METADATA.enrollment.graduate.defaultClassification,
    /Demonstration/,
  );
  assert.match(
    SCENARIO_CONTROL_METADATA.retention.pointGain.rangeClassification,
    /not an institutional target/,
  );
  assert.match(
    SCENARIO_CONTROL_METADATA.pricing.grant.rangeClassification,
    /not financial-aid policy/,
  );
  assert.match(pageSource, /Demonstration starting point/);
});

test("Enrollment change naming accurately preserves the internal mode", () => {
  assert.equal(
    calculateEnrollmentMix(baselines, {
      undergraduateChangePercent: 0,
      graduateChangePercent: 15,
    }).title,
    "Enrollment change",
  );
  assert.match(pageSource, /label: "Enrollment change"/);
  assert.match(pageSource, /id: "enrollment"/);
});

test("mobile comparison retains Scenario A Scenario B and Difference context", () => {
  assert.match(pageSource, /data-mobile-label="Scenario A"/);
  assert.match(pageSource, /data-mobile-label="Scenario B"/);
  assert.match(pageSource, /data-mobile-label="Difference \(B − A\)"/);
  assert.match(cssSource, /content: attr\(data-mobile-label\)/);
});

test("scenario tabs have tab and tabpanel associations plus keyboard navigation", () => {
  assert.match(pageSource, /id=\{`scenario-tab-\$\{item\.id\}`\}/);
  assert.match(pageSource, /aria-controls=\{`scenario-panel-\$\{item\.id\}`\}/);
  assert.match(pageSource, /role="tabpanel"/);
  assert.match(pageSource, /aria-labelledby=\{`scenario-tab-\$\{mode\}`\}/);
  assert.match(pageSource, /event\.key === "ArrowRight"/);
  assert.match(pageSource, /tabIndex=\{mode === item\.id \? 0 : -1\}/);
});

test("verified normal-path reference results remain unchanged", () => {
  const enrollment = calculateEnrollmentMix(baselines, {
    undergraduateChangePercent: 0,
    graduateChangePercent: 15,
  });
  assert.deepEqual(
    enrollment.metrics.slice(0, 5).map((metric) => metric.value),
    [0, 342, 342, 342, 14.25],
  );
  assert.equal(enrollment.comparison.facultyFteImpact, 1.8);
  assert.equal(enrollment.comparison.annualRevenueImpact, 5_653_260);

  const retention = calculateRetentionImprovement(baselines, { pointGain: 3 });
  assert.deepEqual(retention.series, [90, 180, 270, 360]);
  assert.equal(retention.metrics[2].value, 900);

  const capacity = calculateProgramCapacity(baselines, {
    programId: "PCS",
    growthPercent: 20,
  });
  assert.deepEqual(
    [capacity.metrics[0].value, capacity.metrics[2].value, capacity.metrics[3].value],
    [814, -409, 12],
  );
  assert.equal(capacity.comparison.facultyFteImpact, 1.5);

  const faculty = calculateFacultyAttrition(baselines, {
    positionsNotReplaced: 5,
  });
  assert.deepEqual(
    faculty.metrics.map((metric) => metric.value),
    [5, 243, 40, -960],
  );
});
