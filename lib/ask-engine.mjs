import { governancePolicyForQuestion } from "./ask/governance.mjs";
import {
  POPULATION_GROUP_BYS,
  queryPlanSchema,
  semanticPlanSchema,
} from "./ask/plan-contract.mjs";
import {
  planQuestionLocally,
} from "./ask/semantic-planner.mjs";
import {
  normalizePlan,
  validateSemanticPlan,
} from "./ask/plan-validator.mjs";
import { selectedPrograms } from "./ask/plan-scope.mjs";
import { sourceIntegrityIssue } from "./ask/source-integrity.mjs";
import {
  applyConfidenceContext,
  finalizeAnswer,
} from "./ask/confidence-provenance.mjs";

export {
  governancePolicyForQuestion,
  normalizePlan,
  planQuestionLocally,
  queryPlanSchema,
  semanticPlanSchema,
  validateSemanticPlan,
};

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

function sortPoints(
  points,
  plan,
  chronological = false,
  alphabeticalTies = false,
) {
  if (chronological) {
    return [...points].sort((a, b) => Number(a.label) - Number(b.label));
  }
  if (plan.ranking === "lowest") {
    return [...points].sort(
      (a, b) =>
        a.value - b.value ||
        (alphabeticalTies
          ? String(a.label).localeCompare(String(b.label), "en")
          : 0),
    );
  }
  return [...points].sort(
    (a, b) =>
      b.value - a.value ||
      (alphabeticalTies
        ? String(a.label).localeCompare(String(b.label), "en")
        : 0),
  );
}

function limitedPoints(points, limit = 10) {
  return points.slice(0, limit);
}

