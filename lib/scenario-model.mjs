function signedRound(value) {
  return Math.round(value);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function deriveScenarioEffect(mode, comparison) {
  const primaryValues =
    mode === "faculty"
      ? [comparison.facultyFteImpact]
      : mode === "pricing"
        ? [comparison.annualRevenueImpact]
        : [comparison.headcountImpact, comparison.annualRevenueImpact];
  const hasPositive = primaryValues.some((value) => value > 0);
  const hasNegative = primaryValues.some((value) => value < 0);

  if (hasPositive && hasNegative) {
    return { tone: "mixed", label: "Mixed effect" };
  }
  if (hasNegative) {
    return { tone: "negative", label: "Negative effect" };
  }
  if (hasPositive) {
    return { tone: "positive", label: "Positive effect" };
  }
  return { tone: "neutral", label: "No modeled change" };
}

export function calculateEnrollmentMix(baselines, assumptions) {
  const undergraduateChange = signedRound(
    baselines.enrollment.undergraduateHeadcount *
      (assumptions.undergraduateChangePercent / 100),
  );
  const graduateChange = signedRound(
    baselines.enrollment.graduateHeadcount *
      (assumptions.graduateChangePercent / 100),
  );
  const headcountImpact = undergraduateChange + graduateChange;
  const annualRevenueImpact =
    undergraduateChange * baselines.pricing.undergraduateTuitionAndFees +
    graduateChange * baselines.pricing.graduateTuitionAndFees;
  const sectionImpact = signedRound(
    headcountImpact / baselines.enrollment.studentsPerSection,
  );
  const facultyFteImpact =
    Math.round(
      (sectionImpact / baselines.enrollment.sectionsPerFacultyFte) * 10,
    ) / 10;

  return {
    title: "Enrollment mix",
    summary: `${undergraduateChange >= 0 ? "+" : ""}${undergraduateChange.toLocaleString()} UG and ${graduateChange >= 0 ? "+" : ""}${graduateChange.toLocaleString()} GR students`,
    metrics: [
      {
        label: "Undergraduate headcount",
        value: undergraduateChange,
        display: `${undergraduateChange >= 0 ? "+" : ""}${undergraduateChange.toLocaleString()}`,
      },
      {
        label: "Graduate headcount",
        value: graduateChange,
        display: `${graduateChange >= 0 ? "+" : ""}${graduateChange.toLocaleString()}`,
      },
      {
        label: "Annual gross tuition",
        value: annualRevenueImpact,
        display: formatCurrency(annualRevenueImpact),
      },
      {
        label: "Faculty capacity",
        value: facultyFteImpact,
        display: `${facultyFteImpact >= 0 ? "+" : ""}${facultyFteImpact.toFixed(1)} FTE`,
      },
    ],
    comparison: {
      headcountImpact,
      annualRevenueImpact,
      financialHorizonYears: 1,
      capacitySeatImpact: -headcountImpact,
      capacityImpactKind: "student-seat-demand",
      capacityImpactUnit: "student seats",
      facultyFteImpact,
      facultyImpactKind: "faculty-demand",
    },
    assumptions: [
      `${baselines.enrollment.studentsPerSection} students per added or removed section`,
      `${baselines.enrollment.sectionsPerFacultyFte} sections per faculty FTE`,
      "Published tuition and required fees; enrollment response is not modeled",
    ],
    sources: [
      ...baselines.enrollment.sources,
      ...baselines.pricing.sources,
    ],
  };
}

export function calculateRetentionImprovement(baselines, assumptions) {
  const pointGain = clamp(assumptions.pointGain, 0, 100);
  const projectedRate = clamp(baselines.retention.rate + pointGain / 100, 0, 1);
  const additionalPerCohort = signedRound(
    baselines.retention.cohortSize * (pointGain / 100),
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
        display: `+${additionalPerCohort.toLocaleString()}`,
      },
      {
        label: `Year ${baselines.retention.horizonYears} added headcount`,
        value: finalYearHeadcountImpact,
        display: `+${finalYearHeadcountImpact.toLocaleString()}`,
      },
      {
        label: "Cumulative student-years",
        value: cumulativeStudentYears,
        display: `+${cumulativeStudentYears.toLocaleString()}`,
      },
      {
        label: `Year ${baselines.retention.horizonYears} gross tuition`,
        value: finalYearRevenueImpact,
        display: formatCurrency(finalYearRevenueImpact),
      },
    ],
    series: yearlyAdditional,
    comparison: {
      headcountImpact: additionalPerCohort,
      annualRevenueImpact: yearOneRevenueImpact,
      financialHorizonYears: 1,
      capacitySeatImpact: -additionalPerCohort,
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
    assumptions: [
      `A new ${baselines.retention.cohortSize.toLocaleString()}-student cohort receives the same improvement each year`,
      "Incremental retained students remain enrolled through the four-year horizon",
      "Completion, later-year attrition, and behavioral response are not modeled",
    ],
    sources: [
      ...baselines.retention.sources,
      ...baselines.pricing.sources,
    ],
  };
}

