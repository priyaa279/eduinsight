import { clean, normalizeQuestion } from "./normalization.mjs";

const GLOSSARY = [
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

function glossaryMatch(normalized) {
  const definitional =
    /^(?:what is|what are|what does|define|explain)\b/.test(normalized) ||
    /^[a-z0-9 -]{2,40}\?$/.test(normalized);
  if (!definitional) return null;
  return GLOSSARY.find((entry) =>
    [entry.term, ...entry.aliases].some((term) =>
      new RegExp(`\\b${clean(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(
        normalized,
      ),
    ),
  );
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
    /^(?:what|how|which|show|compare|list|give|tell|calculate|report|is|are|has|have|did|do|can)\b/.test(
      normalized,
    );
  const candidates = programCandidates(normalized, dataset);
  const compactFallYear = normalized.match(/\bfall\s?(\d{2})\b/)?.[1];
  const year =
    normalized.match(/\b(20\d{2})\b/)?.[1] ??
    (compactFallYear ? `20${compactFallYear}` : null);
  const metric = metricHint(normalized);
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
  const glossary = glossaryMatch(normalized);
  if (glossary) return { type: "definition", glossary };
  if (CAPABILITY_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { type: "capability" };
  }
  const resolution = partialResolution(question, normalized, dataset);
  if (resolution) return { type: "partial", resolution };
  return { type: "analytical" };
}

export function glossaryAnswer(entry) {
  return {
    eyebrow: "Governed glossary",
    headline: `What ${entry.term} means`,
    summary: entry.definition,
    delta: "Definition",
    points: [],
    notes: [
      "This answer comes from the governed glossary, not the analytical metric pipeline.",
      `Source: ${entry.source}.`,
    ],
    metric: "Governed definition",
    sources: [entry.source],
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

export function capabilityAnswer(dataset) {
  return {
    eyebrow: "Governed capability catalog",
    headline: "EduInsight can answer questions from six governed subject areas.",
    summary:
      "The current upload supports enrollment, first-year retention, course outcomes and DFW, program capacity, IPEDS validation, and data-quality findings.",
    delta: "6 domains",
    points: [],
    notes: [
      `Coverage includes ${dataset.catalogs?.programs?.length ?? 0} catalog programs and ${(dataset.catalogs?.years ?? []).length} Fall census years.`,
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
