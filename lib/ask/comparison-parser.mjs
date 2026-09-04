import { POPULATION_GROUP_BYS } from "./plan-contract.mjs";
import { inferGroupBy } from "./resolvers.mjs";

export function parseComparisonRanking(normalized, metric, population, yearPlan) {
  let groupBy = inferGroupBy(normalized);
  let ranking = "none";
  if (
    /\b(highest|largest|most|top|greatest|strongest|best|peak|maximum|biggest|fastest|sharpest|steepest|fullest)\b/.test(
      normalized,
    )
  ) {
    ranking = "highest";
  } else if (
    /\b(lowest|smallest|least|bottom|weakest|fewest|minimum)\b/.test(normalized)
  ) {
    ranking = "lowest";
  } else if (
    /\b(?:rank|order)\b.*\bprograms?\b/.test(normalized) &&
    !/\blowest|smallest|least|bottom|weakest\b/.test(normalized)
  ) {
    ranking = "highest";
  }
  if (
    /\b(?:lost|declined|decreased|shed)\b.*\b(?:most|greatest|largest)\b|\b(?:largest|greatest)\b.*\b(?:loss(?:es)?|decline|decrease)\b/.test(
      normalized,
    )
  ) {
    ranking = "lowest";
  }
  if (
    ranking === "lowest" &&
    /\bat least\b/.test(normalized) &&
    !/\b(lowest|smallest|bottom|weakest)\b/.test(normalized)
  ) {
    ranking = "none";
  }
  if (
    groupBy === "none" &&
    ranking !== "none" &&
    ["enrollment", "retention", "capacity_utilization"].includes(metric)
  ) {
    groupBy = "program";
  }
  if (
    groupBy === "none" &&
    ranking !== "none" &&
    metric === "course_outcomes"
  ) {
    groupBy = "course";
  }
  if (
    POPULATION_GROUP_BYS.has(groupBy) &&
    population.populationDimension === groupBy
  ) {
    population.populationDimension = "all";
    population.populationValue = null;
    population.retentionGroup = "all";
  }

  const comparisonLanguage =
    /\b(compare|versus|vs|difference|gap|lower|higher)\b/.test(normalized);
  const comparisonMode =
    metric === "retention" &&
    population.populationDimension !== "all" &&
    comparisonLanguage
      ? "groups"
      : yearPlan.timeMode === "trend"
        ? "trend"
        : groupBy !== "none"
          ? ranking === "none"
            ? "groups"
            : "ranking"
          : "snapshot";
  return { groupBy, ranking, comparisonMode };
}
