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
  deriveScenarioBarPresentation,
  deriveScenarioEffect,
} from "../lib/scenario-model.mjs";

const pageSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("zero renders as a true zero-width quantitative bar", () => {
  const bars = deriveScenarioBarPresentation([
    { id: "zero", value: 0, unit: "students", scaleGroup: "headcount" },
    { id: "reference", value: 100, unit: "students", scaleGroup: "headcount" },
  ]);
  assert.equal(bars[0].widthPercent, 0);
  assert.equal(bars[0].direction, "zero");
});

test("tiny nonzero comparable values are not inflated to a three-percent minimum", () => {
  const bars = deriveScenarioBarPresentation([
    { id: "tiny", value: 1, unit: "students", scaleGroup: "headcount" },
    { id: "large", value: 1000, unit: "students", scaleGroup: "headcount" },
  ]);
  assert.equal(bars[0].widthPercent, 0.1);
  assert.ok(bars[0].widthPercent < 3);
  assert.doesNotMatch(pageSource, /Math\.max\(3,\s*Math\.min\(100/);
});

test("old fixed dollar FTE and unit thresholds are absent from Scenario Lab bars", () => {
  assert.doesNotMatch(pageSource, /row\.key === "annualRevenueImpact"\s*\?\s*15_000_000/);
  assert.doesNotMatch(pageSource, /row\.key === "facultyFteImpact"\s*\?\s*20\s*:\s*2000/);
  assert.match(pageSource, /Directional indicators only/);
});

test("comparable values share a maximum derived from the displayed values", () => {
  const bars = deriveScenarioBarPresentation([
    { id: "a", value: 20, unit: "students", scaleGroup: "headcount" },
    { id: "b", value: 100, unit: "students", scaleGroup: "headcount" },
  ]);
  assert.deepEqual(bars.map((bar) => bar.widthPercent), [20, 100]);
  assert.deepEqual(bars.map((bar) => bar.sharedMaximum), [100, 100]);
  assert.ok(bars.every((bar) => bar.scaleMode === "quantitative"));
});

test("unlike units are qualitative and never receive a shared quantitative maximum", () => {
  const bars = deriveScenarioBarPresentation([
    { id: "students", value: 342, unit: "students", scaleGroup: "impact" },
    { id: "money", value: 5_653_260, unit: "dollars", scaleGroup: "impact" },
    { id: "fte", value: 1.8, unit: "FTE", scaleGroup: "impact" },
  ]);
  assert.ok(bars.every((bar) => bar.scaleMode === "qualitative"));
  assert.ok(bars.every((bar) => bar.widthPercent === null));
  assert.ok(bars.every((bar) => bar.sharedMaximum === null));
});

test("demand and supply values do not share a scale even when their units match", () => {
  const bars = deriveScenarioBarPresentation([
    { id: "demand", value: 100, unit: "course seats", scaleGroup: "capacity", semanticType: "demand" },
    { id: "supply", value: -100, unit: "course seats", scaleGroup: "capacity", semanticType: "supply" },
  ]);
  assert.ok(bars.every((bar) => bar.scaleMode === "qualitative"));
  assert.ok(bars.every((bar) => bar.sharedMaximum === null));
});

test("values above the former fixed threshold remain distinguishable when comparable", () => {
  const bars = deriveScenarioBarPresentation([
    { id: "twenty", value: 20_000_000, unit: "dollars", scaleGroup: "dollars" },
    { id: "hundred", value: 100_000_000, unit: "dollars", scaleGroup: "dollars" },
  ]);
  assert.deepEqual(bars.map((bar) => bar.widthPercent), [20, 100]);
});

test("exact numeric labels and units remain the primary visible values", () => {
  assert.match(pageSource, /formatSignedWhole\(value, "students"\)/);
  assert.match(pageSource, /bar\.value\.toLocaleString\(\)\} students/);
  assert.match(pageSource, /row\.format\(value\)/);
});

test("negative and positive directions use opposite center-origin geometry", () => {
  const bars = deriveScenarioBarPresentation([
    { id: "negative", value: -1, unit: "students", scaleGroup: null },
    { id: "positive", value: 1, unit: "students", scaleGroup: null },
  ]);
  assert.deepEqual(bars.map((bar) => bar.direction), ["negative", "positive"]);
  assert.match(cssSource, /\.scenario-direction-track\.positive > span[\s\S]*left: 50%/);
  assert.match(cssSource, /\.scenario-direction-track\.negative > span[\s\S]*right: 50%/);
});

test("Enrollment opposing subgroup directions produce Mixed modeled effects", () => {
  const result = calculateEnrollmentMix(baselines, {
    undergraduateChangePercent: -5,
    graduateChangePercent: 5,
  });
  assert.deepEqual(deriveScenarioEffect("enrollment", result), {
    tone: "mixed",
    label: "Mixed modeled effects",
  });
});

test("Enrollment with both groups increasing produces Modeled increase", () => {
  const result = calculateEnrollmentMix(baselines, {
    undergraduateChangePercent: 5,
    graduateChangePercent: 5,
  });
  assert.equal(deriveScenarioEffect("enrollment", result).label, "Modeled increase");
});

test("Enrollment with both groups unchanged produces No modeled change", () => {
  const result = calculateEnrollmentMix(baselines, {
    undergraduateChangePercent: 0,
    graduateChangePercent: 0,
  });
  assert.equal(deriveScenarioEffect("enrollment", result).label, "No modeled change");
});

test("Enrollment with both groups decreasing produces Modeled decrease", () => {
  const result = calculateEnrollmentMix(baselines, {
    undergraduateChangePercent: -5,
    graduateChangePercent: -5,
  });
  assert.equal(deriveScenarioEffect("enrollment", result).label, "Modeled decrease");
});

test("Tuition and aid opposing component directions produce Mixed modeled effects", () => {
  const result = calculatePricingAndAid(baselines, {
    undergraduatePriceChangePercent: 5,
    graduatePriceChangePercent: -5,
    additionalGrantPerPellEligible: 0,
  });
  assert.deepEqual(deriveScenarioEffect("pricing", result), {
    tone: "mixed",
    label: "Mixed modeled effects",
  });
});

test("Tuition and aid grant-only input avoids a misleading decrease badge", () => {
  const result = calculatePricingAndAid(baselines, {
    undergraduatePriceChangePercent: 0,
    graduatePriceChangePercent: 0,
    additionalGrantPerPellEligible: 1000,
  });
  assert.deepEqual(deriveScenarioEffect("pricing", result), {
    tone: "mixed",
    label: "Mixed modeled effects",
  });
});

test("Faculty positions not replaced retain a coherent modeled decrease badge", () => {
  const result = calculateFacultyAttrition(baselines, {
    positionsNotReplaced: 5,
  });
  assert.deepEqual(deriveScenarioEffect("faculty", result), {
    tone: "negative",
    label: "Modeled decrease",
  });
});

test("Retention normal example remains Modeled increase", () => {
  const result = calculateRetentionImprovement(baselines, { pointGain: 3 });
  assert.equal(deriveScenarioEffect("retention", result).label, "Modeled increase");
});

test("Retention zero-point input produces No modeled change", () => {
  const result = calculateRetentionImprovement(baselines, { pointGain: 0 });
  assert.equal(deriveScenarioEffect("retention", result).label, "No modeled change");
});

test("Program Capacity positive growth produces Modeled increase", () => {
  const result = calculateProgramCapacity(baselines, {
    programId: "PCS",
    growthPercent: 20,
  });
  assert.equal(deriveScenarioEffect("capacity", result).label, "Modeled increase");
});

test("Program Capacity negative growth produces Modeled decrease", () => {
  const result = calculateProgramCapacity(baselines, {
    programId: "PCS",
    growthPercent: -10,
  });
  assert.equal(deriveScenarioEffect("capacity", result).label, "Modeled decrease");
});

test("Faculty zero positions not replaced produces No modeled change", () => {
  const result = calculateFacultyAttrition(baselines, {
    positionsNotReplaced: 0,
  });
  assert.equal(deriveScenarioEffect("faculty", result).label, "No modeled change");
});

test("verified calculations and deterministic outputs remain unchanged", () => {
  const enrollment = calculateEnrollmentMix(baselines, {
    undergraduateChangePercent: 0,
    graduateChangePercent: 15,
  });
  const retention = calculateRetentionImprovement(baselines, { pointGain: 3 });
  const capacity = calculateProgramCapacity(baselines, {
    programId: "PCS",
    growthPercent: 20,
  });
  const faculty = calculateFacultyAttrition(baselines, {
    positionsNotReplaced: 5,
  });
  const pricing = calculatePricingAndAid(baselines, {
    undergraduatePriceChangePercent: 5,
    graduatePriceChangePercent: 0,
    additionalGrantPerPellEligible: 1000,
  });

  assert.deepEqual(enrollment.metrics.map((metric) => metric.value), [0, 342, 342, 342, 14.25, 1.8, 5_653_260]);
  assert.deepEqual(retention.series, [90, 180, 270, 360]);
  assert.deepEqual(
    [capacity.comparison.headcountImpact, capacity.metrics[1].value, capacity.comparison.capacitySeatImpact],
    [136, 1.1623015873015874, 488],
  );
  assert.deepEqual(faculty.metrics.map((metric) => metric.value), [5, 243, 40, -960]);
  assert.deepEqual(
    [faculty.comparison.facultyFteImpact, faculty.comparison.headcountImpact, faculty.comparison.annualRevenueImpact],
    [-5, 0, 0],
  );
  assert.deepEqual(pricing.metrics.map((metric) => metric.value), [11_945_820, 0, 6_088_000, 5_857_820]);

  for (const [calculator, input] of [
    [calculateEnrollmentMix, { undergraduateChangePercent: 0, graduateChangePercent: 15 }],
    [calculateRetentionImprovement, { pointGain: 3 }],
    [calculateProgramCapacity, { programId: "PCS", growthPercent: 20 }],
    [calculateFacultyAttrition, { positionsNotReplaced: 5 }],
    [calculatePricingAndAid, { undergraduatePriceChangePercent: 5, graduatePriceChangePercent: 0, additionalGrantPerPellEligible: 1000 }],
  ]) {
    assert.equal(JSON.stringify(calculator(baselines, input)), JSON.stringify(calculator(baselines, input)));
  }
});
