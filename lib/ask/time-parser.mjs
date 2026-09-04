import { normalizeQuestion } from "./normalization.mjs";

export function hasExplicitTimeExpression(normalized) {
	return /\b(?:19|20)\d{2}\b|\blast year\b|\blast fall\b|\blatest(?: fall| census)?\b|\bthis (?:academic )?year\b|\bover time\b|\btrend\b|\bhistory\b|\bevery available\b|\b(?:from|since|before|after|through)\s+(?:(?:fall|spring|summer|winter)\s+)?(?:19|20)\d{2}\b|\bbetween\s+(?:(?:fall|spring|summer|winter)\s+)?(?:19|20)\d{2}\s+(?:and|to|through)\s+(?:(?:fall|spring|summer|winter)\s+)?(?:19|20)\d{2}\b/.test(
		normalized,
	);
}

function hasTrendTimeExpression(normalized) {
	return /\bover time\b|\btrend\b|\bhistory\b|\btrajectory\b|\bevery available\b|\bchanged?\b|\bgrowth\b|\bincrease\w*\b|\bdecrease\w*\b|\bdecline\w*\b|\b(?:from|since)\s+(?:the\s+)?(?:(?:fall|spring|summer|winter)\s+)?(?:19|20)\d{2}\b|\bbetween\s+(?:the\s+)?(?:(?:fall|spring|summer|winter)\s+)?(?:19|20)\d{2}\s+(?:and|to|through)\s+(?:the\s+)?(?:(?:fall|spring|summer|winter)\s+)?(?:19|20)\d{2}\b/.test(
		normalized,
	);
}

export function extractYears(question, dataset) {
	const normalized = normalizeQuestion(question);
	const years = [...normalized.matchAll(/\b((?:19|20)\d{2})\b/g)].map((match) => Number(match[1]));
	const available = dataset.catalogs.years;
	const minimum = Math.min(...available);
	const maximum = Math.max(...available);
	const invalidYear = years.some((year) => !available.includes(year));
	const trendLanguage = hasTrendTimeExpression(normalized);
	if (!years.length) return {
		startYear: minimum,
		endYear: maximum,
		timeMode: trendLanguage ? "trend" : "latest",
		invalidYear: false,
		endpointsOnly: false,
		emptyRange: false
	};
	if (invalidYear) return {
		startYear: years[0],
		endYear: years.at(-1),
		timeMode: years.length > 1 ? "trend" : "single",
		invalidYear: true,
		endpointsOnly: false,
		emptyRange: false
	};
	if (years.length === 1 && /\bbefore\b/.test(normalized)) {
		const endYear = years[0] - 1;
		return {
			startYear: minimum,
			endYear,
			timeMode: "trend",
			invalidYear: false,
			endpointsOnly: false,
			emptyRange: endYear < minimum
		};
	}
	if (years.length === 1 && /\b(?:history|trend|series)\b.*\bthrough\b/.test(normalized)) return {
		startYear: minimum,
		endYear: years[0],
		timeMode: "trend",
		invalidYear: false,
		endpointsOnly: false,
		emptyRange: false
	};
	if (years.length === 1 && /\bafter\b/.test(normalized)) {
		const startYear = years[0] + 1;
		return {
			startYear,
			endYear: maximum,
			timeMode: "trend",
			invalidYear: false,
			endpointsOnly: false,
			emptyRange: startYear > maximum
		};
	}
	if (years.length === 1 && !trendLanguage) return {
		startYear: years[0],
		endYear: years[0],
		timeMode: "single",
		invalidYear: false,
		endpointsOnly: false,
		emptyRange: false
	};
	return {
		startYear: Math.min(...years),
		endYear: years.length === 1 ? maximum : Math.max(...years),
		timeMode: "trend",
		invalidYear: false,
		endpointsOnly: years.length > 1 && (/\b(compare|versus|vs)\b/.test(normalized) || /\bhow (?:much|large)\b.*\b(?:change|move)\b|\bchange between\b|\bhow many students separated\b/.test(normalized)),
		emptyRange: false
	};
}
export function refineTimePlan(normalized, dataset, metric, yearPlan) {
  if (/\bthis academic year\b|\bthis year\b/.test(normalized)) {
    const latestYear = Math.max(...dataset.catalogs.years);
    yearPlan.startYear = latestYear;
    yearPlan.endYear = latestYear;
    yearPlan.timeMode = "single";
  }
  if (
    /\blast year\b|\blast fall\b|\blatest(?: fall| census)?\b/.test(
      normalized,
    )
  ) {
    const latestYear = Math.max(...dataset.catalogs.years);
    const hasNamedYear = /\b(?:19|20)\d{2}\b/.test(normalized);
    const explicitlyLast =
      /\blast year\b|\blast fall\b/.test(normalized);
    const spansToLatest =
      !explicitlyLast &&
      ((hasNamedYear &&
          /\b(?:from|since|through|trend|history|before)\b/.test(normalized)) ||
        /\b(?:first loaded fall|every available|trend|history|trace|follow)\b/.test(
          normalized,
        ));
    if (!spansToLatest) yearPlan.startYear = latestYear;
    yearPlan.endYear = latestYear;
    yearPlan.timeMode = spansToLatest ? "trend" : "single";
  }

  if (
    /\blatest\b/.test(normalized) &&
    !/\b(?:19|20)\d{2}\b/.test(normalized) &&
    !/\b(?:first loaded fall|every available|trend|history|trace|follow)\b/.test(
      normalized,
    )
  ) {
    if (metric === "retention") {
      const latestCompleteCohort = Math.max(
        ...dataset.retention.map((row) => row.cohortYear),
      );
      yearPlan.startYear = latestCompleteCohort;
      yearPlan.endYear = latestCompleteCohort;
      yearPlan.timeMode = "single";
    } else if (metric === "enrollment") {
      const latestYear = Math.max(...dataset.catalogs.years);
      yearPlan.startYear = latestYear;
      yearPlan.endYear = latestYear;
      yearPlan.timeMode = "single";
    }
  }

  if (
    metric === "enrollment" &&
    /\byear[- ]over[- ]year\b/.test(normalized)
  ) {
    const namedYear = Number(
      normalized.match(/\b((?:19|20)\d{2})\b/)?.[1] ??
        yearPlan.endYear,
    );
    yearPlan.startYear = namedYear - 1;
    yearPlan.endYear = namedYear;
    yearPlan.timeMode = "trend";
  }

  const hasExplicitYear =
    /\b(?:19|20)\d{2}\b|\blast year\b|\blast fall\b|\blatest fall\b|\blatest census\b|\bthis (?:academic )?year\b/.test(
      normalized,
    );
  if (
    !hasExplicitYear &&
    ["capacity_utilization", "course_outcomes"].includes(metric)
  ) {
    const latestSectionYear = Math.max(
      ...dataset.sections.map((section) => section.year),
    );
    yearPlan.startYear = latestSectionYear;
    yearPlan.endYear = latestSectionYear;
    yearPlan.timeMode = "single";
  }
  if (metric === "retention" && yearPlan.timeMode === "trend") {
    const latestCompleteCohort = Math.max(
      ...dataset.retention.map((row) => row.cohortYear),
    );
    yearPlan.endYear = Math.min(yearPlan.endYear, latestCompleteCohort);
  }
  return yearPlan;
}
