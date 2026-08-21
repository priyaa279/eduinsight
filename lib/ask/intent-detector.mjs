export function detectMetric(normalized, program) {
  let metric = "unsupported";
  const explicitEnrollmentIntent =
    Boolean(program) ||
    /\b(enrollment|enrolled|headcount|students?|student records?|institutional population|all-student|all-program|graduate|undergraduate|masters?|ms|bs|demographic|residency|academic standing|race[- ]and[- ]ethnicity|race ethnicity|race and ethnicity|pell|first-generation|continuing-generation|full-time|part-time|reported gender|census|census file|census extract|snapshot|frozen headcount|frozen counts?|fall freeze|fall lock|reportable|in state|out-of-state|international|program (?:grew|declined|added)|programs? (?:lost|that did not grow|failed to increase))\b|\bfall\b.*\b(?:university|institutional) trend\b|programs?.*\b(growth|decline|drop|gain|international percentage)\b|\b(?:growth|decline|drop)[- ]programs?\b|program.*\bpercentage\b.*\binternational\b|program.*\binternational\b/.test(
      normalized,
    );
  if (
    /\b(what data is available|what data do you have|which data (?:is|are|do|can|sources?)|what can you answer|what questions can .+ source package answer|what can eduinsight calculate|capabilities|data catalog|metric catalog|available metric catalog|catalog of governed data|catalog every governed subject|catalog the analysis subjects|inventory the governed analytical subjects|list the governed analytics domains|governed analytics domains|state (?:the )?governed definition used for (?:enrollment|retention)|state (?:the )?governed (?:enrollment|first-year retention|retention) definition|define the governed (?:enrollment|retention)|define the official fall enrollment population and exclusions|explain the enrollment denominator and exclusions|state the first-year retention numerator denominator and lineage|first-year retention cohort definition and lineage|exact cohort definition|source files can answer|which uploaded files (?:and subject areas are supported|support governed calculations)|limitations of the course[- ]outcome data|what governed subjects|catalog every metric|analytics domains can these files answer|which (?:governed )?(?:subjects|metrics|domains|upload files|source files) (?:are available|can .+ answer))\b/.test(
      normalized,
    ) ||
    /\b(?:define|describe|explain|state)\b.*\b(?:official|governed|institutional)?\s*(?:fall )?(?:enrollment|first[- ]year retention|retention)\b.*\b(?:definition|population|numerator|denominator|exclusions?|lineage|sources?)\b/.test(
      normalized,
    ) ||
    /\b(?:what|which)\b.*\b(?:official|governed|institutional)\s+(?:metric )?definition\b.*\b(?:enrollment|first[- ]year retention|retention)\b/.test(
      normalized,
    ) ||
    (/\b(?:which|what|list)\b.*\b(?:uploaded|governed|source)?\s*(?:files?|sources?|data subjects?|analytics domains?)\b.*\b(?:support|supported|answer|calculate|calculations?|available)\b/.test(
      normalized,
    ) &&
      !/\b(?:enrollment|retention|capacity|utilization|ipeds|data quality|quality issues?|dfw|course outcomes?)\b/.test(
        normalized,
      )) ||
    /\b(?:limitations?|coverage)\b.*\b(?:course[- ]outcome|dfw|uploaded|governed)\b/.test(
      normalized,
    )
  ) {
    metric = "data_catalog";
  } else if (
    /\b(ipeds|submission|readiness|validation checks?|validation edits?|fall enrollment (?:component|run|validations?)|fall enrollment checks? (?:have )?not passed|checks? awaiting review|passed review and failed check totals?)\b/.test(
      normalized,
    )
  ) {
    metric = "ipeds_readiness";
  } else if (
    /\b(retention|retain|retained|persistence|persist|persisted|returned|return rate|came back)\b|\bstudents?\s+(?:to\s+)?return\b|\bdid\b.*\breturn\b/.test(
      normalized,
    )
  ) {
    metric = "retention";
  } else if (
    /\b(dfw|grade|grades|course outcome|course outcomes|pass rate|failure rate|course failure|withdrawal rate|withdrawal outcomes?)\b|\bd f and withdrawal outcomes?\b/.test(
      normalized,
    )
  ) {
    metric = "course_outcomes";
  } else if (
    /\b(capacity|utilization|utilized|utilised|filled seats|available seats|open seats|seats? remain|seats? (?:are )?still available|seat availability|scheduled seats|section[- ]seat|seats? occupied|occupied seats|sections?|schedules?)\b|\b\d+(?:\.\d+)? percent full\b/.test(
      normalized,
    )
  ) {
    metric = "capacity_utilization";
  } else if (
    explicitEnrollmentIntent &&
    !/\b(data quality|quality issues?|quality findings?|quality anomaly|which issue|how many issues?)\b/.test(
      normalized,
    )
  ) {
    metric = "enrollment";
  } else if (
    /\b(quality|issue|issues|finding|findings|error|errors|problem|problems|defect|defects|exception|exceptions|anomaly|anomalies|invalid|mismatch|mismatches|data problem|affected records?|record impact|source system|issue owner)\b|\bdq-(?:\d+|[a-z]+-\d+)\b/.test(
      normalized,
    )
  ) {
    metric = "quality_issues";
  }
  return metric;
}
