import fs from "node:fs/promises";

export const dataset = JSON.parse(
  await fs.readFile(
    new URL("../app/data/ask-eduinsight.generated.json", import.meta.url),
    "utf8",
  ),
);

export const round1 = (value) => Number(Number(value).toFixed(1));

const programs = dataset.catalogs.programs;
const programByName = new Map(
  programs.map((program) => [program.programName, program]),
);

export function programId(programName) {
  const program = programByName.get(programName);
  if (!program) throw new Error(`Unknown oracle program: ${programName}`);
  return program.programId;
}

export function scopedPrograms({
  programName,
  degreeLevel,
  programScope,
} = {}) {
  if (programName) return [programByName.get(programName)].filter(Boolean);
  return programs.filter((program) => {
    if (degreeLevel && program.degreeLevel !== degreeLevel) return false;
    if (
      programScope === "masters_of_science" &&
      !program.programName.startsWith("MS ")
    ) {
      return false;
    }
    if (
      programScope === "bachelors_of_science" &&
      !program.programName.startsWith("BS ")
    ) {
      return false;
    }
    return true;
  });
}

export function enrollmentCount({
  year,
  programName,
  degreeLevel,
  programScope,
  dimension = "all",
  value,
}) {
  const ids = new Set(
    scopedPrograms({ programName, degreeLevel, programScope }).map(
      (program) => program.programId,
    ),
  );
  const cube = value === "Domestic" ? "residency" : dimension;
  return (dataset.enrollmentCubes[cube] ?? [])
    .filter(
      (row) =>
        row.year === year &&
        ids.has(row.programId) &&
        (value == null ||
          (value === "Domestic"
            ? row.value !== "International"
            : row.value === value)),
    )
    .reduce((sum, row) => sum + row.count, 0);
}

export function enrollmentSeries(spec, years) {
  return years.map((year) => ({
    label: String(year),
    value: enrollmentCount({ ...spec, year }),
  }));
}

export function enrollmentShare(spec, year, dimension, value) {
  const numerator = enrollmentCount({
    ...spec,
    year,
    dimension,
    value,
  });
  const denominator = enrollmentCount({ ...spec, year });
  return denominator ? round1((numerator / denominator) * 100) : null;
}

export function enrollmentBreakdown(spec, year, dimension) {
  const ids = new Set(
    scopedPrograms(spec).map((program) => program.programId),
  );
  const values = [
    ...new Set(
      dataset.enrollmentCubes[dimension]
        .filter((row) => row.year === year && ids.has(row.programId))
        .map((row) => row.value),
    ),
  ];
  return values.map((value) => ({
    label: value,
    value: enrollmentCount({ ...spec, year, dimension, value }),
  }));
}

export function programEnrollmentRanking({
  year,
  degreeLevel,
  dimension,
  value,
  measure = "count",
  direction = "desc",
  topN = 5,
}) {
  const rows = scopedPrograms({ degreeLevel }).map((program) => {
    const count = enrollmentCount({
      year,
      programName: program.programName,
      dimension,
      value,
    });
    const total = enrollmentCount({ year, programName: program.programName });
    return {
      label: program.programName,
      value:
        measure === "percentage"
          ? total
            ? round1((count / total) * 100)
            : 0
          : count,
    };
  });
  rows.sort((left, right) => {
    const delta =
      direction === "asc"
        ? left.value - right.value
        : right.value - left.value;
    return delta || left.label.localeCompare(right.label);
  });
  return rows.slice(0, topN);
}

export function programChangeRanking({
  startYear,
  endYear,
  degreeLevel,
  measure = "absolute_change",
  direction = "desc",
  topN = 5,
  onlyNonpositive = false,
}) {
  const rows = scopedPrograms({ degreeLevel })
    .map((program) => {
      const start = enrollmentCount({
        year: startYear,
        programName: program.programName,
      });
      const end = enrollmentCount({
        year: endYear,
        programName: program.programName,
      });
      return {
        label: program.programName,
        value:
          measure === "percentage_growth"
            ? start
              ? round1(((end - start) / start) * 100)
              : 0
            : end - start,
      };
    })
    .filter((row) => !onlyNonpositive || row.value <= 0);
  rows.sort((left, right) => {
    const delta =
      direction === "asc"
        ? left.value - right.value
        : right.value - left.value;
    return delta || left.label.localeCompare(right.label);
  });
  return rows.slice(0, topN);
}

