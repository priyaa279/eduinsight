import { clean, normalizeQuestion } from "./normalization.mjs";

const GLOSSARY = [
  {
    term: "Fall enrollment",
    aliases: ["enrollment", "governed enrollment"],
    definition:
      "Fall enrollment is the distinct count of reportable students enrolled at the governed Fall census. It excludes nonreportable student-term rows and is not section registrations or annual unduplicated enrollment.",
    source: "EduInsight governed enrollment definition",
    sourceFiles: ["student_terms.csv", "students.csv", "terms.csv", "programs.csv"],
    sourceUrl: null,
  },
  {
    term: "First-year retention",
    aliases: ["retention", "first year retention"],
    definition:
      "First-year retention is the percentage of first-time, full-time, degree-seeking students in an entering Fall cohort who appear in the following Fall census.",
    source: "EduInsight governed retention definition",
    sourceFiles: ["students.csv", "student_terms.csv", "terms.csv", "programs.csv"],
    sourceUrl: null,
  },
  {
    term: "IPEDS",
    aliases: ["integrated postsecondary education data system"],
    definition:
      "The Integrated Postsecondary Education Data System is the U.S. Department of Education's annual collection of institution-level data from postsecondary institutions that participate in federal student-aid programs.",
    source: "NCES IPEDS — Report Your Data",
    sourceUrl: "https://nces.ed.gov/ipeds/report-your-data",
  },
  {
    term: "DFW",
    aliases: ["dfw rate"],
    definition:
      "DFW is a course-outcome measure that counts grades of D or F and withdrawals (W). A DFW rate divides those outcomes by all graded or otherwise eligible course outcomes in the defined population.",
    source: "EduInsight governed metric dictionary",
    sourceUrl: null,
  },
  {
    term: "CIP code",
    aliases: ["cip", "classification of instructional programs"],
    definition:
      "A CIP code is a six-digit Classification of Instructional Programs code used to classify fields of study and program completions consistently.",
    source: "NCES Classification of Instructional Programs",
    sourceUrl: "https://nces.ed.gov/ipeds/cipcode/",
  },
  {
    term: "AWLEVEL",
    aliases: ["award level", "ipeds award level"],
    definition:
      "AWLEVEL is the IPEDS award-level code that identifies the type of credential awarded, such as bachelor's, master's, or research doctorate.",
    source: "NCES IPEDS Completions survey materials",
    sourceUrl: "https://surveys.nces.ed.gov/ipeds/public/survey-materials/index",
  },
];

const CAPABILITY_PATTERNS = [
  /\bwhat data (?:is|are) available\b/,
  /\bwhat (?:can|does) (?:eduinsight|this) (?:answer|calculate|support)\b/,
  /\bwhat can (?:i|we) ask\b/,
  /\bshow (?:the )?(?:data|metric|capability) catalog\b/,
];

function definitionCatalog(dataset) {
  const shared = dataset.governedDefinitions ?? [];
  if (!shared.length) return GLOSSARY;
  return shared.map((entry) => {
    const fallbackTerm = {
      "definition-fall-headcount": "Fall enrollment",
      "definition-retention": "First-year retention",
    }[entry.id] ?? entry.term;
    const fallback = GLOSSARY.find(
      (candidate) => clean(candidate.term) === clean(fallbackTerm),
    );
    return {
      ...entry,
      sourceFiles: entry.sourceFiles ?? fallback?.sourceFiles,
    };
  });
}

