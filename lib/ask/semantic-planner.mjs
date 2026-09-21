import { normalizeQuestion } from "./normalization.mjs";
import {
  findCourse,
  degreeQualifierMatchesProgram,
  extractDegreeQualifier,
  findModality,
  findProgram,
  findPrograms,
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
  const programs = findPrograms(normalized, dataset);
  const degreeQualifier = extractDegreeQualifier(normalized);
  const degreeProgramMismatch = Boolean(
    degreeQualifier &&
      program &&
      !degreeQualifierMatchesProgram(degreeQualifier, program),
  );
  const unsupportedCredentialScope = Boolean(
    degreeQualifier &&
      !program &&
      ["BA", "BBA", "MA", "MPA"].includes(degreeQualifier.key),
  );
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
  const hasExplicitRankLimit = new RegExp(
    String.raw`\b(?:rank(?: the)?|order(?: the)?)\s+(?:the\s+)?(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b`,
  ).test(normalized);
  if (
    /\b(?:rank|order)\b.*\bprograms?\b/.test(normalized) &&
    !hasExplicitRankLimit &&
    !/\b(?:top|bottom)\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/.test(
      normalized,
    )
  ) {
    topN = dataset.catalogs.programs.filter((candidate) => {
      if (program && candidate.programId !== program.programId) return false;
      if (degreeLevel && candidate.degreeLevel !== degreeLevel) return false;
      if (
        programScope === "masters_of_science" &&
        !candidate.programName.startsWith("MS ")
      ) return false;
      if (
        programScope === "bachelors_of_science" &&
        !candidate.programName.startsWith("BS ")
      ) return false;
      return true;
    }).length;
  }
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
  if (directive.responseType === "answer" && programs.length > 1) {
    directive = {
      responseType: "limitation",
      responseReason:
        "I found two programs in your request. Ask EduInsight does not currently support this comparison in one analysis.",
    };
  }
  if (directive.responseType === "answer" && degreeProgramMismatch) {
    directive = {
      responseType: "limitation",
      responseReason:
        `The requested degree qualifier ${degreeQualifier.label} does not match ` +
        `the governed catalog program ${program.programName} (${program.programId}). ` +
        `No matching ${degreeQualifier.label} program exists for that discipline in ` +
        "the current governed catalog, so EduInsight did not substitute a different degree.",
    };
  }
  if (directive.responseType === "answer" && unsupportedCredentialScope) {
    directive = {
      responseType: "limitation",
      responseReason:
        `The requested ${degreeQualifier.label} credential does not identify one ` +
        "governed catalog program, and the current query plan does not define an " +
        "exact credential-wide aggregate. Name a complete catalog program instead.",
    };
  }
  if (directive.responseType === "answer") {
    directive = questionQualityDirective(question, {
      dataset,
      metric,
      program,
      degreeLevel,
      population,
    });
  }
  if (
    directive.responseType === "answer" &&
    metric === "completions" &&
    (Boolean(program) ||
      Boolean(degreeLevel) ||
      population.populationDimension !== "all" ||
      groupBy !== "none" ||
      measure !== "count")
  ) {
    directive = {
      responseType: "limitation",
      responseReason:
        "The current governed completion aggregate supports institution-wide completion counts by reporting year only; the requested breakdown is not available.",
    };
  }
  const filterAudit = buildFilterAudit({
    normalized,
    metric,
    program,
    programs,
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
    operation,
    endpointsOnly: yearPlan.endpointsOnly,
    checkStatus,
  });
  if (degreeProgramMismatch || unsupportedCredentialScope) {
    filterAudit.detected = filterAudit.detected.map((item) =>
      item.startsWith("Degree level:")
        ? `Requested degree qualifier: ${degreeQualifier.label}`
        : item,
    );
    if (!filterAudit.detected.some((item) => item.includes("degree qualifier"))) {
      filterAudit.detected.push(
        `Requested degree qualifier: ${degreeQualifier.label}`,
      );
    }
    filterAudit.applied = [];
    filterAudit.complete = false;
  }

  const degreeEvidence = degreeQualifier
    ? [
        {
          kind: "degree_level",
          value: degreeQualifier.label,
          sourceSpan: degreeQualifier.sourceSpan,
        },
      ]
    : [];
  const degreeContradictions = degreeProgramMismatch
    ? [
        `Requested degree ${degreeQualifier.label} conflicts with resolved catalog program ${program.programName} (${program.programId}).`,
      ]
    : unsupportedCredentialScope
      ? [
          `Requested credential ${degreeQualifier.label} could not be conserved as a supported catalog scope.`,
        ]
      : [];

  return {
    metric,
    programId: excludeProgram ? null : (program?.programId ?? null),
    requestedProgramIds: programs.map((candidate) => candidate.programId),
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
    semanticEvidence: degreeEvidence,
    unresolvedConstraints: [],
    ambiguities: [],
    contradictions: degreeContradictions,
    compoundParts: 1,
    parser: "local",
    rationale: "Resolved with the local governed-metric vocabulary.",
  };
}
