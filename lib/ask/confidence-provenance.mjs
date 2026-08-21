import { clean } from "./normalization.mjs";
import { POPULATION_GROUP_BYS } from "./plan-contract.mjs";
import { selectedPrograms } from "./plan-scope.mjs";

export function applyConfidenceContext(plan, dataset, answer) {
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
        `Confidence is reduced because the source-derived Data Quality evaluation contains related open issue ${relatedIssue.issueId} affecting ${Number(relatedIssue.affectedRecords ?? 0).toLocaleString("en-US")} records: ${relatedIssue.title}.`,
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
          `Confidence is reduced because the source-derived Data Quality evaluation contains an open enrollment anomaly: ${relatedIssue.issueId} (${relatedIssue.ruleId}).`,
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

export function finalizeAnswer(plan, answer) {
  const disposition =
    plan.responseType === "clarification"
      ? "clarification"
      : plan.responseType === "refusal"
        ? "refusal"
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