function glossaryResolution(normalized, dataset) {
  const explicitDefinitionCue =
    /^(?:define|what does)\b.*(?:\bmean\b)?|\bdefinition of\b|\bwhat is meant by\b|\bmeaning of\b|\b(?:state|explain)\b.*\bdefinition\b/.test(
      normalized,
    );
  const governedMetadataCue =
    /\b(?:source files?|source lineage|numerator|denominator|which students enter|records excluded)\b/.test(
      normalized,
    );
  const bareWhatIs = /^(?:what is|what are)\s+(?:the\s+)?[^?]+$/.test(
    normalized,
  );
  const analyticalEvidence =
    /\b(?:19|20)\d{2}\b|\b(?:fall|spring|summer|winter)\s+(?:19|20)?\d{2}\b|\b(?:how many|number of|count|total|rate for|percentage|percent|difference|gap|compare|versus|vs|highest|lowest|largest|smallest|top|bottom|trend|changed|grew|declined|awarded|completed|enrolled)\b|\b(?:in|for|since|from|between|through)\s+(?:19|20)\d{2}\b|\b[A-Z]{2,4}\s*\d{3}\b/i.test(
      normalized,
    ) || programCandidates(normalized, dataset).length > 0;
  if (
    !explicitDefinitionCue &&
    !governedMetadataCue &&
    !(bareWhatIs && !analyticalEvidence)
  ) {
    return { requested: false, entry: null, requestedTerm: null };
  }
  let requestedTerm = [
    /^what is (?:the )?definition of (.+)$/,
    /^what are (?:the )?definitions? of (.+)$/,
    /^what is meant by (.+)$/,
    /^what does (.+?) mean$/,
    /^define (.+)$/,
    /^state (?:the )?definition of (.+)$/,
    /^state (?:the )?(.+?) definition(?: and (?:its )?lineage)?$/,
    /^explain (?:the )?definition of (.+)$/,
    /^what is (?:the )?(.+)$/,
    /^what are (?:the )?(.+)$/,
  ]
    .map((pattern) => normalized.match(pattern)?.[1])
    .find(Boolean);
  if (!requestedTerm && governedMetadataCue) {
    requestedTerm = /\b(?:retention|retained|entering cohort)\b/.test(normalized)
      ? "first-year retention"
      : /\b(?:enrollment|fall census)\b/.test(normalized)
        ? "fall enrollment"
        : null;
  }
  if (!requestedTerm) {
    return { requested: true, entry: null, requestedTerm: null };
  }
  const entries = definitionCatalog(dataset);
  const normalizedRequestedTerm = clean(requestedTerm);
  const matches = new Map();
  for (const entry of entries) {
    for (const alias of [entry.term, entry.title, ...(entry.aliases ?? [])]) {
      const cleanedAlias = clean(alias);
      if (!cleanedAlias) continue;
      if (cleanedAlias === normalizedRequestedTerm) {
        matches.set(entry.id ?? entry.term, entry);
      }
    }
  }
  return {
    requested: true,
    entry: matches.size === 1 ? [...matches.values()][0] : null,
    requestedTerm,
  };
}

function metricHint(normalized) {
  if (/\b(retention|retained|persistence)\b/.test(normalized)) return "Retention";
  if (/\b(completions?|degrees?|awards?)\b/.test(normalized)) return "Completions";
  if (/\b(capacity|seats?|utilization)\b/.test(normalized)) return "Capacity";
  if (/\b(dfw|course outcomes?|grades?)\b/.test(normalized)) return "Course outcomes";
  if (/\b(ipeds|submission|validation)\b/.test(normalized)) return "IPEDS validation";
  if (/\b(quality|issues?|errors?|findings?)\b/.test(normalized)) return "Data quality";
  if (/\b(enrollment|enrolled|headcount)\b/.test(normalized)) return "Enrollment";
  return null;
}

function programCandidates(normalized, dataset) {
  const programs = dataset.catalogs?.programs ?? [];
  if (/\b(?:cs|computer science|comp sci)\b/.test(normalized)) {
    return programs
      .filter((program) => /computer science/i.test(program.programName))
      .map((program) => program.programName);
  }
  return programs
    .filter((program) => {
      const name = clean(program.programName);
      return name.length > 3 && normalized.includes(name);
    })
    .map((program) => program.programName);
}

function partialResolution(question, normalized, dataset) {
  const words = normalized.split(/\s+/).filter(Boolean);
  const opener =
    /^(?:what|how|which|show|compare|list|rank|order|give|tell|calculate|report|break|split|separate|organize|predict|forecast|explain|is|are|has|have|did|do|can|will)\b/.test(
      normalized,
    );
  const candidates = programCandidates(normalized, dataset);
  const compactFallYear = normalized.match(/\bfall\s?(\d{2})\b/)?.[1];
  const year =
    normalized.match(/\b(20\d{2})\b/)?.[1] ??
    (compactFallYear ? `20${compactFallYear}` : null);
  const metric = metricHint(normalized);
  if (/\b(?:predict|forecast|what will|next year|future)\b/.test(normalized)) {
    return null;
  }
  // Explicit non-Fall terms are complete constraints, not ambiguous shorthand.
  // Let the analytical policy return the governed unsupported-term limitation.
  if (/\b(?:spring|summer|winter)\s+(?:19|20)\d{2}\b/.test(normalized)) {
    return null;
  }
  const hasSignal = Boolean(candidates.length || year || metric);
  const looksPartial = hasSignal && (!opener || words.length < 5);
  if (!looksPartial) return null;
  if (metric && year && candidates.length === 1) return null;

  const fields = [];
  if (candidates.length) {
    fields.push({
      id: "program",
      label: "Program",
      status: candidates.length === 1 ? "resolved" : "ambiguous",
      options: [
        ...candidates.map((label) => ({ label, value: label })),
        ...(candidates.length > 1
          ? [{ label: "All Computer Science programs", value: "all Computer Science programs" }]
          : []),
      ],
    });
  }
  if (year) {
    fields.push({
      id: "time",
      label: "Time",
      status: "ambiguous",
      options: [
        { label: `Fall ${year}`, value: `Fall ${year}` },
        { label: `Academic year ${Number(year) - 1}-${year.slice(2)}`, value: `academic year ${Number(year) - 1}-${year.slice(2)}` },
      ],
    });
  }
  if (/\b(?:intl|international)\b/.test(normalized)) {
    fields.push({
      id: "population",
      label: "Population",
      status: "resolved",
      options: [{ label: "International students", value: "international students" }],
    });
  }
  fields.push({
    id: "metric",
    label: "Metric",
    status: metric ? "resolved" : "assumed",
    assumed: !metric,
    options: [
      { label: metric ?? "Enrollment headcount (assumed)", value: metric ?? "Enrollment headcount" },
      ...(!metric
        ? [
            { label: "Completions", value: "Completions" },
            { label: "Retention", value: "Retention" },
          ]
        : []),
    ],
  });
  return { originalQuestion: question, fields };
}

