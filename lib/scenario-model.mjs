function signedRound(value) {
  return normalizeSignedZero(Math.round(value));
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeSignedZero(value) {
  return Object.is(value, -0) || value === 0 ? 0 : value;
}

function unavailableScenario(title, reason, dependency) {
  return {
    status: "unavailable",
    title,
    summary: `Scenario unavailable — ${reason}.`,
    reason,
    missingDependency: dependency,
  };
}

function requiredFiniteNumber(value, label, options = {}) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return `${label} is missing or invalid`;
  }
  if (options.minimum !== undefined && value < options.minimum) {
    return `${label} is outside its valid range`;
  }
  if (options.maximum !== undefined && value > options.maximum) {
    return `${label} is outside its valid range`;
  }
  if (options.positive && value <= 0) {
    return `${label} must be greater than zero`;
  }
  return null;
}

function requiredString(value, label) {
  return typeof value === "string" && value.trim()
    ? null
    : `${label} is missing or invalid`;
}

function requiredStringArray(value, label) {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? null
    : `${label} is missing or invalid`;
}

function firstValidationIssue(checks) {
  return checks.find((check) => check.reason) ?? null;
}

function finiteCalculationOrUnavailable(title, values) {
  const invalid = values.find((entry) => !Number.isFinite(entry.value));
  return invalid
    ? unavailableScenario(
        title,
        `${invalid.label} could not be calculated safely`,
        invalid.dependency,
      )
    : null;
}

function mathematicallySafePercent(value) {
  return Math.max(-100, value);
}

export function deriveEligibleCapacityPrograms(baselines) {
  const programs = Array.isArray(baselines?.programs)
    ? baselines.programs
    : [];
  const pricingSources = baselines?.pricing?.sources;
  const pricingContractValid =
    Array.isArray(pricingSources) &&
    pricingSources.length > 0 &&
    pricingSources.every(
      (source) => typeof source === "string" && source.trim().length > 0,
    ) &&
    typeof baselines?.pricing?.limitation === "string" &&
    baselines.pricing.limitation.trim().length > 0;
  const sectionsPerFacultyFte =
    baselines?.enrollment?.sectionsPerFacultyFte;

  if (
    !pricingContractValid ||
    typeof sectionsPerFacultyFte !== "number" ||
    !Number.isFinite(sectionsPerFacultyFte) ||
    sectionsPerFacultyFte <= 0
  ) {
    return [];
  }

  return programs.filter(
    (program) =>
      program &&
      typeof program.programId === "string" &&
      program.programId.trim().length > 0 &&
      typeof program.name === "string" &&
      program.name.trim().length > 0 &&
      typeof program.currentHeadcount === "number" &&
      Number.isFinite(program.currentHeadcount) &&
      program.currentHeadcount >= 0 &&
      typeof program.sectionCount === "number" &&
      Number.isFinite(program.sectionCount) &&
      program.sectionCount > 0 &&
      typeof program.filledCourseSeats === "number" &&
      Number.isFinite(program.filledCourseSeats) &&
      program.filledCourseSeats > 0 &&
      typeof program.courseSeatCapacity === "number" &&
      Number.isFinite(program.courseSeatCapacity) &&
      program.courseSeatCapacity > 0 &&
      typeof program.averageSectionCapacity === "number" &&
      Number.isFinite(program.averageSectionCapacity) &&
      program.averageSectionCapacity > 0 &&
      typeof program.tuitionAndFees === "number" &&
      Number.isFinite(program.tuitionAndFees) &&
      program.tuitionAndFees >= 0,
  );
}

export const SCENARIO_CONTROL_METADATA = Object.freeze({
  enrollment: Object.freeze({
    undergraduate: Object.freeze({
      minimum: -25,
      maximum: 25,
      step: 1,
      defaultValue: 0,
      defaultClassification: "Neutral baseline",
      rangeClassification: "Scenario Lab planning range — not institutional policy",
    }),
    graduate: Object.freeze({
      minimum: -25,
      maximum: 30,
      step: 1,
      defaultValue: 15,
      defaultClassification: "Demonstration starting point",
      rangeClassification: "Scenario Lab planning range — not institutional policy",
    }),
  }),
  retention: Object.freeze({
    pointGain: Object.freeze({
      minimum: 0,
      maximum: 8,
      step: 0.5,
      defaultValue: 3,
      defaultClassification: "Demonstration starting point",
      rangeClassification: "Scenario Lab planning range — not an institutional target",
    }),
  }),
  pricing: Object.freeze({
    undergraduate: Object.freeze({
      minimum: -10,
      maximum: 10,
      step: 1,
      defaultValue: 0,
      defaultClassification: "Neutral baseline",
      rangeClassification: "Scenario Lab planning range — not pricing policy",
    }),
    graduate: Object.freeze({
      minimum: -10,
      maximum: 10,
      step: 1,
      defaultValue: 0,
      defaultClassification: "Neutral baseline",
      rangeClassification: "Scenario Lab planning range — not pricing policy",
    }),
    grant: Object.freeze({
      minimum: 0,
      maximum: 50_000,
      step: 250,
      defaultValue: 0,
      defaultClassification: "Neutral baseline",
      rangeClassification: "Scenario Lab planning range — not financial-aid policy",
    }),
  }),
  capacity: Object.freeze({
    program: Object.freeze({
      defaultValue: "PCS",
      defaultClassification: "Demonstration starting program",
    }),
    growth: Object.freeze({
      minimum: -20,
      maximum: 40,
      step: 1,
      defaultValue: 20,
      defaultClassification: "Demonstration starting point",
      rangeClassification: "Scenario Lab planning range — not an enrollment target",
    }),
  }),
  faculty: Object.freeze({
    positions: Object.freeze({
      minimum: 0,
      step: 1,
      defaultValue: 5,
      defaultClassification: "Demonstration starting point",
      rangeClassification: "Baseline-relative Scenario Lab planning guardrail",
    }),
  }),
});

