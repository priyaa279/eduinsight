import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import baselines from "../app/data/scenario-baselines.generated.json" with {
  type: "json",
};
import {
  calculateProgramCapacity,
  deriveEligibleCapacityPrograms,
} from "../lib/scenario-model.mjs";

const pageSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const generatorSource = readFileSync(
  new URL("../scripts/build-scenario-baselines.mjs", import.meta.url),
  "utf8",
);
const clone = (value) => structuredClone(value);
const eligible = (candidateBaselines) =>
  deriveEligibleCapacityPrograms(candidateBaselines);

test("selector options derive from the complete capacity evidence contract", () => {
  assert.equal(eligible(baselines).length, baselines.programs.length);
  assert.match(pageSource, /deriveEligibleCapacityPrograms\(scenarioBaselines\)/);
});

test("current governed sources produce exactly four capacity options", () => {
  assert.equal(eligible(baselines).length, 4);
});

test("the four expected programs remain available", () => {
  assert.deepEqual(
    eligible(baselines).map((program) => program.name),
    [
      "MS Business Analytics",
      "MS Computer Science",
      "MS Nursing",
      "Master of Public Administration",
    ],
  );
});

test("a program with enrollment only is excluded", () => {
  const fixture = clone(baselines);
  fixture.programs.push({
    programId: "ENROLLMENT_ONLY",
    name: "Enrollment Only",
    currentHeadcount: 100,
    filledCourseSeats: 0,
    courseSeatCapacity: 0,
    sectionCount: 0,
    averageSectionCapacity: 0,
    tuitionAndFees: 10_000,
  });
  assert.ok(!eligible(fixture).some((program) => program.programId === "ENROLLMENT_ONLY"));
});

test("a program with sections but no course-seat demand is excluded", () => {
  const fixture = clone(baselines);
  fixture.programs[0].filledCourseSeats = 0;
  assert.ok(!eligible(fixture).some((program) => program.programId === "PBA"));
});

test("a program with demand but zero capacity is excluded", () => {
  const fixture = clone(baselines);
  fixture.programs[0].courseSeatCapacity = 0;
  assert.ok(!eligible(fixture).some((program) => program.programId === "PBA"));
});

test("a program with invalid average section capacity is excluded", () => {
  const fixture = clone(baselines);
  fixture.programs[0].averageSectionCapacity = Number.NaN;
  assert.ok(!eligible(fixture).some((program) => program.programId === "PBA"));
});

test("missing required tuition or pricing evidence is excluded", () => {
  const missingTuition = clone(baselines);
  delete missingTuition.programs[0].tuitionAndFees;
  assert.ok(!eligible(missingTuition).some((program) => program.programId === "PBA"));

  const missingProvenance = clone(baselines);
  missingProvenance.pricing.sources = [];
  assert.deepEqual(eligible(missingProvenance), []);

  const missingLimitation = clone(baselines);
  missingLimitation.pricing.limitation = "";
  assert.deepEqual(eligible(missingLimitation), []);
});

test("future eligibility is evidence-driven rather than a four-program enumeration", () => {
  const fixture = clone(baselines);
  fixture.programs.push({
    programId: "FUTURE_UG",
    name: "Future Undergraduate Program",
    currentHeadcount: 250,
    filledCourseSeats: 700,
    courseSeatCapacity: 800,
    sectionCount: 20,
    averageSectionCapacity: 40,
    tuitionAndFees: fixture.pricing.undergraduateTuitionAndFees,
  });
  assert.ok(eligible(fixture).some((program) => program.programId === "FUTURE_UG"));
  assert.doesNotMatch(generatorSource, /commandCenter\.programSignals\.map/);
});

test("UI disclosure count derives from the actual option count", () => {
  assert.match(
    pageSource,
    /Showing \{capacityPrograms\.length\} programs with complete modeled course-capacity evidence\./,
  );
});

test("Program Capacity normal-path calculations remain unchanged", () => {
  const result = calculateProgramCapacity(baselines, {
    programId: "PCS",
    growthPercent: 20,
  });
  assert.notEqual(result.status, "unavailable");
  assert.equal(result.comparison.headcountImpact, 136);
  assert.equal(result.metrics[1].value, 1.1623015873015874);
  assert.equal(result.comparison.capacitySeatImpact, 488);
  assert.equal(result.program.averageSectionCapacity, 35);
  assert.equal(result.program.tuitionAndFees, 16_530);
});

test("unknown program IDs continue to fail closed", () => {
  const result = calculateProgramCapacity(baselines, {
    programId: "UNKNOWN",
    growthPercent: 20,
  });
  assert.equal(result.status, "unavailable");
  assert.equal(result.missingDependency, "assumptions.programId");
});
