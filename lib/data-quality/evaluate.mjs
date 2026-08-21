import { DATA_QUALITY_RULES } from "../data-quality-catalog.mjs";
import {
  DATA_QUALITY_FINDING_TYPES,
  DATA_QUALITY_RESULT_STATUSES,
  notEvaluatedResult,
} from "./contracts.mjs";
import { aidRules } from "./rules/aid.mjs";
import { completionRules } from "./rules/completions.mjs";
import { courseRules } from "./rules/courses.mjs";
import { crossDomainRules } from "./rules/cross-domain.mjs";
import { demographicRules } from "./rules/demographics.mjs";
import { enrollmentRules } from "./rules/enrollment.mjs";

const executableRules = [
  ...enrollmentRules,
  ...demographicRules,
  ...completionRules,
  ...aidRules,
  ...courseRules,
  ...crossDomainRules,
];

const executableById = new Map(executableRules.map((rule) => [rule.ruleId, rule]));

const missingDependencyReasons = new Map([
  ["DQ-ENR-005", "credits_earned is not present in the student-term source contract."],
  ["DQ-ENR-006", "credits_earned is not present, so the complete nonnegative-credit rule cannot run."],
  ["DQ-ENR-007", "term_gpa is not present in the student-term source contract."],
  ["DQ-DEM-002", "A versioned governed race/ethnicity-to-IPEDS code map is not present."],
  ["DQ-DEM-003", "A versioned governed sex/gender reporting code set is not present."],
  ["DQ-DEM-004", "A versioned governed residency code set is not present."],
  ["DQ-DEM-005", "Published demographic cells are not present in the current source contract."],
  ["DQ-COM-003", "AWLEVEL is not present in the completion source contract."],
  ["DQ-COM-005", "completion_term is not present in the completion source contract."],
  ["DQ-AID-002", "A governed aid-amount ceiling is not present in the source contract."],
  ["DQ-AID-003", "A complete governed Pell reconciliation contract is not defined."],
  ["DQ-CRS-002", "An active-section indicator is not present in the section source contract."],
  ["DQ-CRS-003", "Faculty assignment identifiers are not present; instructor_type is not an assignment."],
  ["DQ-CRS-004", "Faculty FTE is not present in the source contract."],
  ["DQ-CRS-005", "Faculty identifiers and section meeting times are not present."],
  ["DQ-X-002", "Versioned governed code sets are not present for schema-drift comparison."],
  ["DQ-X-003", "Historical table snapshots and approved explanations are not present."],
  ["DQ-X-005", "A comparable prior-year completion population is not present."],
  ["DQ-X-006", "A comparable prior-year financial-aid population is not present."],
  ["DQ-X-007", "Historical CIP values and effective-dated bridge records are not present."],
  ["DQ-X-008", "Governed identity-match attributes are not present."],
]);

function catalogMetadata(catalogRule) {
  return {
    ruleId: catalogRule.id,
    implementationRule: catalogRule.implementationRule,
    domain: catalogRule.domain,
    title: catalogRule.threshold,
    description: catalogRule.threshold,
    category: catalogRule.category,
    severity: null,
    owner: catalogRule.owner,
    findingType: DATA_QUALITY_FINDING_TYPES.DATA_DEFECT,
    sourceSystem: null,
    sourceFiles: [],
    sourceFields: [],
    scopeDescription: "Not evaluated from the current source contract",
    countSemantics: "Not available",
  };
}

export function evaluateDataQuality(context) {
  const results = DATA_QUALITY_RULES.map((catalogRule) => {
    const executable = executableById.get(catalogRule.id);
    if (!executable) {
      return notEvaluatedResult(
        catalogMetadata(catalogRule),
        missingDependencyReasons.get(catalogRule.id) ??
          "No unambiguous evaluator is available for the current source contract.",
      );
    }
    return executable.evaluate(context, executable);
  });

  const activeFindings = results
    .filter((result) => result.status === DATA_QUALITY_RESULT_STATUSES.FAIL)
    .map((result) => ({
      issueId: result.findingId ?? result.ruleId,
      ruleId: result.ruleId,
      implementationRule: result.implementationRule,
      severity: result.severity,
      title: result.title,
      description: result.description,
      findingType: result.findingType,
      affectedRecords:
        result.findingType === DATA_QUALITY_FINDING_TYPES.DATA_DEFECT
          ? result.violationCount
          : 0,
      observation: result.findingType === DATA_QUALITY_FINDING_TYPES.ANOMALY
        ? result.evidence
        : null,
      owner: result.owner,
      sourceSystem: result.sourceSystem,
      sourceFiles: result.sourceFiles,
      sourceFields: result.sourceFields,
      scopeDescription: result.scopeDescription,
      countSemantics: result.countSemantics,
      status: "Open",
      lifecycleStatus: "New",
      openedAt: context.generatedAt,
      resolvedAt: null,
      sampleRows: result.sampleRows,
      evidence: result.evidence,
    }));

  return { results, activeFindings };
}

export function summarizeDataQuality(results, activeFindings) {
  const count = (status) => results.filter((result) => result.status === status).length;
  return {
    totalRules: results.length,
    executed: count(DATA_QUALITY_RESULT_STATUSES.PASS) + count(DATA_QUALITY_RESULT_STATUSES.FAIL),
    pass: count(DATA_QUALITY_RESULT_STATUSES.PASS),
    fail: count(DATA_QUALITY_RESULT_STATUSES.FAIL),
    notEvaluated: count(DATA_QUALITY_RESULT_STATUSES.NOT_EVALUATED),
    activeFindings: activeFindings.length,
    dataDefects: activeFindings.filter(
      (finding) => finding.findingType === DATA_QUALITY_FINDING_TYPES.DATA_DEFECT,
    ).length,
    anomalies: activeFindings.filter(
      (finding) => finding.findingType === DATA_QUALITY_FINDING_TYPES.ANOMALY,
    ).length,
  };
}
