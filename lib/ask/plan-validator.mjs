import { clean, normalizeQuestion } from "./normalization.mjs";
import {
  GROUP_BY_VALUES,
  METRICS,
  POPULATION_DIMENSIONS,
  PROGRAM_SCOPES,
  RETENTION_GROUPS,
  SEMANTIC_OPERATIONS,
} from "./plan-contract.mjs";
import { includesPhrase } from "./resolvers.mjs";
import { planQuestionLocally } from "./semantic-planner.mjs";

export function validateSemanticPlan(plan, dataset) {
  const errors = [];
  const years = dataset.catalogs.years;
  if (!METRICS.has(plan.metric)) errors.push("metric");
  if (!PROGRAM_SCOPES.has(plan.programScope)) errors.push("programScope");
  if (!POPULATION_DIMENSIONS.has(plan.populationDimension)) {
    errors.push("populationDimension");
  }
  if (!RETENTION_GROUPS.has(plan.retentionGroup)) errors.push("retentionGroup");
  if (!GROUP_BY_VALUES.has(plan.groupBy)) errors.push("groupBy");
  if (!SEMANTIC_OPERATIONS.has(plan.operation)) errors.push("operation");
  if (!years.includes(plan.startYear) || !years.includes(plan.endYear)) {
    errors.push("time");
  }
  if (plan.startYear > plan.endYear) errors.push("timeOrder");
  if (
    !["answer", "clarification", "limitation", "refusal"].includes(
      plan.responseType,
    )
  ) {
    errors.push("responseType");
  }
  if (
    !plan.filterAudit ||
    !Array.isArray(plan.filterAudit.detected) ||
    !Array.isArray(plan.filterAudit.applied) ||
    typeof plan.filterAudit.complete !== "boolean"
  ) {
    errors.push("filterAudit");
  }
  if (plan.responseType === "answer" && plan.filterAudit?.complete === false) {
    errors.push("silentFilterDrop");
  }
  if (
    plan.requestedGranularity &&
    !["aggregate", "student_level"].includes(plan.requestedGranularity)
  ) {
    errors.push("requestedGranularity");
  }
  if (
    plan.responseType === "answer" &&
    plan.requestedGranularity !== "aggregate"
  ) {
    errors.push("privacyGranularity");
  }
  if (
    plan.responseType === "answer" &&
    ((plan.unresolvedConstraints?.length ?? 0) > 0 ||
      (plan.ambiguities?.length ?? 0) > 0 ||
      (plan.contradictions?.length ?? 0) > 0)
  ) {
    errors.push("unresolvedSemantics");
  }
  if (plan.responseType === "answer" && plan.compoundParts !== 1) {
    errors.push("compoundRequest");
  }

  const operationMetric = {
    program_share_ranking: "enrollment",
    program_change_absolute: "enrollment",
    program_change_percent: "enrollment",
    program_change_negative: "enrollment",
    program_change_nonpositive: "enrollment",
    compare_degree_levels: "enrollment",
    compare_residency: "enrollment",
    compare_other_graduate: "enrollment",
    compare_years: "enrollment",
    retention_degree_gap: "retention",
    retention_group_improvement: "retention",
    retention_group_ranking: "retention",
    retention_pell_comparison: "retention",
    retention_generation_comparison: "retention",
    capacity_enrollment_comparison: "capacity_utilization",
    capacity_threshold: "capacity_utilization",
    capacity_evidence_count: "capacity_utilization",
    capacity_evidence_list: "capacity_utilization",
    capacity_shortfall: "capacity_utilization",
    quality_issue_detail: "quality_issues",
    quality_issue_list: "quality_issues",
    quality_issue_ranking: "quality_issues",
    quality_rule_status: "quality_issues",
    quality_lifecycle_status: "quality_issues",
    ipeds_remediation: "ipeds_readiness",
    ipeds_unresolved: "ipeds_readiness",
    ipeds_package_readiness: "ipeds_readiness",
    ipeds_source_backed: "ipeds_readiness",
    ipeds_source_gaps: "ipeds_readiness",
    ipeds_layouts: "ipeds_readiness",
    ipeds_submission_capability: "ipeds_readiness",
  }[plan.operation];
  if (operationMetric && operationMetric !== plan.metric) {
    errors.push("operationMetricCompatibility");
  }
  return { valid: errors.length === 0, errors };
}

function validPopulationValue(plan, dataset) {
  if (plan.populationDimension === "all") return null;
  const allowed = {
    residency: [...dataset.catalogs.residencies, "Domestic"],
    gender: dataset.catalogs.genders,
    race_ethnicity: dataset.catalogs.raceEthnicities,
    first_generation: ["First-generation", "Continuing-generation"],
    pell_eligible: ["Pell-eligible", "Non-Pell"],
    attendance_status: ["Full-time", "Part-time"],
    academic_status: dataset.catalogs.academicStatuses,
  }[plan.populationDimension];
  if (typeof plan.populationValue !== "string" || !plan.populationValue.trim()) {
    return null;
  }
  return (
    allowed?.find(
      (value) => clean(value) === clean(plan.populationValue),
    ) ?? null
  );
}

function conciseProgramName(programName) {
  return programName
    .replace(/^(MS|BS|BA|BBA)\s+/i, "")
    .replace(/^Master of\s+/i, "");
}

function programDisplayNameForQuestion(program, question) {
  const normalized = normalizeQuestion(question);
  const explicitlyNamesCredential =
    (program.degreeLevel === "Graduate" &&
      /\b(ms|master|masters|mpa)\b/.test(normalized)) ||
    (program.degreeLevel === "Undergraduate" &&
      /\b(bs|ba|bba|bachelor|bachelors)\b/.test(normalized));
  return includesPhrase(clean(question), program.programName) ||
    explicitlyNamesCredential
    ? program.programName
    : conciseProgramName(program.programName);
}

