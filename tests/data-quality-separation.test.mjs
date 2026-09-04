import assert from "node:assert/strict";
import test from "node:test";

import { evaluateDataQuality } from "../lib/data-quality/evaluate.mjs";
import {
  reconcileFindingLifecycles,
  stableFindingIdentity,
} from "../lib/data-quality/lifecycle.mjs";
import { loadDataQualityContext } from "./helpers/data-quality-context.mjs";

test("raw evaluator findings contain source truth without workflow state", () => {
  const { activeFindings } = evaluateDataQuality(loadDataQualityContext());
  for (const finding of activeFindings) {
    assert.equal(Object.hasOwn(finding, "status"), false);
    assert.equal(Object.hasOwn(finding, "lifecycleStatus"), false);
    assert.equal(Object.hasOwn(finding, "openedAt"), false);
    assert.equal(Object.hasOwn(finding, "resolvedAt"), false);
  }
});

test("lifecycle reconciliation assigns Open without changing evaluator truth", () => {
  const context = loadDataQualityContext();
  const { activeFindings } = evaluateDataQuality(context);
  const sourceSnapshot = structuredClone(activeFindings);
  const reconciled = reconcileFindingLifecycles(
    activeFindings,
    [],
    context.generatedAt,
  );
  assert.ok(reconciled.findings.every((finding) => finding.lifecycle.status === "Open"));
  assert.deepEqual(activeFindings, sourceSnapshot);
});

test("legacy finding aliases preserve their stable lifecycle identities", () => {
  const { activeFindings } = evaluateDataQuality(loadDataQualityContext());
  const byRule = new Map(activeFindings.map((finding) => [finding.ruleId, finding]));
  assert.equal(stableFindingIdentity(byRule.get("DQ-ENR-001")), "dq-finding:v1:DQ-ENR-001:DQ-1001");
  assert.equal(stableFindingIdentity(byRule.get("DQ-X-004")), "dq-finding:v1:DQ-X-004:DQ-1002");
  assert.equal(stableFindingIdentity(byRule.get("DQ-DEM-001")), "dq-finding:v1:DQ-DEM-001:DQ-1003");
});

test("resolved or suppressed lifecycle state does not change an evaluator FAIL", () => {
  const { results, activeFindings } = evaluateDataQuality(loadDataQualityContext());
  const finding = activeFindings.find((candidate) => candidate.ruleId === "DQ-ENR-001");
  const lifecycle = {
    findingKey: stableFindingIdentity(finding),
    issueId: finding.issueId,
    ruleId: finding.ruleId,
    status: "Resolved",
    notes: "Reviewed",
    reviewerIdentity: "reviewer",
    reviewerDisplayName: "Reviewer",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-02T00:00:00.000Z",
    lastSeenEvaluationAt: "2026-08-02T00:00:00.000Z",
    isActive: true,
    occurrenceCount: 1,
    previousStatus: null,
    reopenedAt: null,
  };
  const reconciled = reconcileFindingLifecycles(activeFindings, [lifecycle]);
  assert.equal(reconciled.findings.find((item) => item.ruleId === "DQ-ENR-001").lifecycle.status, "Resolved");
  assert.equal(results.find((result) => result.ruleId === "DQ-ENR-001").status, "FAIL");
  assert.equal(results.find((result) => result.ruleId === "DQ-ENR-001").violationCount, 146);
});