export const FACULTY_STAFFING_PLANNING_SHARE = 0.1;

export function deriveFacultyStaffingPlanningRange(fullTimeInstructionalCount) {
  if (
    typeof fullTimeInstructionalCount !== "number" ||
    !Number.isFinite(fullTimeInstructionalCount) ||
    fullTimeInstructionalCount < 0
  ) {
    return null;
  }
  const baseline = Math.round(fullTimeInstructionalCount);
  const minimum = 0;
  const maximum = Math.round(
    baseline * FACULTY_STAFFING_PLANNING_SHARE,
  );

  return {
    minimum,
    maximum,
    midpoint: Math.floor((minimum + maximum) / 2),
    step: 1,
  };
}

function metricValue(result, label) {
  return result?.metrics?.find((metric) => metric.label === label)?.value ?? 0;
}

function effectFromDirections(primaryValues) {
  const finiteValues = primaryValues.filter(
    (value) => typeof value === "number" && Number.isFinite(value),
  );
  const hasPositive = finiteValues.some((value) => value > 0);
  const hasNegative = finiteValues.some((value) => value < 0);

  if (hasPositive && hasNegative) {
    return { tone: "mixed", label: "Mixed modeled effects" };
  }
  if (hasNegative) {
    return { tone: "negative", label: "Modeled decrease" };
  }
  if (hasPositive) {
    return { tone: "positive", label: "Modeled increase" };
  }
  return { tone: "neutral", label: "No modeled change" };
}

export function deriveScenarioEffect(mode, result) {
  const comparison = result?.comparison ?? result;

  if (mode === "enrollment") {
    return effectFromDirections([
      metricValue(result, "Undergraduate headcount change"),
      metricValue(result, "Graduate headcount change"),
    ]);
  }
  if (mode === "retention") {
    return effectFromDirections([comparison?.headcountImpact]);
  }
  if (mode === "pricing") {
    const undergraduatePriceEffect = metricValue(
      result,
      "UG aggregate gross tuition change",
    );
    const graduatePriceEffect = metricValue(
      result,
      "GR aggregate gross tuition change",
    );
    const additionalGrantAid = metricValue(
      result,
      "Modeled additional grant aid",
    );

    // Tuition direction and additional grant aid are distinct policy levers.
    // A grant increase must not be described as a modeled decrease merely
    // because it lowers gross tuition less modeled aid.
    if (additionalGrantAid > 0) {
      return { tone: "mixed", label: "Mixed modeled effects" };
    }
    return effectFromDirections([
      undergraduatePriceEffect,
      graduatePriceEffect,
    ]);
  }
  if (mode === "capacity") {
    return effectFromDirections([comparison?.headcountImpact]);
  }
  if (mode === "faculty") {
    return effectFromDirections([comparison?.facultyFteImpact]);
  }
  return effectFromDirections([]);
}

export function deriveScenarioBarPresentation(items) {
  if (!Array.isArray(items)) return [];
  const groups = new Map();
  const comparisonGroupKey = (item) =>
    item?.scaleGroup && item?.unit
      ? `${item.scaleGroup}::${item.unit}::${item.semanticType ?? "value"}`
      : null;

  for (const item of items) {
    const groupKey = comparisonGroupKey(item);
    if (
      groupKey &&
      typeof item.value === "number" &&
      Number.isFinite(item.value)
    ) {
      const values = groups.get(groupKey) ?? [];
      values.push(Math.abs(item.value));
      groups.set(groupKey, values);
    }
  }

  return items.map((item) => {
    const value =
      typeof item?.value === "number" && Number.isFinite(item.value)
        ? normalizeSignedZero(item.value)
        : 0;
    const groupKey = comparisonGroupKey(item);
    const comparableValues = groupKey
      ? groups.get(groupKey) ?? []
      : [];
    const sharedMaximum = comparableValues.length > 1
      ? Math.max(0, ...comparableValues)
      : 0;
    const quantitative = sharedMaximum > 0;

    return {
      ...item,
      value,
      direction: value > 0 ? "positive" : value < 0 ? "negative" : "zero",
      scaleMode: quantitative ? "quantitative" : "qualitative",
      widthPercent:
        value === 0
          ? 0
          : quantitative
            ? (Math.abs(value) / sharedMaximum) * 100
            : null,
      sharedMaximum: quantitative ? sharedMaximum : null,
    };
  });
}

