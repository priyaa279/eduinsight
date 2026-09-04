import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"));

const commandCenter = readJson("../app/data/command-center.generated.json");
const ask = readJson("../app/data/ask-eduinsight.generated.json");
const ipeds = readJson("../app/data/ipeds-suite.generated.json");
const memoryBase = readJson("../app/data/institutional-memory.json");
const memoryExpanded = readJson("../app/data/institutional-memory-expanded.json");
const scenario = readJson("../app/data/scenario-baselines.generated.json");

test("cross-module enrollment reconciles with the frozen Ask source cube", () => {
  const latest = ask.enrollment.reduce(
    (sum, program) => sum + program.points.find((point) => point.year === 2025).total,
    0,
  );
  assert.equal(commandCenter.kpis.fallHeadcount.value, latest);
  assert.equal(latest, 18426);
});

test("cross-module retention reconciles with the frozen Ask cohort contract", () => {
  const cohort = ask.retention.find((item) => item.cohortYear === 2024);
  assert.equal(commandCenter.kpis.firstYearRetention.value, cohort.groups.all.rate);
  assert.equal(cohort.groups.all.rate, 0.784);
});

test("cross-module Data Quality retains evaluator and anomaly semantics", () => {
  const anomaly = commandCenter.qualityFindings.find((item) => item.ruleId === "DQ-X-004");
  assert.equal(commandCenter.kpis.openQualityIssues.value, commandCenter.qualityFindings.length);
  assert.deepEqual(
    [anomaly.observationCount, anomaly.defectiveRecordCount, anomaly.absoluteChange],
    [1, 0, -808],
  );
});

test("cross-module IPEDS classifications reconcile with the frozen suite", () => {
  const packageValues = Object.values(ipeds.packages);
  const counts = ["source_backed", "modeled_demo", "source_gap"].map(
    (state) => packageValues.filter((item) => item.sourceReadiness === state).length,
  );
  assert.deepEqual(
    [...counts, Object.keys(ipeds.nonImportable).length, ipeds.officialImportLayoutCodes.length],
    [1, 8, 2, 1, 11],
  );
});

test("cross-module Institutional Memory verification chronology remains source-derived", () => {
  const latestVerification = [memoryBase.verifiedAt, memoryExpanded.verifiedAt].sort().at(-1);
  assert.equal(
    commandCenter.snapshotMetadata.moduleVerification.institutionalMemory.verifiedAt,
    latestVerification,
  );
  assert.equal(JSON.stringify(commandCenter).includes('"definitionCount"'), false);
});

test("cross-module Scenario Lab outputs are not used as Command Center operational truth", () => {
  assert.ok(scenario.enrollment && scenario.retention && scenario.programs);
  assert.equal(JSON.stringify(commandCenter.sourceManifest).includes("scenario"), false);
  assert.equal(Object.hasOwn(commandCenter, "scenario"), false);
});