export function classifyQuestionIntent(question, dataset) {
  const normalized = normalizeQuestion(question);
  // Definition titles belong to the governed catalog. Evaluate them before the
  // analytical normalizer rewrites domain words such as “major” to “programs.”
  const glossary = glossaryResolution(clean(question), dataset);
  if (glossary.entry) return { type: "definition", glossary: glossary.entry };
  if (glossary.requested) {
    if (/\bpersistence\b/.test(glossary.requestedTerm ?? "")) {
      return { type: "persistence_unsupported" };
    }
    return {
      type: "definition_unavailable",
      requestedTerm: glossary.requestedTerm,
    };
  }
  if (
    /\b(?:persistence|persisted|persisting)\b/.test(normalized) &&
    !/\b(?:definition of|what does .+ mean|define)\b/.test(normalized) &&
    !/\b(?:first[- ]year|ftft|first[- ]time full[- ]time|retention)\b/.test(
      normalized,
    )
  ) {
    return { type: "persistence_unsupported" };
  }
  if (CAPABILITY_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { type: "capability" };
  }
  const resolution = partialResolution(question, normalized, dataset);
  if (resolution) return { type: "partial", resolution };
  return { type: "analytical" };
}

export function definitionUnavailableAnswer(requestedTerm) {
  const displayTerm = String(requestedTerm ?? "that term").trim() || "that term";
  return {
    eyebrow: "Governed glossary · Definition unavailable",
    headline: `No governed definition matched “${displayTerm}.”`,
    summary:
      "EduInsight did not substitute a nearby concept. Rephrase using a governed title or review Institutional Memory for available definitions.",
    delta: "Clarify",
    points: [],
    notes: [
      "Definition matching is limited to exact governed titles, terms, and explicit aliases.",
      "No analytical calculation was run.",
    ],
    metric: "Governed definition not resolved",
    sources: ["Institutional Memory governed-definition contract"],
    limitations: ["No sufficiently governed glossary match was available."],
    confidence: "Low",
    confidenceDetails: {
      query: "Unresolved",
      data: "Unavailable",
      calculation: "Not run",
    },
    disposition: "clarification",
    queryPlan: `glossary_unavailable(term=${displayTerm})`,
    chartType: "none",
    intent: "definition",
  };
}

export function glossaryAnswer(entry) {
  const definition = entry.definition ?? entry.body ?? entry.excerpt;
  const detailedDefinition =
    entry.excerpt && !definition.includes(entry.excerpt)
      ? `${entry.excerpt} ${definition}`
      : definition;
  const expandedDefinition =
    entry.id === "definition-retention" &&
    !/first-time, full-time, degree-seeking/i.test(detailedDefinition)
      ? `${detailedDefinition} FTFT means first-time, full-time, degree-seeking.`
      : detailedDefinition;
  return {
    eyebrow: "Governed glossary",
    headline: `What ${entry.term} means`,
    summary: expandedDefinition,
    delta: "Definition",
    points: [],
    notes: [
      "This answer comes from the governed glossary, not the analytical metric pipeline.",
      "Definition contract: Institutional Memory shared governed definitions.",
      `Source: ${entry.source}.`,
      ...(entry.calculation ? [`Calculation: ${entry.calculation}.`] : []),
      ...(entry.sourceFiles?.length
        ? [`Lineage: ${entry.sourceFiles.join(" → ")}.`]
        : []),
    ],
    metric: "Governed definition",
    sources: entry.sourceFiles ?? [entry.source],
    sourceLinks: entry.sourceUrl ? [entry.sourceUrl] : [],
    limitations: ["Definitions describe the governed term; they do not calculate an institutional result."],
    confidence: "High",
    confidenceDetails: {
      query: "Resolved",
      data: "Certified",
      calculation: "Not run",
    },
    disposition: "answer",
    queryPlan: `glossary_lookup(term=${entry.term})`,
    chartType: "none",
    intent: "definition",
  };
}

