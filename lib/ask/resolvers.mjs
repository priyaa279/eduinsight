import { clean, normalizeQuestion } from "./normalization.mjs";

export function includesPhrase(normalized, phrase) {
	const escaped = clean(phrase).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`(?:^|\\s)${escaped}(?=\\s|$)`).test(normalized);
}
export function programAliases(program) {
	const name = clean(program.programName);
	const aliases = new Set([
		name,
		clean(program.programId),
		name.replace(/^(ms|ba|bs|bba)\s+/, ""),
		name.replace(/^master of\s+/, "")
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
	if (program.programId === "PPSY") {
		aliases.add("psych");
		aliases.add("psychology");
	}
	if (program.programId === "PBUS") aliases.add("bba");
	if (program.programId === "PMATH") {
		aliases.add("bs math");
		aliases.add("mathematics");
	}
	return [...aliases].filter((alias) => alias.length >= 2);
}
export function findProgram(question, dataset) {
	const normalized = normalizeQuestion(question);
	const matches = [];
	for (const program of dataset.catalogs.programs) for (const alias of programAliases(program)) if (includesPhrase(normalized, alias)) matches.push({
		program,
		aliasLength: alias.length
	});
	return matches.sort((a, b) => b.aliasLength - a.aliasLength)[0]?.program ?? null;
}
export function findCatalogValue(normalized, values) {
	return [...values].sort((a, b) => clean(b).length - clean(a).length).find((value) => includesPhrase(normalized, value)) ?? null;
}
export function findResidency(normalized, dataset) {
	if (/\b(?:not|excluding|exclude|without|except)\s+(?:the\s+)?international\b/.test(normalized)) return "Domestic";
	if (/\bout of state\b|\bout-of-state\b|\bnonresident domestic\b/.test(normalized)) return "Out-of-state";
	if (/\bin state\b|\binstate\b|\bresident students?\b/.test(normalized)) return "In-state";
	if (/\bdomestic\b/.test(normalized)) return "Domestic";
	if (/\binternational\b|\bforeign students?\b|\bforeign learners?\b/.test(normalized)) return "International";
	return findCatalogValue(normalized, dataset.catalogs.residencies);
}
export function findGender(normalized, dataset) {
	if (/\b(nonbinary|non-binary)\b/.test(normalized)) return "Nonbinary";
	if (/\b(women|woman|female)\b/.test(normalized)) return "Woman";
	if (/\b(men|man|male)\b/.test(normalized)) return "Man";
	return findCatalogValue(normalized, dataset.catalogs.genders);
}
export function findRaceEthnicity(normalized, dataset) {
	for (const [value, pattern] of [
		["Black or African American", /\bblack\b|\bafrican american\b/],
		["Hispanic or Latino", /\bhispanic\b|\blatino\b|\blatina\b|\blatinx\b/],
		["Asian", /\basian\b/],
		["White", /\bwhite\b/],
		["American Indian or Alaska Native", /\bamerican indian\b|\balaska native\b/],
		["Native Hawaiian or Other Pacific Islander", /\bnative hawaiian\b|\bpacific islander\b/],
		["Two or more races", /\btwo or more races\b|\bmultiracial\b/],
		["Nonresident", /\bnonresident\b/]
	]) if (pattern.test(normalized) && dataset.catalogs.raceEthnicities.includes(value)) return value;
	return findCatalogValue(normalized, dataset.catalogs.raceEthnicities);
}
export function inferPopulation(normalized, dataset) {
	if (/\bnon[- ]pell\b|\bnot pell(?: eligible)?\b|\bexcluding pell(?: eligible)?\b/.test(normalized)) return {
		populationDimension: "pell_eligible",
		populationValue: "Non-Pell",
		retentionGroup: "non_pell"
	};
	if (/\bpell\b/.test(normalized)) return {
		populationDimension: "pell_eligible",
		populationValue: "Pell-eligible",
		retentionGroup: "pell_eligible"
	};
	if (/\bcontinuing[- ]generation\b|\bcontinuing gen\b/.test(normalized)) return {
		populationDimension: "first_generation",
		populationValue: "Continuing-generation",
		retentionGroup: "continuing_generation"
	};
	if (/\bfirst[- ]generation\b|\bfirst gen\b/.test(normalized)) return {
		populationDimension: "first_generation",
		populationValue: "First-generation",
		retentionGroup: "first_generation"
	};
	const residency = findResidency(normalized, dataset);
	if (residency) return {
		populationDimension: "residency",
		populationValue: residency,
		retentionGroup: "all"
	};
	const gender = findGender(normalized, dataset);
	if (gender) return {
		populationDimension: "gender",
		populationValue: gender,
		retentionGroup: "all"
	};
	const raceEthnicity = findRaceEthnicity(normalized, dataset);
	if (raceEthnicity) return {
		populationDimension: "race_ethnicity",
		populationValue: raceEthnicity,
		retentionGroup: "all"
	};
	const academicStatus = findCatalogValue(normalized, dataset.catalogs.academicStatuses);
	if (academicStatus) return {
		populationDimension: "academic_status",
		populationValue: academicStatus,
		retentionGroup: "all"
	};
	if (/\b(probation|suspension|suspended)\b/.test(normalized)) return {
		populationDimension: "academic_status",
		populationValue: /\bprobation\b/.test(normalized) ? "Probation" : "Suspension",
		retentionGroup: "all"
	};
	if (/\bpart[- ]time\b/.test(normalized)) return {
		populationDimension: "attendance_status",
		populationValue: "Part-time",
		retentionGroup: "all"
	};
	if (/\bfull[- ]time\b/.test(normalized)) return {
		populationDimension: "attendance_status",
		populationValue: "Full-time",
		retentionGroup: "all"
	};
	return {
		populationDimension: "all",
		populationValue: null,
		retentionGroup: "all"
	};
}
export function populationMentions(normalized) {
	const mentions = [];
	if (/\b(international|foreign students?)\b/.test(normalized) && !/\b(?:not|excluding|exclude|without|except)\s+(?:the\s+)?international\b/.test(normalized)) mentions.push(["residency", "International"]);
	if (/\bdomestic\b/.test(normalized) || /\b(?:not|excluding|exclude|without|except)\s+(?:the\s+)?international\b/.test(normalized)) mentions.push(["residency", "Domestic"]);
	if (/\bnon[- ]pell\b|\bnot pell(?: eligible)?\b|\bexcluding pell(?: eligible)?\b/.test(normalized)) mentions.push(["pell_eligible", "Non-Pell"]);
	if (/\bpell(?:-eligible)?\b/.test(normalized) && !/\bnon[- ]pell\b|\bnot pell(?: eligible)?\b|\bexcluding pell(?: eligible)?\b/.test(normalized)) mentions.push(["pell_eligible", "Pell-eligible"]);
	if (/\bfirst[- ]generation\b|\bfirst gen\b/.test(normalized)) mentions.push(["first_generation", "First-generation"]);
	if (/\bcontinuing[- ]generation\b|\bcontinuing gen\b/.test(normalized)) mentions.push(["first_generation", "Continuing-generation"]);
	if (/\b(women|woman|female|men|man|male|nonbinary|non-binary)\b/.test(normalized)) mentions.push(["gender", "gender"]);
	if (/\b(black|african american|hispanic|latino|latina|latinx|asian|white|american indian|alaska native|native hawaiian|pacific islander|multiracial|two or more races)\b/.test(normalized)) mentions.push(["race_ethnicity", "race or ethnicity"]);
	if (/\b(full[- ]time|part[- ]time)\b/.test(normalized)) mentions.push(["attendance_status", "attendance status"]);
	if (/\b(good standing|probation|suspension|suspended|academic warning)\b/.test(normalized)) mentions.push(["academic_status", "academic status"]);
	return mentions;
}
export function requestedLimit(normalized) {
	const numeric = normalized.match(/\b(?:top|bottom|only|which|give|give me the|give the|return the|list the|show the|rank(?: the)?)\s+(\d+)\b/);
	if (numeric) return Math.max(1, Math.min(Number(numeric[1]), 25));
	const words = new Map([
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
		["ten", 10]
	]);
	const word = normalized.match(/\b(?:top|bottom|which|give|give the|give me the|return|return the|list|list the|show|show the|rank(?: the)?)\s+(one|single|two|three|four|five|six|seven|eight|nine|ten)\b/);
	if (word) return words.get(word[1]);
	const rankedWord = normalized.match(
		/\b(?:the\s+)?(one|single|two|three|four|five|six|seven|eight|nine|ten)\s+(?:largest|smallest|highest|lowest|most|least|fastest|slowest|biggest)\b/,
	);
	if (rankedWord) return words.get(rankedWord[1]);
	if (/\bwhich (?:single )?(?:academic |graduate |undergraduate )?program\b|\bname the (?:academic )?program\b|\bwhich schedule\b|\bwhere (?:is|was)\b.*\b(?:highest|largest) by program\b/.test(normalized)) return 1;
	return 10;
}
export function inferGroupBy(normalized) {
	for (const [groupBy, pattern] of [
		["year", /\b(by|across|per)\s+(year|cohort|term)\b|\byear[- ]by[- ]year\b/],
		["program", /\b(by|across|per)\s+program\b|\bwhich (?:single |academic |graduate |undergraduate |ms |bs )?program\b|\bprogram breakdown\b|\bprograms? by\b|\bprograms? (?:operating|running|using|that|ended|are|have|with|posted|added|lost)\b|\brank (?:\w+\s+){0,3}programs?\b|\btop \d+ programs?\b|\bbottom \d+ programs?\b|\bprograms? with (?:the )?(?:highest|lowest|greatest|smallest)\b|\bwhere is\b.*\bby program\b/],
		["degree_level", /\bby degree level\b|\bcompare undergraduate (?:with|and|versus|vs) graduate\b|\bundergraduate with graduate\b/],
		["college", /\b(by|across|per)\s+college\b|\bwhich college\b|\bcollege breakdown\b/],
		["residency", /\b(by|across|per)\s+(?:every\s+)?residenc\w*\b|\bresidency breakdown\b|\bresidency enrollment breakdown\b|\bresidency categories\b|\bresidency distribution\b|\b(?:break|split|place|put|show|reconcile)\b.*\bresidency\b.*\b(?:categories|side by side|buckets|totals?)\b|\bin[- ]state\b.*\bout[- ]of[- ]state\b.*\binternational\b/],
		["gender", /\b(by|across|per)\s+(?:reported )?gender\b|\bgender (?:breakdown|distribution|composition)\b|\b(?:reported[- ]?)?gender composition\b|\bdisaggregate\b.*\bgender\b/],
		["race_ethnicity", /\b(by|across|per)\s+(race|ethnicity|race and ethnicity)\b|\bdemographic breakdown\b|\b(?:race(?: and|-and-)?ethnicity|racial|race and ethnic|racial and ethnic)\b.*\b(?:distribution|composition|breakdown)\b/],
		["first_generation", /\b(by|across|per)\s+first[- ]generation\b|\bfirst[- ]generation (?:breakdown|composition|status composition|categories)\b|\bcompare\b.*\bfirst[- ]generation status\b|\b(?:split|break|show|check)\b.*\bfirst[- ]generation\b.*\b(?:continuing[- ]generation|categories|total enrollment)\b/],
		["pell_eligible", /\b(by|across|per)\s+pell\b|\bpell (?:breakdown|eligibility groups?|categories)\b|\b(?:compare|contrast|split|display|show|break|reconcile)\b.*\bpell\b.*\b(?:non[- ]pell|eligibility (?:buckets?|groups?)|categories)\b|\bpell\b.*\b(?:versus|vs)\b.*\bnon[- ]pell\b|\bboth pell eligibility buckets\b/],
		["attendance_status", /\b(by|across|per)\s+(attendance|full[- ]time|part[- ]time)\b|\bfull[- ]time (?:and|versus|vs|plus) part[- ]time\b|\b(?:compare|contrast|separate|split|break|check)\b.*\bfull[- ]time\b.*\bpart[- ]time\b/],
		["academic_status", /\b(by|across|per)\s+academic (?:status|standing)(?: category)?\b|\bacademic standing breakdown\b/],
		["severity", /\b(by|across|per)\s+severity\b|\bseverity breakdown\b/],
		["owner", /\b(by|across|per)\s+(?:assigned |accountable )?owner\b|\bwhich owner\b|\bfindings by assigned owner\b|\bgroup\b.*\bowner\b/],
		["source_system", /\b(by|across|per)\s+(source|system)\b|\bwhich source\b|\b(?:group|aggregate)\b.*\bsource system\b/],
		["status", /\b(by|across|per)\s+status\b|\bstatus breakdown\b|\b(?:break|put|compare)\b.*\bpassed\b.*\breview\b.*\bfailed\b/],
		["course", /\b(by|across|per)\s+course\b|\bwhich (gateway )?course\b|\bcourse breakdown\b/],
		["modality", /\b(by|across|per)\s+modality\b|\bonline versus in person\b/],
		["run", /\b(by|across|per)\s+run\b|\breadiness trend\b/]
	]) if (pattern.test(normalized)) return groupBy;
	return "none";
}

export function findCourse(normalized, dataset) {
	return dataset.catalogs.courses.find((course) => normalized.includes(clean(course))) ?? null;
}
export function findModality(normalized, dataset) {
	if (/\bonline\b/.test(normalized)) return "Online";
	if (/\bin[- ]person\b|\bon campus\b/.test(normalized)) return "In person";
	return findCatalogValue(normalized, dataset.catalogs.modalities);
}
export function findQualityOwner(normalized, dataset) {
	return findCatalogValue(normalized, [...new Set(dataset.qualityIssues.map((issue) => issue.owner))]);
}
export function findQualitySource(normalized, dataset) {
	return findCatalogValue(normalized, [...new Set(dataset.qualityIssues.map((issue) => issue.sourceSystem))]);
}
export function resolveProgramScope(normalized, program) {
  let programScope = "all";
  let degreeLevel = null;
  const excludeProgram =
    Boolean(program) &&
    programAliases(program).some((alias) => {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(
        `\\b(?:other than|excluding|exclude|except|without)\\s+(?:the\\s+)?${escaped}\\b`,
      ).test(normalized);
    });
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
  return { programScope, degreeLevel, excludeProgram };
}
