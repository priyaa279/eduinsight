import { normalizeQuestion } from "./normalization.mjs";
import {
  findCourse,
  findModality,
  findProgram,
  findQualityOwner,
  findQualitySource,
  inferPopulation,
  requestedLimit,
  resolveProgramScope,
} from "./resolvers.mjs";
import { parseComparisonRanking } from "./comparison-parser.mjs";
import { buildFilterAudit } from "./filter-audit.mjs";
import { parseMeasureAggregation } from "./measure-parser.mjs";
import { extractYears, refineTimePlan } from "./time-parser.mjs";
import { detectMetric } from "./intent-detector.mjs";
import { responseDirective } from "./semantic-policy.mjs";
import { questionQualityDirective } from "./question-quality.mjs";

export function planQuestionLocally(question, dataset) {
  const normalized = normalizeQuestion(question);
  const program = findProgram(normalized, dataset);
  const population = inferPopulation(normalized, dataset);
  const yearPlan = extractYears(normalized, dataset);
  const courseCode = findCourse(normalized, dataset);
  const modality = findModality(normalized, dataset);

  const metric = detectMetric(normalized, program);

  refineTimePlan(normalized, dataset, metric, yearPlan);

  let { programScope, degreeLevel, excludeProgram } =
    resolveProgramScope(normalized, program);

  let { groupBy, ranking, comparisonMode } = parseComparisonRanking(
    normalized,
    metric,
    population,
    yearPlan,
  );


  const parsedMeasure = parseMeasureAggregation({
    normalized,
    metric,
    yearPlan,
    dataset,
    population,
    groupBy,
  });
  groupBy = parsedMeasure.groupBy;
  const {
    severity,
    status,
    checkStatus,
    measure,
    operation,
    thresholdOperator,
    thresholdValue,
  } = parsedMeasure;
  if (
    ["retention_degree_gap", "compare_degree_levels"].includes(operation)
  ) {
    programScope = "all";
    degreeLevel = null;
  }
  let topN = requestedLimit(normalized);
  if (/\b(?:rank|order|list|show)\s+all\b.*\bprograms?\b/.test(normalized)) {
    topN = dataset.catalogs.programs.filter((candidate) => {
      if (program && candidate.programId !== program.programId) return false;
      if (degreeLevel && candidate.degreeLevel !== degreeLevel) return false;
      if (
        programScope === "masters_of_science" &&
        !candidate.programName.startsWith("MS ")
      ) {
        return false;
      }
      if (
        programScope === "bachelors_of_science" &&
        !candidate.programName.startsWith("BS ")
      ) {
        return false;
      }
      return true;
    }).length;
  }
  let directive = responseDirective(
    normalized,
    program,
    yearPlan,
    metric,
    population,
    groupBy,
  );
  if (directive.responseType === "answer") {
    directive = questionQualityDirective(question, {
      dataset,
      metric,
      program,
      degreeLevel,
      population,
    });
  }
  const filterAudit = buildFilterAudit({
    normalized,
    metric,
    program,
    degreeLevel,
    excludeProgram,
    population,
    groupBy,
    yearPlan,
    measure,
    ranking,
    topN,
    thresholdOperator,
    thresholdValue,
  });

  return {
    metric,
    programId: excludeProgram ? null : (program?.programId ?? null),
    excludeProgramId: excludeProgram ? program.programId : null,
    programScope,
    degreeLevel,
    startYear: yearPlan.startYear,
    endYear: yearPlan.endYear,
    timeMode: yearPlan.timeMode,
    populationDimension: population.populationDimension,
    populationValue: population.populationValue,
    retentionGroup: population.retentionGroup,
    groupBy,
    comparisonMode,
    ranking,
    severity,
    status,
    issueOwner: findQualityOwner(normalized, dataset),
    issueSource: findQualitySource(normalized, dataset),
    courseCode,
    modality,
    checkStatus,
    measure,
    operation,
    topN,
    thresholdOperator,
    thresholdValue,
    endpointsOnly: yearPlan.endpointsOnly,
    invalidYear: yearPlan.invalidYear,
    emptyRange: yearPlan.emptyRange,
    responseType: directive.responseType,
    responseReason: directive.responseReason,
    questionQualityIssue: directive.qualityIssue ?? null,
    normalizedQuestion: normalized,
    filterAudit,
    requestedGranularity: "aggregate",
    semanticEvidence: [],
    unresolvedConstraints: [],
    ambiguities: [],
    contradictions: [],
    compoundParts: 1,
    parser: "local",
    rationale: "Resolved with the local governed-metric vocabulary.",
  };
}
