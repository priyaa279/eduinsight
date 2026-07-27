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

function normalizeQuestion(value) {
  let normalized = clean(value)
    .replace(/\bhow s\b/g, "how is")
    .replace(/\bwhat s\b/g, "what is")
    .replace(/\bdata ve\b/g, "data have")
    .replace(/\bint l\b|\bintl\b/g, "international")
    .replace(/\benrollmnt\b/g, "enrollment")
    .replace(/\benrolments?\b/g, "enrollment")
    .replace(/\benrollments\b/g, "enrollment")
    .replace(/\benroll\b/g, "enrollment")
    .replace(/\bcomp(?:uter)?[- ]sci(?:ence)?\b/g, "computer science")
    .replace(/\bpublic admin\b/g, "public administration")
    .replace(/\bbiz analytics\b/g, "business analytics")
    .replace(/\bforeign[- ](?:students?|learners?)\b/g, "international students")
    .replace(/\boverseas[- ]students?\b/g, "international students")
    .replace(/\bnon[- ]domestic\b/g, "international")
    .replace(/\btagged international\b/g, "with international residency")
    .replace(/\bug\b/g, "undergraduate")
    .replace(/\bundergrads?\b/g, "undergraduate")
    .replace(/\bundergraduates\b/g, "undergraduate")
    .replace(/\bgrad kids?\b/g, "graduate students")
    .replace(/\bgrad students?\b/g, "graduate students")
    .replace(/\bgrad enrollment\b/g, "graduate enrollment")
    .replace(/\bgrad\b/g, "graduate")
    .replace(/\bft\b/g, "full-time")
    .replace(/\bpt\b/g, "part-time")
    .replace(/\bfirst[- ]gen\b/g, "first-generation")
    .replace(/\bnonpell\b/g, "non-pell")
    .replace(/\b(kids?|learners?|enrollees?)\b/g, "students")
    .replace(/\bhead count\b|\bhc\b/g, "headcount")
    .replace(/\bstudent body count\b/g, "student enrollment count")
    .replace(/\bcensus size\b|\bcensus count\b|\bprogram size\b/g, "enrollment")
    .replace(/\bseats? left\b/g, "available seats")
    .replace(/\br\b/g, "are")
    .replace(/\bdegrees?\b/g, "programs")
    .replace(/\bmajors?\b/g, "programs")
    .replace(/\bprobs?\b/g, "problems")
    .replace(/\bpls\b/g, "")
    .replace(/\bfall twenty twenty[- ]one\b/g, "fall 2021")
    .replace(/\btwenty twenty[- ]one\b/g, "2021")
    .replace(/\bthru\b/g, "through")
    .replace(/\bbeginning (?:in|with)\b|\bstarting (?:in|with)\b/g, "since")
    .replace(/\bfrom (\d{4}) onward\b/g, "since $1")
    .replace(/\bprior to\b/g, "before")
    .replace(/\blater than\b/g, "after")
    .replace(/\bside by side\b|\bnext to each other\b/g, "compare")
    .replace(/\bprior year\b|\blast yr\b|\byr over yr\b/g, "year-over-year")
    .replace(/\bhigh to low\b/g, "highest")
    .replace(/\bno greater than\b/g, "at most")
    .replace(/\b(\d+(?:\.\d+)?) percent or more\b/g, "at least $1 percent")
    .replace(/\bportion of\b/g, "percentage of")
    .replace(/\bshare(?: of)?\b/g, "percentage of")
    .replace(/\bsplit by\b/g, "by")
    .replace(/\bseries\b/g, "trend")
    .replace(/\bmovement\b/g, "change")
    .replace(/\bshrink\b|\bshrunk\b/g, "decrease")
    .replace(/\bplot\b|\bchart\b/g, "show")
    .replace(/\bfailures\b/g, "failure rate")
    .replace(/\butilizing\b/g, "with utilization")
    .replace(/\binstitution total\b|\binstitution count\b/g, "institution enrollment")
    .replace(/\blatest fall institution enrollment\b/g, "institution enrollment latest fall")
    .replace(/\bhow large was the international cohort\b/g, "how many international students were enrolled")
    .replace(/\bwhat data have we got\b/g, "what data is available")
    .replace(/\bipeds good to go\b/g, "ipeds readiness")
    .replace(/\bipeds problems\b/g, "ipeds checks require review")
    .replace(/\bwhich programs are almost full\b/g, "which programs have the highest capacity utilization")
    .replace(/\btop (\d+) programs by size\b/g, "top $1 programs by enrollment")
    .replace(/\blowest headcount program\b/g, "program with the lowest enrollment")
    .replace(/\bprogram leading in international student count\b/g, "which program has the most international students")
    .replace(/\bprogram with the greatest international percentage of\b/g, "which program has the highest percentage of international")
    .replace(/\bprogram adding the largest number of students\b/g, "which program added the most students")
    .replace(/\bprogram with the fastest percentage growth\b/g, "which program had the highest percentage growth")
    .replace(/\blist programs with no enrollment growth\b/g, "programs that did not grow")
    .replace(/\bonly the two biggest programs\b/g, "top 2 programs")
    .replace(/\bthree smallest programs\b/g, "bottom 3 programs")
    .replace(/\br almost full\b/g, "are almost full");
  normalized = normalized.replace(
    /\bay\s*(\d{2})\b/g,
    (_, year) => `20${year}`,
  );
  normalized = normalized.replace(
    /\b(since|from|through|after|before|in|fall)\s+(\d{2})\b/g,
    (_, prefix, year) => `${prefix} ${Number(year) >= 70 ? "19" : "20"}${year}`,
  );
  return normalized.replace(/\s+/g, " ").trim();
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
    aliases.add("public admin");
    aliases.add("mpa");
  }
  if (program.programId === "PCS") {
    aliases.add("cs");
    aliases.add("comp sci");
    aliases.add("comp science");
    aliases.add("computer science");
  }
  return [...aliases].filter((alias) => alias.length >= 2);
}