export function normalizePlan(plan, question, dataset) {
  const fallback = planQuestionLocally(question, dataset);
  const normalized = {
    ...plan,
  };
  if (fallback.responseType === "refusal") {
    normalized.responseType = "refusal";
    normalized.responseReason = fallback.responseReason;
    normalized.requestedGranularity = "student_level";
    normalized.parser = "local";
    normalized.filterAudit = {
      ...normalized.filterAudit,
      applied: [],
      complete: false,
    };
  }
  if (!METRICS.has(normalized.metric)) normalized.metric = "unsupported";
  if (
    normalized.programId &&
    !dataset.catalogs.programs.some(
      (program) => program.programId === normalized.programId,
    )
  ) {
    normalized.programId = null;
  }
  if (!PROGRAM_SCOPES.has(normalized.programScope)) {
    normalized.programScope = fallback.programScope;
  }
  if (!["Graduate", "Undergraduate", null].includes(normalized.degreeLevel)) {
    normalized.degreeLevel = fallback.degreeLevel;
  }
  if (!["latest", "single", "trend"].includes(normalized.timeMode)) {
    normalized.timeMode = fallback.timeMode;
  }
  if (!POPULATION_DIMENSIONS.has(normalized.populationDimension)) {
    normalized.populationDimension = fallback.populationDimension;
  }
  normalized.populationValue =
    validPopulationValue(normalized, dataset) ??
    (normalized.populationDimension === fallback.populationDimension
      ? fallback.populationValue
      : null);
  if (
    normalized.populationDimension !== "all" &&
    normalized.populationValue === null
  ) {
    normalized.populationDimension = "all";
  }
  if (!RETENTION_GROUPS.has(normalized.retentionGroup)) {
    normalized.retentionGroup = fallback.retentionGroup;
  }
  if (!GROUP_BY_VALUES.has(normalized.groupBy)) {
    normalized.groupBy = fallback.groupBy;
  }
  if (!["trend", "groups", "ranking", "snapshot"].includes(normalized.comparisonMode)) {
    normalized.comparisonMode = fallback.comparisonMode;
  }
  if (!["none", "highest", "lowest"].includes(normalized.ranking)) {
    normalized.ranking = fallback.ranking;
  }
  if (!["Critical", "High", "Medium", null].includes(normalized.severity)) {
    normalized.severity = null;
  }
  if (!["Open", "Resolved", "All"].includes(normalized.status)) {
    normalized.status = fallback.status;
  }
  const owners = new Set([
    ...dataset.qualityIssues.map((issue) => issue.owner),
    ...(dataset.qualityRuleCatalog ?? []).map((rule) => rule.owner),
  ]);
  const sources = new Set(dataset.qualityIssues.map((issue) => issue.sourceSystem));
  if (!owners.has(normalized.issueOwner)) normalized.issueOwner = null;
  if (!sources.has(normalized.issueSource)) normalized.issueSource = null;
  if (!dataset.catalogs.courses.includes(normalized.courseCode)) {
    normalized.courseCode = null;
  }
  if (!dataset.catalogs.modalities.includes(normalized.modality)) {
    normalized.modality = null;
  }
  if (!["Passed", "Review", "Failed", null].includes(normalized.checkStatus)) {
    normalized.checkStatus = null;
  }
  if (
    ![
      "count",
      "affected_records",
      "utilization",
      "available_seats",
      "dfw_rate",
      "retention_rate",
      "readiness",
      "percentage",
      "absolute_change",
      "percentage_growth",
      "percentage_point_difference",
    ].includes(normalized.measure)
  ) {
    normalized.measure = fallback.measure;
  }

  const minYear = Math.min(...dataset.catalogs.years);
  const maxYear = Math.max(...dataset.catalogs.years);
  normalized.startYear = Math.max(
    minYear,
    Math.min(Number(normalized.startYear) || minYear, maxYear),
  );
  normalized.endYear = Math.max(
    normalized.startYear,
    Math.min(Number(normalized.endYear) || maxYear, maxYear),
  );
  const resolvedProgram = normalized.programId
    ? dataset.catalogs.programs.find(
        (program) => program.programId === normalized.programId,
      )
    : null;
  normalized.programDisplayName = resolvedProgram
    ? programDisplayNameForQuestion(resolvedProgram, question)
    : null;
  normalized.requestedGranularity =
    normalized.requestedGranularity ?? "aggregate";
  normalized.semanticEvidence = Array.isArray(normalized.semanticEvidence)
    ? normalized.semanticEvidence
    : [];
  normalized.unresolvedConstraints = Array.isArray(
    normalized.unresolvedConstraints,
  )
    ? normalized.unresolvedConstraints
    : [];
  normalized.ambiguities = Array.isArray(normalized.ambiguities)
    ? normalized.ambiguities
    : [];
  normalized.contradictions = Array.isArray(normalized.contradictions)
    ? normalized.contradictions
    : [];
  normalized.compoundParts = Number.isInteger(normalized.compoundParts)
    ? normalized.compoundParts
    : 1;
  normalized.parser = "local";

  const validation = validateSemanticPlan(normalized, dataset);
  if (!validation.valid && normalized.responseType === "answer") {
    normalized.responseType = "limitation";
    normalized.responseReason = `The request could not be converted into a complete governed query plan without dropping or invalidating a recognized constraint (${validation.errors.join(", ")}).`;
    normalized.filterAudit = {
      ...normalized.filterAudit,
      applied: [],
      complete: false,
    };
  }
  return normalized;
}