function clarificationAnswer(reason) {
  return {
    eyebrow: "Governed analysis · Clarification needed",
    headline: "I’m not confident I understood that question.",
    summary:
      reason ??
      "The question is ambiguous without a prior answer or a named governed metric.",
    delta: "Clarify",
    points: [],
    notes: [
      "Write a complete question using full English terms and a supported metric.",
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
  const timeLabel =
    plan.startYear === plan.endYear
      ? String(plan.endYear)
      : `${plan.startYear}–${plan.endYear}`;
  return {
    eyebrow: `Enrollment · Fall census · ${timeLabel}`,
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
    const percentageChange = first ? ((last - first) / first) * 100 : null;
    return enrollmentAnswer({
      plan,
      dataset,
      headline: `${titleCase(programScopeLabel(plan, dataset))} enrollment changed by ${(last - first).toLocaleString("en-US")} students${percentageChange === null ? "" : ` (${percentageChange >= 0 ? "+" : "−"}${Math.abs(percentageChange).toFixed(1)}%)`} between ${startYear} and ${endYear}.`,
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
      const dimension =
        plan.populationDimension === "all"
          ? "residency"
          : plan.populationDimension;
      const value =
        plan.populationDimension === "all"
          ? "International"
          : plan.populationValue;
      const numerator = count([program], endYear, dimension, value);
      const denominator = count([program], endYear, "all", null);
      return percentPoint(
        program.programName,
        denominator ? (numerator / denominator) * 100 : 0,
      );
    });
    points.sort((a, b) =>
      plan.ranking === "lowest"
        ? a.value - b.value
        : b.value - a.value,
    );
    points = points.slice(0, plan.topN);
    const populationLabel = plan.populationValue ?? "International";
    return enrollmentAnswer({
      plan,
      dataset,
      headline: `${points[0].label} has the ${plan.ranking === "lowest" ? "lowest" : "highest"} percentage of ${populationLabel.toLowerCase()} students at ${points[0].value.toFixed(1)}%.`,
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
    const ascending =
      plan.operation === "program_change_negative" ||
      plan.operation === "program_change_nonpositive" ||
      plan.ranking === "lowest" ||
      /\b(decline|declined|drop|shed|lost|loss)\b/.test(
        plan.normalizedQuestion,
      );
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
      const delta = ascending
        ? left - right
        : right - left;
      return delta || a.label.localeCompare(b.label, "en");
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
    const action =
      Math.abs(leaderValue) < 0.0001
        ? "was unchanged"
        : leaderValue < 0
          ? "declined the most"
          : ascending
            ? `had the lowest ${percentage ? "percentage growth" : "enrollment change"}`
            : percentage
              ? "grew the most"
              : "added the most students";
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
  rawPoints = sortPoints(rawPoints, plan, chronological, true);
  let visibleRawPoints = limitedPoints(rawPoints, plan.topN);
  if (
    !chronological &&
    plan.ranking !== "none" &&
    visibleRawPoints.length &&
    rawPoints.length > visibleRawPoints.length &&
    (plan.topN === 1 ||
      /\b(?:shared|tied?|program or programs)\b/.test(
        plan.normalizedQuestion,
      ))
  ) {
    const boundaryValue = visibleRawPoints.at(-1).value;
    visibleRawPoints = [
      ...visibleRawPoints,
      ...rawPoints
        .slice(visibleRawPoints.length)
        .filter((point) => closeNumeric(point.value, boundaryValue)),
    ];
  }
  const points = visibleRawPoints.map((point) => ({
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
      /\b(?:why|caused?|explain)\b/.test(plan.normalizedQuestion)
        ? "The available cohort data cannot establish why the retention difference occurred or prove causation."
        : "Retention differences are descriptive and do not establish causation.",
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
        (plan.populationValue === "Domestic"
          ? dataset.catalogs.residencies.includes(row.value) &&
            row.value !== "International"
          : row.value === plan.populationValue)),
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
      /\b(?:why|caused?|explain)\b/.test(plan.normalizedQuestion)
        ? "The available cohort data cannot establish why retention changed or prove causation."
        : "Retention differences are descriptive and do not establish causation.",
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
          ? "0 failed IPEDS validation checks are present in the latest run."
          : `${checks.length} current validation checks are marked ${plan.checkStatus.toLowerCase()}.`,
      summary:
        plan.checkStatus === "Failed" && checks.length === 0
          ? `${reviewCount} checks are marked Review; Review is distinct from Failed.`
          : `Those checks represent ${weight.toFixed(1)} of 100 governed readiness weight points.`,
      delta: `${checks.length} checks`,
      points: listChecks
        ? (/\b(?:all|every)\b/.test(plan.normalizedQuestion)
            ? checks
            : limitedPoints(checks, 8)
          ).map((check) => ({
              label: check.checkId,
              value: check.weight,
              display: `${check.weight.toFixed(2)} pts`,
            }))
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
        /\b(?:all|every)\b/.test(plan.normalizedQuestion)
          ? "Every matching check is shown because the request explicitly asked for the complete list."
          : "The chart shows at most eight checks; the method panel retains the exact filter.",
      ],
      confidence: "High",
      queryPlan: `ipeds_readiness; run=${latestRun.runId}; check_status=${plan.checkStatus}`,
    };
  }

  if (plan.measure === "count" || plan.groupBy === "status") {
    const statusPoints = ["Passed", "Review", "Failed"].map((status) => {
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
  const sourcesFor = (matchedIssues) => {
    const sources = [
      ...new Set(matchedIssues.flatMap((issue) => issue.sourceFiles ?? [])),
    ];
    return sources.length ? sources : ["data-quality-results.json"];
  };

  if (plan.operation === "quality_issue_detail") {
    const requestedId = plan.normalizedQuestion
      .match(/\bdq-(?:\d+|[a-z]+-\d+)\b/)?.[0]
      ?.toUpperCase();
    const issue = issues.find(
      (candidate) =>
        candidate.issueId === requestedId || candidate.ruleId === requestedId,
    );
    if (!issue) {
      return unsupportedAnswer(
        `No quality finding with ID ${requestedId ?? "requested"} exists in the current upload.`,
        "Use an active finding or executed rule ID from the current Data Quality evaluation.",
        ["data-quality-results.json"],
      );
    }
    if (issue.findingType === "ANOMALY") {
      const observation = issue.observation ?? {};
      return {
        eyebrow: `Data quality · ${issue.issueId}`,
        headline: `${issue.issueId} observed a ${Number(observation.absoluteChange ?? 0).toLocaleString("en-US")} student change (${Number(observation.percentChange ?? 0).toFixed(1)}%).`,
        summary: issue.title,
        delta: `${Number(observation.percentChange ?? 0).toFixed(1)}%`,
        points: [
          {
            label: String(observation.previousTerm ?? "Previous"),
            value: Number(observation.previousValue ?? 0),
            display: Number(observation.previousValue ?? 0).toLocaleString("en-US"),
          },
          {
            label: String(observation.currentTerm ?? "Current"),
            value: Number(observation.currentValue ?? 0),
            display: Number(observation.currentValue ?? 0).toLocaleString("en-US"),
          },
        ],
        notes: [
          `Implementation rule: ${issue.implementationRule ?? issue.ruleId}.`,
          `Owner: ${issue.owner}.`,
          `Threshold: ±${Number(observation.thresholdPercent ?? 0).toFixed(1)}%.`,
          "The absolute change is an observation, not an affected-record count.",
        ],
        metric: issue.countSemantics,
        sources: sourcesFor([issue]),
        limitations: [
          "The available data establishes the change but does not establish its cause.",
        ],
        confidence: "High",
        queryPlan: `quality_issues; issue_id=${issue.issueId}; type=anomaly`,
      };
    }
    return {
      eyebrow: `Data quality Â· ${issue.issueId}`,
      headline: `${issue.issueId} (${issue.ruleId}) affects ${issue.affectedRecords.toLocaleString("en-US")} records.`,
      summary: issue.title,
      delta: `${issue.affectedRecords.toLocaleString("en-US")} records`,
      points: [
        {
          label: issue.issueId,
          value: issue.affectedRecords,
          display: issue.affectedRecords.toLocaleString("en-US"),
        },
      ],
      notes: [
        `Implementation rule: ${issue.implementationRule ?? issue.ruleId}.`,
        `Owner: ${issue.owner}.`,
        `Source system: ${issue.sourceSystem}.`,
        `Severity: ${issue.severity}; status: ${issue.status}.`,
      ],
      metric: "Affected-record count for a governed data-quality finding",
      sources: sourcesFor([issue]),
      limitations: [
        "Affected-record counts identify rule hits and do not necessarily represent distinct students.",
      ],
      confidence: "High",
      queryPlan: `quality_issues; issue_id=${issue.issueId}`,
    };
  }

  if (plan.operation === "quality_issue_list") {
    const severityOrder = new Map([
      ["Critical", 0],
      ["High", 1],
      ["Medium", 2],
    ]);
    issues = [...issues].sort(
      (left, right) =>
        severityOrder.get(left.severity) - severityOrder.get(right.severity) ||
        right.affectedRecords - left.affectedRecords,
    );
    return {
      eyebrow: `Data quality Â· ${plan.status} findings`,
      headline: `${issues.length} ${plan.severity ? `${plan.severity.toLowerCase()} ` : ""}${plan.status.toLowerCase()} data-quality findings match.`,
      summary: issues.length
        ? "Each chart item is a governed issue, not an aggregated severity bucket."
        : "No governed issue matched every requested filter.",
      delta: `${issues.length} issues`,
      points: issues.slice(0, plan.topN).map((issue) => ({
        label: issue.issueId,
        value: issue.affectedRecords,
        display: issue.affectedRecords.toLocaleString("en-US"),
      })),
      notes: issues.slice(0, 3).map(
        (issue) => `${issue.issueId}: ${issue.title} (${issue.ruleId}).`,
      ),
      metric: "Governed data-quality findings and affected-record counts",
      sources: sourcesFor(issues),
      limitations: [
        "The chart is limited to the requested display count; issue totals can overlap.",
      ],
      confidence: "High",
      queryPlan: `quality_issues; status=${plan.status}; severity=${plan.severity ?? "all"}; list=issues`,
    };
  }

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
      sources: sourcesFor(issues),
      limitations: [
        "Affected-record totals can double-count a record flagged by multiple rules.",
      ],
      confidence: "High",
      queryPlan: `quality_issues; status=${plan.status}; rank_by=affected_records`,
    };
  }

  const asksForSingleCount =
    plan.measure === "count" &&
    (/\b(?:how many|number of|count of)\b/.test(plan.normalizedQuestion) ||
      /^(?:open|unresolved) (?:data quality )?(?:issues?|findings?)$/.test(
        plan.normalizedQuestion,
      ));
  const groupBy =
    plan.groupBy !== "none"
      ? plan.groupBy
      : plan.severity || plan.issueOwner || plan.issueSource || asksForSingleCount
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
        label:
          plan.issueOwner ??
          plan.issueSource ??
          plan.severity ??
          plan.status,
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
        : "Every evaluated source system is included.",
      issues[0]
        ? `Highest-priority matched finding: ${issues[0].title}.`
        : "No issue matched the requested filters.",
    ],
    metric:
      plan.measure === "affected_records"
        ? "Sum of affected-record counts in governed quality findings"
        : "Count of governed data-quality findings",
    sources: sourcesFor(issues),
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
      "Enrollment is a distinct, reportable student headcount at the governed Fall census from student-term records; it is not section registrations or annual unduplicated enrollment.",
      "First-year retention is the percentage of first-time, full-time, degree-seeking students in an entering Fall cohort who appear in the following Fall census.",
      "Enrollment supports year, program, degree, residency, gender, race and ethnicity, first-generation, Pell, attendance, and academic-standing questions.",
      "Retention supports cohort year, program, degree, residency, gender, race and ethnicity, first-generation, and Pell questions.",
      "Scheduled capacity uses sections.csv, section_enrollments.csv, and programs.csv.",
      "Course-outcome DFW calculations are unavailable because the current sections do not contain final-grade outcomes.",
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
  if (plan.responseType === "clarification") {
    return finalizeAnswer(plan, clarificationAnswer(plan.responseReason));
  }
  if (plan.responseType === "refusal") {
    const refusal = unsupportedAnswer(
      "I cannot provide individual or policy-bypassing results through this aggregate analytics interface.",
      plan.responseReason,
    );
    return finalizeAnswer(
      plan,
      {
        ...refusal,
        eyebrow: "Governed analysis · Privacy refusal",
        delta: "Blocked",
        notes: [
          "No individual, named, row-level, or personally identifiable student data was disclosed.",
          "Ask for an aggregate governed metric instead.",
        ],
        metric: "Aggregate-only privacy policy",
        queryPlan: "privacy_refusal",
        sources: [],
        limitations: [
          "The request was not executed and no institutional records were returned.",
        ],
      },
    );
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

export function analyzeQuestion(question, dataset) {
  const plan = normalizePlan(
    planQuestionLocally(question, dataset),
    question,
    dataset,
  );
  return {
    question,
    plan,
    answer: executeQueryPlan(plan, dataset),
  };
}
