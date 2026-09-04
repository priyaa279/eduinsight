import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import commandCenter from "../app/data/command-center.generated.json" with { type: "json" };
import askDataset from "../app/data/ask-eduinsight.generated.json" with { type: "json" };
import { analyzeQuestionRequest } from "../lib/ask/request-service.mjs";
import { evaluateDataQuality } from "../lib/data-quality/evaluate.mjs";
import { loadDataQualityContext } from "./helpers/data-quality-context.mjs";

const evaluation = evaluateDataQuality(loadDataQualityContext());

test("DQ-ENR-001 evidence distinguishes undergraduate rows from the full-time predicate scope", () => {
  const result = evaluation.results.find((candidate) => candidate.ruleId === "DQ-ENR-001");
  assert.equal(result.evidence.currentUndergraduateRowCount, 16143);
  assert.equal(result.evidence.scopedFullTimeUndergraduateRowCount, 12943);
  assert.equal(Object.hasOwn(result.evidence, "scopedRowCount"), false);
  assert.equal(result.violationCount, 146);
});

test("DQ-X-004 finding contract separates one observation from zero defective records", () => {
  const finding = evaluation.activeFindings.find((candidate) => candidate.ruleId === "DQ-X-004");
  assert.equal(finding.observationCount, 1);
  assert.equal(finding.defectiveRecordCount, 0);
  assert.equal(finding.affectedRecords, 0);
  assert.equal(finding.absoluteChange, -808);
  assert.equal(finding.percentChange, -4.200894249766039);
  assert.equal(finding.observation.previousValue, 19234);
  assert.equal(finding.observation.currentValue, 18426);
});

test("Command Center brief does not store 808 as affectedRecords", () => {
  const anomaly = commandCenter.brief.find((item) => item.priority === 2);
  assert.equal(Object.hasOwn(anomaly, "affectedRecords"), false);
  assert.equal(anomaly.observationCount, 1);
  assert.equal(anomaly.defectiveRecordCount, 0);
  assert.equal(anomaly.absoluteChange, -808);
  assert.equal(anomaly.percentChange, -4.200894249766039);
});

test("Data Quality, Ask, and Command Center reconcile DQ-X-004 semantics", async () => {
  const dataQuality = commandCenter.qualityFindings.find((item) => item.ruleId === "DQ-X-004");
  const askIssue = askDataset.qualityIssues.find((item) => item.ruleId === "DQ-X-004");
  assert.deepEqual(
    [dataQuality.observationCount, askIssue.observationCount],
    [1, 1],
  );
  assert.deepEqual(
    [dataQuality.defectiveRecordCount, askIssue.defectiveRecordCount],
    [0, 0],
  );
  const answer = await analyzeQuestionRequest("Explain DQ-X-004.", askDataset);
  assert.match(answer.answer.headline, /-808 student change/i);
  assert.doesNotMatch(answer.answer.headline, /808 affected records/i);
});

test("the DQ-COM-004 applicability limitation is present in generated data and UI", () => {
  const finding = commandCenter.qualityFindings.find((item) => item.ruleId === "DQ-COM-004");
  assert.match(finding.applicabilityLimitation, /synthetic single-career dataset/i);
  assert.match(finding.applicabilityLimitation, /career\/program-specific entry logic/i);
  const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /selected\.applicabilityLimitation/);
});
