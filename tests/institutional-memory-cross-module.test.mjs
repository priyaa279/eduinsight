import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import askDataset from "../app/data/ask-eduinsight.generated.json" with { type: "json" };
import commandCenter from "../app/data/command-center.generated.json" with { type: "json" };
import memory from "../app/data/institutional-memory.json" with { type: "json" };
import expandedMemory from "../app/data/institutional-memory-expanded.json" with { type: "json" };
import ipedsSuite from "../app/data/ipeds-suite.generated.json" with { type: "json" };
import scenarioBaselines from "../app/data/scenario-baselines.generated.json" with { type: "json" };
import { buildInstitutionalMemoryCatalog } from "../lib/institutional-memory-contract.mjs";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const catalog = buildInstitutionalMemoryCatalog([memory, expandedMemory]);

test("Ask and Institutional Memory expose the same complete definition contract", () => {
  assert.equal(catalog.definitions.length, 81);
  assert.equal(askDataset.governedDefinitions.length, 81);
  assert.deepEqual(
    askDataset.governedDefinitions.map((entry) => entry.id),
    catalog.definitions.map((entry) => entry.id),
  );
});

test("Institutional Memory uses the frozen Data Quality lifecycle vocabulary", () => {
  const finding = catalog.records.find(
    (record) => record.id === "definition-quality-finding",
  );
  assert.match(finding.use, /Open, In Review, Resolved, and Suppressed/);
  assert.doesNotMatch(finding.use, /Investigating|Reviewed/);
});

test("completion and course-seat definitions remain compatible with governed consumers", () => {
  const completion = catalog.records.find(
    (record) => record.id === "definition-completion",
  );
  const capacity = catalog.records.find(
    (record) => record.id === "definition-capacity",
  );
  assert.match(completion.body, /One student may generate more than one completion/);
  assert.match(completion.use, /completion count for awards/);
  assert.equal(capacity.calculation, "SUM(enrolled seats) ÷ SUM(section capacity)");
  assert.ok(
    scenarioBaselines.programs.every(
      (program) =>
        program.filledCourseSeats >= 0 &&
        program.courseSeatCapacity > 0 &&
        program.filledCourseSeats <= program.courseSeatCapacity,
    ),
  );
});

test("IPEDS boundary and source-readiness vocabulary remain frozen", () => {
  assert.match(page, /EduInsight does not submit data to NCES/);
  assert.equal(ipedsSuite.packages.C.sourceReadiness, "source_backed");
  assert.equal(ipedsSuite.packages.EF.sourceReadiness, "modeled_demo");
  assert.equal(ipedsSuite.packages.OM.sourceReadiness, "source_gap");
  assert.equal(ipedsSuite.packages.F.sourceReadiness, "source_gap");
});

test("Command Center carries no stale partial Institutional Memory definition contract", () => {
  assert.equal(Object.hasOwn(commandCenter, "governedDefinitionContract"), false);
  assert.match(page, /memoryItems\.filter\([\s\S]*?item\.kind === "Definition"/);
  assert.doesNotMatch(page, /definitionCount\s*=\s*28/);
});
