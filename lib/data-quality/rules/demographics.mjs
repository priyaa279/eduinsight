import { DATA_QUALITY_FINDING_TYPES, evaluatedResult } from "../contracts.mjs";

export const demographicRules = [
  {
    ruleId: "DQ-DEM-001",
    implementationRule: "DEMOGRAPHIC_COMPLETENESS",
    findingId: "DQ-1003",
    domain: "Demographics",
    title: "Race and ethnicity is missing",
    description:
      "Students in the current Fall reportable census population require a nonblank race/ethnicity value.",
    category: "Nulls",
    severity: "High",
    owner: "Admissions",
    findingType: DATA_QUALITY_FINDING_TYPES.DATA_DEFECT,
    sourceSystem: "SIS student",
    sourceFiles: ["students.csv", "student_terms.csv", "terms.csv"],
    sourceFields: [
      "students.student_id",
      "students.race_ethnicity",
      "student_terms.student_id",
      "student_terms.term_id",
      "student_terms.census_enrolled",
      "student_terms.reportable",
      "terms.is_current",
    ],
    scopeDescription: "Distinct students in the current Fall reportable census",
    countSemantics: "Distinct in-scope students with a blank race/ethnicity value",
    evaluate(context, rule) {
      const currentStudentIds = new Set(
        context.currentStudentTermRows.map((row) => row.student_id),
      );
      const violations = context.students
        .filter(
          (row) =>
            currentStudentIds.has(row.student_id) &&
            !String(row.race_ethnicity ?? "").trim(),
        )
        .map((row) => ({
          student_id: row.student_id,
          entry_term_id: row.entry_term_id,
          primary_program_id: row.primary_program_id,
          race_ethnicity: "(blank)",
        }));
      return evaluatedResult(rule, violations, {
        evidence: { scopedStudentCount: currentStudentIds.size },
      });
    },
  },
];