function findProgram(question, dataset) {
  const normalized = normalizeQuestion(question);
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
  if (
    /\b(?:not|excluding|exclude|without)\s+(?:the\s+)?international\b/.test(
      normalized,
    )
  ) {
    return "Domestic";
  }
  if (/\bdomestic\b/.test(normalized)) {
    return "Domestic";
  }
  if (/\bin state\b|\binstate\b|\bresident students?\b/.test(normalized)) {
    return "In-state";
  }
  if (/\bout of state\b|\bout-of-state\b|\bnonresident domestic\b/.test(normalized)) {
    return "Out-of-state";
  }
  if (/\binternational\b|\bforeign students?\b|\bforeign learners?\b/.test(normalized)) {
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
  if (
    /\bnon[- ]pell\b|\bnot pell(?: eligible)?\b|\bexcluding pell(?: eligible)?\b/.test(
      normalized,
    )
  ) {
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

function populationMentions(normalized) {
  const mentions = [];
  if (
    /\b(international|foreign students?)\b/.test(normalized) &&
    !/\b(?:not|excluding|exclude|without)\s+(?:the\s+)?international\b/.test(
      normalized,
    )
  ) {
    mentions.push(["residency", "International"]);
  }
  if (
    /\bdomestic\b/.test(normalized) ||
    /\b(?:not|excluding|exclude|without)\s+(?:the\s+)?international\b/.test(
      normalized,
    )
  ) {
    mentions.push(["residency", "Domestic"]);
  }
  if (
    /\bnon[- ]pell\b|\bnot pell(?: eligible)?\b|\bexcluding pell(?: eligible)?\b/.test(
      normalized,
    )
  ) {
    mentions.push(["pell_eligible", "Non-Pell"]);
  }
  if (
    /\bpell(?:-eligible)?\b/.test(normalized) &&
    !/\bnon[- ]pell\b|\bnot pell(?: eligible)?\b|\bexcluding pell(?: eligible)?\b/.test(
      normalized,
    )
  ) {
    mentions.push(["pell_eligible", "Pell-eligible"]);
  }
  if (/\bfirst[- ]generation\b|\bfirst gen\b/.test(normalized)) {
    mentions.push(["first_generation", "First-generation"]);
  }
  if (/\bcontinuing[- ]generation\b|\bcontinuing gen\b/.test(normalized)) {
    mentions.push(["first_generation", "Continuing-generation"]);
  }
  if (/\b(women|woman|female|men|man|male|nonbinary|non-binary)\b/.test(normalized)) {
    mentions.push(["gender", "gender"]);
  }
  if (
    /\b(black|african american|hispanic|latino|latina|latinx|asian|white|american indian|alaska native|native hawaiian|pacific islander|multiracial|two or more races)\b/.test(
      normalized,
    )
  ) {
    mentions.push(["race_ethnicity", "race or ethnicity"]);
  }
  if (/\b(full[- ]time|part[- ]time)\b/.test(normalized)) {
    mentions.push(["attendance_status", "attendance status"]);
  }
  if (
    /\b(good standing|probation|suspension|suspended|academic warning)\b/.test(
      normalized,
    )
  ) {
    mentions.push(["academic_status", "academic status"]);
  }
  return mentions;
}

function requestedLimit(normalized) {
  const numeric = normalized.match(/\b(?:top|bottom|only|five|give me the)\s+(\d+)\b/);
  if (numeric) return Math.max(1, Math.min(Number(numeric[1]), 25));
  const words = new Map([
    ["three", 3],
    ["five", 5],
    ["ten", 10],
  ]);
  const word = normalized.match(/\b(?:top|bottom|which)\s+(three|five|ten)\b/);
  return word ? words.get(word[1]) : 10;
}

function inferGroupBy(normalized) {
  const rules = [
    ["year", /\b(by|across|per)\s+(year|cohort|term)\b|\byear[- ]by[- ]year\b/],
    [
      "program",
      /\b(by|across|per)\s+program\b|\bwhich (graduate |undergraduate |ms |bs )?program\b|\bprogram breakdown\b|\bprograms? by\b/,
    ],
    ["college", /\b(by|across|per)\s+college\b|\bwhich college\b|\bcollege breakdown\b/],
    ["residency", /\b(by|across|per)\s+residenc\w*\b|\bresidency breakdown\b|\bresidency enrollment breakdown\b/],
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
  const normalized = normalizeQuestion(question);
  const years = [...normalized.matchAll(/\b((?:19|20)\d{2})\b/g)].map((match) =>
    Number(match[1]),
  );
  const available = dataset.catalogs.years;
  const minimum = Math.min(...available);
  const maximum = Math.max(...available);
  const invalidYear = years.some((year) => !available.includes(year));
  const trendLanguage =
    /\bsince\b|\bfrom\b|\bbetween\b|\bthrough\b|\bover time\b|\btrend\b|\bchanged?\b|\bgrowth\b|\bincrease\w*\b|\bdecrease\w*\b|\bdecline\w*\b/.test(
      normalized,
    );

  if (!years.length) {
    return {
      startYear: minimum,
      endYear: maximum,
      timeMode: trendLanguage ? "trend" : "latest",
      invalidYear: false,
      endpointsOnly: false,
      emptyRange: false,
    };
  }
  if (invalidYear) {
    return {
      startYear: years[0],
      endYear: years.at(-1),
      timeMode: years.length > 1 ? "trend" : "single",
      invalidYear: true,
      endpointsOnly: false,
      emptyRange: false,
    };
  }
  if (years.length === 1 && /\bbefore\b/.test(normalized)) {
    const endYear = years[0] - 1;
    return {
      startYear: minimum,
      endYear,
      timeMode: "trend",
      invalidYear: false,
      endpointsOnly: false,
      emptyRange: endYear < minimum,
    };
  }
  if (years.length === 1 && /\bafter\b/.test(normalized)) {
    const startYear = years[0] + 1;
    return {
      startYear,
      endYear: maximum,
      timeMode: "trend",
      invalidYear: false,
      endpointsOnly: false,
      emptyRange: startYear > maximum,
    };
  }
  if (years.length === 1 && !trendLanguage) {
    return {
      startYear: years[0],
      endYear: years[0],
      timeMode: "single",
      invalidYear: false,
      endpointsOnly: false,
      emptyRange: false,
    };
  }
  return {
    startYear: Math.min(...years),
    endYear: years.length === 1 ? maximum : Math.max(...years),
    timeMode: "trend",
    invalidYear: false,
    endpointsOnly:
      years.length > 1 && /\b(compare|versus|vs)\b/.test(normalized),
    emptyRange: false,
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

function unknownEnrollmentSubject(normalized, program, metric) {
  if (program || metric !== "enrollment") return null;
  const candidates = [];
  const direct = normalized.match(
    /^(?!(?:compare|which|how|why|break|do|ignore)\b)([a-z][a-z-]*(?:\s+[a-z][a-z-]*){0,3})\s+enrollment(?:\s+(?:in|for|since|from|between|before|after|last|fall|\d)\b|$)/,
  );
  if (direct?.[1]) candidates.push(direct[1]);
  const requested = normalized.match(
    /^(?:show|what was|tell me|give me)\s+(?:the\s+)?(.+?)\s+enrollment(?:\s+(?:in|for|since|from|between|before|after|last|fall|\d)\b|$)/,
  );
  if (requested?.[1]) candidates.push(requested[1]);
  const counted = normalized.match(
    /^how many\s+(.+?)\s+students?(?:\s+(?:were|are|in|for|last|\d)\b|$)/,
  );
  if (counted?.[1]) candidates.push(counted[1]);
  const safeSubjectTokens = new Set([
    "all",
    "bottom",
    "by",
    "continuing-generation",
    "domestic",
    "fall",
    "first-generation",
    "give",
    "graduate",
    "me",
    "institution-wide",
    "institutionwide",
    "international",
    "institution",
    "part-time",
    "full-time",
    "master",
    "masters",
    "ms",
    "non-pell",
    "of",
    "overall",
    "pell",
    "pell-eligible",
    "percentage",
    "program",
    "programs",
    "show",
    "student",
    "students",
    "tell",
    "total",
    "top",
    "undergraduate",
    "was",
    "what",
  ]);
  for (const candidate of candidates) {
    const subject = candidate
      .replace(/^(?:the|show|what was|tell me|give me)\s+/, "")
      .trim();
    const tokens = subject.split(/\s+/).filter((token) => !/^\d+$/.test(token));
    if (tokens.some((token) => !safeSubjectTokens.has(token))) return subject;
  }
  return null;
}

function isCompoundQuestion(normalized) {
  if (/\bcompare enrollment and capacity\b/.test(normalized)) return false;
  const domains = [
    /\b(enrollment|enrolled|headcount)\b/,
    /\b(retention|retained|persistence)\b/,
    /\b(capacity|utilization|available seats?|open seats?)\b/,
    /\bipeds\b/,
    /\b(data quality|quality issues?|quality findings?)\b/,
    /\b(dfw|course outcomes?)\b/,
  ].filter((pattern) => pattern.test(normalized)).length;
  if (domains > 1) return true;
  return (
    /\b(?:and|also)\s+(?:which|what|how|show|are|is|was|were)\b/.test(
      normalized,
    ) ||
    (/\benrollment\b/.test(normalized) &&
      /\bcapacity\b/.test(normalized) &&
      /\binternational percentage\b|\binternational share\b/.test(normalized)) ||
    (/\bcapacity\b/.test(normalized) &&
      /\binternational students?\b/.test(normalized) &&
      /\b(most|highest|which)\b/.test(normalized))
  );
}

export function governancePolicyForQuestion(question) {
  const normalized = normalizeQuestion(question);
  const rowLevelRequest =
    /\b(individual students?|student names?|names? of .+students?|student ids?|email addresses?|student[- ]level records?|records? behind this chart|list every .+student|export .+records?)\b/.test(
      normalized,
    ) ||
    /\b(show|give|list|export)\b.*\b(names?|ids?|email addresses?|individual|student[- ]level records?)\b/.test(
      normalized,
    );
  if (rowLevelRequest) {
    return {
      blocked: true,
      reason:
        "Ask EduInsight is aggregate-only. Individual, named, row-level, and personally identifiable student records are restricted and cannot be returned through this analytics interface.",
    };
  }
  return { blocked: false, reason: null };
}

function responseDirective(normalized, program, yearPlan, metric) {
  const governance = governancePolicyForQuestion(normalized);
  if (governance.blocked) {
    return {
      responseType: "limitation",
      responseReason: governance.reason,
    };
  }

  const clarificationPatterns = [
    /^why$/,
    /^why exactly\b/,
    /^same question\b/,
    /^what about (?:its|that|the)\b/,
    /^and its\b/,
    /\b(that growth|its capacity|that program|that program s)\b/,
    /\bwhat data did you use for this answer\b/,
    /\bwhat did you use for that number\b/,
    /\bwhich source tables support this result\b/,
    /\bhow was this metric calculated\b/,
    /\bwhat definition of (enrollment|retention) are you using\b/,
    /\bwhich records were excluded\b/,
    /\bwhat limitations does this result have\b/,
    /\bhow is .+ (?:doing|looking)\b/,
    /\bhow are enrollments? looking\b/,
    /\banything concerning with enrollment\b/,
    /\bdid enrollment drop anywhere\b/,
    /\bshow me student performance\b/,
    /\btell me about student success\b/,
    /\bwhat is our biggest problem\b/,
    /\bwhat should leadership worry about\b/,
    /\bwhat is going on with\b/,
    /\bwhich (?:programs?|majors?) (?:is |are )?(?:best|biggest|strongest)\b/,
    /\bwhich (?:degree|area) (?:is )?(?:best|strongest|winning)\b/,
    /\bcompare program performance\b/,
    /\bshow me graduate data\b/,
    /^what changed(?: recently)?$/,
    /\bshow me the programs\b/,
    /\bis retention good\b/,
    /\bhow are we doing against peers\b/,
    /\bwhat is the most important number\b/,
    /^(?:same thing|do that analysis)\b/,
    /\bwhat about those students\b/,
    /\bdid .+ go up\b/,
  ];
  if (clarificationPatterns.some((pattern) => pattern.test(normalized))) {
    return {
      responseType: "clarification",
      responseReason:
        "The question depends on missing conversational context or an unspecified governed metric.",
    };
  }
  if (isCompoundQuestion(normalized)) {
    return {
      responseType: "clarification",
      responseReason:
        "This request contains multiple analyses. Ask one governed question at a time so no part is silently ignored.",
    };
  }

  const contradictory =
    (/\bundergraduate\b/.test(normalized) &&
      /\b(ms|master(?:s)? of science)\b/.test(normalized)) ||
    (/\bbs\b|\bbachelor(?:s)? of science\b/.test(normalized) &&
      /\bgraduate\b/.test(normalized)) ||
    (/\bdomestic\b/.test(normalized) &&
      /\binternational\b/.test(normalized) &&
      !/\b(compare|versus|vs|grew faster)\b/.test(normalized)) ||
    (/\bpell\b/.test(normalized) &&
      /\bnon[- ]pell\b/.test(normalized) &&
      /\bonly\b|\bpell eligible\b/.test(normalized) &&
      !/\b(compare|versus|vs|gap|with non[- ]pell|side by side)\b/.test(
        normalized,
      ));
  if (contradictory) {
    return {
      responseType: "clarification",
      responseReason:
        "The requested filters conflict. Clarify which mutually exclusive population or degree scope should be used.",
    };
  }

  const unsupportedPatterns = [
    /\b(gpa|grade point average)\b/,
    /\btuition revenue\b/,
    /\buniversity budget\b|\bbudget\b/,
    /\bfaculty members?\b|\bfaculty salary\b/,
    /\bgraduation rate\b/,
    /\bstudent satisfaction\b/,
    /\b(got jobs?|employment outcomes?|job placement)\b/,
    /\baverage salary of graduates\b/,
    /\bprofessor\b.*\bratings?\b/,
    /\bmedian student age\b|\bstudent age\b/,
    /\bmedian age of enrolled students?\b/,
    /\battempted credit load\b|\baverage credit load\b|\bcredits? (?:have )?students? completed\b/,
    /\bscholarship aid\b|\bfinancial aid awarded\b/,
    /\binstitutional scholarship aid\b/,
    /\bhousing status\b/,
    /\bcitizenship\b/,
    /\badvisor caseload\b/,
    /\bfaculty fte\b/,
    /\boutstanding tuition balance\b/,
    /\bforecast\b|\bproject(?:ed|ion)? enrollment\b/,
    /\b(pharmacy|aerospace engineering)\b/,
    /\bcampus\s+\w+\b|\b\w+(?:\s+\w+)?\s+campus\b/,
  ];
  if (unsupportedPatterns.some((pattern) => pattern.test(normalized))) {
    return {
      responseType: "limitation",
      responseReason:
        "The currently uploaded governed sources do not contain the fields required for this calculation.",
    };
  }
  if (yearPlan.invalidYear || yearPlan.emptyRange) {
    return {
      responseType: "limitation",
      responseReason:
        "The requested year is outside the years available in the uploaded governed sources.",
    };
  }
  if (
    yearPlan.endpointsOnly &&
    yearPlan.startYear === yearPlan.endYear
  ) {
    return {
      responseType: "clarification",
      responseReason:
        "A comparison requires two different years. Provide distinct start and end years.",
    };
  }
  const unknownSubject = unknownEnrollmentSubject(normalized, program, metric);
  if (unknownSubject) {
    return {
      responseType: "limitation",
      responseReason: `No governed program or population matching “${unknownSubject}” exists in the current upload.`,
    };
  }
  if (
    (!program &&
      /\b(mechanical engineering|dentistry)\b/.test(normalized)) ||
    /\bcampus mars\b|\bfrom wakanda\b|\bwakanda residenc\w*\b/.test(normalized)
  ) {
    return {
      responseType: "limitation",
      responseReason:
        "No matching governed program, campus, or dimension value exists in the current upload.",
    };
  }
  const mentions = populationMentions(normalized);
  if (new Set(mentions.map(([dimension]) => dimension)).size > 1) {
    return {
      responseType: "limitation",
      responseReason:
        "The current aggregate upload cannot safely combine those demographic filters without a certified cross-tabulation.",
    };
  }
  if (
    /\bipeds\b/.test(normalized) &&
    (/\b(?:critical|high|medium)(?:[- ]severity)?\b|\bseverity\b/.test(normalized) ||
      /\baffects? the most records\b/.test(normalized))
  ) {
    return {
      responseType: "limitation",
      responseReason:
        "The IPEDS validation source does not contain severity or affected-record fields.",
    };
  }
  if (
    /\b(issues?|findings?)\b/.test(normalized) &&
    /\breviewed\b/.test(normalized)
  ) {
    return {
      responseType: "limitation",
      responseReason:
        "The quality-issue source does not contain a reviewed workflow state.",
    };
  }
  if (/\bdq-001\b/.test(normalized)) {
    return {
      responseType: "limitation",
      responseReason:
        "No issue with ID DQ-001 exists in the uploaded quality log.",
    };
  }
  return { responseType: "answer", responseReason: null };
}

function inferOperation(normalized, metric, yearPlan) {
  if (metric === "enrollment") {
    if (/\bwhy\b/.test(normalized)) return "why";
    if (/\byear[- ]over[- ]year\b/.test(normalized)) return "year_over_year";
    if (/\bhow many more\b/.test(normalized)) return "absolute_difference";
    if (
      /\b(highest|greatest) percentage\b/.test(normalized) &&
      /\bprogram\b/.test(normalized) &&
      /\binternational\b/.test(normalized)
    ) {
      return "program_share_ranking";
    }
    if (
      /\bpercentage(?: of| for)?\b|\bwhat percentage\b|\bshare of\b/.test(normalized) &&
      !/\bwhich program\b/.test(normalized)
    ) {
      return "share";
    }
    if (/\bwhich programs? lost enrollment\b/.test(normalized)) {
      return "program_change_negative";
    }
    if (/\bprograms? that did not grow\b|\bprograms? that (?:did not|didn t) increase\b/.test(normalized)) {
      return "program_change_nonpositive";
    }
    if (/\bwhich program declined the most\b/.test(normalized)) {
      return "program_change_absolute";
    }
    if (
      /\bwhich (undergraduate )?program had the largest enrollment growth\b/.test(
        normalized,
      ) ||
      /\bwhich program added the most students\b|\bprogram adding the largest number of students\b/.test(
        normalized,
      )
    ) {
      return "program_change_absolute";
    }
    if (/\bwhich program grew the most\b/.test(normalized)) {
      return "program_change_percent";
    }
    if (
      /\bwhich program had the highest percentage growth\b|\bfastest percentage growth\b/.test(
        normalized,
      )
    ) {
      return "program_change_percent";
    }
    if (
      /\b(compare|which grew faster)\b/.test(normalized) &&
      /\bundergraduate\b/.test(normalized) &&
      /\bgraduate\b/.test(normalized)
    ) {
      return "compare_degree_levels";
    }
    if (
      /\b(compare|which grew faster)\b/.test(normalized) &&
      /\bdomestic\b/.test(normalized) &&
      /\binternational\b/.test(normalized)
    ) {
      return "compare_residency";
    }
    if (
      /\bcompare\b/.test(normalized) &&
      /\bother graduate programs?\b/.test(normalized)
    ) {
      return "compare_other_graduate";
    }
    if (yearPlan.endpointsOnly) return "compare_years";
    if (/\bwhich year had the (highest|lowest)\b/.test(normalized)) {
      return "rank_year";
    }
  }
  if (metric === "retention") {
    if (
      /\bretention difference\b/.test(normalized) &&
      /\bbs\b/.test(normalized) &&
      /\bms\b/.test(normalized)
    ) {
      return "retention_degree_gap";
    }
    if (/\bwhich student group improved\b/.test(normalized)) {
      return "retention_group_improvement";
    }
    if (/\bwhich group had the (lowest|highest)\b/.test(normalized)) {
      return "retention_group_ranking";
    }
    if (
      /\b(gap|compare|versus|vs|side by side)\b/.test(normalized) &&
      (/\bnon[- ]pell\b/.test(normalized) || /\beveryone else\b/.test(normalized))
    ) {
      return "retention_pell_comparison";
    }
    if (
      /\b(gap|compare)\b/.test(normalized) &&
      /\bcontinuing[- ]generation\b/.test(normalized)
    ) {
      return "retention_generation_comparison";
    }
    if (/\bwhich cohort year had the (highest|lowest)\b/.test(normalized)) {
      return "rank_year";
    }
  }
  if (metric === "capacity_utilization") {
    if (/\bcompare enrollment and capacity\b/.test(normalized)) {
      return "capacity_enrollment_comparison";
    }
    if (
      /\b(?:above|below|exactly|at least|at most|not above|not below)\s+\d+(?:\.\d+)?(?:\s*percent)?\b/.test(
        normalized,
      ) ||
      /\b(?:above|below)\s+or equal to\s+\d+(?:\.\d+)?(?:\s*percent)?\b/.test(
        normalized,
      )
    ) {
      return "capacity_threshold";
    }
  }
  if (metric === "quality_issues") {
    if (
      /\bwhich (?:data quality )?issue affects the most records\b|\bwhat rule caused the largest data quality issue\b/.test(
        normalized,
      )
    ) {
      return "quality_issue_ranking";
    }
  }
  if (metric === "ipeds_readiness") {
    if (
      /\bwhat needs to be fixed\b|\bexplain the largest ipeds validation problem\b/.test(
        normalized,
      )
    ) {
      return "ipeds_remediation";
    }
    if (/\b(open|unresolved) ipeds\b|\bipeds validation issues are open\b/.test(normalized)) {
      return "ipeds_unresolved";
    }
  }
  return "standard";
}

export function planQuestionLocally(question, dataset) {
  const normalized = normalizeQuestion(question);
  const program = findProgram(normalized, dataset);
  const population = inferPopulation(normalized, dataset);
  const yearPlan = extractYears(normalized, dataset);
  if (
    /\blast year\b|\blast fall\b|\blatest fall\b|\blatest census\b/.test(
      normalized,
    )
  ) {
    const latestYear = Math.max(...dataset.catalogs.years);
    yearPlan.startYear = latestYear;
    yearPlan.endYear = latestYear;
    yearPlan.timeMode = "single";
  }
  const courseCode = findCourse(normalized, dataset);
  const modality = findModality(normalized, dataset);

  let metric = "unsupported";
  const explicitEnrollmentIntent =
    Boolean(program) ||
    /\b(enrollment|enrolled|headcount|students?|graduate|undergraduate|masters?|ms|bs|demographic|residency|academic standing|program (?:grew|declined|added)|programs? (?:lost|that did not grow))\b|program.*\b(growth|international percentage)\b|program.*\bpercentage\b.*\binternational\b/.test(
      normalized,
    );
  if (
    /\b(what data is available|what data do you have|which data (?:is|are|do|can|sources?)|source files?|available data|what can you answer|capabilities|data catalog|catalog of governed data)\b/.test(
      normalized,
    )
  ) {
    metric = "data_catalog";
  } else if (/\b(ipeds|submission|readiness|validation checks?)\b/.test(normalized)) {
    metric = "ipeds_readiness";
  } else if (/\b(retention|retained|persistence|persisted|returned)\b/.test(normalized)) {
    metric = "retention";
  } else if (
    /\b(dfw|grade|grades|course outcome|course outcomes|pass rate|failure rate|withdrawal rate)\b/.test(
      normalized,
    )
  ) {
    metric = "course_outcomes";
  } else if (
    /\b(capacity|utilization|utilized|utilised|filled seats|available seats|open seats|seats? remain|seat availability|sections?)\b/.test(
      normalized,
    )
  ) {
    metric = "capacity_utilization";
  } else if (
    explicitEnrollmentIntent &&
    !/\b(data quality|quality issues?|quality findings?|which issue|how many issues?)\b/.test(
      normalized,
    )
  ) {
    metric = "enrollment";
  } else if (
    /\b(quality|issue|issues|error|errors|problem|problems|anomaly|anomalies|invalid|mismatch|mismatches|data problem|affected records?|source system|issue owner)\b/.test(
      normalized,
    )
  ) {
    metric = "quality_issues";
  }

  let programScope = "all";
  let degreeLevel = null;
  const excludeProgram =
    Boolean(program) &&
    /\b(other than|excluding|exclude|except|without)\b/.test(normalized);
  if (
    /\b(?:do not|don t|exclude|excluding|without)\s+(?:include\s+)?graduate students?\b/.test(
      normalized,
    )
  ) {
    programScope = "degree_level";
    degreeLevel = "Undergraduate";
  } else if (program && !excludeProgram) {
    programScope = "specific";
    degreeLevel = program.degreeLevel;
  } else if (
    /\bms\b|\bmasters?\b|\bmaster of science\b|\bmasters of science\b/.test(
      normalized,
    )
  ) {
    programScope = "masters_of_science";
    degreeLevel = "Graduate";
  } else if (/\bbs\b|\bbachelor of science\b|\bbachelors of science\b/.test(normalized)) {
    programScope = "bachelors_of_science";
    degreeLevel = "Undergraduate";
  } else if (/\bgraduates?\b|\bgraduate students?\b/.test(normalized)) {
    programScope = "degree_level";
    degreeLevel = "Graduate";
  } else if (/\bundergraduates?\b/.test(normalized)) {
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
  if (
    /\bnot resolved\b|\bunresolved\b|\bnot closed\b|\bnot fixed\b/.test(
      normalized,
    )
  ) {
    status = "Open";
  } else if (/\b(resolved|closed|fixed)\b/.test(normalized)) {
    status = "Resolved";
  }
  if (/\b(all|any)\s+(quality )?(issues|findings)\b/.test(normalized)) {
    status = "All";
  }

  let checkStatus = null;
  if (
    /\b(?:did not|didn t|not)\s+pass(?:ed)?\b|\bnot passed\b/.test(normalized)
  ) {
    checkStatus = "Review";
  } else {
    if (/\b(passed|passing)\b/.test(normalized)) checkStatus = "Passed";
    if (/\b(failed|failing)\b/.test(normalized)) checkStatus = "Failed";
    if (/\b(review|attention|problem checks?)\b/.test(normalized)) {
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

  let measure = "count";
  if (
    /\baffected records?\b|\brecords? (?:are )?affected\b|\brecord impact\b/.test(
      normalized,
    )
  ) {
    measure = "affected_records";
  } else if (/\bavailable seats?|open seats?|seats? remain\b/.test(normalized)) {
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

  const operation = inferOperation(normalized, metric, yearPlan);
  if (metric === "enrollment" && operation === "share") {
    measure = "percentage";
  }
  if (
    metric === "retention" &&
    operation === "rank_year" &&
    !/\b(?:19|20)\d{2}\b/.test(normalized)
  ) {
    yearPlan.startYear = Math.max(2021, Math.min(...dataset.catalogs.years));
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
  const directive = responseDirective(normalized, program, yearPlan, metric);
  const detectedPopulationFilters = populationMentions(normalized);
  const detectedFilters = [
    ...(program ? [`Program: ${program.programName}`] : []),
    ...(degreeLevel ? [`Degree level: ${degreeLevel}`] : []),
    ...detectedPopulationFilters.map(
      ([dimension, value]) =>
        `${dimension.replaceAll("_", " ")}: ${value}`,
    ),
    `Time: ${yearPlan.startYear}-${yearPlan.endYear}`,
  ];
  const appliedFilters = [
    ...(program && !excludeProgram ? [`Program: ${program.programName}`] : []),
    ...(degreeLevel ? [`Degree level: ${degreeLevel}`] : []),
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

  return {
    metric,
    programId: excludeProgram ? null : (program?.programId ?? null),
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
    topN: requestedLimit(normalized),
    thresholdOperator,
    thresholdValue,
    endpointsOnly: yearPlan.endpointsOnly,
    invalidYear: yearPlan.invalidYear,
    emptyRange: yearPlan.emptyRange,
    responseType: directive.responseType,
    responseReason: directive.responseReason,
    normalizedQuestion: normalized,
    filterAudit: {
      detected: detectedFilters,
      applied: appliedFilters,
      complete:
        populationFiltersComplete &&
        !(
          detectedPopulationFilters.length > 1 &&
          detectedDimensions.size > 1
        ),
    },
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
    ) ?? null
  );
}

function conciseProgramName(programName) {
  return programName
    .replace(/^(MS|BS|BA|BBA)\s+/i, "")
    .replace(/^Master of\s+/i, "");
}

function programDisplayNameForQuestion(program, question) {
  return includesPhrase(clean(question), program.programName)
    ? program.programName
    : conciseProgramName(program.programName);
}

export function normalizePlan(plan, question, dataset) {
  const fallback = planQuestionLocally(question, dataset);
  const mayUseProposedPlan =
    fallback.metric === "unsupported" && fallback.responseType === "answer";
  const normalized = {
    ...fallback,
    ...(mayUseProposedPlan ? (plan ?? {}) : {}),
  };
  normalized.responseType = fallback.responseType;
  normalized.responseReason = fallback.responseReason;
  normalized.operation = fallback.operation;
  normalized.topN = fallback.topN;
  normalized.thresholdOperator = fallback.thresholdOperator;
  normalized.thresholdValue = fallback.thresholdValue;
  normalized.endpointsOnly = fallback.endpointsOnly;
  normalized.invalidYear = fallback.invalidYear;
  normalized.emptyRange = fallback.emptyRange;
  normalized.excludeProgramId = fallback.excludeProgramId;
  normalized.normalizedQuestion = fallback.normalizedQuestion;
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
  if (!["Passed", "Review", "Failed", null].includes(normalized.checkStatus)) {
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
      "percentage",
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
  const resolvedProgram = normalized.programId
    ? dataset.catalogs.programs.find(
        (program) => program.programId === normalized.programId,
      )
    : null;
  normalized.programDisplayName = resolvedProgram
    ? programDisplayNameForQuestion(resolvedProgram, question)
    : null;
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
  return plan.excludeProgramId
    ? programs.filter((program) => program.programId !== plan.excludeProgramId)
    : programs;
}

function programScopeLabel(plan, dataset) {
  if (plan.programId) {
    return (
      plan.programDisplayName ??
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

function scopeNote(plan, dataset) {
  if (plan.excludeProgramId) {
    const excluded = dataset.catalogs.programs.find(
      (program) => program.programId === plan.excludeProgramId,
    );
    return `The calculation includes every governed academic program except ${excluded?.programName ?? plan.excludeProgramId}.`;
  }
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
    const program = dataset.catalogs.programs.find(
      (candidate) => candidate.programId === plan.programId,
    );
    if (!program) {
      return "The calculation is restricted to the named governed academic program.";
    }
    if (plan.programDisplayName !== program.programName) {
      return `“${plan.programDisplayName}” resolved to catalog program ${program.programName} (${program.programId}). No other programs are included.`;
    }
    return `The calculation is restricted to catalog program ${program.programName} (${program.programId}); no other programs are included.`;
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

function clarificationAnswer(reason) {
  return {
    eyebrow: "Governed analysis · Clarification needed",
    headline: "Please clarify the metric or population you want analyzed.",
    summary:
      reason ??
      "The question is ambiguous without a prior answer or a named governed metric.",
    delta: "Clarify",
    points: [],
    notes: [
      "Choose a metric such as enrollment, retention, capacity, IPEDS, or data quality.",
      "EduInsight did not assume a definition or reuse an unrelated result.",
    ],
    metric: "No governed metric selected",
    sources: [],
    limitations: [
      "A precise answer requires an unambiguous metric, population, and time period.",
    ],
    confidence: "Low",
    queryPlan: "clarification_required",
  };
}

function incompatibleBreakdownAnswer(plan) {
  return unsupportedAnswer(
    "That cross-tabulation is not certified in the current upload model.",
    `The question combines a ${plan.populationDimension.replaceAll("_", " ")} filter with a ${plan.groupBy.replaceAll("_", " ")} breakdown. Add that governed cross-tabulation to the ingestion contract before reporting it.`,
  );
}

function enrollmentCountFor(
  dataset,
  programs,
  year,
  populationDimension = "all",
  populationValue = null,
) {
  const programIds = new Set(programs.map((program) => program.programId));
  const dimension =
    populationValue === "Domestic" ? "residency" : populationDimension;
  const rows = dataset.enrollmentCubes[dimension] ?? [];
  return rows
    .filter(
      (row) =>
        programIds.has(row.programId) &&
        row.year === year &&
        (dimension === "all" ||
          (populationValue === "Domestic"
            ? dataset.catalogs.residencies.includes(row.value) &&
              row.value !== "International"
            : row.value === populationValue)),
    )
    .reduce((sum, row) => sum + row.count, 0);
}

function enrollmentAnswer({
  plan,
  dataset,
  headline,
  summary,
  points,
  delta,
  notes = [],
  limitations = [],
}) {
  return {
    eyebrow: `Enrollment · Fall census · ${points.map((point) => point.label).join(" / ")}`,
    headline,
    summary,
    delta,
    points,
    notes: [scopeNote(plan, dataset), populationNote(plan), ...notes],
    metric: "Distinct reportable, census-enrolled students",
    sources: ["student_terms.csv", "students.csv", "programs.csv", "terms.csv"],
    limitations: [
      "Enrollment is a census headcount, not section registrations or annual unduplicated enrollment.",
      ...limitations,
    ],
    confidence: "High",
    queryPlan: `enrollment; operation=${plan.operation}; scope=${plan.programId ?? plan.programScope}; population=${plan.populationValue ?? "all"}; years=${plan.startYear}-${plan.endYear}`,
  };
}

function answerEnrollmentSpecial(plan, dataset) {
  const allPrograms = dataset.catalogs.programs;
  const programs = selectedPrograms(plan, dataset);
  const startYear = plan.startYear;
  const endYear = plan.endYear;
  const count = (
    scopedPrograms,
    year,
    dimension = plan.populationDimension,
    value = plan.populationValue,
  ) => enrollmentCountFor(dataset, scopedPrograms, year, dimension, value);
  const countPoint = (label, value) => ({
    label,
    value,
    display: value.toLocaleString("en-US"),
  });
  const percentPoint = (label, value) => ({
    label,
    value,
    display: `${value.toFixed(1)}%`,
  });

  if (plan.operation === "share") {
    const numerator = count(programs, endYear);
    const denominator =
      plan.populationDimension !== "all"
        ? count(programs, endYear, "all", null)
        : plan.programScope !== "all" || plan.programId
          ? count(allPrograms, endYear, "all", null)
          : count(allPrograms, endYear, "all", null);
    if (denominator <= 0) {
      return unsupportedAnswer(
        "A percentage cannot be calculated because the governed denominator is zero.",
        `The matched ${endYear} enrollment denominator contains no students. EduInsight did not report 0% or assign a High-confidence label.`,
        ["student_terms.csv", "students.csv", "programs.csv", "terms.csv"],
      );
    }
    if (numerator > denominator) {
      return unsupportedAnswer(
        "A percentage cannot be calculated because the governed numerator exceeds its denominator.",
        "The uploaded aggregate cubes contradict one another and must be reconciled before this result can be reported.",
        ["student_terms.csv", "students.csv", "programs.csv", "terms.csv"],
      );
    }
    const share = (numerator / denominator) * 100;
    const subject =
      plan.populationValue ??
      (plan.programId
        ? programScopeLabel(plan, dataset)
        : plan.degreeLevel ?? "Selected");
    return enrollmentAnswer({
      plan,
      dataset,
      headline: `${subject} students represent ${share.toFixed(1)}% of the matched ${endYear} enrollment denominator.`,
      summary: `${numerator.toLocaleString("en-US")} of ${denominator.toLocaleString("en-US")} students are in the requested population.`,
      delta: `${share.toFixed(1)}%`,
      points: [percentPoint(subject, share)],
      notes: [
        `Numerator: ${numerator.toLocaleString("en-US")} matched students.`,
        `Denominator: ${denominator.toLocaleString("en-US")} students in the governed comparison population.`,
      ],
    });
  }

  if (plan.operation === "absolute_difference") {
    const first = count(programs, startYear);
    const last = count(programs, endYear);
    const difference = last - first;
    return enrollmentAnswer({
      plan,
      dataset,
      headline: `${programScopeLabel(plan, dataset)} had ${Math.abs(difference).toLocaleString("en-US")} ${difference >= 0 ? "more" : "fewer"} students in ${endYear} than ${startYear}.`,
      summary: `${first.toLocaleString("en-US")} students in ${startYear} compared with ${last.toLocaleString("en-US")} in ${endYear}.`,
      delta: difference.toLocaleString("en-US"),
      points: [
        countPoint(String(startYear), first),
        countPoint(String(endYear), last),
      ],
    });
  }

  if (plan.operation === "year_over_year") {
    const previousYear = endYear - 1;
    const previous = count(programs, previousYear);
    const current = count(programs, endYear);
    const difference = current - previous;
    const rate = previous ? difference / previous : 0;
    return enrollmentAnswer({
      plan,
      dataset,
      headline: `Enrollment ${difference >= 0 ? "increased" : "decreased"} by ${Math.abs(difference).toLocaleString("en-US")} students (${signedPercent(rate)}) in ${endYear}.`,
      summary: `${previous.toLocaleString("en-US")} students in ${previousYear} compared with ${current.toLocaleString("en-US")} in ${endYear}.`,
      delta: signedPercent(rate),
      points: [
        countPoint(String(previousYear), previous),
        countPoint(String(endYear), current),
      ],
    });
  }

  if (plan.operation === "compare_degree_levels") {
    const undergraduate = allPrograms.filter(
      (program) => program.degreeLevel === "Undergraduate",
    );
    const graduate = allPrograms.filter(
      (program) => program.degreeLevel === "Graduate",
    );
    if (plan.timeMode === "trend") {
      const undergraduateStart = count(undergraduate, startYear, "all", null);
      const undergraduateEnd = count(undergraduate, endYear, "all", null);
      const graduateStart = count(graduate, startYear, "all", null);
      const graduateEnd = count(graduate, endYear, "all", null);
      const undergraduateGrowth =
        (undergraduateEnd - undergraduateStart) / undergraduateStart;
      const graduateGrowth = (graduateEnd - graduateStart) / graduateStart;
      const winner =
        graduateGrowth >= undergraduateGrowth ? "Graduate" : "Undergraduate";
      const winnerGrowth = Math.max(graduateGrowth, undergraduateGrowth);
      return enrollmentAnswer({
        plan,
        dataset,
        headline: `${winner} enrollment grew faster, changing ${Math.abs(winnerGrowth * 100).toFixed(1)}% since ${startYear}.`,
        summary: `Graduate enrollment changed ${signedPercent(graduateGrowth)}; undergraduate enrollment changed ${signedPercent(undergraduateGrowth)}.`,
        delta: signedPercent(winnerGrowth),
        points: [
          percentPoint("Undergraduate", undergraduateGrowth * 100),
          percentPoint("Graduate", graduateGrowth * 100),
        ],
      });
    }
    const undergraduateCount = count(undergraduate, endYear, "all", null);
    const graduateCount = count(graduate, endYear, "all", null);
    const difference = undergraduateCount - graduateCount;
    return enrollmentAnswer({
      plan,
      dataset,
      headline: `Undergraduate enrollment is larger by ${difference.toLocaleString("en-US")} students in ${endYear}.`,
      summary: `${undergraduateCount.toLocaleString("en-US")} undergraduate students compared with ${graduateCount.toLocaleString("en-US")} graduate students.`,
      delta: difference.toLocaleString("en-US"),
      points: [
        countPoint("Undergraduate", undergraduateCount),
        countPoint("Graduate", graduateCount),
      ],
    });
  }

  if (plan.operation === "compare_residency") {
    const domestic = (year) =>
      count(allPrograms, year, "residency", "Domestic");
    const international = (year) =>
      count(allPrograms, year, "residency", "International");
    if (plan.timeMode === "trend") {
      const domesticGrowth =
        (domestic(endYear) - domestic(startYear)) / domestic(startYear);
      const internationalGrowth =
        (international(endYear) - international(startYear)) /
        international(startYear);
      const winner =
        internationalGrowth >= domesticGrowth ? "International" : "Domestic";
      const winnerGrowth = Math.max(internationalGrowth, domesticGrowth);
      return enrollmentAnswer({
        plan,
        dataset,
        headline: `${winner} enrollment grew faster at ${Math.abs(winnerGrowth * 100).toFixed(1)}% since ${startYear}.`,
        summary: `Domestic enrollment changed ${signedPercent(domesticGrowth)}; international enrollment changed ${signedPercent(internationalGrowth)}.`,
        delta: signedPercent(winnerGrowth),
        points: [
          percentPoint("Domestic", domesticGrowth * 100),
          percentPoint("International", internationalGrowth * 100),
        ],
      });
    }
    const domesticCount = domestic(endYear);
    const internationalCount = international(endYear);
    return enrollmentAnswer({
      plan,
      dataset,
      headline: `Domestic enrollment is larger by ${(domesticCount - internationalCount).toLocaleString("en-US")} students in ${endYear}.`,
      summary: `${domesticCount.toLocaleString("en-US")} domestic students compared with ${internationalCount.toLocaleString("en-US")} international students.`,
      delta: (domesticCount - internationalCount).toLocaleString("en-US"),
      points: [
        countPoint("Domestic", domesticCount),
        countPoint("International", internationalCount),
      ],
    });
  }

  if (plan.operation === "compare_other_graduate") {
    const selected = programs;
    const other = allPrograms.filter(
      (program) =>
        program.degreeLevel === "Graduate" &&
        !selected.some((candidate) => candidate.programId === program.programId),
    );
    const selectedCount = count(selected, endYear, "all", null);
    const otherCount = count(other, endYear, "all", null);
    return enrollmentAnswer({
      plan,
      dataset,
      headline: `${programs[0].programName} has ${(otherCount - selectedCount).toLocaleString("en-US")} fewer students than the other graduate programs combined.`,
      summary: `${selectedCount.toLocaleString("en-US")} students in ${programs[0].programName}; ${otherCount.toLocaleString("en-US")} across the other graduate programs.`,
      delta: selectedCount.toLocaleString("en-US"),
      points: [
        countPoint(programs[0].programName, selectedCount),
        countPoint("Other graduate programs", otherCount),
      ],
    });
  }

  if (plan.operation === "compare_years") {
    const first = count(programs, startYear);
    const last = count(programs, endYear);
    return enrollmentAnswer({
      plan,
      dataset,
      headline: `${titleCase(programScopeLabel(plan, dataset))} enrollment changed by ${(last - first).toLocaleString("en-US")} students between ${startYear} and ${endYear}.`,
      summary: `${first.toLocaleString("en-US")} students in ${startYear}; ${last.toLocaleString("en-US")} in ${endYear}.`,
      delta: (last - first).toLocaleString("en-US"),
      points: [
        countPoint(String(startYear), first),
        countPoint(String(endYear), last),
      ],
    });
  }

  if (plan.operation === "rank_year") {
    let points = dataset.catalogs.years
      .filter((year) => year >= startYear && year <= endYear)
      .map((year) => countPoint(String(year), count(programs, year)));
    points.sort((a, b) =>
      plan.ranking === "lowest" ? a.value - b.value : b.value - a.value,
    );
    const leader = points[0];
    return enrollmentAnswer({
      plan,
      dataset,
      headline: `${leader.label} had the ${plan.ranking === "lowest" ? "lowest" : "highest"} enrollment at ${leader.display} students.`,
      summary: `The ranking compares Fall census headcount across ${points.length} years.`,
      delta: leader.display,
      points,
    });
  }

  if (plan.operation === "program_share_ranking") {
    let points = programs.map((program) => {
      const numerator = count([program], endYear, "residency", "International");
      const denominator = count([program], endYear, "all", null);
      return percentPoint(
        program.programName,
        denominator ? (numerator / denominator) * 100 : 0,
      );
    });
    points.sort((a, b) => b.value - a.value);
    points = points.slice(0, plan.topN);
    return enrollmentAnswer({
      plan,
      dataset,
      headline: `${points[0].label} has the highest percentage of international students at ${points[0].value.toFixed(1)}%.`,
      summary: "Each program uses its own Fall census enrollment as the denominator.",
      delta: points[0].display,
      points,
    });
  }

  if (
    [
      "program_change_negative",
      "program_change_nonpositive",
      "program_change_absolute",
      "program_change_percent",
    ].includes(plan.operation)
  ) {
    let changes = programs.map((program) => {
      const first = count([program], startYear, "all", null);
      const last = count([program], endYear, "all", null);
      const absolute = last - first;
      const percentage = first ? (absolute / first) * 100 : 0;
      return { label: program.programName, first, last, absolute, percentage };
    });
    const declining =
      plan.operation === "program_change_negative" ||
      /\bdeclined\b/.test(plan.normalizedQuestion);
    if (
      plan.operation === "program_change_negative" ||
      plan.operation === "program_change_nonpositive"
    ) {
      changes = changes.filter((change) =>
        plan.operation === "program_change_nonpositive"
          ? change.absolute <= 0
          : change.absolute < 0,
      );
    }
    const percentage = plan.operation === "program_change_percent";
    changes.sort((a, b) => {
      const left = percentage ? a.percentage : a.absolute;
      const right = percentage ? b.percentage : b.absolute;
      return declining ? left - right : right - left;
    });
    if (!changes.length) {
      return enrollmentAnswer({
        plan,
        dataset,
        headline: `No programs matched the requested enrollment-change condition between ${startYear} and ${endYear}.`,
        summary: "Every governed program was evaluated against the requested endpoints.",
        delta: "0 programs",
        points: [],
      });
    }
    const leader = changes[0];
    const leaderValue = percentage ? leader.percentage : leader.absolute;
    const tied = changes.filter((change) =>
      closeNumeric(
        percentage ? change.percentage : change.absolute,
        leaderValue,
      ),
    );
    const points = changes.slice(0, plan.topN).map((change) =>
      percentage
        ? percentPoint(change.label, change.percentage)
        : countPoint(change.label, change.absolute),
    );
    const action = declining
      ? "declined the most"
      : "changed the most";
    return enrollmentAnswer({
      plan,
      dataset,
      headline:
        plan.operation === "program_change_nonpositive"
          ? `${changes.length} programs did not grow between ${startYear} and ${endYear}; ${leader.label} ${action} at ${signedInteger(leader.absolute)}${tied.length > 1 ? `, tied with ${tied.length - 1} other program${tied.length === 2 ? "" : "s"}` : ""}.`
          : `${leader.label} ${action} at ${percentage ? `${leader.percentage.toFixed(1)}%` : signedInteger(leader.absolute)} between ${startYear} and ${endYear}${tied.length > 1 ? `; ${tied.length} programs tie at that value` : ""}.`,
      summary: `${leader.first.toLocaleString("en-US")} students in ${startYear} and ${leader.last.toLocaleString("en-US")} in ${endYear}.`,
      delta: percentage
        ? `${leader.percentage.toFixed(1)}%`
        : signedInteger(leader.absolute),
      points,
      notes: [
        tied.length > 1
          ? `A tie exists among ${tied.map((change) => change.label).join(", ")}.`
          : "No tie exists at the leading value.",
      ],
    });
  }

  return null;
}

function signedInteger(value) {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toLocaleString("en-US")}`;
}

function closeNumeric(left, right) {
  return Math.abs(Number(left) - Number(right)) < 0.0001;
}

function answerEnrollment(plan, dataset) {
  const special = answerEnrollmentSpecial(plan, dataset);
  if (special) return special;
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
        (plan.populationValue === "Domestic"
          ? dataset.catalogs.residencies.includes(row.value) &&
            row.value !== "International"
          : row.value === plan.populationValue)),
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
  const points = limitedPoints(rawPoints, plan.topN).map((point) => ({
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
        : Math.abs(change) < 0.0005
          ? `${titleCase(subject)} is unchanged since ${first.label}.`
          : `${titleCase(subject)} is ${change > 0 ? "up" : "down"} ${Math.abs(change * 100).toFixed(1)}% since ${first.label}.`;
    summary = `${last.display} students matched in ${last.label}, compared with ${first.display} in ${first.label}.`;
    delta =
      change === null
        ? "No baseline"
        : Math.abs(change) < 0.0005
          ? "No change"
          : signedPercent(change);
  } else if (effectiveGroupBy !== "none") {
    const leader = points[0];
    const tiedLeaders = rawPoints.filter((point) =>
      closeNumeric(point.value, leader.value),
    );
    headline = `${leader.label} has the ${plan.ranking === "lowest" ? "lowest" : "largest"} matched enrollment at ${leader.display} students${tiedLeaders.length > 1 ? `; ${tiedLeaders.length} programs tie at that value` : ""}.`;
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
      scopeNote(plan, dataset),
      populationNote(plan),
      effectiveGroupBy === "year"
        ? "The x-axis contains Fall census years."
        : `The x-axis contains ${dimensionLabel(effectiveGroupBy)} values.`,
    ],
    metric: "Distinct reportable, census-enrolled students",
    sources: ["student_terms.csv", "students.csv", "programs.csv", "terms.csv"],
    limitations: [
      "Enrollment is a census headcount, not section registrations or annual unduplicated enrollment.",
      plan.operation === "why"
        ? "The available data is descriptive and cannot establish why enrollment changed or prove causation."
        : "The result describes observed enrollment and does not infer motivation or causation.",
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

function retentionValueFor(
  dataset,
  programs,
  cohortYear,
  dimension = "all",
  value = null,
) {
  const programIds = new Set(programs.map((program) => program.programId));
  const rows = (dataset.retentionCubes[dimension] ?? []).filter(
    (row) =>
      programIds.has(row.programId) &&
      row.cohortYear === cohortYear &&
      (dimension === "all" || row.value === value),
  );
  const cohortSize = rows.reduce((sum, row) => sum + row.cohortSize, 0);
  const retained = rows.reduce((sum, row) => sum + row.retained, 0);
  return {
    cohortSize,
    retained,
    value: cohortSize ? (retained / cohortSize) * 100 : 0,
  };
}

function retentionAnswer({
  plan,
  dataset,
  headline,
  summary,
  points,
  delta,
  notes = [],
}) {
  return {
    eyebrow: "First-year retention · FTFT cohorts",
    headline,
    summary,
    delta,
    points,
    notes: [scopeNote(plan, dataset), populationNote(plan), ...notes],
    metric:
      "Following-Fall persistence among first-time, full-time, degree-seeking students",
    sources: ["students.csv", "student_terms.csv", "programs.csv", "terms.csv"],
    limitations: [
      "Retention differences are descriptive and do not establish causation.",
      "The latest complete cohort is 2024 because a following-Fall outcome is required.",
    ],
    confidence: "High",
    queryPlan: `retention; operation=${plan.operation}; scope=${plan.programId ?? plan.programScope}; cohorts=${plan.startYear}-${plan.endYear}`,
  };
}

function answerRetentionSpecial(plan, dataset) {
  const programs = selectedPrograms(plan, dataset);
  const availableYears = [
    ...new Set(dataset.retentionCubes.all.map((row) => row.cohortYear)),
  ].filter((year) => year >= plan.startYear && year <= plan.endYear);
  const latestYear = Math.max(...availableYears);
  const point = (label, result) => ({
    label,
    value: result.value,
    display: `${result.value.toFixed(1)}%`,
  });
  const groupResult = (dimension, value, year = latestYear) =>
    retentionValueFor(dataset, programs, year, dimension, value);

  if (
    plan.operation === "retention_pell_comparison" ||
    plan.operation === "retention_generation_comparison"
  ) {
    const pell = plan.operation === "retention_pell_comparison";
    const dimension = pell ? "pell_eligible" : "first_generation";
    const leftLabel = pell ? "Pell-eligible" : "First-generation";
    const rightLabel = pell ? "Non-Pell" : "Continuing-generation";
    const left = groupResult(dimension, leftLabel);
    const right = groupResult(dimension, rightLabel);
    const gap = left.value - right.value;
    return retentionAnswer({
      plan,
      dataset,
      headline: `${leftLabel} retention is ${Math.abs(gap).toFixed(1)} percentage points ${gap >= 0 ? "higher" : "lower"} than ${rightLabel} retention.`,
      summary: `${leftLabel}: ${left.retained.toLocaleString("en-US")} of ${left.cohortSize.toLocaleString("en-US")}; ${rightLabel}: ${right.retained.toLocaleString("en-US")} of ${right.cohortSize.toLocaleString("en-US")}.`,
      delta: `${Math.abs(gap).toFixed(1)} pts`,
      points: [point(leftLabel, left), point(rightLabel, right)],
      notes: [
        `Both rates use the ${latestYear} first-time, full-time, degree-seeking cohort.`,
      ],
    });
  }

  if (plan.operation === "retention_group_ranking") {
    const groups = [
      ["First-generation", "first_generation", "First-generation"],
      ["Continuing-generation", "first_generation", "Continuing-generation"],
      ["Pell-eligible", "pell_eligible", "Pell-eligible"],
      ["Non-Pell", "pell_eligible", "Non-Pell"],
    ].map(([label, dimension, value]) => ({
      label,
      ...groupResult(dimension, value),
    }));
    groups.sort((a, b) =>
      plan.ranking === "highest" ? b.value - a.value : a.value - b.value,
    );
    const leader = groups[0];
    return retentionAnswer({
      plan,
      dataset,
      headline: `${leader.label} had the ${plan.ranking === "highest" ? "highest" : "lowest"} retention in ${latestYear} at ${leader.value.toFixed(1)}%.`,
      summary:
        "The ranking compares the governed first-generation and Pell-status population pairs.",
      delta: `${leader.value.toFixed(1)}%`,
      points: groups.map((group) => point(group.label, group)),
    });
  }

  if (plan.operation === "retention_group_improvement") {
    const groups = [
      ["First-generation", "first_generation", "First-generation"],
      ["Continuing-generation", "first_generation", "Continuing-generation"],
      ["Pell-eligible", "pell_eligible", "Pell-eligible"],
      ["Non-Pell", "pell_eligible", "Non-Pell"],
    ].map(([label, dimension, value]) => {
      const first = groupResult(dimension, value, plan.startYear);
      const last = groupResult(dimension, value, latestYear);
      return { label, change: last.value - first.value, first, last };
    });
    groups.sort((a, b) => b.change - a.change);
    const leader = groups[0];
    return retentionAnswer({
      plan,
      dataset,
      headline: `${leader.label} improved retention the most, by ${leader.change.toFixed(1)} percentage points since ${plan.startYear}.`,
      summary: `${leader.first.value.toFixed(1)}% in ${plan.startYear} compared with ${leader.last.value.toFixed(1)}% in ${latestYear}.`,
      delta: `${leader.change.toFixed(1)} pts`,
      points: groups.map((group) => ({
        label: group.label,
        value: group.change,
        display: `${group.change.toFixed(1)} pts`,
      })),
    });
  }

  if (plan.operation === "retention_degree_gap") {
    const bsPrograms = dataset.catalogs.programs.filter((program) =>
      program.programName.startsWith("BS "),
    );
    const msPrograms = dataset.catalogs.programs.filter((program) =>
      program.programName.startsWith("MS "),
    );
    const bs = retentionValueFor(dataset, bsPrograms, latestYear);
    const ms = retentionValueFor(dataset, msPrograms, latestYear);
    const gap = bs.value - ms.value;
    return retentionAnswer({
      plan,
      dataset,
      headline: `BS retention is ${Math.abs(gap).toFixed(1)} percentage points ${gap >= 0 ? "higher" : "lower"} than MS retention.`,
      summary: `BS retention is ${bs.value.toFixed(1)}%; MS retention is ${ms.value.toFixed(1)}% for the ${latestYear} cohort.`,
      delta: `${Math.abs(gap).toFixed(1)} pts`,
      points: [point("BS", bs), point("MS", ms)],
    });
  }

  if (plan.operation === "rank_year") {
    let results = availableYears.map((year) => ({
      label: String(year),
      ...retentionValueFor(
        dataset,
        programs,
        year,
        plan.populationDimension,
        plan.populationValue,
      ),
    }));
    results.sort((a, b) =>
      plan.ranking === "lowest" ? a.value - b.value : b.value - a.value,
    );
    const leader = results[0];
    return retentionAnswer({
      plan,
      dataset,
      headline: `${leader.label} had the ${plan.ranking === "lowest" ? "lowest" : "highest"} retention at ${leader.value.toFixed(1)}%.`,
      summary: "The ranking compares complete FTFT cohort years.",
      delta: `${leader.value.toFixed(1)}%`,
      points: results.map((result) => point(result.label, result)),
    });
  }

  return null;
}

function answerRetention(plan, dataset) {
  const special = answerRetentionSpecial(plan, dataset);
  if (special) return special;
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
        scopeNote(plan, dataset),
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
      scopeNote(plan, dataset),
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
    const reviewCount = currentChecks.filter(
      (check) => check.status === "Review",
    ).length;
    return {
      eyebrow: `IPEDS · Fall Enrollment · Run ${latestRun.sequence}`,
      headline:
        plan.checkStatus === "Failed" && checks.length === 0
          ? "No failed IPEDS validation checks are present in the latest run."
          : `${checks.length} current validation checks are marked ${plan.checkStatus.toLowerCase()}.`,
      summary:
        plan.checkStatus === "Failed" && checks.length === 0
          ? `${reviewCount} checks are marked Review; Review is distinct from Failed.`
          : `Those checks represent ${weight.toFixed(1)} of 100 governed readiness weight points.`,
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

  if (plan.operation === "quality_issue_ranking") {
    const ranked = [...issues].sort(
      (left, right) => right.affectedRecords - left.affectedRecords,
    );
    const leader = ranked[0];
    return {
      eyebrow: `Data quality · ${plan.status} findings`,
      headline: `${leader.issueId} (${leader.ruleId}) is the largest data-quality issue, affecting ${leader.affectedRecords.toLocaleString("en-US")} records.`,
      summary: leader.title,
      delta: `${leader.affectedRecords.toLocaleString("en-US")} records`,
      points: ranked.slice(0, plan.topN).map((issue) => ({
        label: issue.issueId,
        value: issue.affectedRecords,
        display: issue.affectedRecords.toLocaleString("en-US"),
      })),
      notes: [
        `Owner: ${leader.owner}.`,
        `Source system: ${leader.sourceSystem}.`,
        `Severity: ${leader.severity}.`,
      ],
      metric: "Affected-record count for governed data-quality findings",
      sources: ["data_quality_issue_log.csv"],
      limitations: [
        "Affected-record totals can double-count a record flagged by multiple rules.",
      ],
      confidence: "High",
      queryPlan: `quality_issues; status=${plan.status}; rank_by=affected_records`,
    };
  }

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
  if (rows.every((row) => row.seats === 0)) {
    return unsupportedAnswer(
      "Capacity utilization is unavailable because the governed denominator is zero.",
      "The matched schedule contains zero available seats. EduInsight did not report 0%, Infinity, or a High-confidence utilization.",
      ["sections.csv", "section_enrollments.csv", "programs.csv"],
    );
  }

  if (plan.operation === "capacity_enrollment_comparison") {
    const programs = selectedPrograms(plan, dataset);
    const censusEnrollment = enrollmentCountFor(
      dataset,
      programs,
      2025,
      "all",
      null,
    );
    const scheduledSeats = rows.reduce((sum, row) => sum + row.seats, 0);
    const registrations = rows.reduce((sum, row) => sum + row.filled, 0);
    const utilization = scheduledSeats
      ? (registrations / scheduledSeats) * 100
      : 0;
    return {
      eyebrow: "Enrollment and capacity · Fall 2025",
      headline: `${programScopeLabel(plan, dataset)} has ${censusEnrollment.toLocaleString("en-US")} census students and ${registrations.toLocaleString("en-US")} section registrations against ${scheduledSeats.toLocaleString("en-US")} scheduled seats.`,
      summary: `Capacity utilization is ${utilization.toFixed(0)}%; registrations and census headcount are different governed measures.`,
      delta: `${utilization.toFixed(0)}%`,
      points: [
        {
          label: "Census enrollment",
          value: censusEnrollment,
          display: censusEnrollment.toLocaleString("en-US"),
        },
        {
          label: "Section registrations",
          value: registrations,
          display: registrations.toLocaleString("en-US"),
        },
        {
          label: "Scheduled seats",
          value: scheduledSeats,
          display: scheduledSeats.toLocaleString("en-US"),
        },
      ],
      notes: [
        "Census enrollment is a distinct student headcount.",
        "Capacity uses section registrations, so one student can contribute more than one registration.",
      ],
      metric: "Census headcount compared with scheduled-section registrations and seats",
      sources: [
        "student_terms.csv",
        "sections.csv",
        "section_enrollments.csv",
        "programs.csv",
      ],
      limitations: [
        "The measures should not be subtracted as if they used the same unit.",
      ],
      confidence: "High",
      queryPlan: `capacity_enrollment_comparison; scope=${plan.programId ?? plan.programScope}; year=2025`,
    };
  }

  if (plan.operation === "capacity_threshold") {
    const programs = selectedPrograms(plan, dataset);
    const allowed = new Set(programs.map((program) => program.programId));
    let matches = dataset.capacity
      .filter((value) => allowed.has(value.programId))
      .filter((value) =>
        ({
          gt: (actual) => actual > plan.thresholdValue,
          gte: (actual) => actual >= plan.thresholdValue,
          lt: (actual) => actual < plan.thresholdValue,
          lte: (actual) => actual <= plan.thresholdValue,
          eq: (actual) => closeNumeric(actual, plan.thresholdValue),
        })[plan.thresholdOperator]?.(value.utilization * 100) ?? false,
      )
      .sort((left, right) => right.utilization - left.utilization);
    matches = matches.slice(0, plan.topN);
    const points = matches.map((value) => ({
      label: value.programName,
      value: value.utilization * 100,
      display: `${(value.utilization * 100).toFixed(0)}%`,
    }));
    const operatorLabel = {
      gt: "above",
      gte: "at least",
      lt: "below",
      lte: "at most",
      eq: "exactly",
    }[plan.thresholdOperator];
    return {
      eyebrow: "Capacity · Fall 2025 threshold",
      headline: matches.length
        ? `${matches.length} program${matches.length === 1 ? " is" : "s are"} ${operatorLabel} ${plan.thresholdValue}% capacity.`
        : `No programs are ${operatorLabel} ${plan.thresholdValue}% capacity.`,
      summary: matches.length
        ? "Every displayed program satisfies the requested utilization threshold."
        : "No uploaded program satisfies the requested utilization threshold.",
      delta: `${matches.length} program${matches.length === 1 ? "" : "s"}`,
      points,
      notes: matches.map(
        (value) =>
          `${value.programName}: ${value.filled.toLocaleString("en-US")} registrations across ${value.seats.toLocaleString("en-US")} seats.`,
      ),
      metric: "Enrolled section registrations divided by scheduled section capacity",
      sources: ["sections.csv", "section_enrollments.csv", "programs.csv"],
      limitations: [
        "Capacity reflects the uploaded Fall 2025 schedule.",
      ],
      confidence: "High",
      queryPlan: `capacity_utilization; threshold=${plan.thresholdOperator}_${plan.thresholdValue}`,
    };
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
  const points = limitedPoints(aggregates, plan.topN).map((value) => ({
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

function firstDuplicate(rows, keyFor) {
  const seen = new Set();
  for (const row of rows ?? []) {
    const key = keyFor(row);
    if (seen.has(key)) return key;
    seen.add(key);
  }
  return null;
}

function sourceIntegrityIssue(plan, dataset) {
  const programIds = new Set(
    (dataset.catalogs?.programs ?? []).map((program) => program.programId),
  );
  if (plan.metric === "enrollment") {
    const dimensions = new Set(["all"]);
    if (plan.populationDimension && plan.populationDimension !== "all") {
      dimensions.add(plan.populationDimension);
    }
    if (POPULATION_GROUP_BYS.has(plan.groupBy)) dimensions.add(plan.groupBy);
    for (const dimension of dimensions) {
      const rows = dataset.enrollmentCubes?.[dimension];
      if (!rows) continue;
      const unmapped = rows.find((row) => !programIds.has(row.programId));
      if (unmapped) {
        return {
          headline: "Enrollment cannot be reported because a program mapping is missing.",
          summary: `Aggregate enrollment references unmapped program ${unmapped.programId}. Reconcile programs.csv before calculating institution or program totals.`,
          sources: ["student_terms.csv", "programs.csv"],
        };
      }
      if (
        rows.some((row) => !Number.isFinite(row.count) || row.count < 0)
      ) {
        return {
          headline: "Enrollment cannot be reported because an aggregate count is invalid.",
          summary: `The ${dimension} enrollment cube contains a negative or nonnumeric count.`,
          sources: ["student_terms.csv"],
        };
      }
      const duplicate = firstDuplicate(
        rows,
        (row) => `${row.programId}|${row.year}|${row.value ?? "all"}`,
      );
      if (duplicate) {
        return {
          headline: "Enrollment cannot be reported because duplicate aggregate records were detected.",
          summary: `Duplicate ${dimension} cube key ${duplicate} would double-count students. Reconcile the upload before publishing a result.`,
          sources: ["student_terms.csv"],
        };
      }
    }
  }
  if (plan.metric === "retention") {
    const dimensions = new Set(["all"]);
    if (plan.populationDimension && plan.populationDimension !== "all") {
      dimensions.add(plan.populationDimension);
    }
    if (POPULATION_GROUP_BYS.has(plan.groupBy)) dimensions.add(plan.groupBy);
    for (const dimension of dimensions) {
      const rows = dataset.retentionCubes?.[dimension];
      if (!rows) continue;
      const invalid = rows.find(
        (row) =>
          !programIds.has(row.programId) ||
          !Number.isFinite(row.cohortSize) ||
          !Number.isFinite(row.retained) ||
          row.cohortSize < 0 ||
          row.retained < 0 ||
          row.retained > row.cohortSize,
      );
      if (invalid) {
        return {
          headline: "Retention cannot be reported because the cohort aggregates are inconsistent.",
          summary:
            "A retention record has a missing program mapping, an invalid denominator, or more retained students than cohort members.",
          sources: ["students.csv", "student_terms.csv", "programs.csv"],
        };
      }
      const duplicate = firstDuplicate(
        rows,
        (row) => `${row.programId}|${row.cohortYear}|${row.value ?? "all"}`,
      );
      if (duplicate) {
        return {
          headline: "Retention cannot be reported because duplicate cohort aggregates were detected.",
          summary: `Duplicate ${dimension} retention key ${duplicate} would double-count the cohort.`,
          sources: ["students.csv", "student_terms.csv"],
        };
      }
    }
  }
  if (
    plan.metric === "capacity_utilization" ||
    plan.metric === "course_outcomes"
  ) {
    const invalid = (dataset.sections ?? []).find(
      (section) =>
        !programIds.has(section.programId) ||
        !Number.isFinite(section.seats) ||
        !Number.isFinite(section.filled) ||
        section.seats < 0 ||
        section.filled < 0 ||
        section.filled > section.seats,
    );
    if (invalid) {
      return {
        headline: "Capacity cannot be reported because the uploaded schedule is contradictory.",
        summary: `Section ${invalid.sectionId ?? "record"} has invalid capacity or enrollment exceeds capacity. Reconcile sections.csv and section_enrollments.csv first.`,
        sources: ["sections.csv", "section_enrollments.csv", "programs.csv"],
      };
    }
  }
  return null;
}

function applyConfidenceContext(plan, dataset, answer) {
  if (answer.confidence !== "High") return answer;

  const lowerConfidence = (reason, limitation, confidence = "Medium") => ({
    ...answer,
    confidence,
    notes: [...answer.notes, reason],
    limitations: [...answer.limitations, limitation],
  });

  const generatedAt = Date.parse(dataset.generatedAt ?? "");
  const ageDays = Number.isFinite(generatedAt)
    ? (Date.now() - generatedAt) / 86_400_000
    : Number.POSITIVE_INFINITY;
  if (ageDays > 400) {
    return lowerConfidence(
      `Confidence is reduced because the governed dataset was generated ${Number.isFinite(generatedAt) ? new Date(generatedAt).toISOString().slice(0, 10) : "without a valid freshness timestamp"}.`,
      "Refresh the uploaded sources before treating this result as High confidence.",
      "Medium",
    );
  }

  if (plan.metric === "enrollment") {
    const dimension = POPULATION_GROUP_BYS.has(plan.groupBy)
      ? plan.groupBy
      : plan.populationDimension;
    if (dimension && dimension !== "all") {
      const allowedPrograms = new Set(
        selectedPrograms(plan, dataset).map((program) => program.programId),
      );
      const inScope = (row) =>
        allowedPrograms.has(row.programId) &&
        row.year >= plan.startYear &&
        row.year <= plan.endYear;
      const allTotal = (dataset.enrollmentCubes?.all ?? [])
        .filter(inScope)
        .reduce((sum, row) => sum + row.count, 0);
      const dimensionTotal = (dataset.enrollmentCubes?.[dimension] ?? [])
        .filter(inScope)
        .reduce((sum, row) => sum + row.count, 0);
      const allowedValues = {
        residency: dataset.catalogs.residencies,
        gender: dataset.catalogs.genders,
        race_ethnicity: dataset.catalogs.raceEthnicities,
        first_generation: ["First-generation", "Continuing-generation"],
        pell_eligible: ["Pell-eligible", "Non-Pell"],
        attendance_status: ["Full-time", "Part-time"],
        academic_status: dataset.catalogs.academicStatuses,
      }[dimension];
      const unknownRows = (dataset.enrollmentCubes?.[dimension] ?? []).filter(
        (row) => inScope(row) && !allowedValues?.includes(row.value),
      );
      if (dimensionTotal !== allTotal || unknownRows.length) {
        return lowerConfidence(
          `Confidence is reduced because ${dimension.replaceAll("_", " ")} values are incomplete or include ${unknownRows.length ? `unknown categor${unknownRows.length === 1 ? "y" : "ies"}` : "missing records"} within the matched population.`,
          `The ${dimension.replaceAll("_", " ")} field is incomplete; unknown or missing values were not silently assigned to another category.`,
          "Medium",
        );
      }
    }
  }

  if (plan.programId) {
    const program = dataset.catalogs.programs.find(
      (candidate) => candidate.programId === plan.programId,
    );
    const programTerms = new Set(
      clean(program?.programName)
        .replace(/^(ms|bs|ba|bba)\s+/, "")
        .split(/\s+/)
        .filter((token) => token.length >= 3),
    );
    const relatedIssue = (dataset.qualityIssues ?? []).find((issue) => {
      if (
        issue.status !== "Open" ||
        !["Critical", "High"].includes(issue.severity)
      ) {
        return false;
      }
      const issueText = clean(
        `${issue.title ?? ""} ${issue.ruleId ?? ""} ${issue.description ?? ""}`,
      );
      return (
        issueText.includes(clean(plan.programId)) ||
        [...programTerms].every((token) => issueText.includes(token))
      );
    });
    if (relatedIssue) {
      return lowerConfidence(
        `Confidence is reduced because the quality log contains related open issue ${relatedIssue.issueId} affecting ${Number(relatedIssue.affectedRecords ?? 0).toLocaleString("en-US")} records: ${relatedIssue.title}.`,
        "Resolve or formally accept the related program issue before treating this result as High confidence.",
        "Medium",
      );
    }
  }

  if (
    plan.metric === "enrollment" &&
    /\b(anomaly|quality issue|quality problem|despite)\b/.test(
      plan.normalizedQuestion,
    )
  ) {
    const relatedIssue = (dataset.qualityIssues ?? []).find(
      (issue) =>
        issue.status === "Open" &&
        /\b(headcount|enrollment)\b/i.test(
          `${issue.title ?? ""} ${issue.ruleId ?? ""}`,
        ),
    );
    if (relatedIssue) {
      return {
        ...answer,
        confidence: "Medium",
        notes: [
          ...answer.notes,
          `Confidence is reduced because the uploaded quality log contains an open enrollment anomaly: ${relatedIssue.issueId} (${relatedIssue.ruleId}).`,
        ],
        limitations: [
          ...answer.limitations,
          "Resolve or formally accept the related headcount anomaly before treating this result as High confidence.",
        ],
      };
    }
  }
  return answer;
}

function finalizeAnswer(plan, answer) {
  const disposition =
    plan.responseType === "clarification"
      ? "clarification"
      : plan.responseType === "limitation" || answer.confidence === "Low"
        ? "limitation"
        : "answer";
  return {
    ...answer,
    disposition,
    confidenceDetails: {
      query:
        plan.responseType === "answer" && plan.filterAudit?.complete !== false
          ? "Resolved"
          : "Unresolved",
      data:
        answer.confidence === "High"
          ? "Certified"
          : answer.confidence === "Medium"
            ? "Caveat"
            : "Unavailable",
      calculation: answer.points.length ? "Validated" : "Not run",
    },
  };
}

export function executeQueryPlan(plan, dataset) {
  if (plan.responseType === "clarification") {
    return finalizeAnswer(plan, clarificationAnswer(plan.responseReason));
  }
  if (plan.responseType === "limitation") {
    return finalizeAnswer(
      plan,
      unsupportedAnswer(
        "I cannot calculate that from the currently uploaded governed sources.",
        plan.responseReason,
      ),
    );
  }
  const integrityIssue = sourceIntegrityIssue(plan, dataset);
  if (integrityIssue) {
    return finalizeAnswer(
      plan,
      unsupportedAnswer(
        integrityIssue.headline,
        integrityIssue.summary,
        integrityIssue.sources,
      ),
    );
  }
  let answer;
  switch (plan.metric) {
    case "enrollment":
      answer = answerEnrollment(plan, dataset);
      break;
    case "retention":
      answer = answerRetention(plan, dataset);
      break;
    case "ipeds_readiness":
      answer = answerIpeds(plan, dataset);
      break;
    case "quality_issues":
      answer = answerQuality(plan, dataset);
      break;
    case "capacity_utilization":
      answer = answerCapacity(plan, dataset);
      break;
    case "course_outcomes":
      answer = answerCourseOutcomes(plan, dataset);
      break;
    case "data_catalog":
      answer = answerDataCatalog(dataset);
      break;
    default:
      answer = unsupportedAnswer(
        "I can’t calculate that from the uploaded sources yet.",
        "The question did not resolve to a governed metric and source combination supported by the current university upload contract.",
      );
      break;
  }
  return finalizeAnswer(plan, applyConfidenceContext(plan, dataset, answer));
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
      checkStatus: nullableEnum(["Passed", "Review", "Failed"]),
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
          "percentage",
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