export function calculateEnrollmentMix(baselines, assumptions) {
  const issue = firstValidationIssue([
    {
      dependency: "enrollment.undergraduateHeadcount",
      reason: requiredFiniteNumber(
        baselines?.enrollment?.undergraduateHeadcount,
        "undergraduate enrollment baseline",
        { minimum: 0 },
      ),
    },
    {
      dependency: "enrollment.graduateHeadcount",
      reason: requiredFiniteNumber(
        baselines?.enrollment?.graduateHeadcount,
        "graduate enrollment baseline",
        { minimum: 0 },
      ),
    },
    {
      dependency: "enrollment.studentsPerSection",
      reason: requiredFiniteNumber(
        baselines?.enrollment?.studentsPerSection,
        "students-per-section planning assumption",
        { positive: true },
      ),
    },
    {
      dependency: "enrollment.sectionsPerFacultyFte",
      reason: requiredFiniteNumber(
        baselines?.enrollment?.sectionsPerFacultyFte,
        "sections-per-FTE planning assumption",
        { positive: true },
      ),
    },
    {
      dependency: "pricing.undergraduateTuitionAndFees",
      reason: requiredFiniteNumber(
        baselines?.pricing?.undergraduateTuitionAndFees,
        "undergraduate tuition baseline",
        { minimum: 0 },
      ),
    },
    {
      dependency: "pricing.graduateTuitionAndFees",
      reason: requiredFiniteNumber(
        baselines?.pricing?.graduateTuitionAndFees,
        "graduate tuition baseline",
        { minimum: 0 },
      ),
    },
    {
      dependency: "assumptions.undergraduateChangePercent",
      reason: requiredFiniteNumber(
        assumptions?.undergraduateChangePercent,
        "undergraduate enrollment change",
      ),
    },
    {
      dependency: "assumptions.graduateChangePercent",
      reason: requiredFiniteNumber(
        assumptions?.graduateChangePercent,
        "graduate enrollment change",
      ),
    },
    { dependency: "enrollment.sources", reason: requiredStringArray(baselines?.enrollment?.sources, "enrollment source provenance") },
    { dependency: "pricing.sources", reason: requiredStringArray(baselines?.pricing?.sources, "pricing source provenance") },
    { dependency: "pricing.limitation", reason: requiredString(baselines?.pricing?.limitation, "pricing source limitation") },
  ]);
  if (issue) {
    return unavailableScenario("Enrollment change", issue.reason, issue.dependency);
  }
  const undergraduateChangePercent = mathematicallySafePercent(
    assumptions.undergraduateChangePercent,
  );
  const graduateChangePercent = mathematicallySafePercent(
    assumptions.graduateChangePercent,
  );
  const undergraduateChange = signedRound(
    baselines.enrollment.undergraduateHeadcount *
      (undergraduateChangePercent / 100),
  );
  const graduateChange = signedRound(
    baselines.enrollment.graduateHeadcount *
      (graduateChangePercent / 100),
  );
  const headcountImpact = undergraduateChange + graduateChange;
  const annualRevenueImpact =
    undergraduateChange * baselines.pricing.undergraduateTuitionAndFees +
    graduateChange * baselines.pricing.graduateTuitionAndFees;
  const sectionEquivalents =
    headcountImpact / baselines.enrollment.studentsPerSection;
  const facultyFteUnrounded =
    sectionEquivalents / baselines.enrollment.sectionsPerFacultyFte;
  const facultyFteImpact =
    normalizeSignedZero(Math.round(facultyFteUnrounded * 10) / 10);
  const unsafe = finiteCalculationOrUnavailable("Enrollment change", [
    { value: undergraduateChange, label: "undergraduate headcount change", dependency: "calculation.undergraduateChange" },
    { value: graduateChange, label: "graduate headcount change", dependency: "calculation.graduateChange" },
    { value: annualRevenueImpact, label: "gross tuition change", dependency: "calculation.annualRevenueImpact" },
    { value: sectionEquivalents, label: "section equivalents", dependency: "calculation.sectionEquivalents" },
    { value: facultyFteImpact, label: "faculty FTE requirement", dependency: "calculation.facultyFteImpact" },
  ]);
  if (unsafe) return unsafe;

  return {
    title: "Enrollment change",
    summary: `${undergraduateChange > 0 ? "+" : ""}${undergraduateChange.toLocaleString()} UG and ${graduateChange > 0 ? "+" : ""}${graduateChange.toLocaleString()} GR students`,
    metrics: [
      {
        label: "Undergraduate headcount change",
        value: undergraduateChange,
        display: `${undergraduateChange > 0 ? "+" : ""}${undergraduateChange.toLocaleString()}`,
      },
      {
        label: "Graduate headcount change",
        value: graduateChange,
        display: `${graduateChange > 0 ? "+" : ""}${graduateChange.toLocaleString()}`,
      },
      {
        label: "Total headcount change",
        value: headcountImpact,
        display: `${headcountImpact > 0 ? "+" : ""}${headcountImpact.toLocaleString()}`,
      },
      {
        label: headcountImpact >= 0 ? "Additional seat demand" : "Seat-demand reduction",
        value: headcountImpact,
        display: `${headcountImpact > 0 ? "+" : ""}${headcountImpact.toLocaleString()} seats`,
      },
      {
        label:
          sectionEquivalents >= 0
            ? "Additional section equivalents"
            : "Section-equivalent reduction",
        value: sectionEquivalents,
        display: `${sectionEquivalents > 0 ? "+" : ""}${normalizeSignedZero(sectionEquivalents).toFixed(2)} section equivalents`,
      },
      {
        label: "Faculty FTE requirement change",
        value: facultyFteImpact,
        display: `${facultyFteImpact > 0 ? "+" : ""}${facultyFteImpact.toFixed(1)} FTE`,
      },
      {
        label: "Annual gross tuition change",
        value: annualRevenueImpact,
        display: formatCurrency(annualRevenueImpact),
      },
    ],
    comparison: {
      headcountImpact,
      annualRevenueImpact,
      financialHorizonYears: 1,
      capacitySeatImpact: headcountImpact,
      capacityImpactKind: "student-seat-demand",
      capacityImpactUnit: "student seats",
      facultyFteImpact,
      facultyImpactKind: "faculty-demand",
    },
    assumptions: [
      `Capacity assumption: ${baselines.enrollment.studentsPerSection} students per section`,
      `Faculty staffing assumption: ${baselines.enrollment.sectionsPerFacultyFte} sections per faculty FTE`,
      "Annual gross tuition change uses published in-state tuition and required fees; grants, discounts, and aid are excluded",
      baselines.pricing.limitation,
    ],
    sources: [
      ...baselines.enrollment.sources,
      ...baselines.pricing.sources,
    ],
  };
}

