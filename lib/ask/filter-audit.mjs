import { populationMentions } from "./resolvers.mjs";

export function buildFilterAudit({
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
}) {
  const detectedPopulationFilters = populationMentions(normalized);
  const hasExplicitDegreeLevel =
    /\bms\b|\bmasters?\b|\bmaster of science\b|\bmasters of science\b|\bbs\b|\bbachelor of science\b|\bbachelors of science\b|\bgraduates?\b|\bgraduate students?\b|\bundergraduates?\b/.test(
      normalized,
    );
  const detectedFilters = [
    ...(program ? [`Program: ${program.programName}`] : []),
    ...(degreeLevel && hasExplicitDegreeLevel
      ? [`Degree level: ${degreeLevel}`]
      : []),
    ...detectedPopulationFilters.map(
      ([dimension, value]) =>
        `${dimension.replaceAll("_", " ")}: ${value}`,
    ),
    `Time: ${yearPlan.startYear}-${yearPlan.endYear}`,
  ];
  const appliedFilters = [
    ...(program && !excludeProgram ? [`Program: ${program.programName}`] : []),
    ...(degreeLevel && hasExplicitDegreeLevel
      ? [`Degree level: ${degreeLevel}`]
      : []),
    ...(population.populationDimension !== "all"
      ? [
          `${population.populationDimension.replaceAll("_", " ")}: ${population.populationValue}`,
        ]
      : []),
    ...(groupBy !== "none" ? [`Group by: ${groupBy.replaceAll("_", " ")}`] : []),
    `Time: ${yearPlan.startYear}-${yearPlan.endYear}`,
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
      : null;
  const expectedMeasure =
    /\bpercentage[- ]points?\b|\bretention (?:gap|difference)\b/.test(
      normalized,
    )
      ? "percentage_point_difference"
      : /\b(?:available|open|remaining|unfilled|unused)\b.*\bseats?\b|\bseats?\b.*\b(?:remain|available|unused|unfilled|open)\b/.test(
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
          : /\bprograms?\b.*\b(?:added|gained|lost|raw (?:enrollment |headcount )?change)\b|\b(?:added|gained|lost)\b.*\b(?:students?|headcount)\b/.test(
                normalized,
              )
            ? "absolute_change"
            : null;
  const expectedRanking =
    /\b(?:lost|declined|decreased|shed)\b.*\b(?:most|greatest|largest)\b|\b(?:largest|greatest)\b.*\b(?:percentage )?(?:loss|decline|decrease|drop)\b|\b(?:lowest|smallest|bottom|fewest|minimum)\b|\bleast[- ](?:utilized|enrolled|full|capacity)\b/.test(
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
      /\b(?:top|bottom|which|give|return|list|show|rank(?: the)?)\s+(\d+)\b|\bthe\s+(\d+)\s+(?:largest|smallest|highest|lowest|most|least|fastest|biggest)\b/,
    ) ??
    normalized.match(
      /\b(?:top|bottom|which|give|return|list|show|rank(?: the)?)\s+(one|single|two|three|four|five|six|seven|eight|nine|ten)\b|\bthe\s+(one|single|two|three|four|five|six|seven|eight|nine|ten)\s+(?:largest|smallest|highest|lowest|most|least|fastest|biggest)\b/,
    );
  const explicitLimitValue = explicitLimit?.slice(1).find(Boolean);
  const expectedTopN = explicitLimit
    ? /^\d+$/.test(explicitLimitValue)
      ? Number(explicitLimitValue)
      : numberWords.get(explicitLimitValue)
    : null;
  const thresholdMatch = normalized.match(
    /\b(?:above|below|exactly|at least|at most)\s+(\d+(?:\.\d+)?)\s*(?:percent)?\b/,
  );
  const semanticConstraintsComplete =
    (!expectedGroupBy || groupBy === expectedGroupBy) &&
    (!expectedMeasure || measure === expectedMeasure) &&
    (!expectedRanking || ranking === expectedRanking) &&
    (!expectedTopN || topN === expectedTopN) &&
    (!thresholdMatch ||
      (thresholdOperator !== null &&
        Number(thresholdValue) === Number(thresholdMatch[1])));
  return {
    detected: detectedFilters,
    applied: appliedFilters,
    complete:
      populationFiltersComplete &&
      semanticConstraintsComplete &&
      !(
        detectedPopulationFilters.length > 1 &&
        detectedDimensions.size > 1
      ),
  };
}
