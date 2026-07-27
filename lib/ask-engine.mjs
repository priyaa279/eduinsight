const METRICS = new Set([
  "enrollment",
  "retention",
  "ipeds_readiness",
  "quality_issues",
  "capacity_utilization",
  "course_outcomes",
  "data_catalog",
  "unsupported",
]);

const PROGRAM_SCOPES = new Set([
  "all",
  "masters_of_science",
  "bachelors_of_science",
  "degree_level",
  "specific",
]);

const POPULATION_DIMENSIONS = new Set([
  "all",
  "residency",
  "gender",
  "race_ethnicity",
  "first_generation",
  "pell_eligible",
  "attendance_status",
  "academic_status",
]);

const GROUP_BY_VALUES = new Set([
  "none",
  "year",
  "program",
  "college",
  "residency",
  "gender",
  "race_ethnicity",
  "first_generation",
  "pell_eligible",
  "attendance_status",
  "academic_status",
  "severity",
  "owner",
  "source_system",
  "status",
  "course",
  "modality",
  "run",
]);

const RETENTION_GROUPS = new Set([
  "all",
  "first_generation",
  "continuing_generation",
  "pell_eligible",
  "non_pell",
]);

const POPULATION_GROUP_BYS = new Set([
  "residency",
  "gender",
  "race_ethnicity",
  "first_generation",
  "pell_eligible",
  "attendance_status",
  "academic_status",
]);