export function degreeLevelComparison(year) {
  return ["Undergraduate", "Graduate"].map((degreeLevel) => ({
    label: degreeLevel,
    value: enrollmentCount({ year, degreeLevel }),
  }));
}

export function retentionRate({
  year,
  programName,
  degreeLevel,
  programScope,
  dimension = "all",
  value,
}) {
  const ids = new Set(
    scopedPrograms({ programName, degreeLevel, programScope }).map(
      (program) => program.programId,
    ),
  );
  const cube = value === "Domestic" ? "residency" : dimension;
  const rows = (dataset.retentionCubes[cube] ?? []).filter(
    (row) =>
      row.cohortYear === year &&
      ids.has(row.programId) &&
      (value == null ||
        (value === "Domestic"
          ? row.value !== "International"
          : row.value === value)),
  );
  const numerator = rows.reduce((sum, row) => sum + row.retained, 0);
  const denominator = rows.reduce((sum, row) => sum + row.cohortSize, 0);
  return denominator ? round1((numerator / denominator) * 100) : null;
}

export function retentionSeries(spec, years) {
  return years.map((year) => ({
    label: String(year),
    value: retentionRate({ ...spec, year }),
  }));
}

export function retentionBreakdown(spec, year, dimension) {
  const ids = new Set(
    scopedPrograms(spec).map((program) => program.programId),
  );
  const values = [
    ...new Set(
      dataset.retentionCubes[dimension]
        .filter((row) => row.cohortYear === year && ids.has(row.programId))
        .map((row) => row.value),
    ),
  ];
  return values.map((value) => ({
    label: value,
    value: retentionRate({ ...spec, year, dimension, value }),
  }));
}

export function capacityRanking({
  measure = "utilization",
  direction = "desc",
  topN = 5,
  operator,
  threshold,
  programName,
}) {
  let rows = dataset.capacity
    .filter((row) => !programName || row.programName === programName)
    .map((row) => ({
      label: row.programName,
      value:
        measure === "available_seats"
          ? row.seats - row.filled
          : round1(row.utilization * 100),
    }));
  if (operator && threshold != null) {
    rows = rows.filter((row) => {
      if (operator === "gt") return row.value > threshold;
      if (operator === "gte") return row.value >= threshold;
      if (operator === "eq") return row.value === threshold;
      if (operator === "lte") return row.value <= threshold;
      if (operator === "lt") return row.value < threshold;
      return true;
    });
  }
  rows.sort((left, right) => {
    const delta =
      direction === "asc"
        ? left.value - right.value
        : right.value - left.value;
    return delta || left.label.localeCompare(right.label);
  });
  return rows.slice(0, topN);
}

function courseAggregates({ modality } = {}) {
  const byCourse = new Map();
  for (const section of dataset.sections) {
    if (modality && section.modality !== modality) continue;
    const current = byCourse.get(section.courseCode) ?? {
      courseCode: section.courseCode,
      graded: 0,
      dfw: 0,
    };
    current.graded += section.gradedCount;
    current.dfw += section.dfwCount;
    byCourse.set(section.courseCode, current);
  }
  return [...byCourse.values()]
    .filter((row) => row.graded > 0)
    .map((row) => ({
      label: row.courseCode,
      rate: round1((row.dfw / row.graded) * 100),
      count: row.dfw,
    }));
}

export function courseOutcomeRanking({
  measure = "dfw_rate",
  direction = "desc",
  topN = 5,
  modality,
  courseCode,
}) {
  const rows = courseAggregates({ modality })
    .filter((row) => !courseCode || row.label === courseCode)
    .map((row) => ({
      label: row.label,
      value: measure === "dfw_rate" ? row.rate : row.count,
    }));
  rows.sort((left, right) => {
    const delta =
      direction === "asc"
        ? left.value - right.value
        : right.value - left.value;
    return delta || left.label.localeCompare(right.label);
  });
  return rows.slice(0, topN);
}

export function modalityDfwComparison() {
  return dataset.catalogs.modalities.map((modality) => {
    const rows = dataset.sections.filter(
      (section) => section.modality === modality,
    );
    const graded = rows.reduce((sum, row) => sum + row.gradedCount, 0);
    const dfw = rows.reduce((sum, row) => sum + row.dfwCount, 0);
    return {
      label: modality,
      value: graded ? round1((dfw / graded) * 100) : 0,
    };
  });
}

