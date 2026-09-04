import { inferOperation } from "./semantic-policy.mjs";

function titleCase(value) {
  if (!value) return "";
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

export function parseMeasureAggregation({
  normalized,
  metric,
  yearPlan,
  dataset,
  population,
  groupBy,
}) {
  let severity = null;
  for (const candidate of ["critical", "high", "medium"]) {
    if (normalized.includes(candidate)) {
      severity = titleCase(candidate);
    }
  }

  let status = "Open";
  if (
    /\bnot resolved\b|\bunresolved\b|\bnot closed\b|\bnot fixed\b/.test(
      normalized,
    )
  ) {
    status = "Open";
  } else if (/\b(resolved|closed|fixed)\b/.test(normalized)) {
    status = "Resolved";
  }
  if (
    /\b(all|any|every)\s+(quality[- ]?)?(issues|findings)\b/.test(normalized) ||
    /\bopen (?:plus|and) (?:resolved|closed)\b/.test(normalized)
  ) {
    status = "All";
  }

  let checkStatus = null;
  if (
    /\b(?:did not|didn t|not)\s+pass(?:ed)?\b|\bnot passed\b|\banything other than passed\b|\bremain\b.*\bother than passed\b/.test(
      normalized,
    )
  ) {
    checkStatus = "Review";
  } else {
    if (/\b(passed|passing)\b/.test(normalized)) checkStatus = "Passed";
    if (/\b(failed|failing)\b/.test(normalized)) checkStatus = "Failed";
    if (/\b(review|attention|problem checks?|awaiting (?:human )?review|still open|unresolved)\b/.test(normalized)) {
      checkStatus = "Review";
    }
  }
  if (
    metric === "ipeds_readiness" &&
    checkStatus &&
    /\b(how many|number of)\b/.test(normalized)
  ) {
    groupBy = "status";
  }
  if (
    metric === "ipeds_readiness" &&
    /\b(?:passed|review)\b.*\bfailed\b|\beach status\b/.test(normalized)
  ) {
    checkStatus = null;
    groupBy = "status";
  }

  let measure = "count";
  if (
    /\baffected records?\b|\brecords? (?:are )?affected\b|\brecord impact\b/.test(
      normalized,
    )
    || /\baffected[- ]record counts?\b|\bsum\b.*\b(?:record|quality)\b/.test(
      normalized,
    )
  ) {
    measure = "affected_records";
  } else if (
    /\bavailable seats?|open (?:scheduled )?seats?|seats? remain\b|\bunfilled\b|\bunused\b|\bremaining\b.*\bseats?\b/.test(
      normalized,
    )
  ) {
    measure = "available_seats";
  } else if (metric === "capacity_utilization") {
    measure = "utilization";
  } else if (metric === "course_outcomes") {
    measure = "dfw_rate";
  } else if (metric === "retention") {
    measure = "retention_rate";
  } else if (metric === "ipeds_readiness") {
    measure = /\breadiness\b/.test(normalized)
      ? "readiness"
      : /\b(checks?|validations?)\b/.test(normalized)
      ? "count"
      : "readiness";
  }
  if (
    metric === "ipeds_readiness" &&
    /\bpretend every ipeds edit passed\b/.test(normalized)
  ) {
    checkStatus = null;
    measure = "readiness";
    groupBy = "none";
  }

  const operation = inferOperation(normalized, metric, yearPlan);
  if (metric === "enrollment" && operation === "share") {
    measure = "percentage";
  }
  if (operation === "program_share_ranking") {
    measure = "percentage";
  }
  if (
    [
      "program_change_absolute",
      "program_change_negative",
      "program_change_nonpositive",
    ].includes(operation)
  ) {
    measure = "absolute_change";
  }
  if (operation === "program_change_percent") {
    measure = "percentage_growth";
  }
  if (
    [
      "retention_degree_gap",
      "retention_pell_comparison",
      "retention_generation_comparison",
    ].includes(operation)
  ) {
    measure = "percentage_point_difference";
  }
  if (operation === "quality_issue_ranking") {
    measure = "affected_records";
  }
  if (
    metric === "enrollment" &&
    /\b(percent(?:age)? change|percentage (?:enrollment )?growth|percent enrollment growth|growth rate)\b/.test(
      normalized,
    )
  ) {
    measure = "percentage_growth";
  }
  if (
    metric === "enrollment" &&
    /\b(how many (?:more|fewer)|by how many students|raw number|numeric enrollment (?:gain|change)|enrollment loss(?:es)?|number of students (?:did|were|changed)|added the (?:greatest|largest|most) number)\b/.test(
      normalized,
    )
  ) {
    measure = "absolute_change";
  }
  if (
    metric === "retention" &&
    /\b(percentage[- ]point|percentage points|gap|difference)\b/.test(normalized)
  ) {
    measure = "percentage_point_difference";
  }
  if (
    metric === "quality_issues" &&
    /\b(affects? the most records|affecting the (?:greatest|largest|most) (?:number of )?records|touches? the (?:greatest|largest|most) (?:number of )?records|largest number of records|affected[- ]record footprint|record impact|affected[- ]record totals?)\b/.test(
      normalized,
    )
  ) {
    measure = "affected_records";
  }
  if (
    metric === "retention" &&
    operation === "rank_year" &&
    !/\b(?:19|20)\d{2}\b/.test(normalized)
  ) {
    yearPlan.startYear = Math.min(...dataset.catalogs.years);
  }
  if (
    [
      "program_change_negative",
      "program_change_nonpositive",
      "program_change_absolute",
      "program_change_percent",
    ].includes(operation)
  ) {
    groupBy = "program";
  }
  if (operation === "rank_year") groupBy = "year";
  if (operation === "compare_degree_levels") groupBy = "degree_level";
  if (operation === "capacity_threshold") groupBy = "program";
  if (
    operation === "retention_pell_comparison" ||
    (metric === "enrollment" &&
      /\b(?:compare|side by side|versus|vs)\b.*\bpell\b.*\bnon[- ]pell\b/.test(
        normalized,
      ))
  ) {
    groupBy = "pell_eligible";
    population.populationDimension = "all";
    population.populationValue = null;
    population.retentionGroup = "all";
  }
  if (
    operation === "retention_generation_comparison" ||
    (metric === "enrollment" &&
      /\bcompare first[- ]generation and continuing[- ]generation\b/.test(
        normalized,
      ))
  ) {
    groupBy = "first_generation";
    population.populationDimension = "all";
    population.populationValue = null;
    population.retentionGroup = "all";
  }
  if (operation === "ipeds_remediation" || operation === "ipeds_unresolved") {
    checkStatus = "Review";
  }
  let thresholdOperator = null;
  let thresholdValue = null;
  const thresholdRules = [
    ["lte", /\b(?:not above|below or equal to|at most)\s+(\d+(?:\.\d+)?)(?:\s*percent)?\b/],
    ["gte", /\b(?:not below|above or equal to|at least)\s+(\d+(?:\.\d+)?)(?:\s*percent)?\b/],
    ["eq", /\bexactly\s+(\d+(?:\.\d+)?)(?:\s*percent)?\b/],
    ["gt", /\babove\s+(\d+(?:\.\d+)?)(?:\s*percent)?\b/],
    ["lt", /\bbelow\s+(\d+(?:\.\d+)?)(?:\s*percent)?\b/],
  ];
  for (const [operator, pattern] of thresholdRules) {
    const match = normalized.match(pattern);
    if (match) {
      thresholdOperator = operator;
      thresholdValue = Number(match[1]);
      break;
    }
  }
  return {
    groupBy,
    severity,
    status,
    checkStatus,
    measure,
    operation,
    thresholdOperator,
    thresholdValue,
  };
}