export function persistenceLimitationAnswer() {
  return {
    eyebrow: "Governed analysis · Definition required",
    headline: "A governed persistence measure is not available in this source package.",
    summary:
      "Persistence can include continued enrollment at this institution or enrollment elsewhere. EduInsight will not silently substitute first-year retention for that broader concept.",
    delta: "Clarify",
    points: [],
    notes: [
      "Ask for first-year retention if you mean return to this institution in the following Fall.",
      "A broader persistence result requires a governed persistence definition and, where applicable, external enrollment data.",
    ],
    metric: "No governed persistence metric selected",
    sources: ["EduInsight governed metric dictionary"],
    limitations: [
      "The current upload does not contain a separately governed persistence measure.",
    ],
    confidence: "Low",
    confidenceDetails: {
      query: "Ambiguous",
      data: "Unavailable",
      calculation: "Not run",
    },
    disposition: "clarification",
    queryPlan: "persistence_definition_required",
    chartType: "none",
    intent: "analytical",
  };
}

export function capabilityAnswer(dataset) {
  const packageSummary = dataset.ipedsPackageSummary;
  const gradedSections = (dataset.sections ?? []).filter(
    (section) => Number(section.gradedCount ?? 0) > 0,
  ).length;
  return {
    eyebrow: "Governed capability catalog",
    headline: "EduInsight has seven governed subject areas with source-specific availability.",
    summary:
      "The current governed contracts cover Fall-census enrollment, institution-wide annual completions, first-year retention, scheduled program capacity, Data Quality findings and rule evaluation, and current IPEDS package/source-readiness workflow. Course-outcome DFW requires final grades, which are not present in this upload.",
    delta: "7 domains",
    points: [],
    notes: [
      `Coverage includes ${dataset.catalogs?.programs?.length ?? 0} catalog programs and ${(dataset.catalogs?.years ?? []).length} Fall census years.`,
      `${dataset.qualityEvaluationSummary?.totalRules ?? 0} Data Quality rules are cataloged; ${dataset.qualityEvaluationSummary?.activeFindings ?? 0} active findings are tracked separately.`,
      ...(packageSummary
        ? [`IPEDS includes ${packageSummary.officialLayoutCount}/${packageSummary.officialLayoutCount} official layouts; source readiness remains package-specific.`]
        : []),
      gradedSections
        ? `${gradedSections} sections contain governed final-grade outcomes.`
        : "No current section contains final-grade outcomes, so DFW calculations fail closed.",
      "Unsupported subjects return a governed limitation; student-level identifying requests are refused.",
    ],
    metric: "Available governed data",
    sources: dataset.sourceFiles ?? [],
    limitations: ["Availability reflects only the currently loaded source package."],
    confidence: "High",
    confidenceDetails: {
      query: "Resolved",
      data: "Certified",
      calculation: "Not run",
    },
    disposition: "answer",
    queryPlan: "capability_catalog",
    chartType: "none",
    intent: "capability",
  };
}

export function partialAnswer(resolution) {
  return {
    eyebrow: "Governed analysis · confirm the request",
    headline: "I resolved part of your request.",
    summary: "This shorthand request resolved partially. Confirm the remaining choices below, then EduInsight can run the governed calculation without guessing.",
    delta: "Confirm",
    points: [],
    notes: [
      "Resolved fields are prefilled from the governed catalog.",
      "Assumed fields are visibly marked and are not executed until you confirm them.",
    ],
    metric: "Partially resolved request",
    sources: ["Governed program and term catalogs"],
    limitations: ["No institutional result has been calculated yet."],
    confidence: "Low",
    confidenceDetails: {
      query: "Unresolved",
      data: "Certified",
      calculation: "Not run",
    },
    disposition: "clarification",
    queryPlan: "partial_resolution_required",
    chartType: "none",
    intent: "partial",
    resolution,
  };
}

export function selectChartType(answer) {
  if (!answer || answer.disposition !== "answer" || !answer.points?.length) return "none";
  if (answer.points.length === 1) return "none";
  const plan = String(answer.queryPlan ?? "").toLowerCase();
  const labels = answer.points.map((point) => String(point.label));
  const years = labels.every((label) => /^20\d{2}$/.test(label));
  if (years) return "line";
  if (/\b(?:share|composition|residency|pell|gender|race|first.generation)\b/.test(plan)) {
    return "stacked-bar";
  }
  return "bar";
}