export function calculatePricingAndAid(baselines, assumptions) {
  const additionalGrantPerPellEligible = clamp(
    assumptions.additionalGrantPerPellEligible,
    0,
    50_000,
  );
  const undergraduatePriceImpact =
    baselines.enrollment.undergraduateHeadcount *
    baselines.pricing.undergraduateTuitionAndFees *
    (assumptions.undergraduatePriceChangePercent / 100);
  const graduatePriceImpact =
    baselines.enrollment.graduateHeadcount *
    baselines.pricing.graduateTuitionAndFees *
    (assumptions.graduatePriceChangePercent / 100);
  const additionalAid =
    baselines.aid.pellEligibleStudents *
    additionalGrantPerPellEligible;
  const annualRevenueImpact =
    undergraduatePriceImpact + graduatePriceImpact - additionalAid;
  const baselineGrossTuition =
    baselines.enrollment.undergraduateHeadcount *
      baselines.pricing.undergraduateTuitionAndFees +
    baselines.enrollment.graduateHeadcount *
      baselines.pricing.graduateTuitionAndFees;
  const discountRatePointChange = baselineGrossTuition
    ? (additionalAid / baselineGrossTuition) * 100
    : 0;

  return {
    title: "Tuition and aid",
    summary: `${formatCurrency(undergraduatePriceImpact + graduatePriceImpact)} pricing effect and ${formatCurrency(-additionalAid)} additional aid`,
    metrics: [
      {
        label: "UG pricing effect",
        value: undergraduatePriceImpact,
        display: formatCurrency(undergraduatePriceImpact),
      },
      {
        label: "GR pricing effect",
        value: graduatePriceImpact,
        display: formatCurrency(graduatePriceImpact),
      },
      {
        label: "Additional grant aid",
        value: -additionalAid,
        display: formatCurrency(-additionalAid),
      },
      {
        label: "Net annual effect",
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
      discountRatePointChange,
      coveredStudents: baselines.aid.pellEligibleStudents,
      modeledNetPriceChange: -Math.max(
        0,
        additionalGrantPerPellEligible,
      ),
    },
    assumptions: [
      "Enrollment is held constant; price elasticity and yield response are not modeled",
      "Additional grant is applied equally to every Pell-eligible student in the current governed population",
      baselines.aid.limitation,
    ],
    sources: [...baselines.pricing.sources, ...baselines.aid.sources],
  };
}

export function calculateProgramCapacity(baselines, assumptions) {
  const program =
    baselines.programs.find(
      (candidate) => candidate.programId === assumptions.programId,
    ) ?? baselines.programs[0];
  const growthRate = assumptions.growthPercent / 100;
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
  const uniformProgramCapacitySource = baselines.programs.every(
    (candidate) =>
      candidate.sectionCount === baselines.programs[0].sectionCount &&
      candidate.averageSectionCapacity ===
        baselines.programs[0].averageSectionCapacity,
  );

  return {
    title: `${program.name} capacity`,
    summary: `${projectedHeadcount.toLocaleString()} projected students; ${(projectedUtilization * 100).toFixed(1)}% course-seat utilization`,
    metrics: [
      {
        label: "Student headcount",
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
        display: Math.abs(remainingCourseSeats).toLocaleString(),
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
      capacitySeatImpact: -addedCourseSeatDemand,
      capacityImpactKind: "course-seat-demand",
      capacityImpactUnit: "course seats",
      facultyFteImpact:
        Math.round(
          (sectionsNeeded / baselines.enrollment.sectionsPerFacultyFte) * 10,
        ) / 10,
      facultyImpactKind: "faculty-demand",
    },
    program,
    assumptions: [
      "Current course-seat demand scales proportionally with program headcount",
      `New sections use the current ${program.averageSectionCapacity.toFixed(0)}-seat average`,
      "Course-seat capacity counts seats across sections, not unique students; one student may occupy multiple course seats",
      ...(uniformProgramCapacitySource
        ? [
            `The current capacity source reports ${program.sectionCount} sections at ${program.averageSectionCapacity.toFixed(0)} seats for every modeled program; verify those source capacities before an operational decision`,
          ]
        : []),
      "Course mix, modality shifts, and student course-taking changes are not modeled",
    ],
    sources: [
      "student_terms.csv",
      "sections.csv",
      "section_enrollments.csv",
      "programs.csv",
    ],
  };
}

export function calculateFacultyAttrition(baselines, assumptions) {
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
    -sectionsLost * baselines.faculty.seatsPerSectionAssumption;

  return {
    title: "Faculty staffing",
    summary: `${positionsNotReplaced} positions not replaced; ${remainingFaculty} full-time instructional staff remain`,
    metrics: [
      {
        label: "Positions not replaced",
        value: positionsNotReplaced,
        display: `−${positionsNotReplaced}`,
      },
      {
        label: "Instructional staff remaining",
        value: remainingFaculty,
        display: remainingFaculty.toLocaleString(),
      },
      {
        label: "Modeled sections lost",
        value: -sectionsLost,
        display: `−${sectionsLost}`,
      },
      {
        label: "Modeled seat capacity",
        value: capacitySeatImpact,
        display: capacitySeatImpact.toLocaleString(),
      },
    ],
    comparison: {
      headcountImpact: 0,
      annualRevenueImpact: 0,
      financialHorizonYears: 1,
      capacitySeatImpact,
      capacityImpactKind: "course-seat-supply",
      capacityImpactUnit: "course seats",
      facultyFteImpact: -positionsNotReplaced,
      facultyImpactKind: "faculty-supply",
    },
    assumptions: [
      `${baselines.faculty.sectionsPerFacultyFteAssumption} sections per faculty FTE`,
      `${baselines.faculty.seatsPerSectionAssumption} students per section`,
      baselines.faculty.limitation,
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