export function calculateRetentionImprovement(baselines, assumptions) {
  const issue = firstValidationIssue([
    { dependency: "retention.cohortSize", reason: requiredFiniteNumber(baselines?.retention?.cohortSize, "retention cohort denominator", { positive: true }) },
    { dependency: "retention.retained", reason: requiredFiniteNumber(baselines?.retention?.retained, "retention numerator", { minimum: 0 }) },
    { dependency: "retention.rate", reason: requiredFiniteNumber(baselines?.retention?.rate, "retention rate", { minimum: 0, maximum: 1 }) },
    { dependency: "retention.horizonYears", reason: requiredFiniteNumber(baselines?.retention?.horizonYears, "retention horizon", { positive: true }) },
    { dependency: "pricing.undergraduateTuitionAndFees", reason: requiredFiniteNumber(baselines?.pricing?.undergraduateTuitionAndFees, "undergraduate tuition baseline", { minimum: 0 }) },
    { dependency: "enrollment.studentsPerSection", reason: requiredFiniteNumber(baselines?.enrollment?.studentsPerSection, "students-per-section planning assumption", { positive: true }) },
    { dependency: "enrollment.sectionsPerFacultyFte", reason: requiredFiniteNumber(baselines?.enrollment?.sectionsPerFacultyFte, "sections-per-FTE planning assumption", { positive: true }) },
    { dependency: "assumptions.pointGain", reason: requiredFiniteNumber(assumptions?.pointGain, "retention point improvement") },
    { dependency: "retention.sources", reason: requiredStringArray(baselines?.retention?.sources, "retention source provenance") },
    { dependency: "pricing.sources", reason: requiredStringArray(baselines?.pricing?.sources, "pricing source provenance") },
    { dependency: "pricing.limitation", reason: requiredString(baselines?.pricing?.limitation, "pricing source limitation") },
  ]);
  if (issue) return unavailableScenario("Retention improvement", issue.reason, issue.dependency);
  if (baselines.retention.retained > baselines.retention.cohortSize) {
    return unavailableScenario("Retention improvement", "retention numerator exceeds its cohort denominator", "retention.retained");
  }
  if (
    Math.abs(
      baselines.retention.rate -
        baselines.retention.retained / baselines.retention.cohortSize,
    ) > 1e-9
  ) {
    return unavailableScenario(
      "Retention improvement",
      "retention numerator, denominator, and rate do not reconcile",
      "retention.rate",
    );
  }
  const maximumPointGain = Math.max(0, (1 - baselines.retention.rate) * 100);
  const pointGain = clamp(assumptions.pointGain, 0, maximumPointGain);
  const projectedRate = clamp(baselines.retention.rate + pointGain / 100, 0, 1);
  const additionalPerCohort = signedRound(
    baselines.retention.cohortSize * (pointGain / 100),
  );
  const modeledRetained = Math.min(
    baselines.retention.cohortSize,
    baselines.retention.retained + additionalPerCohort,
  );
  const yearlyAdditional = Array.from(
    { length: baselines.retention.horizonYears },
    (_, index) => additionalPerCohort * (index + 1),
  );
  const cumulativeStudentYears = yearlyAdditional.reduce(
    (total, value) => total + value,
    0,
  );
  const finalYearHeadcountImpact = yearlyAdditional.at(-1) ?? 0;
  const finalYearRevenueImpact =
    finalYearHeadcountImpact *
    baselines.pricing.undergraduateTuitionAndFees;
  const yearOneRevenueImpact =
    additionalPerCohort * baselines.pricing.undergraduateTuitionAndFees;

  return {
    title: "Retention improvement",
    summary: `${(baselines.retention.rate * 100).toFixed(1)}% → ${(projectedRate * 100).toFixed(1)}% if the ${pointGain.toFixed(1)}-point gain holds`,
    metrics: [
      {
        label: "Additional retained / cohort",
        value: additionalPerCohort,
        display: `${additionalPerCohort > 0 ? "+" : ""}${additionalPerCohort.toLocaleString()}`,
      },
      {
        label: `Year ${baselines.retention.horizonYears} added headcount`,
        value: finalYearHeadcountImpact,
        display: `${finalYearHeadcountImpact > 0 ? "+" : ""}${finalYearHeadcountImpact.toLocaleString()}`,
      },
      {
        label: `Cumulative added student-years (Years 1–${baselines.retention.horizonYears})`,
        value: cumulativeStudentYears,
        display: `${cumulativeStudentYears > 0 ? "+" : ""}${cumulativeStudentYears.toLocaleString()}`,
      },
      {
        label: `Year ${baselines.retention.horizonYears} gross tuition change`,
        value: finalYearRevenueImpact,
        display: formatCurrency(finalYearRevenueImpact),
      },
    ],
    series: yearlyAdditional,
    comparison: {
      headcountImpact: additionalPerCohort,
      annualRevenueImpact: yearOneRevenueImpact,
      financialHorizonYears: 1,
      capacitySeatImpact: additionalPerCohort,
      capacityImpactKind: "student-seat-demand",
      capacityImpactUnit: "student seats",
      facultyFteImpact:
        Math.round(
          (additionalPerCohort /
            baselines.enrollment.studentsPerSection /
            baselines.enrollment.sectionsPerFacultyFte) *
            10,
        ) / 10,
      facultyImpactKind: "faculty-demand",
    },
    supportingComparisons: [
      {
        label: "Retained students per cohort",
        display: `${baselines.retention.retained.toLocaleString()} current → ${modeledRetained.toLocaleString()} modeled`,
      },
    ],
    assumptions: [
      `A new ${baselines.retention.cohortSize.toLocaleString()}-student cohort receives the same improvement each year, and each incremental retained student is carried forward through the modeled ${baselines.retention.horizonYears}-year horizon`,
      "Completion, later-year attrition, transfer-out, external persistence, and behavioral response are not modeled",
      baselines.pricing.limitation,
    ],
    sources: [
      ...baselines.retention.sources.map(
        (source) => `${source} — governed synthetic source`,
      ),
      ...baselines.pricing.sources,
    ],
  };
}

