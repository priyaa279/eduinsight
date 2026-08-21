export function datasetCapabilities(dataset) {
  const enrollmentRows = dataset.enrollmentCubes?.all ?? [];
  const retentionRows = dataset.retentionCubes?.all ?? [];
  const sections = dataset.sections ?? [];
  const courseOutcomeRows = sections.filter(
    (section) =>
      Number(section.gradedCount ?? 0) > 0 &&
      Number.isFinite(Number(section.dfwCount)),
  );

  return {
    enrollment: enrollmentRows.length > 0,
    retention: retentionRows.length > 0,
    ipeds_readiness:
      (dataset.ipedsReadiness?.length ?? 0) > 0 ||
      (dataset.ipedsChecks?.length ?? 0) > 0,
    quality_issues: (dataset.qualityIssues?.length ?? 0) > 0,
    capacity_utilization: sections.some(
      (section) => Number(section.seats ?? 0) > 0,
    ),
    course_outcomes: courseOutcomeRows.length > 0,
    data_catalog: true,
    unsupported: false,
  };
}

export function capabilityIssue(plan, dataset) {
  const capabilities = datasetCapabilities(dataset);
  if (plan.responseType !== "answer") return null;
  if (capabilities[plan.metric] !== false) return null;

  const reasons = {
    enrollment:
      "No governed Fall-census enrollment aggregates are available in the uploaded dataset.",
    retention:
      "No governed following-Fall retention aggregates are available in the uploaded dataset.",
    ipeds_readiness:
      "No IPEDS readiness runs or validation checks are available in the uploaded dataset.",
    quality_issues:
      "No source-derived Data Quality evaluation is available in the uploaded dataset.",
    capacity_utilization:
      "No scheduled-seat capacity records are available in the uploaded dataset.",
    course_outcomes:
      "Course outcomes cannot be calculated because the uploaded section records contain no graded students or final-grade-derived DFW outcomes.",
  };
  return reasons[plan.metric] ?? "The uploaded dataset does not support this metric.";
}
