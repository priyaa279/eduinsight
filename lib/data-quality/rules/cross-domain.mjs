import { DATA_QUALITY_FINDING_TYPES, evaluatedResult } from "../contracts.mjs";

export const crossDomainRules = [
  {
    ruleId: "DQ-X-001",
    implementationRule: "REFERENTIAL_INTEGRITY",
    domain: "Cross-domain",
    title: "Declared source foreign keys resolve",
    description: "Every declared child key must resolve to its governed parent source.",
    category: "Referential integrity",
    severity: "Critical",
    owner: "Enterprise Systems",
    findingType: DATA_QUALITY_FINDING_TYPES.DATA_DEFECT,
    sourceSystem: "Enterprise data warehouse",
    sourceFiles: [
      "students.csv",
      "terms.csv",
      "programs.csv",
      "student_terms.csv",
      "completions.csv",
      "financial_aid.csv",
      "sections.csv",
      "section_enrollments.csv",
    ],
    sourceFields: ["All declared source foreign-key columns"],
    scopeDescription: "All declared source foreign-key relationships",
    countSemantics: "Unresolved child-key rows across declared relationships",
    evaluate(context, rule) {
      const studentIds = new Set(context.students.map((row) => row.student_id));
      const termIds = new Set(context.terms.map((row) => row.term_id));
      const programIds = new Set(context.programs.map((row) => row.program_id));
      const sectionIds = new Set(context.sections.map((row) => row.section_id));
      const checks = [
        [context.studentTerms, "student_id", studentIds, "student_terms.csv"],
        [context.studentTerms, "term_id", termIds, "student_terms.csv"],
        [context.studentTerms, "program_id", programIds, "student_terms.csv"],
        [context.completions, "student_id", studentIds, "completions.csv"],
        [context.completions, "program_id", programIds, "completions.csv"],
        [context.financialAid, "student_id", studentIds, "financial_aid.csv"],
        [context.financialAid, "term_id", termIds, "financial_aid.csv"],
        [context.sections, "term_id", termIds, "sections.csv"],
        [context.sections, "program_id", programIds, "sections.csv"],
        [context.sectionEnrollments, "student_id", studentIds, "section_enrollments.csv"],
        [context.sectionEnrollments, "section_id", sectionIds, "section_enrollments.csv"],
        [context.sectionEnrollments, "term_id", termIds, "section_enrollments.csv"],
      ];
      const violations = [];
      for (const [rows, field, parents, file] of checks) {
        for (const row of rows) {
          if (!parents.has(row[field])) {
            violations.push({ source_file: file, field, value: row[field] });
          }
        }
      }
      return evaluatedResult(rule, violations, {
        evidence: { relationshipsEvaluated: checks.length },
      });
    },
  },
  {
    ruleId: "DQ-X-004",
    implementationRule: "YOY_HEADCOUNT_VARIANCE",
    findingId: "DQ-1002",
    domain: "Cross-domain",
    title: "Fall census headcount changed outside the expected range",
    description:
      "The distinct reportable Fall census headcount changed by more than ±2.5% from the prior Fall term.",
    category: "Anomalies",
    severity: "High",
    owner: "Institutional Research",
    findingType: DATA_QUALITY_FINDING_TYPES.ANOMALY,
    sourceSystem: "SIS student term",
    sourceFiles: ["student_terms.csv", "terms.csv"],
    sourceFields: [
      "student_terms.student_id",
      "student_terms.term_id",
      "student_terms.census_enrolled",
      "student_terms.reportable",
      "terms.season",
      "terms.is_current",
    ],
    parameters: Object.freeze({ thresholdPercent: 2.5 }),
    scopeDescription: "Distinct reportable census students in current and prior Fall terms",
    countSemantics: "One anomaly observation; absolute change is not an affected-record count",
    evaluate(context, rule) {
      const distinctHeadcount = (termId) =>
        new Set(
          context.studentTerms
            .filter(
              (row) =>
                row.term_id === termId &&
                row.census_enrolled === "1" &&
                row.reportable === "1",
            )
            .map((row) => row.student_id),
        ).size;
      const previousValue = distinctHeadcount(context.priorTerm.term_id);
      const currentValue = distinctHeadcount(context.currentTerm.term_id);
      const absoluteChange = currentValue - previousValue;
      const percentChange = previousValue
        ? (absoluteChange / previousValue) * 100
        : null;
      const thresholdPercent = rule.parameters.thresholdPercent;
      const thresholdBreached =
        percentChange !== null && Math.abs(percentChange) > thresholdPercent;
      return evaluatedResult(rule, [], {
        violationCount: thresholdBreached ? 1 : 0,
        evidence: {
          previousTerm: context.priorTerm.term_id,
          currentTerm: context.currentTerm.term_id,
          previousValue,
          currentValue,
          absoluteChange,
          percentChange,
          thresholdPercent,
          thresholdParameter: "DQ-X-004.parameters.thresholdPercent",
          thresholdBreached,
        },
      });
    },
  },
];
