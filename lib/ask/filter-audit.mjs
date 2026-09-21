import { extractDegreeQualifier, populationMentions } from "./resolvers.mjs";
import { hasExplicitTimeExpression } from "./time-parser.mjs";

export function buildFilterAudit({
  normalized,
  metric,
  program,
  programs = program ? [program] : [],
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
  endpointsOnly,
  checkStatus,
}) {
  const detectedPopulationFilters = populationMentions(normalized);
  const hasExplicitDegreeLevel = Boolean(extractDegreeQualifier(normalized)) ||
    /\bgraduates?\b|\bgraduate students?\b|\bundergraduates?\b/.test(normalized);
  const hasExplicitTime = hasExplicitTimeExpression(normalized);
  const explicitTerm = normalized.match(
    /\b(fall|spring|summer|winter)\s+((?:19|20)\d{2})\b/,
  );
  const detectedFilters = [
    ...programs.map((candidate) => `Program: ${candidate.programName}`),
    ...(degreeLevel && hasExplicitDegreeLevel
      ? [`Degree level: ${degreeLevel}`]
      : []),
    ...detectedPopulationFilters.map(
      ([dimension, value]) =>
        `${dimension.replaceAll("_", " ")}: ${value}`,
    ),
    ...(hasExplicitTime
      ? [`Time: ${yearPlan.startYear}-${yearPlan.endYear}`]
      : []),
    ...(explicitTerm
      ? [`Term: ${explicitTerm[1][0].toUpperCase()}${explicitTerm[1].slice(1)} ${explicitTerm[2]}`]
      : []),
  ];
  const comparisonPopulationFilters =
    operation === "compare_residency"
      ? ["residency: Domestic", "residency: International"]
      : operation === "retention_pell_comparison"
        ? ["pell eligible: Pell-eligible", "pell eligible: Non-Pell"]
        : operation === "retention_generation_comparison"
          ? [
              "first generation: First-generation",
              "first generation: Continuing-generation",
            ]
      : [];
  const implicitTimeScope =
    !hasExplicitTime && metric === "retention" && operation === "rank_year"
      ? ["Cohorts: all available"]
      : !hasExplicitTime && ["enrollment", "retention", "completions"].includes(metric)
        ? ["Time scope: latest available"]
        : !hasExplicitTime && ["capacity_utilization", "course_outcomes"].includes(metric)
          ? [`Time: ${yearPlan.endYear}-${yearPlan.endYear}`]
        : [];
  const appliedFilters = [
    ...(program && !excludeProgram ? [`Program: ${program.programName}`] : []),
    ...(program && excludeProgram
      ? [`Exclude program: ${program.programName}`]
      : []),
    ...(degreeLevel && hasExplicitDegreeLevel
      ? [`Degree level: ${degreeLevel}`]
      : []),
    ...comparisonPopulationFilters,
    ...(operation !== "compare_residency" && population.populationDimension !== "all"
      ? [
          `${population.populationDimension.replaceAll("_", " ")}: ${population.populationValue}`,
        ]
      : []),
    ...(operation !== "compare_residency" && groupBy !== "none"
      ? [`Group by: ${groupBy.replaceAll("_", " ")}`]
      : []),
    ...(hasExplicitTime
      ? [`Time: ${yearPlan.startYear}-${yearPlan.endYear}`]
      : implicitTimeScope),
    ...(explicitTerm?.[1] === "fall"
      ? [`Term: Fall ${explicitTerm[2]}`]
      : []),
  ];
  const detectedDimensions = new Set(
    detectedPopulationFilters.map(([dimension]) => dimension),
  );
  const populationFiltersComplete =
    detectedDimensions.size <= 1 &&
    [...detectedDimensions].every(
      (dimension) =>
        population.populationDimension === dimension || groupBy === dimension,
    );
  const expectedGroupBy =
    /\b(?:compare|contrast)\b.*\bfull[- ]time\b.*\bpart[- ]time\b/.test(
      normalized,
    )
      ? "attendance_status"
      : /\b(?:each|every) academic[- ]status categor(?:y|ies)\b/.test(normalized)
        ? "academic_status"
        : /\b(?:each|per|by|assigned) owner\b|\bissue counts? for each owner\b/.test(normalized)
          ? "owner"
          : /\b(?:each|per|by) source system\b|\b(?:totals?|counts?) from (?:each )?source system\b|\bwhich source system\b/.test(normalized)
            ? "source_system"
            : null;
  const expectedMeasure =
    /\bpercentage[- ]points?\b|\bretention (?:gap|difference)\b/.test(
      normalized,
    )
      ? "percentage_point_difference"
      : /\b(?:available|open|remaining|unfilled|unused)\b.*\bseats?\b|\bseats?\b.*\b(?:remain|available|unused|unfilled|open|not yet filled)\b/.test(
      normalized,
    )
      ? "available_seats"
      : metric === "capacity_utilization" &&
          /\b(?:capacity|utilization|utilized|scheduled seats?|filled seats?|occupied)\b/.test(
            normalized,
          )
        ? "utilization"
      : /\b(?:percentage|proportion|share)\b/.test(normalized) &&
          /\bprograms?\b/.test(normalized) &&
          !/\b(?:growth|grew|change|decline|drop)\b/.test(normalized)
        ? "percentage"
          : /\b(?:percentage|percent)\b.*\b(?:growth|grew|change|decline|drop)\b|\b(?:growth|grew|change|decline|drop)\b.*\b(?:percentage|percent)\b/.test(
              normalized,
            )
          ? "percentage_growth"
          : /\bprograms?\b.*\b(?:added|gained|lost|losses|raw (?:enrollment |headcount )?change|numeric enrollment gain)\b|\b(?:added|gained|lost)\b.*\b(?:students?|headcount)\b|\bnumeric enrollment gain\b|\benrollment losses\b/.test(
                normalized,
              )
            ? "absolute_change"
            : null;
  const expectedRanking =
    /\b(?:lost|declined|decreased|shed)\b.*\b(?:most|greatest|largest)\b|\b(?:largest|greatest)\b.*\b(?:percentage )?(?:loss(?:es)?|decline|decrease|drop)\b|\b(?:lowest|smallest|bottom|fewest|minimum)\b|\bleast[- ](?:utilized|enrolled|full|capacity)\b/.test(
      normalized,
    )
      ? "lowest"
      : /\b(?:highest|largest|most|top|greatest|maximum|biggest|fastest)\b/.test(
            normalized,
          )
        ? "highest"
        : null;
  const numberWords = new Map([
    ["one", 1],
    ["single", 1],
    ["two", 2],
    ["three", 3],
    ["four", 4],
    ["five", 5],
    ["six", 6],
    ["seven", 7],
    ["eight", 8],
    ["nine", 9],
    ["ten", 10],
  ]);
  const explicitLimit =
    normalized.match(
      /\b(?:top|bottom|which|give|return|list|show|rank(?: the)?|identify|name)\s+(?:the\s+)?(\d+)\b|\bthe\s+(\d+)\s+(?:largest|smallest|highest|lowest|most|least|fastest|biggest)\b/,
    ) ??
    normalized.match(
      /\b(?:top|bottom|which|give|return|list|show|rank(?: the)?|identify|name)\s+(?:the\s+)?(one|single|two|three|four|five|six|seven|eight|nine|ten)\b|\bthe\s+(one|single|two|three|four|five|six|seven|eight|nine|ten)\s+(?:largest|smallest|highest|lowest|most|least|fastest|biggest)\b/,
    );
  const explicitLimitValue = explicitLimit?.slice(1).find(Boolean);
  const expectedTopN = ranking !== "none" && explicitLimit
    ? /^\d+$/.test(explicitLimitValue)
      ? Number(explicitLimitValue)
      : numberWords.get(explicitLimitValue)
    : null;
  const thresholdMatch = normalized.match(
    /\b(?:above|below|exactly|at least|at most)\s+(\d+(?:\.\d+)?)\s*(?:percent)?\b/,
  );
  const expectsEndpointsOnly =
    (normalized.match(/\b(?:19|20)\d{2}\b/g)?.length ?? 0) > 1 &&
    /\b(?:compare|versus|vs|in one comparison)\b/.test(normalized);
  const expectedCheckStatus =
    metric === "ipeds_readiness" &&
    groupBy !== "status" &&
    /\b(?:review|attention|must be reviewed|before ipeds submission)\b/.test(normalized)
      ? "Review"
      : null;
  const semanticConstraintsComplete =
    (!expectedGroupBy || groupBy === expectedGroupBy) &&
    (!expectedMeasure || measure === expectedMeasure) &&
    (!expectedRanking || ranking === expectedRanking) &&
    (!expectedTopN || topN === expectedTopN) &&
    (!expectsEndpointsOnly || endpointsOnly === true) &&
    (!expectedCheckStatus || checkStatus === expectedCheckStatus) &&
    (!thresholdMatch ||
      (thresholdOperator !== null &&
        Number(thresholdValue) === Number(thresholdMatch[1])));
  return {
    detected: detectedFilters,
    applied: appliedFilters,
    complete:
      programs.length <= 1 &&
      populationFiltersComplete &&
      semanticConstraintsComplete &&
      !(
        detectedPopulationFilters.length > 1 &&
        detectedDimensions.size > 1
      ),
  };
}