export function currentIpedsChecks(status) {
  const latestSequence = Math.max(
    ...dataset.ipedsChecks.map((check) => check.sequence),
  );
  return dataset.ipedsChecks
    .filter(
      (check) =>
        check.sequence === latestSequence && (!status || check.status === status),
    )
    .sort((left, right) => left.checkId.localeCompare(right.checkId))
    .map((check) => ({
      label: check.checkId,
      value: check.weight,
    }));
}

export function latestIpedsReadiness() {
  const latest = dataset.ipedsReadiness.toSorted(
    (left, right) => right.sequence - left.sequence,
  )[0];
  return round1(latest.readiness * 100);
}

export function qualityRows({
  status = "Open",
  severity,
  owner,
  source,
} = {}) {
  return dataset.qualityIssues.filter(
    (issue) =>
      (status === "All" || issue.status === status) &&
      (!severity || issue.severity === severity) &&
      (!owner || issue.owner === owner) &&
      (!source || issue.sourceSystem === source),
  );
}

export function qualityExpected({
  status = "Open",
  severity,
  owner,
  source,
  measure = "count",
  groupBy,
  topN = 10,
} = {}) {
  const rows = qualityRows({ status, severity, owner, source });
  if (groupBy) {
    const field = {
      severity: "severity",
      owner: "owner",
      source_system: "sourceSystem",
      status: "status",
    }[groupBy];
    const grouped = new Map();
    for (const issue of rows) {
      grouped.set(
        issue[field],
        (grouped.get(issue[field]) ?? 0) +
          (measure === "affected_records" ? issue.affectedRecords : 1),
      );
    }
    return [...grouped.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, topN);
  }
  if (measure === "affected_records") {
    return rows
      .toSorted(
        (left, right) =>
          right.affectedRecords - left.affectedRecords ||
          left.issueId.localeCompare(right.issueId),
      )
      .slice(0, topN)
      .map((issue) => ({
        label: issue.issueId,
        value: issue.affectedRecords,
      }));
  }
  const label = severity ?? owner ?? source ?? status;
  return [{ label, value: rows.length }];
}

export const sourceContracts = {
  enrollment: [
    "student_terms.csv",
    "students.csv",
    "programs.csv",
    "terms.csv",
  ],
  retention: [
    "students.csv",
    "student_terms.csv",
    "programs.csv",
    "terms.csv",
  ],
  capacity_utilization: [
    "sections.csv",
    "section_enrollments.csv",
    "programs.csv",
  ],
  course_outcomes: [
    "sections.csv",
    "section_enrollments.csv",
    "programs.csv",
  ],
  ipeds_readiness: ["ipeds_validation_results.csv"],
  quality_issues: ["data_quality_issue_log.csv"],
};

export function oraclePoints(oracle) {
  switch (oracle.type) {
    case "enrollment-series":
      return enrollmentSeries(oracle.spec ?? {}, oracle.years);
    case "enrollment-share":
      return [
        {
          label: oracle.label,
          value: enrollmentShare(
            oracle.spec ?? {},
            oracle.year,
            oracle.dimension,
            oracle.value,
          ),
        },
      ];
    case "enrollment-breakdown":
      return enrollmentBreakdown(
        oracle.spec ?? {},
        oracle.year,
        oracle.dimension,
      );
    case "program-enrollment-ranking":
      return programEnrollmentRanking(oracle);
    case "program-change-ranking":
      return programChangeRanking(oracle);
    case "degree-comparison":
      return degreeLevelComparison(oracle.year);
    case "retention-series":
      return retentionSeries(oracle.spec ?? {}, oracle.years);
    case "retention-breakdown":
      return retentionBreakdown(
        oracle.spec ?? {},
        oracle.year,
        oracle.dimension,
      );
    case "capacity-ranking":
      return capacityRanking(oracle);
    case "course-ranking":
      return courseOutcomeRanking(oracle);
    case "modality-dfw":
      return modalityDfwComparison();
    case "ipeds-checks":
      return currentIpedsChecks(oracle.status);
    case "ipeds-readiness":
      return [{ label: "Readiness", value: latestIpedsReadiness() }];
    case "quality":
      return qualityExpected(oracle);
    default:
      throw new Error(`Unsupported Blind #8 oracle type: ${oracle.type}`);
  }
}
