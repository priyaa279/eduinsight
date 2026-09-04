import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import baselines from "../app/data/scenario-baselines.generated.json" with {
  type: "json",
};
import {
  calculateFacultyAttrition,
  calculatePricingAndAid,
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

function savedScenarioFixture(scenario) {
  return {
    schemaVersion: SAVED_SCENARIO_SCHEMA_VERSION,
    savedAt: "2026-08-23T00:00:00.000Z",
    financialDefinition: financialDefinitionForMode(scenario.mode),
    ...scenario,
  };
}

function memoryStorage() {
  const values = new Map();
  return {
    values,
    storage: {
      getItem(key) {
        return values.get(key) ?? null;
      },
      setItem(key, value) {
        values.set(key, value);
      },
    },
  };
}

test("comparison table uses scenario-aware financial labels and portfolio-friendly difference wording", () => {
  assert.doesNotMatch(pageSource, /Year 1 tuition and aid change/);
  assert.match(pageSource, /Year \$\{horizon\} gross tuition change/);
  assert.match(
    pageSource,
    /gross tuition change less modeled additional grant aid/,
  );
  assert.match(pageSource, /Difference \(B − A\)/);
  assert.doesNotMatch(pageSource, /Delta B − A/);
});

test("financial comparisons require the same definition and Year horizon", () => {
  assert.match(pageSource, /financialA\.kind === financialB\.kind/);
  assert.match(pageSource, /financialA\.horizon === financialB\.horizon/);
  assert.match(pageSource, /financialComparisonCompatible/);
  assert.match(pageSource, /"Financial comparison"/);
  assert.match(pageSource, /"Not comparable"/);
});

test("Faculty Staffing 5-versus-10 comparison preserves verified B-minus-A arithmetic", () => {
  const scenarioA = calculateFacultyAttrition(baselines, {
    positionsNotReplaced: 5,
  });
  const scenarioB = calculateFacultyAttrition(baselines, {
    positionsNotReplaced: 10,
  });
  assert.equal(scenarioA.metrics[0].value, 5);
  assert.equal(scenarioA.metrics[1].value, 243);
  assert.equal(scenarioB.metrics[0].value, 10);
  assert.equal(scenarioB.metrics[1].value, 238);
  assert.equal(
    scenarioB.comparison.headcountImpact -
      scenarioA.comparison.headcountImpact,
    0,
  );
  assert.equal(
    scenarioB.comparison.annualRevenueImpact -
      scenarioA.comparison.annualRevenueImpact,
    0,
  );
  assert.equal(
    scenarioB.comparison.capacitySeatImpact -
      scenarioA.comparison.capacitySeatImpact,
    -960,
  );
  assert.equal(
    scenarioB.comparison.facultyFteImpact -
      scenarioA.comparison.facultyFteImpact,
    -5,
  );
});

test("saved snapshots remain immutable when the live Faculty scenario changes", () => {
  const savedResult = calculateFacultyAttrition(baselines, {
    positionsNotReplaced: 5,
  });
  const saved = {
    id: "faculty-five",
    name: "Faculty staffing — 5 positions",
    mode: "faculty",
    inputs: { positionsNotReplaced: 5 },
    assumptionSummary: "5 positions not replaced",
    result: structuredClone(savedResult),
  };
  const liveResult = calculateFacultyAttrition(baselines, {
    positionsNotReplaced: 10,
  });
  assert.equal(saved.result.metrics[0].value, 5);
  assert.equal(liveResult.metrics[0].value, 10);
  assert.notDeepEqual(saved.result, liveResult);
});

test("multiple saved scenarios remain independently selectable and session-persistent", () => {
  const facultyFive = savedScenarioFixture({
    id: "faculty-five",
    name: "Faculty staffing — 5 positions",
    mode: "faculty",
    inputs: { positionsNotReplaced: 5 },
    result: calculateFacultyAttrition(baselines, { positionsNotReplaced: 5 }),
  });
  const facultyTen = savedScenarioFixture({
    id: "faculty-ten",
    name: "Faculty staffing — 10 positions",
    mode: "faculty",
    inputs: { positionsNotReplaced: 10 },
    result: calculateFacultyAttrition(baselines, { positionsNotReplaced: 10 }),
  });
  const { storage, values } = memoryStorage();
  persistSavedScenarios(storage, [facultyFive, facultyTen]);
  assert.ok(values.has(SAVED_SCENARIOS_STORAGE_KEY));
  const restored = loadSavedScenarios(storage);
  assert.equal(restored.length, 2);
  assert.equal(restored.find((scenario) => scenario.id === "faculty-five").inputs.positionsNotReplaced, 5);
  assert.equal(restored.find((scenario) => scenario.id === "faculty-ten").inputs.positionsNotReplaced, 10);
  assert.deepEqual(restored[0].result, facultyFive.result);
  assert.deepEqual(restored[1].result, facultyTen.result);
});

test("Tuition and Aid retains its distinct combined financial comparison definition", () => {
  const result = calculatePricingAndAid(baselines, {
    undergraduatePriceChangePercent: 2,
    graduatePriceChangePercent: 1,
    additionalGrantPerPellEligible: 500,
  });
  const expected =
    baselines.enrollment.undergraduateHeadcount *
      baselines.pricing.undergraduateTuitionAndFees *
      0.02 +
    baselines.enrollment.graduateHeadcount *
      baselines.pricing.graduateTuitionAndFees *
      0.01 -
    baselines.aid.pellEligibleStudents * 500;
  assert.equal(result.comparison.annualRevenueImpact, expected);
  assert.match(
    pageSource,
    /gross-tuition-less-modeled-aid/,
  );
});

test("capacity and faculty comparison safeguards still reject unlike units and demand/supply meanings", () => {
  assert.match(pageSource, /capacityComparisonCompatible/);
  assert.match(
    pageSource,
    /selectedA\.result\.comparison\.capacityImpactKind ===[\s\S]*selectedB\.result\.comparison\.capacityImpactKind/,
  );
  assert.match(
    pageSource,
    /selectedA\.result\.comparison\.capacityImpactUnit ===[\s\S]*selectedB\.result\.comparison\.capacityImpactUnit/,
  );
  assert.match(pageSource, /facultyComparisonCompatible/);
  assert.match(
    pageSource,
    /selectedA\.result\.comparison\.facultyImpactKind ===[\s\S]*selectedB\.result\.comparison\.facultyImpactKind/,
  );
});
