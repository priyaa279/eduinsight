import { clean, normalizeQuestion } from "./normalization.mjs";

const REQUEST_OPENERS =
  /^(?:what|how|why|which|show|compare|list|give|tell|count|calculate|report|display|rank|order|group|explain|break|plot|put|provide|return|name|identify|state|define|check|find|trace|track|summarize|are|is|has|have|did|do|can|were|was)\b/;
const LEADING_SCOPE_CLAUSE =
  /^(?:for|among|in|during)\b.+\b(?:what|how|which|show|compare|list|give|count|calculate|report|rank)\b/;

// Common governed higher-education abbreviations (for example MS, BS, CS,
// grad, undergrad, intl, FT/PT, IPEDS, DFW, HC, pct, and FA25) are resolved by
// normalizeQuestion and the catalog resolvers. Only unresolved shorthand and
// typo-like forms are rejected here. The separate fragment check still rejects
// compressed prompts such as "intl cs fall25".
const UNRESOLVED_SHORTHAND_PATTERNS = [
  /\benrl\b|\benrlmnt\b|\benrollmnt\b|\benrollmt\b/,
  /\bretntn\b|\bpersistnce\b/,
  /\bfall\s*\d{2}\b/,
  /\bpls\b|\brn\b/,
];

const RELATIVE_TIME_PATTERN =
  /\b(?:last fall|last year|previous fall|previous year|this fall|this year)\b/;

function shorthandReason(raw) {
  if (!UNRESOLVED_SHORTHAND_PATTERNS.some((pattern) => pattern.test(raw))) {
    return null;
  }
  return (
    "The request uses shorthand or an abbreviation that the local parser does " +
    "not resolve automatically. Please write the full institutional-data question."
  );
}

function isCompleteCompactRequest(raw, context) {
  const normalized = normalizeQuestion(raw);
  const explicitMetric =
    /\b(?:enrollment|enrolled|headcount|retention|persistence|capacity|utilization|ipeds|data quality|quality issues?|dfw|course outcomes?)\b/.test(
      normalized,
    );
  const explicitYear = /\b(?:19|20)\d{2}\b/.test(normalized);
  const explicitSubject =
    Boolean(context.program) ||
    Boolean(context.degreeLevel) ||
    Boolean(
      context.population &&
        context.population.populationDimension !== "all",
    ) ||
    /\bprograms?\b/.test(normalized) ||
    /\b(?:total|overall|institution|institutional|university)\b/.test(
      normalized,
    );
  const currentSnapshotMetric = new Set([
    "capacity_utilization",
    "ipeds_readiness",
    "quality_issues",
    "data_catalog",
  ]).has(context.metric);

  return (
    explicitMetric &&
    ((explicitYear && explicitSubject) || currentSnapshotMetric)
  );
}

function fragmentReason(raw, context) {
  const words = raw.split(/\s+/).filter(Boolean);
  if (isCompleteCompactRequest(raw, context)) return null;
  if (
    words.length < 4 ||
    (!REQUEST_OPENERS.test(raw) && !LEADING_SCOPE_CLAUSE.test(raw))
  ) {
    return (
      "The request appears to be an incomplete fragment. Please rephrase it as " +
      "a complete question, including the metric, population or program, and time period when relevant."
    );
  }
  return null;
}

function relativeTimeReason(raw) {
  if (!RELATIVE_TIME_PATTERN.test(raw) || /\b(?:19|20)\d{2}\b/.test(raw)) {
    return null;
  }
  return (
    "The time period is ambiguous. Name the exact Fall term or cohort year, " +
    "such as Fall 2025 or the 2024 cohort."
  );
}

function ambiguousCatalogSubject(raw, program, dataset) {
  if (program) return null;
  const subjectMatch = raw.match(
    /\b([a-z][a-z-]*(?:\s+[a-z][a-z-]*){0,2})\s+(?:program\s+)?(?:enrollment|retention|capacity)\b/,
  );
  if (!subjectMatch) return null;
  const ignored = new Set([
    "all",
    "total",
    "overall",
    "graduate",
    "undergraduate",
    "bs",
    "ms",
    "institutional",
    "first year",
    "first-year",
  ]);
  const subject = clean(subjectMatch[1]);
  if (!subject || ignored.has(subject)) return null;
  const matches = dataset.catalogs.programs.filter((candidate) =>
    clean(candidate.programName).includes(subject),
  );
  if (matches.length <= 1) return null;
  return (
    `The program name “${subjectMatch[1]}” matches more than one governed catalog program. ` +
    "Please use the complete catalog program name."
  );
}

export function questionQualityDirective(question, context) {
  const raw = clean(question);
  const shorthand = shorthandReason(raw);
  if (shorthand) {
    return {
      responseType: "clarification",
      responseReason: shorthand,
      qualityIssue: "shorthand",
    };
  }

  const relativeTime = relativeTimeReason(raw);
  if (relativeTime) {
    return {
      responseType: "clarification",
      responseReason: relativeTime,
      qualityIssue: "ambiguous_time",
    };
  }

  const fragment = fragmentReason(raw, context);
  if (fragment) {
    return {
      responseType: "clarification",
      responseReason: fragment,
      qualityIssue: "incomplete_fragment",
    };
  }

  const ambiguousProgram = ambiguousCatalogSubject(
    raw,
    context.program,
    context.dataset,
  );
  if (ambiguousProgram) {
    return {
      responseType: "clarification",
      responseReason: ambiguousProgram,
      qualityIssue: "ambiguous_entity",
    };
  }

  if (context.metric === "unsupported") {
    return {
      responseType: "clarification",
      responseReason:
        "I could not identify one supported governed metric. Ask about enrollment, retention, capacity, course outcomes, IPEDS, data quality, or available data.",
      qualityIssue: "unresolved_metric",
    };
  }

  return {
    responseType: "answer",
    responseReason: null,
    qualityIssue: null,
  };
}