export function calculatePricingAndAid(baselines, assumptions) {
  const issue = firstValidationIssue([
    { dependency: "enrollment.undergraduateHeadcount", reason: requiredFiniteNumber(baselines?.enrollment?.undergraduateHeadcount, "undergraduate enrollment baseline", { minimum: 0 }) },
    { dependency: "enrollment.graduateHeadcount", reason: requiredFiniteNumber(baselines?.enrollment?.graduateHeadcount, "graduate enrollment baseline", { minimum: 0 }) },
    { dependency: "pricing.undergraduateTuitionAndFees", reason: requiredFiniteNumber(baselines?.pricing?.undergraduateTuitionAndFees, "undergraduate tuition baseline", { minimum: 0 }) },
    { dependency: "pricing.graduateTuitionAndFees", reason: requiredFiniteNumber(baselines?.pricing?.graduateTuitionAndFees, "graduate tuition baseline", { minimum: 0 }) },
    { dependency: "aid.pellEligibleStudents", reason: requiredFiniteNumber(baselines?.aid?.pellEligibleStudents, "Pell-eligible population", { minimum: 0 }) },
    { dependency: "assumptions.undergraduatePriceChangePercent", reason: requiredFiniteNumber(assumptions?.undergraduatePriceChangePercent, "undergraduate tuition change") },
    { dependency: "assumptions.graduatePriceChangePercent", reason: requiredFiniteNumber(assumptions?.graduatePriceChangePercent, "graduate tuition change") },
    { dependency: "assumptions.additionalGrantPerPellEligible", reason: requiredFiniteNumber(assumptions?.additionalGrantPerPellEligible, "additional grant amount") },
    { dependency: "pricing.sources", reason: requiredStringArray(baselines?.pricing?.sources, "pricing source provenance") },
    { dependency: "pricing.limitation", reason: requiredString(baselines?.pricing?.limitation, "pricing source limitation") },
    { dependency: "aid.sources", reason: requiredStringArray(baselines?.aid?.sources, "financial-aid source provenance") },
    { dependency: "aid.limitation", reason: requiredString(baselines?.aid?.limitation, "financial-aid source limitation") },
  ]);
  if (issue) return unavailableScenario("Tuition and aid", issue.reason, issue.dependency);
  const additionalGrantPerPellEligible = clamp(
    assumptions.additionalGrantPerPellEligible,
    0,
    50_000,
  );
  const undergraduatePriceChangePercent = mathematicallySafePercent(
    assumptions.undergraduatePriceChangePercent,
  );
  const graduatePriceChangePercent = mathematicallySafePercent(
    assumptions.graduatePriceChangePercent,
  );
  const undergraduatePriceImpact =
    baselines.enrollment.undergraduateHeadcount *
    baselines.pricing.undergraduateTuitionAndFees *
    (undergraduatePriceChangePercent / 100);
  const graduatePriceImpact =
    baselines.enrollment.graduateHeadcount *
    baselines.pricing.graduateTuitionAndFees *
    (graduatePriceChangePercent / 100);
  const additionalAid =
    baselines.aid.pellEligibleStudents *
    additionalGrantPerPellEligible;
  const grossTuitionChange =
    undergraduatePriceImpact + graduatePriceImpact;
  const annualRevenueImpact = grossTuitionChange - additionalAid;
  const baselineGrossTuition =
    baselines.enrollment.undergraduateHeadcount *
      baselines.pricing.undergraduateTuitionAndFees +
    baselines.enrollment.graduateHeadcount *
      baselines.pricing.graduateTuitionAndFees;
  const additionalGrantShareOfBaselineGrossTuitionPercent = baselineGrossTuition
    ? (additionalAid / baselineGrossTuition) * 100
    : 0;
  const unsafe = finiteCalculationOrUnavailable("Tuition and aid", [
    { value: undergraduatePriceImpact, label: "undergraduate gross tuition change", dependency: "calculation.undergraduatePriceImpact" },
    { value: graduatePriceImpact, label: "graduate gross tuition change", dependency: "calculation.graduatePriceImpact" },
    { value: additionalAid, label: "additional grant aid", dependency: "calculation.additionalAid" },
    { value: annualRevenueImpact, label: "gross tuition change less modeled aid", dependency: "calculation.annualRevenueImpact" },
    { value: additionalGrantShareOfBaselineGrossTuitionPercent, label: "grant-aid share", dependency: "calculation.grantShare" },
  ]);
  if (unsafe) return unsafe;

  return {
    title: "Tuition and aid",
    summary: `${formatCurrency(grossTuitionChange)} aggregate gross tuition change; ${formatCurrency(additionalAid)} modeled additional grant aid`,
    metrics: [
      {
        label: "UG aggregate gross tuition change",
        value: undergraduatePriceImpact,
        display: formatCurrency(undergraduatePriceImpact),
      },
      {
        label: "GR aggregate gross tuition change",
        value: graduatePriceImpact,
        display: formatCurrency(graduatePriceImpact),
      },
      {
        label: "Modeled additional grant aid",
        value: additionalAid,
        display: formatCurrency(additionalAid),
      },
      {
        label: "Gross tuition change less modeled additional grant aid",
        value: annualRevenueImpact,
        display: formatCurrency(annualRevenueImpact),
      },
    ],
    comparison: {
      headcountImpact: 0,
      annualRevenueImpact,
      financialHorizonYears: 1,
      capacitySeatImpact: 0,
      capacityImpactKind: "none",
      capacityImpactUnit: null,
      facultyFteImpact: 0,
      facultyImpactKind: "none",
    },
    details: {
      additionalGrantShareOfBaselineGrossTuitionPercent,
      coveredStudents: baselines.aid.pellEligibleStudents,
      modeledGrantOffsetPerPellEligibleStudent: normalizeSignedZero(
        -Math.max(0, additionalGrantPerPellEligible),
      ),
    },
    assumptions: [
      "Enrollment is held constant; price elasticity and yield response are not modeled",
      "Additional grant is applied equally to every Pell-eligible student in the current governed population",
      "Gross tuition changes exclude existing discounts, other aid, operating costs, and other expenses",
      baselines.aid.limitation,
      baselines.pricing.limitation,
    ],
    sources: [
      ...baselines.pricing.sources,
      ...baselines.aid.sources.map(
        (source) => `${source} — governed synthetic source`,
      ),
    ],
  };
}