function clean(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function signedPercent(value, digits = 1) {
  const prefix = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${prefix}${Math.abs(value * 100).toFixed(digits)}%`;
}

function signedPoints(value, digits = 1) {
  const prefix = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${prefix}${Math.abs(value * 100).toFixed(digits)} pts`;
}

function titleCase(value) {
  if (!value) return "";
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

function includesPhrase(normalized, phrase) {
  const escaped = clean(phrase).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\s)${escaped}(?=\\s|$)`).test(normalized);
}

function programAliases(program) {
  const name = clean(program.programName);
  const aliases = new Set([
    name,
    clean(program.programId),
    name.replace(/^(ms|ba|bs|bba)\s+/, ""),
    name.replace(/^master of\s+/, ""),
  ]);
  if (name.includes("public administration")) {
    aliases.add("public administration");
    aliases.add("mpa");
  }
  return [...aliases].filter((alias) => alias.length >= 3);
}

function findProgram(question, dataset) {
  const normalized = clean(question);
  const matches = [];
  for (const program of dataset.catalogs.programs) {
    for (const alias of programAliases(program)) {
      if (includesPhrase(normalized, alias)) {
        matches.push({ program, aliasLength: alias.length });
      }
    }
  }
  return matches.sort((a, b) => b.aliasLength - a.aliasLength)[0]?.program ?? null;
}

function findCatalogValue(normalized, values) {
  return (
    [...values]
      .sort((a, b) => clean(b).length - clean(a).length)
      .find((value) => includesPhrase(normalized, value)) ?? null
  );
}

function findResidency(normalized, dataset) {
  if (/\bin state\b|\binstate\b|\bresident students?\b/.test(normalized)) {
    return "In-state";
  }
  if (/\bout of state\b|\bout-of-state\b|\bnonresident domestic\b/.test(normalized)) {
    return "Out-of-state";
  }
  if (/\binternational\b|\bforeign students?\b/.test(normalized)) {
    return "International";
  }
  return findCatalogValue(normalized, dataset.catalogs.residencies);
}

function findGender(normalized, dataset) {
  if (/\b(nonbinary|non-binary)\b/.test(normalized)) return "Nonbinary";
  if (/\b(women|woman|female)\b/.test(normalized)) return "Woman";
  if (/\b(men|man|male)\b/.test(normalized)) return "Man";
  return findCatalogValue(normalized, dataset.catalogs.genders);
}

function findRaceEthnicity(normalized, dataset) {
  const aliases = [
    ["Black or African American", /\bblack\b|\bafrican american\b/],
    ["Hispanic or Latino", /\bhispanic\b|\blatino\b|\blatina\b|\blatinx\b/],
    ["Asian", /\basian\b/],
    ["White", /\bwhite\b/],
    ["American Indian or Alaska Native", /\bamerican indian\b|\balaska native\b/],
    [
      "Native Hawaiian or Other Pacific Islander",
      /\bnative hawaiian\b|\bpacific islander\b/,
    ],
    ["Two or more races", /\btwo or more races\b|\bmultiracial\b/],
    ["Nonresident", /\bnonresident\b/],
  ];
  for (const [value, pattern] of aliases) {
    if (pattern.test(normalized) && dataset.catalogs.raceEthnicities.includes(value)) {
      return value;
    }
  }
  return findCatalogValue(normalized, dataset.catalogs.raceEthnicities);
}

function inferPopulation(normalized, dataset) {
  if (/\bnon[- ]pell\b/.test(normalized)) {
    return {
      populationDimension: "pell_eligible",
      populationValue: "Non-Pell",
      retentionGroup: "non_pell",
    };
  }
  if (/\bpell\b/.test(normalized)) {
    return {
      populationDimension: "pell_eligible",
      populationValue: "Pell-eligible",
      retentionGroup: "pell_eligible",
    };
  }
  if (/\bcontinuing[- ]generation\b|\bcontinuing gen\b/.test(normalized)) {
    return {
      populationDimension: "first_generation",
      populationValue: "Continuing-generation",
      retentionGroup: "continuing_generation",
    };
  }
  if (/\bfirst[- ]generation\b|\bfirst gen\b/.test(normalized)) {
    return {
      populationDimension: "first_generation",
      populationValue: "First-generation",
      retentionGroup: "first_generation",
    };
  }

  const residency = findResidency(normalized, dataset);
  if (residency) {
    return {
      populationDimension: "residency",
      populationValue: residency,
      retentionGroup: "all",
    };
  }
  const gender = findGender(normalized, dataset);
  if (gender) {
    return {
      populationDimension: "gender",
      populationValue: gender,
      retentionGroup: "all",
    };
  }
  const raceEthnicity = findRaceEthnicity(normalized, dataset);
  if (raceEthnicity) {
    return {
      populationDimension: "race_ethnicity",
      populationValue: raceEthnicity,
      retentionGroup: "all",
    };
  }
  const academicStatus = findCatalogValue(
    normalized,
    dataset.catalogs.academicStatuses,
  );
  if (academicStatus) {
    return {
      populationDimension: "academic_status",
      populationValue: academicStatus,
      retentionGroup: "all",
    };
  }
  if (/\b(probation|suspension|suspended)\b/.test(normalized)) {
    return {
      populationDimension: "academic_status",
      populationValue: /\bprobation\b/.test(normalized)
        ? "Probation"
        : "Suspension",
      retentionGroup: "all",
    };
  }
  if (/\bpart[- ]time\b/.test(normalized)) {
    return {
      populationDimension: "attendance_status",
      populationValue: "Part-time",
      retentionGroup: "all",
    };
  }
  if (/\bfull[- ]time\b/.test(normalized)) {
    return {
      populationDimension: "attendance_status",
      populationValue: "Full-time",
      retentionGroup: "all",
    };
  }
  return {
    populationDimension: "all",
    populationValue: null,
    retentionGroup: "all",
  };
}

function inferGroupBy(normalized) {
  const rules = [
    ["year", /\b(by|across|per)\s+(year|cohort|term)\b|\byear[- ]by[- ]year\b/],
    [
      "program",
      /\b(by|across|per)\s+program\b|\bwhich (graduate |undergraduate |ms |bs )?program\b|\bprogram breakdown\b/,
    ],
    ["college", /\b(by|across|per)\s+college\b|\bwhich college\b|\bcollege breakdown\b/],
    ["residency", /\b(by|across|per)\s+residenc\w*\b|\bresidency breakdown\b/],
    ["gender", /\b(by|across|per)\s+gender\b|\bgender breakdown\b/],
    [
      "race_ethnicity",
      /\b(by|across|per)\s+(race|ethnicity|race and ethnicity)\b|\bdemographic breakdown\b/,
    ],
    [
      "first_generation",
      /\b(by|across|per)\s+first[- ]generation\b|\bfirst[- ]generation breakdown\b/,
    ],
    ["pell_eligible", /\b(by|across|per)\s+pell\b|\bpell breakdown\b/],
    [
      "attendance_status",
      /\b(by|across|per)\s+(attendance|full[- ]time|part[- ]time)\b|\bfull[- ]time versus part[- ]time\b/,
    ],
    [
      "academic_status",
      /\b(by|across|per)\s+academic status\b|\bacademic standing breakdown\b/,
    ],
    ["severity", /\b(by|across|per)\s+severity\b|\bseverity breakdown\b/],
    ["owner", /\b(by|across|per)\s+owner\b|\bwhich owner\b/],
    [
      "source_system",
      /\b(by|across|per)\s+(source|system)\b|\bwhich source\b/,
    ],
    ["status", /\b(by|across|per)\s+status\b|\bstatus breakdown\b/],
    [
      "course",
      /\b(by|across|per)\s+course\b|\bwhich (gateway )?course\b|\bcourse breakdown\b/,
    ],
    ["modality", /\b(by|across|per)\s+modality\b|\bonline versus in person\b/],
    ["run", /\b(by|across|per)\s+run\b|\breadiness trend\b/],
  ];
  for (const [groupBy, pattern] of rules) {
    if (pattern.test(normalized)) return groupBy;
  }
  return "none";
}

function extractYears(question, dataset) {
  const normalized = clean(question);
  const years = [...question.matchAll(/\b(20\d{2})\b/g)].map((match) =>
    Number(match[1]),
  );
  const available = dataset.catalogs.years;
  const minimum = Math.min(...available);
  const maximum = Math.max(...available);
  const trendLanguage =
    /\bsince\b|\bfrom\b|\bbetween\b|\bthrough\b|\bover time\b|\btrend\b|\bchanged?\b|\bgrowth\b|\bincrease\w*\b|\bdecrease\w*\b|\bdecline\w*\b/.test(
      normalized,
    );

  if (!years.length) {
    return {
      startYear: minimum,
      endYear: maximum,
      timeMode: trendLanguage ? "trend" : "latest",
    };
  }
  if (years.length === 1 && !trendLanguage) {
    const year = Math.max(minimum, Math.min(years[0], maximum));
    return { startYear: year, endYear: year, timeMode: "single" };
  }
  return {
    startYear: Math.max(minimum, Math.min(...years)),
    endYear: Math.min(maximum, years.length === 1 ? maximum : Math.max(...years)),
    timeMode: "trend",
  };
}

function findCourse(normalized, dataset) {
  return (
    dataset.catalogs.courses.find((course) =>
      normalized.includes(clean(course)),
    ) ?? null
  );
}

function findModality(normalized, dataset) {
  if (/\bonline\b/.test(normalized)) return "Online";
  if (/\bin[- ]person\b|\bon campus\b/.test(normalized)) return "In person";
  return findCatalogValue(normalized, dataset.catalogs.modalities);
}

function findQualityOwner(normalized, dataset) {
  const owners = [...new Set(dataset.qualityIssues.map((issue) => issue.owner))];
  return findCatalogValue(normalized, owners);
}

function findQualitySource(normalized, dataset) {
  const sources = [
    ...new Set(dataset.qualityIssues.map((issue) => issue.sourceSystem)),
  ];
  return findCatalogValue(normalized, sources);
}

export function planQuestionLocally(question, dataset) {
  const normalized = clean(question);
  const program = findProgram(question, dataset);
  const population = inferPopulation(normalized, dataset);
  const yearPlan = extractYears(question, dataset);
  const courseCode = findCourse(normalized, dataset);
  const modality = findModality(normalized, dataset);

  let metric = "unsupported";
  if (
    /\b(what data|which data|source files?|available data|what can you answer|capabilities|data catalog)\b/.test(
      normalized,
    )
  ) {
    metric = "data_catalog";
  } else if (/\b(ipeds|submission|readiness|validation checks?)\b/.test(normalized)) {
    metric = "ipeds_readiness";
  } else if (
    /\b(quality|issue|issues|error|errors|invalid|mismatch|mismatches|data problem|affected records?|source system|issue owner)\b/.test(
      normalized,
    )
  ) {
    metric = "quality_issues";
  } else if (/\b(retention|retained|persistence|persisted|returned)\b/.test(normalized)) {
    metric = "retention";
  } else if (
    /\b(dfw|grade|grades|course outcome|course outcomes|pass rate|failure rate|withdrawal rate)\b/.test(
      normalized,
    )
  ) {
    metric = "course_outcomes";
  } else if (
    /\b(capacity|utilization|filled seats|available seats|open seats|seat availability|sections?)\b/.test(
      normalized,
    )
  ) {
    metric = "capacity_utilization";
  } else if (
    program ||
    /\b(enrollment|enrolled|headcount|students|student|graduate|undergraduate|masters|master|ms|bs|demographic|residency|academic standing)\b/.test(
      normalized,
    )
  ) {
    metric = "enrollment";
  }

  let programScope = "all";
  let degreeLevel = null;
  if (program) {
    programScope = "specific";
    degreeLevel = program.degreeLevel;
  } else if (/\bms\b|\bmaster of science\b|\bmasters of science\b/.test(normalized)) {
    programScope = "masters_of_science";
    degreeLevel = "Graduate";
  } else if (/\bbs\b|\bbachelor of science\b|\bbachelors of science\b/.test(normalized)) {
    programScope = "bachelors_of_science";
    degreeLevel = "Undergraduate";
  } else if (/\bgraduate\b|\bgrad students?\b/.test(normalized)) {
    programScope = "degree_level";
    degreeLevel = "Graduate";
  } else if (/\bundergraduate\b|\bundergrad\b/.test(normalized)) {
    programScope = "degree_level";
    degreeLevel = "Undergraduate";
  }

  let groupBy = inferGroupBy(normalized);
  let ranking = "none";
  if (/\b(highest|largest|most|top|greatest)\b/.test(normalized)) {
    ranking = "highest";
  } else if (/\b(lowest|smallest|least|bottom)\b/.test(normalized)) {
    ranking = "lowest";
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

  let severity = null;
  for (const candidate of ["critical", "high", "medium"]) {
    if (normalized.includes(candidate)) {
      severity = titleCase(candidate);
    }
  }

  let status = "Open";
  if (/\b(resolved|closed|fixed)\b/.test(normalized)) status = "Resolved";
  if (/\b(all|any)\s+(quality )?(issues|findings)\b/.test(normalized)) {
    status = "All";
  }

  let checkStatus = null;
  if (/\b(passed|passing)\b/.test(normalized)) checkStatus = "Passed";
  if (/\b(failed|failing|review|attention|problem checks?)\b/.test(normalized)) {
    checkStatus = "Review";
  }
  if (
    metric === "ipeds_readiness" &&
    checkStatus &&
    /\b(how many|number of)\b/.test(normalized)
  ) {
    groupBy = "status";
  }

  let measure = "count";
  if (/\baffected records?\b|\brecord impact\b/.test(normalized)) {
    measure = "affected_records";
  } else if (/\bavailable seats?|open seats?\b/.test(normalized)) {
    measure = "available_seats";
  } else if (metric === "capacity_utilization") {
    measure = "utilization";
  } else if (metric === "course_outcomes") {
    measure = "dfw_rate";
  } else if (metric === "retention") {
    measure = "retention_rate";
  } else if (metric === "ipeds_readiness") {
    measure = /\bchecks?\b/.test(normalized) ? "count" : "readiness";
  }

  return {
    metric,
    programId: program?.programId ?? null,
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
    rationale: "Resolved with the local governed-metric vocabulary.",
  };
}

function validPopulationValue(plan, dataset) {
  if (plan.populationDimension === "all") return null;
  const allowed = {
    residency: dataset.catalogs.residencies,
    gender: dataset.catalogs.genders,
    race_ethnicity: dataset.catalogs.raceEthnicities,
    first_generation: ["First-generation", "Continuing-generation"],
    pell_eligible: ["Pell-eligible", "Non-Pell"],
    attendance_status: ["Full-time", "Part-time"],
    academic_status: dataset.catalogs.academicStatuses,
  }[plan.populationDimension];
  if (typeof plan.populationValue !== "string" || !plan.populationValue.trim()) {
    return null;
  }
  return (
    allowed?.find(
      (value) => clean(value) === clean(plan.populationValue),
    ) ?? plan.populationValue.trim()
  );
}

export function normalizePlan(plan, question, dataset) {
  const fallback = planQuestionLocally(question, dataset);
  const normalized = { ...fallback, ...(plan ?? {}) };
  if (!METRICS.has(normalized.metric)) normalized.metric = "unsupported";
  if (
    normalized.programId &&
    !dataset.catalogs.programs.some(
      (program) => program.programId === normalized.programId,
    )
  ) {
    normalized.programId = null;
  }
  if (!PROGRAM_SCOPES.has(normalized.programScope)) {
    normalized.programScope = fallback.programScope;
  }
  if (!["Graduate", "Undergraduate", null].includes(normalized.degreeLevel)) {
    normalized.degreeLevel = fallback.degreeLevel;
  }
  if (!["latest", "single", "trend"].includes(normalized.timeMode)) {
    normalized.timeMode = fallback.timeMode;
  }
  if (!POPULATION_DIMENSIONS.has(normalized.populationDimension)) {
    normalized.populationDimension = fallback.populationDimension;
  }
  normalized.populationValue =
    validPopulationValue(normalized, dataset) ??
    (normalized.populationDimension === fallback.populationDimension
      ? fallback.populationValue
      : null);
  if (
    normalized.populationDimension !== "all" &&
    normalized.populationValue === null
  ) {
    normalized.populationDimension = "all";
  }
  if (!RETENTION_GROUPS.has(normalized.retentionGroup)) {
    normalized.retentionGroup = fallback.retentionGroup;
  }
  if (!GROUP_BY_VALUES.has(normalized.groupBy)) {
    normalized.groupBy = fallback.groupBy;
  }
  if (!["trend", "groups", "ranking", "snapshot"].includes(normalized.comparisonMode)) {
    normalized.comparisonMode = fallback.comparisonMode;
  }
  if (!["none", "highest", "lowest"].includes(normalized.ranking)) {
    normalized.ranking = fallback.ranking;
  }
  if (!["Critical", "High", "Medium", null].includes(normalized.severity)) {
    normalized.severity = null;
  }
  if (!["Open", "Resolved", "All"].includes(normalized.status)) {
    normalized.status = fallback.status;
  }
  const owners = new Set(dataset.qualityIssues.map((issue) => issue.owner));
  const sources = new Set(dataset.qualityIssues.map((issue) => issue.sourceSystem));
  if (!owners.has(normalized.issueOwner)) normalized.issueOwner = null;
  if (!sources.has(normalized.issueSource)) normalized.issueSource = null;
  if (!dataset.catalogs.courses.includes(normalized.courseCode)) {
    normalized.courseCode = null;
  }
  if (!dataset.catalogs.modalities.includes(normalized.modality)) {
    normalized.modality = null;
  }
  if (!["Passed", "Review", null].includes(normalized.checkStatus)) {
    normalized.checkStatus = null;
  }
  if (
    ![
      "count",
      "affected_records",
      "utilization",
      "available_seats",
      "dfw_rate",
      "retention_rate",
      "readiness",
    ].includes(normalized.measure)
  ) {
    normalized.measure = fallback.measure;
  }

  const minYear = Math.min(...dataset.catalogs.years);
  const maxYear = Math.max(...dataset.catalogs.years);
  normalized.startYear = Math.max(
    minYear,
    Math.min(Number(normalized.startYear) || minYear, maxYear),
  );
  normalized.endYear = Math.max(
    normalized.startYear,
    Math.min(Number(normalized.endYear) || maxYear, maxYear),
  );
  return normalized;
}

function selectedPrograms(plan, dataset) {
  const programs = dataset.catalogs.programs;
  if (plan.programId) {
    return programs.filter((program) => program.programId === plan.programId);
  }
  if (plan.programScope === "masters_of_science") {
    return programs.filter((program) => program.programName.startsWith("MS "));
  }
  if (plan.programScope === "bachelors_of_science") {
    return programs.filter((program) => program.programName.startsWith("BS "));
  }
  if (plan.programScope === "degree_level" && plan.degreeLevel) {
    return programs.filter((program) => program.degreeLevel === plan.degreeLevel);
  }
  return programs;
}

function programScopeLabel(plan, dataset) {
  if (plan.programId) {
    return (
      dataset.catalogs.programs.find(
        (program) => program.programId === plan.programId,
      )?.programName ?? plan.programId
    );
  }
  if (plan.programScope === "masters_of_science") return "MS-program";
  if (plan.programScope === "bachelors_of_science") return "BS-program";
  if (plan.programScope === "degree_level" && plan.degreeLevel) {
    return plan.degreeLevel.toLowerCase();
  }
  return "institution-wide";
}

function scopeNote(plan) {
  if (plan.programScope === "masters_of_science") {
    return "MS includes catalog programs beginning with “MS”; the Master of Public Administration is excluded.";
  }
  if (plan.programScope === "bachelors_of_science") {
    return "BS includes catalog programs beginning with “BS”; BA and BBA programs are excluded.";
  }
  if (plan.programScope === "degree_level" && plan.degreeLevel) {
    return `The calculation includes every catalog program governed as ${plan.degreeLevel}.`;
  }
  if (plan.programId) {
    return "The calculation is restricted to the named governed academic program.";
  }
  return "The calculation includes every governed academic program.";
}

function populationNote(plan) {
  if (plan.populationDimension === "all") {
    return "No demographic or student-status filter was applied.";
  }
  return `Population filter: ${plan.populationValue} (${plan.populationDimension.replaceAll("_", " ")}).`;
}

function populationDisplayLabel(plan) {
  if (
    ["first_generation", "pell_eligible", "residency", "gender", "race_ethnicity"].includes(
      plan.populationDimension,
    )
  ) {
    return `${plan.populationValue} students`;
  }
  return plan.populationValue;
}

function dimensionLabel(groupBy) {
  return {
    year: "year",
    program: "program",
    college: "college",
    residency: "residency",
    gender: "gender",
    race_ethnicity: "race and ethnicity",
    first_generation: "first-generation status",
    pell_eligible: "Pell eligibility",
    attendance_status: "attendance status",
    academic_status: "academic standing",
    severity: "severity",
    owner: "owner",
    source_system: "source system",
    status: "status",
    course: "course",
    modality: "modality",
    run: "validation run",
  }[groupBy] ?? "category";
}

function aggregateCount(rows, keyFor) {
  const values = new Map();
  for (const row of rows) {
    const key = keyFor(row);
    values.set(key, (values.get(key) ?? 0) + row.count);
  }
  return [...values.entries()].map(([label, value]) => ({ label, value }));
}

function sortPoints(points, plan, chronological = false) {
  if (chronological) {
    return [...points].sort((a, b) => Number(a.label) - Number(b.label));
  }
  if (plan.ranking === "lowest") {
    return [...points].sort((a, b) => a.value - b.value);
  }
  return [...points].sort((a, b) => b.value - a.value);
}

function limitedPoints(points, limit = 10) {
  return points.slice(0, limit);
}

function incompatibleBreakdownAnswer(plan) {
  return unsupportedAnswer(
    "That cross-tabulation is not certified in the current upload model.",
    `The question combines a ${plan.populationDimension.replaceAll("_", " ")} filter with a ${plan.groupBy.replaceAll("_", " ")} breakdown. Add that governed cross-tabulation to the ingestion contract before reporting it.`,
  );
}

function answerEnrollment(plan, dataset) {
  if (plan.modality) {
    return unsupportedAnswer(
      "Student enrollment cannot be filtered by course modality from this upload.",
      "student_terms.csv does not contain a modality field. The modality values belong to scheduled sections, where registrations are not unique student headcount.",
    );
  }

  const programs = selectedPrograms(plan, dataset);
  if (!programs.length) {
    return unsupportedAnswer(
      "No governed program matched the question.",
      "Use a catalog program name, MS, BS, graduate, undergraduate, or institution-wide scope.",
    );
  }
  const programIds = new Set(programs.map((program) => program.programId));
  const demographicGroup = POPULATION_GROUP_BYS.has(plan.groupBy)
    ? plan.groupBy
    : null;
  if (
    demographicGroup &&
    plan.populationDimension !== "all" &&
    plan.populationDimension !== demographicGroup
  ) {
    return incompatibleBreakdownAnswer(plan);
  }
  const cubeDimension =
    demographicGroup ?? plan.populationDimension ?? "all";
  let rows = dataset.enrollmentCubes[cubeDimension] ?? [];
  rows = rows.filter(
    (row) =>
      programIds.has(row.programId) &&
      row.year >= plan.startYear &&
      row.year <= plan.endYear &&
      (plan.populationDimension === "all" ||
        demographicGroup ||
        row.value === plan.populationValue),
  );

  if (!rows.length) {
    return unsupportedAnswer(
      "No Fall census enrollment records matched all requested filters.",
      `Available Fall census years are ${dataset.catalogs.years.join(", ")}.`,
    );
  }

  const latestYear = Math.max(...rows.map((row) => row.year));
  const effectiveGroupBy =
    plan.groupBy !== "none"
      ? plan.groupBy
      : plan.timeMode === "trend"
        ? "year"
        : "none";
  if (effectiveGroupBy !== "year") {
    rows = rows.filter((row) => row.year === latestYear);
  }

  let rawPoints;
  if (["program", "college"].includes(effectiveGroupBy)) {
    const names = new Map(
      programs.map((program) => [
        program.programId,
        effectiveGroupBy === "college" ? program.college : program.programName,
      ]),
    );
    rawPoints = aggregateCount(rows, (row) => names.get(row.programId));
  } else if (effectiveGroupBy === "year") {
    rawPoints = aggregateCount(rows, (row) => String(row.year));
  } else if (demographicGroup) {
    rawPoints = aggregateCount(rows, (row) => row.value);
  } else {
    rawPoints = [
      {
        label: String(latestYear),
        value: rows.reduce((sum, row) => sum + row.count, 0),
      },
    ];
  }

  const chronological = effectiveGroupBy === "year";
  rawPoints = sortPoints(rawPoints, plan, chronological);
  const points = limitedPoints(rawPoints).map((point) => ({
    ...point,
    display: point.value.toLocaleString("en-US"),
  }));
  const subject = `${plan.populationValue ? `${plan.populationValue} ` : ""}${programScopeLabel(plan, dataset)} enrollment`;
  const total = rawPoints.reduce((sum, point) => sum + point.value, 0);
  let headline;
  let summary;
  let delta;

  if (effectiveGroupBy === "year" && points.length > 1) {
    const first = points[0];
    const last = points.at(-1);
    const change = first.value ? (last.value - first.value) / first.value : null;
    headline =
      change === null
        ? `${titleCase(subject)} has no nonzero baseline in ${first.label}.`
        : `${titleCase(subject)} is ${change >= 0 ? "up" : "down"} ${Math.abs(change * 100).toFixed(1)}% since ${first.label}.`;
    summary = `${last.display} students matched in ${last.label}, compared with ${first.display} in ${first.label}.`;
    delta = change === null ? "No baseline" : signedPercent(change);
  } else if (effectiveGroupBy !== "none") {
    const leader = points[0];
    headline = `${leader.label} has the ${plan.ranking === "lowest" ? "lowest" : "largest"} matched enrollment at ${leader.display} students.`;
    summary = `${total.toLocaleString("en-US")} students are shown across ${rawPoints.length} ${dimensionLabel(effectiveGroupBy)} categor${rawPoints.length === 1 ? "y" : "ies"} for ${latestYear}.`;
    delta = leader.display;
  } else {
    headline = `${titleCase(subject)} is ${points[0].display} students in ${latestYear}.`;
    summary = "The result is a distinct, reportable Fall census student headcount.";
    delta = points[0].display;
  }

  return {
    eyebrow: `Enrollment · Fall census · ${effectiveGroupBy === "year" ? `${points[0].label}–${points.at(-1).label}` : latestYear}`,
    headline,
    summary,
    delta,
    points,
    notes: [
      scopeNote(plan),
      populationNote(plan),
      effectiveGroupBy === "year"
        ? "The x-axis contains Fall census years."
        : `The x-axis contains ${dimensionLabel(effectiveGroupBy)} values.`,
    ],
    metric: "Distinct reportable, census-enrolled students",
    sources: ["student_terms.csv", "students.csv", "programs.csv", "terms.csv"],
    limitations: [
      "Enrollment is a census headcount, not section registrations or annual unduplicated enrollment.",
      rawPoints.length > points.length
        ? `The chart displays the first ${points.length} ranked categories.`
        : "Every matched category is displayed.",
    ],
    confidence: "High",
    queryPlan: `enrollment; scope=${plan.programId ?? plan.programScope}; population=${plan.populationValue ?? "all"}; group_by=${effectiveGroupBy}; years=${plan.startYear}-${plan.endYear}`,
  };
}

function retentionAggregate(rows, keyFor) {
  const values = new Map();
  for (const row of rows) {
    const key = keyFor(row);
    const value = values.get(key) ?? { label: key, cohortSize: 0, retained: 0 };
    value.cohortSize += row.cohortSize;
    value.retained += row.retained;
    values.set(key, value);
  }
  return [...values.values()].map((value) => ({
    ...value,
    value: value.cohortSize ? (value.retained / value.cohortSize) * 100 : 0,
  }));
}

function answerRetention(plan, dataset) {
  if (
    ["attendance_status", "academic_status"].includes(plan.populationDimension) ||
    ["attendance_status", "academic_status"].includes(plan.groupBy)
  ) {
    return unsupportedAnswer(
      "That retention population is not defined by the uploaded FTFT cohort contract.",
      "The retention denominator can currently be disaggregated by program, degree level, residency, gender, race and ethnicity, first-generation status, and Pell eligibility.",
    );
  }

  const programs = selectedPrograms(plan, dataset);
  const programIds = new Set(programs.map((program) => program.programId));
  const demographicGroup = POPULATION_GROUP_BYS.has(plan.groupBy)
    ? plan.groupBy
    : null;
  if (
    demographicGroup &&
    plan.populationDimension !== "all" &&
    plan.populationDimension !== demographicGroup
  ) {
    return incompatibleBreakdownAnswer(plan);
  }
  const cubeDimension =
    demographicGroup ?? plan.populationDimension ?? "all";
  let rows = (dataset.retentionCubes[cubeDimension] ?? []).filter(
    (row) =>
      programIds.has(row.programId) &&
      row.cohortYear >= plan.startYear &&
      row.cohortYear <= plan.endYear &&
      (plan.populationDimension === "all" ||
        demographicGroup ||
        row.value === plan.populationValue),
  );
  if (!rows.length) {
    return unsupportedAnswer(
      "No complete retention cohort matched all requested filters.",
      "Retention requires a governed FTFT entry cohort and an available following-Fall outcome.",
    );
  }

  const latestCohort = Math.max(...rows.map((row) => row.cohortYear));
  const subject = `${plan.populationValue ? `${plan.populationValue} ` : ""}${programScopeLabel(plan, dataset)} first-year retention`;

  if (
    plan.comparisonMode === "groups" &&
    plan.populationDimension !== "all" &&
    plan.populationValue
  ) {
    const selectedRows = rows.filter((row) => row.cohortYear === latestCohort);
    const allRows = dataset.retentionCubes.all.filter(
      (row) =>
        programIds.has(row.programId) && row.cohortYear === latestCohort,
    );
    const selected = retentionAggregate(selectedRows, () => "Selected population")[0];
    const all = retentionAggregate(allRows, () => "Matched FTFT cohort")[0];
    const gap = (selected.value - all.value) / 100;
    const selectedLabel = populationDisplayLabel(plan);
    return {
      eyebrow: `${programScopeLabel(plan, dataset)} retention · ${latestCohort} FTFT cohort`,
      headline: `${selectedLabel} retained at ${selected.value.toFixed(1)}%, ${Math.abs(gap * 100).toFixed(1)} points ${gap >= 0 ? "above" : "below"} the matched cohort.`,
      summary: `${selected.retained.toLocaleString("en-US")} of ${selected.cohortSize.toLocaleString("en-US")} selected students appeared in the following Fall census.`,
      delta: signedPoints(gap),
      points: [
        {
          label: "Matched FTFT cohort",
          value: all.value,
          display: `${all.value.toFixed(1)}%`,
        },
        {
          label: selectedLabel,
          value: selected.value,
          display: `${selected.value.toFixed(1)}%`,
        },
      ],
      notes: [
        scopeNote(plan),
        populationNote(plan),
        "Both bars use the same first-time, full-time, degree-seeking cohort definition.",
      ],
      metric: "Following-Fall persistence among first-time, full-time, degree-seeking students",
      sources: ["students.csv", "student_terms.csv", "programs.csv", "terms.csv"],
      limitations: [
        "The difference is descriptive and does not establish why retention differs.",
      ],
      confidence: "High",
      queryPlan: `retention; scope=${plan.programId ?? plan.programScope}; population=${plan.populationValue}; comparison=matched_cohort; cohort=${latestCohort}`,
    };
  }

  let effectiveGroupBy = plan.groupBy;
  if (effectiveGroupBy === "none" && plan.timeMode === "trend") {
    effectiveGroupBy = "year";
  }
  if (effectiveGroupBy !== "year") {
    rows = rows.filter((row) => row.cohortYear === latestCohort);
  }

  let rawPoints;
  if (["program", "college"].includes(effectiveGroupBy)) {
    const names = new Map(
      programs.map((program) => [
        program.programId,
        effectiveGroupBy === "college" ? program.college : program.programName,
      ]),
    );
    rawPoints = retentionAggregate(rows, (row) => names.get(row.programId));
  } else if (effectiveGroupBy === "year") {
    rawPoints = retentionAggregate(rows, (row) => String(row.cohortYear));
  } else if (demographicGroup) {
    rawPoints = retentionAggregate(rows, (row) => row.value);
  } else {
    rawPoints = retentionAggregate(rows, () => String(latestCohort));
  }

  rawPoints = sortPoints(rawPoints, plan, effectiveGroupBy === "year");
  const points = limitedPoints(rawPoints).map((point) => ({
    label: point.label,
    value: point.value,
    display: `${point.value.toFixed(1)}%`,
  }));
  let headline;
  let summary;
  let delta;

  if (effectiveGroupBy === "year" && rawPoints.length > 1) {
    const first = rawPoints[0];
    const last = rawPoints.at(-1);
    const change = (last.value - first.value) / 100;
    const direction =
      change > 0 ? "increased" : change < 0 ? "decreased" : "was unchanged";
    headline = `${titleCase(subject)} ${direction} ${Math.abs(change * 100).toFixed(1)} percentage points, from ${first.value.toFixed(1)}% in ${first.label} to ${last.value.toFixed(1)}% in ${last.label}.`;
    summary = `${last.retained.toLocaleString("en-US")} of ${last.cohortSize.toLocaleString("en-US")} students in the latest matched cohort returned the following Fall.`;
    delta = signedPoints(change);
  } else if (effectiveGroupBy !== "none") {
    const leader = rawPoints[0];
    headline = `${leader.label} has the ${plan.ranking === "lowest" ? "lowest" : "highest"} matched first-year retention at ${leader.value.toFixed(1)}%.`;
    summary = `${leader.retained.toLocaleString("en-US")} of ${leader.cohortSize.toLocaleString("en-US")} students in that ${dimensionLabel(effectiveGroupBy)} category returned the following Fall.`;
    delta = `${leader.value.toFixed(1)}%`;
  } else {
    const latest = rawPoints[0];
    headline = `${titleCase(subject)} is ${latest.value.toFixed(1)}% for the ${latestCohort} cohort.`;
    summary = `${latest.retained.toLocaleString("en-US")} of ${latest.cohortSize.toLocaleString("en-US")} students appeared in the following Fall census.`;
    delta = `${latest.value.toFixed(1)}%`;
  }

  return {
    eyebrow: `First-year retention · ${effectiveGroupBy === "year" ? `${rawPoints[0].label}–${rawPoints.at(-1).label}` : latestCohort} FTFT cohort${effectiveGroupBy === "year" ? "s" : ""}`,
    headline,
    summary,
    delta,
    points,
    notes: [
      scopeNote(plan),
      populationNote(plan),
      effectiveGroupBy === "year"
        ? "The x-axis contains FTFT cohort entry years; each value measures return in the following Fall."
        : `The x-axis contains ${dimensionLabel(effectiveGroupBy)} values for the latest complete cohort.`,
    ],
    metric: "Following-Fall persistence among first-time, full-time, degree-seeking students",
    sources: ["students.csv", "student_terms.csv", "programs.csv", "terms.csv"],
    limitations: [
      "Retention differences are descriptive and do not establish causation.",
      "The latest complete cohort is 2024 because a following-Fall outcome is required.",
    ],
    confidence: "High",
    queryPlan: `retention; scope=${plan.programId ?? plan.programScope}; population=${plan.populationValue ?? "all"}; group_by=${effectiveGroupBy}; cohorts=${plan.startYear}-${latestCohort}`,
  };
}

function answerIpeds(plan, dataset) {
  const runs = dataset.ipedsReadiness;
  const latestRun = runs.at(-1);
  const currentChecks = dataset.ipedsChecks.filter(
    (check) => check.runId === latestRun.runId,
  );

  if (plan.checkStatus) {
    const checks = currentChecks.filter(
      (check) => check.status === plan.checkStatus,
    );
    const weight = checks.reduce((sum, check) => sum + check.weight, 0);
    const listChecks = plan.groupBy !== "status";
    return {
      eyebrow: `IPEDS · Fall Enrollment · Run ${latestRun.sequence}`,
      headline: `${checks.length} current validation checks are marked ${plan.checkStatus.toLowerCase()}.`,
      summary: `Those checks represent ${weight.toFixed(1)} of 100 governed readiness weight points.`,
      delta: `${checks.length} checks`,
      points: listChecks
        ? limitedPoints(
            checks.map((check) => ({
              label: check.checkId,
              value: check.weight,
              display: `${check.weight.toFixed(2)} pts`,
            })),
            8,
          )
        : [
            {
              label: plan.checkStatus,
              value: checks.length,
              display: checks.length.toLocaleString("en-US"),
            },
          ],
      notes: checks.length
        ? listChecks
          ? checks.slice(0, 3).map((check) => `${check.checkId}: ${check.checkName}.`)
          : [
              `${checks.length} of ${currentChecks.length} checks are ${plan.checkStatus.toLowerCase()}.`,
              `Their combined governed weight is ${weight.toFixed(1)} points.`,
            ]
        : ["No check matched the requested status in the latest run."],
      metric: "Current IPEDS Fall Enrollment validation check status and governed weight",
      sources: ["ipeds_validation_results.csv"],
      limitations: [
        "The chart shows at most eight checks; the method panel retains the exact filter.",
      ],
      confidence: "High",
      queryPlan: `ipeds_readiness; run=${latestRun.runId}; check_status=${plan.checkStatus}`,
    };
  }

  if (plan.measure === "count" || plan.groupBy === "status") {
    const statusPoints = ["Passed", "Review"].map((status) => {
      const value = currentChecks.filter((check) => check.status === status).length;
      return { label: status, value, display: String(value) };
    });
    return {
      eyebrow: `IPEDS · Fall Enrollment · Run ${latestRun.sequence}`,
      headline: `${latestRun.passedChecks} checks passed and ${latestRun.totalChecks - latestRun.passedChecks} require review.`,
      summary: `${latestRun.totalChecks} governed checks were evaluated in the latest validation run.`,
      delta: `${latestRun.totalChecks - latestRun.passedChecks} review`,
      points: statusPoints,
      notes: [
        "Passed and review counts come directly from the latest uploaded validation run.",
        "Readiness uses governed weights, so the check-count percentage can differ from the readiness percentage.",
      ],
      metric: "Count of IPEDS validation checks by status",
      sources: ["ipeds_validation_results.csv"],
      limitations: [
        "Check status does not replace final human approval or submission.",
      ],
      confidence: "High",
      queryPlan: `ipeds_readiness; run=${latestRun.runId}; group_by=status`,
    };
  }

  const selectedRuns =
    plan.timeMode === "trend" ? runs : [latestRun];
  const first = selectedRuns[0];
  const last = selectedRuns.at(-1);
  const change = last.readiness - first.readiness;
  return {
    eyebrow: "IPEDS · Fall Enrollment validation",
    headline: `Fall Enrollment is ${(last.readiness * 100).toFixed(0)}% submission-ready.`,
    summary: `${last.passedChecks} of ${last.totalChecks} governed validation checks passed in the latest run.`,
    delta:
      selectedRuns.length > 1
        ? signedPoints(change, 0)
        : `${(last.readiness * 100).toFixed(0)}%`,
    points: selectedRuns.map((run) => ({
      label: `Run ${run.sequence}`,
      value: run.readiness * 100,
      display: `${(run.readiness * 100).toFixed(0)}%`,
    })),
    notes: [
      `${last.totalChecks - last.passedChecks} checks still require review.`,
      "The readiness score is weighted and the latest run totals 100 governed weight points.",
      "The calculation uses uploaded validation outcomes, not a model estimate.",
    ],
    metric: "Passed IPEDS validation weight divided by total validation weight",
    sources: ["ipeds_validation_results.csv"],
    limitations: [
      "Readiness does not mean the survey has received final human approval or been submitted.",
    ],
    confidence: "High",
    queryPlan: `ipeds_readiness; runs=${selectedRuns.map((run) => run.runId).join(",")}`,
  };
}

function answerQuality(plan, dataset) {
  let issues = dataset.qualityIssues.filter(
    (issue) =>
      (plan.status === "All" || issue.status === plan.status) &&
      (!plan.severity || issue.severity === plan.severity) &&
      (!plan.issueOwner || issue.owner === plan.issueOwner) &&
      (!plan.issueSource || issue.sourceSystem === plan.issueSource),
  );

  const groupBy =
    plan.groupBy !== "none"
      ? plan.groupBy
      : plan.severity
        ? "none"
        : "severity";
  const keyFor = {
    severity: (issue) => issue.severity,
    owner: (issue) => issue.owner,
    source_system: (issue) => issue.sourceSystem,
    status: (issue) => issue.status,
  }[groupBy];
  const measureFor = (issue) =>
    plan.measure === "affected_records" ? issue.affectedRecords : 1;
  let rawPoints;
  if (keyFor) {
    const values = new Map();
    for (const issue of issues) {
      const key = keyFor(issue);
      values.set(key, (values.get(key) ?? 0) + measureFor(issue));
    }
    rawPoints = [...values.entries()].map(([label, value]) => ({ label, value }));
    if (groupBy === "severity") {
      const order = new Map([
        ["Critical", 0],
        ["High", 1],
        ["Medium", 2],
      ]);
      rawPoints.sort((a, b) => order.get(a.label) - order.get(b.label));
      if (plan.ranking !== "none") rawPoints = sortPoints(rawPoints, plan);
    } else {
      rawPoints = sortPoints(rawPoints, plan);
    }
  } else {
    const value = issues.reduce((sum, issue) => sum + measureFor(issue), 0);
    rawPoints = [
      {
        label: plan.severity ?? plan.status,
        value,
      },
    ];
  }

  const points = limitedPoints(rawPoints).map((point) => ({
    ...point,
    display: point.value.toLocaleString("en-US"),
  }));
  const issueCount = issues.length;
  const affected = issues.reduce(
    (sum, issue) => sum + issue.affectedRecords,
    0,
  );
  const measureLabel =
    plan.measure === "affected_records" ? "affected records" : "issues";
  const leader = points[0];
  const headline =
    keyFor && leader
      ? `${leader.label} has the ${plan.ranking === "lowest" ? "lowest" : "largest"} matched total at ${leader.display} ${measureLabel}.`
      : `${issueCount} ${plan.severity ? `${plan.severity.toLowerCase()} ` : ""}${plan.status === "All" ? "" : `${plan.status.toLowerCase()} `}data-quality issues match.`;

  return {
    eyebrow: `Data quality · ${plan.status} findings`,
    headline,
    summary: `${issueCount} findings reference ${affected.toLocaleString("en-US")} affected source records in aggregate.`,
    delta:
      plan.measure === "affected_records"
        ? `${affected.toLocaleString("en-US")} records`
        : `${issueCount} issues`,
    points,
    notes: [
      plan.issueOwner
        ? `Owner filter: ${plan.issueOwner}.`
        : "Every issue owner is included.",
      plan.issueSource
        ? `Source filter: ${plan.issueSource}.`
        : "Every logged source system is included.",
      issues[0]
        ? `Highest-priority matched finding: ${issues[0].title}.`
        : "No issue matched the requested filters.",
    ],
    metric:
      plan.measure === "affected_records"
        ? "Sum of affected-record counts in governed quality findings"
        : "Count of governed data-quality findings",
    sources: ["data_quality_issue_log.csv"],
    limitations: [
      "Affected-record totals can double-count a record flagged by multiple rules.",
    ],
    confidence: "High",
    queryPlan: `quality_issues; status=${plan.status}; severity=${plan.severity ?? "all"}; owner=${plan.issueOwner ?? "all"}; source=${plan.issueSource ?? "all"}; group_by=${groupBy}; measure=${plan.measure}`,
  };
}

function aggregateSections(rows, keyFor) {
  const values = new Map();
  for (const row of rows) {
    const key = keyFor(row);
    const value = values.get(key) ?? {
      label: key,
      seats: 0,
      filled: 0,
      gradedCount: 0,
      dfwCount: 0,
    };
    value.seats += row.seats;
    value.filled += row.filled;
    value.gradedCount += row.gradedCount;
    value.dfwCount += row.dfwCount;
    values.set(key, value);
  }
  return [...values.values()];
}

function filteredSections(plan, dataset) {
  const programIds = new Set(
    selectedPrograms(plan, dataset).map((program) => program.programId),
  );
  return dataset.sections.filter(
    (section) =>
      programIds.has(section.programId) &&
      section.year >= plan.startYear &&
      section.year <= plan.endYear &&
      (!plan.courseCode || section.courseCode === plan.courseCode) &&
      (!plan.modality || section.modality === plan.modality),
  );
}

function answerCapacity(plan, dataset) {
  const rows = filteredSections(plan, dataset);
  if (!rows.length) {
    return unsupportedAnswer(
      "No scheduled-section capacity matched all requested filters.",
      "The current upload contains Fall 2025 scheduled sections; earlier section schedules are not present.",
    );
  }
  let groupBy = plan.groupBy;
  if (!["program", "course", "modality"].includes(groupBy)) {
    groupBy = plan.programId || plan.courseCode || plan.modality ? "none" : "program";
  }
  const keyFor = {
    program: (row) => row.programName,
    course: (row) => row.courseCode,
    modality: (row) => row.modality,
    none: () => programScopeLabel(plan, dataset),
  }[groupBy];
  let aggregates = aggregateSections(rows, keyFor).map((value) => ({
    ...value,
    available: value.seats - value.filled,
    utilization: value.seats ? value.filled / value.seats : 0,
  }));
  const measureValue = (value) =>
    plan.measure === "available_seats"
      ? value.available
      : value.utilization * 100;
  aggregates = aggregates
    .map((value) => ({ ...value, value: measureValue(value) }))
    .sort((a, b) =>
      plan.ranking === "lowest" ? a.value - b.value : b.value - a.value,
    );
  const points = limitedPoints(aggregates).map((value) => ({
    label: value.label,
    value: value.value,
    display:
      plan.measure === "available_seats"
        ? value.available.toLocaleString("en-US")
        : `${(value.utilization * 100).toFixed(0)}%`,
  }));
  const leader = aggregates[0];
  const totalSeats = rows.reduce((sum, row) => sum + row.seats, 0);
  const totalFilled = rows.reduce((sum, row) => sum + row.filled, 0);
  const totalUtilization = totalSeats ? totalFilled / totalSeats : 0;
  const measureLabel =
    plan.measure === "available_seats" ? "available seats" : "utilization";
  return {
    eyebrow: `Capacity · ${rows[0].termId} schedule`,
    headline: `${leader.label} has the ${plan.ranking === "lowest" ? "lowest" : "highest"} matched ${measureLabel} at ${plan.measure === "available_seats" ? leader.available.toLocaleString("en-US") : `${(leader.utilization * 100).toFixed(0)}%`}.`,
    summary: `${totalFilled.toLocaleString("en-US")} of ${totalSeats.toLocaleString("en-US")} scheduled seats are filled across the matched sections.`,
    delta:
      plan.measure === "available_seats"
        ? `${(totalSeats - totalFilled).toLocaleString("en-US")} open`
        : `${(totalUtilization * 100).toFixed(0)}% filled`,
    points,
    notes: aggregates.slice(0, 3).map(
      (value) =>
        `${value.label}: ${value.filled.toLocaleString("en-US")} filled of ${value.seats.toLocaleString("en-US")} seats; ${value.available.toLocaleString("en-US")} available.`,
    ),
    metric:
      plan.measure === "available_seats"
        ? "Scheduled section capacity minus enrolled registrations"
        : "Enrolled section registrations divided by scheduled section capacity",
    sources: ["sections.csv", "section_enrollments.csv", "programs.csv"],
    limitations: [
      "Capacity reflects the uploaded schedule and does not include waitlists or planned sections.",
      "Registrations are not a distinct student headcount.",
    ],
    confidence: "High",
    queryPlan: `capacity_utilization; scope=${plan.programId ?? plan.programScope}; course=${plan.courseCode ?? "all"}; modality=${plan.modality ?? "all"}; group_by=${groupBy}; measure=${plan.measure}`,
  };
}

function answerCourseOutcomes(plan, dataset) {
  const rows = filteredSections(plan, dataset);
  if (!rows.length) {
    return unsupportedAnswer(
      "No course sections matched all requested filters.",
      "Use a course code, catalog program, or modality contained in sections.csv.",
    );
  }
  const gradedRows = rows.filter((row) => row.gradedCount > 0);
  if (!gradedRows.length) {
    return unsupportedAnswer(
      "A DFW or grade result cannot be calculated from the current upload.",
      "section_enrollments.csv contains no final_grade values for the matched sections. Upload completed-course outcomes before reporting a DFW rate.",
      ["sections.csv", "section_enrollments.csv"],
    );
  }
  let groupBy = plan.groupBy;
  if (!["program", "course", "modality"].includes(groupBy)) groupBy = "course";
  const keyFor = {
    program: (row) => row.programName,
    course: (row) => row.courseCode,
    modality: (row) => row.modality,
  }[groupBy];
  let aggregates = aggregateSections(gradedRows, keyFor).map((value) => ({
    ...value,
    value: value.gradedCount ? (value.dfwCount / value.gradedCount) * 100 : 0,
  }));
  aggregates = sortPoints(aggregates, plan);
  const points = limitedPoints(aggregates).map((value) => ({
    label: value.label,
    value: value.value,
    display: `${value.value.toFixed(1)}%`,
  }));
  const leader = aggregates[0];
  return {
    eyebrow: "Course outcomes · Completed registrations",
    headline: `${leader.label} has the ${plan.ranking === "lowest" ? "lowest" : "highest"} matched DFW rate at ${leader.value.toFixed(1)}%.`,
    summary: `${leader.dfwCount.toLocaleString("en-US")} of ${leader.gradedCount.toLocaleString("en-US")} graded registrations received D, F, or W outcomes.`,
    delta: `${leader.value.toFixed(1)}%`,
    points,
    notes: [
      "DFW includes final grades beginning with D, F, or W.",
      "The denominator contains registrations with a nonblank final grade.",
      `The x-axis contains ${dimensionLabel(groupBy)} values.`,
    ],
    metric: "D, F, or W registrations divided by registrations with final grades",
    sources: ["sections.csv", "section_enrollments.csv", "programs.csv"],
    limitations: [
      "Registration-level outcomes are not a distinct student count.",
    ],
    confidence: "High",
    queryPlan: `course_outcomes; scope=${plan.programId ?? plan.programScope}; course=${plan.courseCode ?? "all"}; modality=${plan.modality ?? "all"}; group_by=${groupBy}`,
  };
}

function answerDataCatalog(dataset) {
  return {
    eyebrow: "Governed analysis · Available data",
    headline: "EduInsight can calculate six governed analysis domains from this upload.",
    summary:
      "Questions can use enrollment, retention, IPEDS validation, data quality, scheduled capacity, and course outcomes when final grades are supplied.",
    delta: `${dataset.sourceFiles.length} sources`,
    points: [
      { label: "Enrollment", value: 4, display: "4 sources" },
      { label: "Retention", value: 4, display: "4 sources" },
      { label: "Capacity", value: 3, display: "3 sources" },
      { label: "IPEDS", value: 1, display: "1 source" },
      { label: "Quality", value: 1, display: "1 source" },
    ],
    notes: [
      "Enrollment supports year, program, degree, residency, gender, race and ethnicity, first-generation, Pell, attendance, and academic-standing questions.",
      "Retention supports cohort year, program, degree, residency, gender, race and ethnicity, first-generation, and Pell questions.",
      "Every answer displays its interpreted metric, validated query plan, certified sources, and limitations.",
    ],
    metric: "Uploaded governed data catalog",
    sources: dataset.sourceFiles,
    limitations: [
      "A question requiring a field absent from the uploaded files returns a source limitation instead of an invented number.",
    ],
    confidence: "High",
    queryPlan: "data_catalog; list supported governed domains",
  };
}

function unsupportedAnswer(headline, summary, sources = []) {
  return {
    eyebrow: "Governed analysis · Source limitation",
    headline,
    summary,
    delta: "Not available",
    points: [],
    notes: [
      "EduInsight did not reuse an unrelated result or invent a number.",
      "Ask what data is available to see the current governed analysis domains.",
    ],
    metric: "No governed metric and source combination resolved",
    sources,
    limitations: [
      "A required field, source file, or governed metric definition is missing for this question.",
    ],
    confidence: "Low",
    queryPlan: "unsupported",
  };
}

export function executeQueryPlan(plan, dataset) {
  switch (plan.metric) {
    case "enrollment":
      return answerEnrollment(plan, dataset);
    case "retention":
      return answerRetention(plan, dataset);
    case "ipeds_readiness":
      return answerIpeds(plan, dataset);
    case "quality_issues":
      return answerQuality(plan, dataset);
    case "capacity_utilization":
      return answerCapacity(plan, dataset);
    case "course_outcomes":
      return answerCourseOutcomes(plan, dataset);
    case "data_catalog":
      return answerDataCatalog(dataset);
    default:
      return unsupportedAnswer(
        "I can’t calculate that from the uploaded sources yet.",
        "The question did not resolve to a governed metric and source combination supported by the current university upload contract.",
      );
  }
}

export function analyzeQuestion(question, dataset, proposedPlan = null) {
  const plan = normalizePlan(
    proposedPlan ?? planQuestionLocally(question, dataset),
    question,
    dataset,
  );
  return {
    question,
    plan,
    answer: executeQueryPlan(plan, dataset),
  };
}

export function queryPlanSchema(dataset) {
  const qualityOwners = [
    ...new Set(dataset.qualityIssues.map((issue) => issue.owner)),
  ];
  const qualitySources = [
    ...new Set(dataset.qualityIssues.map((issue) => issue.sourceSystem)),
  ];
  const nullableEnum = (values) => ({
    anyOf: [{ type: "string", enum: values }, { type: "null" }],
  });
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      metric: { type: "string", enum: [...METRICS] },
      programId: nullableEnum(
        dataset.catalogs.programs.map((program) => program.programId),
      ),
      programScope: { type: "string", enum: [...PROGRAM_SCOPES] },
      degreeLevel: nullableEnum(["Graduate", "Undergraduate"]),
      startYear: {
        type: "integer",
        minimum: Math.min(...dataset.catalogs.years),
        maximum: Math.max(...dataset.catalogs.years),
      },
      endYear: {
        type: "integer",
        minimum: Math.min(...dataset.catalogs.years),
        maximum: Math.max(...dataset.catalogs.years),
      },
      timeMode: { type: "string", enum: ["latest", "single", "trend"] },
      populationDimension: {
        type: "string",
        enum: [...POPULATION_DIMENSIONS],
      },
      populationValue: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      retentionGroup: { type: "string", enum: [...RETENTION_GROUPS] },
      groupBy: { type: "string", enum: [...GROUP_BY_VALUES] },
      comparisonMode: {
        type: "string",
        enum: ["trend", "groups", "ranking", "snapshot"],
      },
      ranking: { type: "string", enum: ["none", "highest", "lowest"] },
      severity: nullableEnum(["Critical", "High", "Medium"]),
      status: { type: "string", enum: ["Open", "Resolved", "All"] },
      issueOwner: nullableEnum(qualityOwners),
      issueSource: nullableEnum(qualitySources),
      courseCode: nullableEnum(dataset.catalogs.courses),
      modality: nullableEnum(dataset.catalogs.modalities),
      checkStatus: nullableEnum(["Passed", "Review"]),
      measure: {
        type: "string",
        enum: [
          "count",
          "affected_records",
          "utilization",
          "available_seats",
          "dfw_rate",
          "retention_rate",
          "readiness",
        ],
      },
      rationale: { type: "string" },
    },
    required: [
      "metric",
      "programId",
      "programScope",
      "degreeLevel",
      "startYear",
      "endYear",
      "timeMode",
      "populationDimension",
      "populationValue",
      "retentionGroup",
      "groupBy",
      "comparisonMode",
      "ranking",
      "severity",
      "status",
      "issueOwner",
      "issueSource",
      "courseCode",
      "modality",
      "checkStatus",
      "measure",
      "rationale",
    ],
  };
}
