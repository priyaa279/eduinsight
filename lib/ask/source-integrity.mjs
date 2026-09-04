import { POPULATION_GROUP_BYS } from "./plan-contract.mjs";

function firstDuplicate(rows, keyFor) {
  const seen = new Set();
  for (const row of rows ?? []) {
    const key = keyFor(row);
    if (seen.has(key)) return key;
    seen.add(key);
  }
  return null;
}

export function sourceIntegrityIssue(plan, dataset) {
  const programIds = new Set(
    (dataset.catalogs?.programs ?? []).map((program) => program.programId),
  );
  if (plan.metric === "completions") {
    const invalid = (dataset.completions ?? []).find(
      (row) =>
        !Number.isInteger(row.year) ||
        !Number.isFinite(row.count) ||
        row.count < 0,
    );
    if (invalid) {
      return {
        headline: "Completions cannot be reported because the governed aggregate is invalid.",
        summary:
          "A reporting-year completion count is negative, nonnumeric, or missing its governed year.",
        sources: ["completions.csv"],
      };
    }
    const duplicate = firstDuplicate(dataset.completions, (row) => row.year);
    if (duplicate) {
      return {
        headline: "Completions cannot be reported because duplicate annual aggregates were detected.",
        summary: `Reporting year ${duplicate} appears more than once and could double-count awards.`,
        sources: ["completions.csv"],
      };
    }
  }
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