export function calculateProgramCapacity(baselines, assumptions) {
  if (!Array.isArray(baselines?.programs) || baselines.programs.length === 0) {
    return unavailableScenario("Program capacity", "program capacity evidence is unavailable", "programs");
  }
  if (typeof assumptions?.programId !== "string" || !assumptions.programId) {
    return unavailableScenario("Program capacity", "a valid academic program must be selected", "assumptions.programId");
  }
  const program = baselines.programs.find(
    (candidate) => candidate?.programId === assumptions.programId,
  );
  if (!program) {
    return unavailableScenario("Program capacity", `program ${assumptions.programId} is not available in the governed capacity evidence`, "assumptions.programId");
  }
  const issue = firstValidationIssue([
    { dependency: "program.programId", reason: requiredString(program.programId, "program identifier") },
    { dependency: "program.name", reason: requiredString(program.name, "program name") },
    { dependency: "program.currentHeadcount", reason: requiredFiniteNumber(program.currentHeadcount, "program headcount", { minimum: 0 }) },
    { dependency: "program.filledCourseSeats", reason: requiredFiniteNumber(program.filledCourseSeats, "program course-seat demand", { minimum: 0 }) },
    { dependency: "program.courseSeatCapacity", reason: requiredFiniteNumber(program.courseSeatCapacity, "program course-seat capacity", { minimum: 0 }) },
    { dependency: "program.averageSectionCapacity", reason: requiredFiniteNumber(program.averageSectionCapacity, "average section capacity", { positive: true }) },
    { dependency: "program.tuitionAndFees", reason: requiredFiniteNumber(program.tuitionAndFees, "program tuition baseline", { minimum: 0 }) },
    { dependency: "enrollment.sectionsPerFacultyFte", reason: requiredFiniteNumber(baselines?.enrollment?.sectionsPerFacultyFte, "sections-per-FTE planning assumption", { positive: true }) },
    { dependency: "assumptions.growthPercent", reason: requiredFiniteNumber(assumptions?.growthPercent, "program enrollment change") },
    { dependency: "pricing.sources", reason: requiredStringArray(baselines?.pricing?.sources, "pricing source provenance") },
    { dependency: "pricing.limitation", reason: requiredString(baselines?.pricing?.limitation, "pricing source limitation") },
  ]);
  if (issue) return unavailableScenario(`${program.name ?? "Program"} capacity`, issue.reason, issue.dependency);
  if (program.courseSeatCapacity === 0) {
    return unavailableScenario(`${program.name} capacity`, "modeled course-seat utilization cannot be calculated because capacity is zero", "program.courseSeatCapacity");
  }
  const safeGrowthPercent = mathematicallySafePercent(assumptions.growthPercent);
  const growthRate = safeGrowthPercent / 100;
  const headcountImpact = signedRound(program.currentHeadcount * growthRate);
  const projectedHeadcount = program.currentHeadcount + headcountImpact;
  const projectedFilledCourseSeats = signedRound(
    program.filledCourseSeats * (1 + growthRate),
  );
  const projectedUtilization = program.courseSeatCapacity
    ? projectedFilledCourseSeats / program.courseSeatCapacity
    : 0;
  const remainingCourseSeats =
    program.courseSeatCapacity - projectedFilledCourseSeats;
  const sectionsNeeded =
    remainingCourseSeats < 0 && program.averageSectionCapacity
      ? Math.ceil(
          Math.abs(remainingCourseSeats) / program.averageSectionCapacity,
        )
      : 0;
  const annualRevenueImpact = headcountImpact * program.tuitionAndFees;
  const addedCourseSeatDemand =
    projectedFilledCourseSeats - program.filledCourseSeats;
  const currentUtilization = program.courseSeatCapacity
    ? program.filledCourseSeats / program.courseSeatCapacity
    : 0;
  const currentRemainingCourseSeats =
    program.courseSeatCapacity - program.filledCourseSeats;
  const uniformProgramCapacitySource = baselines.programs.every(
    (candidate) =>
      candidate &&
      candidate.sectionCount === baselines.programs[0]?.sectionCount &&
      candidate.averageSectionCapacity ===
        baselines.programs[0]?.averageSectionCapacity,
  );
  const unsafe = finiteCalculationOrUnavailable(`${program.name} capacity`, [
    { value: headcountImpact, label: "program headcount change", dependency: "calculation.headcountImpact" },
    { value: projectedHeadcount, label: "modeled program headcount", dependency: "calculation.projectedHeadcount" },
    { value: projectedFilledCourseSeats, label: "modeled course-seat demand", dependency: "calculation.projectedFilledCourseSeats" },
    { value: projectedUtilization, label: "course-seat utilization", dependency: "calculation.projectedUtilization" },
    { value: remainingCourseSeats, label: "remaining course seats", dependency: "calculation.remainingCourseSeats" },
  ]);
  if (unsafe) return unsafe;

  return {
    title: `${program.name} capacity`,
    summary: `${projectedHeadcount.toLocaleString()} modeled students; ${(projectedUtilization * 100).toFixed(1)}% course-seat utilization`,
    metrics: [
      {
        label: "Modeled student headcount",
        value: projectedHeadcount,
        display: projectedHeadcount.toLocaleString(),
      },
      {
        label: "Course-seat utilization",
        value: projectedUtilization,
        display: `${(projectedUtilization * 100).toFixed(1)}%`,
      },
      {
        label: remainingCourseSeats >= 0 ? "Course seats remaining" : "Course-seat shortfall",
        value: remainingCourseSeats,
        display: `${Math.abs(remainingCourseSeats).toLocaleString()} seats`,
      },
      {
        label: "Additional sections",
        value: sectionsNeeded,
        display: sectionsNeeded ? `+${sectionsNeeded}` : "0",
      },
    ],
    comparison: {
      headcountImpact,
      annualRevenueImpact,
      financialHorizonYears: 1,
      capacitySeatImpact: addedCourseSeatDemand,
      capacityImpactKind: "course-seat-demand",
      capacityImpactUnit: "course seats",
      facultyFteImpact:
        Math.round(
          (sectionsNeeded / baselines.enrollment.sectionsPerFacultyFte) * 10,
        ) / 10,
      facultyImpactKind: "faculty-demand",
    },
    supportingComparisons: [
      {
        label: "Course-seat utilization",
        display: `${(currentUtilization * 100).toFixed(1)}% current → ${(projectedUtilization * 100).toFixed(1)}% modeled`,
      },
      {
        label: "Capacity position",
        display:
          remainingCourseSeats < 0
            ? `${currentRemainingCourseSeats.toLocaleString()} seats currently remaining → ${Math.abs(remainingCourseSeats).toLocaleString()}-seat modeled shortfall`
            : `${currentRemainingCourseSeats.toLocaleString()} seats currently remaining → ${remainingCourseSeats.toLocaleString()} modeled remaining`,
      },
    ],
    program,
    assumptions: [
      "Current course-seat demand scales proportionally with program headcount",
      `New sections use the current ${program.averageSectionCapacity.toFixed(0)}-seat average`,
      "Course-seat capacity counts seats across sections, not unique students; one student may occupy multiple course seats",
      `Planning assumption: ${baselines.enrollment.sectionsPerFacultyFte} sections per faculty FTE`,
      ...(uniformProgramCapacitySource
        ? [
            `The current capacity source reports ${program.sectionCount} sections at ${program.averageSectionCapacity.toFixed(0)} seats for every modeled program; verify those source capacities before an operational decision`,
          ]
        : []),
      "Course mix, modality shifts, and student course-taking changes are not modeled",
      "Gross tuition change excludes grants, discounts, aid, operating costs, and behavioral response",
      baselines.pricing.limitation,
    ],
    sources: [
      "student_terms.csv — governed synthetic source",
      "sections.csv — governed synthetic source",
      "section_enrollments.csv — governed synthetic source",
      "programs.csv — governed synthetic source",
      ...baselines.pricing.sources,
    ],
  };
}

export function calculateFacultyAttrition(baselines, assumptions) {
  const issue = firstValidationIssue([
    { dependency: "faculty.fullTimeInstructionalCount", reason: requiredFiniteNumber(baselines?.faculty?.fullTimeInstructionalCount, "full-time instructional staffing baseline", { minimum: 0 }) },
    { dependency: "faculty.sectionsPerFacultyFteAssumption", reason: requiredFiniteNumber(baselines?.faculty?.sectionsPerFacultyFteAssumption, "sections-per-FTE planning assumption", { positive: true }) },
    { dependency: "faculty.seatsPerSectionAssumption", reason: requiredFiniteNumber(baselines?.faculty?.seatsPerSectionAssumption, "seats-per-section planning assumption", { positive: true }) },
    { dependency: "assumptions.positionsNotReplaced", reason: requiredFiniteNumber(assumptions?.positionsNotReplaced, "positions not replaced") },
    { dependency: "faculty.sources", reason: requiredStringArray(baselines?.faculty?.sources, "faculty source provenance") },
    { dependency: "faculty.limitation", reason: requiredString(baselines?.faculty?.limitation, "faculty source limitation") },
    { dependency: "faculty.sourceLimitation", reason: requiredString(baselines?.faculty?.sourceLimitation, "faculty modeled-source limitation") },
  ]);
  if (issue) return unavailableScenario("Faculty staffing", issue.reason, issue.dependency);
  const positionsNotReplaced = clamp(
    Math.round(assumptions.positionsNotReplaced),
    0,
    baselines.faculty.fullTimeInstructionalCount,
  );
  const remainingFaculty =
    baselines.faculty.fullTimeInstructionalCount - positionsNotReplaced;
  const sectionsLost =
    positionsNotReplaced * baselines.faculty.sectionsPerFacultyFteAssumption;
  const capacitySeatImpact =
    normalizeSignedZero(
      -sectionsLost * baselines.faculty.seatsPerSectionAssumption,
    );

  return {
    title: "Faculty staffing",
    summary: `${positionsNotReplaced} positions not replaced; ${remainingFaculty} full-time instructional staff remain`,
    metrics: [
      {
        label: "Positions not replaced",
        value: positionsNotReplaced,
        display: positionsNotReplaced.toLocaleString(),
      },
      {
        label: "Instructional staff remaining",
        value: remainingFaculty,
        display: remainingFaculty.toLocaleString(),
      },
      {
        label: "Modeled sections lost",
        value: sectionsLost,
        display: sectionsLost.toLocaleString(),
      },
      {
        label: "Course-seat capacity change",
        value: capacitySeatImpact,
        display: `${capacitySeatImpact.toLocaleString()} seats`,
      },
    ],
    comparison: {
      headcountImpact: 0,
      annualRevenueImpact: 0,
      financialHorizonYears: 1,
      capacitySeatImpact,
      capacityImpactKind: "course-seat-supply",
      capacityImpactUnit: "course seats",
      facultyFteImpact: normalizeSignedZero(-positionsNotReplaced),
      facultyImpactKind: "faculty-supply",
    },
    assumptions: [
      `${baselines.faculty.sectionsPerFacultyFteAssumption} sections per faculty FTE`,
      `${baselines.faculty.seatsPerSectionAssumption} students per section`,
      baselines.faculty.limitation,
      baselines.faculty.sourceLimitation,
    ],
    sources: baselines.faculty.sources,
  };
}

export function formatCurrency(value) {
  const absolute = Math.abs(value);
  const formatted =
    absolute >= 1_000_000
      ? `$${(absolute / 1_000_000).toFixed(1)}M`
      : `$${Math.round(absolute).toLocaleString("en-US")}`;
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return "$0";
}
