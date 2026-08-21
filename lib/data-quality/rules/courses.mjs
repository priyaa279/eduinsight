import { DATA_QUALITY_FINDING_TYPES, evaluatedResult } from "../contracts.mjs";

export const courseRules = [
  {
    ruleId: "DQ-CRS-001",
    implementationRule: "SECTION_OVER_CAPACITY",
    domain: "Courses/faculty",
    title: "Section enrollment does not exceed capacity",
    description: "The number of enrolled section rows cannot exceed section capacity.",
    category: "Invalid values",
    severity: "High",
    owner: "Academic Affairs",
    findingType: DATA_QUALITY_FINDING_TYPES.DATA_DEFECT,
    sourceSystem: "SIS course schedule",
    sourceFiles: ["sections.csv", "section_enrollments.csv"],
    sourceFields: [
      "sections.section_id",
      "sections.section_capacity",
      "section_enrollments.section_id",
      "section_enrollments.enrollment_status",
    ],
    scopeDescription: "All sections and Enrolled registration rows",
    countSemantics: "Sections whose enrolled count exceeds capacity",
    evaluate(context, rule) {
      const enrolledBySection = new Map();
      for (const row of context.sectionEnrollments) {
        if (row.enrollment_status !== "Enrolled") continue;
        enrolledBySection.set(
          row.section_id,
          (enrolledBySection.get(row.section_id) ?? 0) + 1,
        );
      }
      const violations = context.sections
        .filter(
          (row) =>
            (enrolledBySection.get(row.section_id) ?? 0) >
            Number(row.section_capacity),
        )
        .map((row) => ({
          section_id: row.section_id,
          term_id: row.term_id,
          section_capacity: Number(row.section_capacity),
          enrolled_count: enrolledBySection.get(row.section_id) ?? 0,
        }));
      return evaluatedResult(rule, violations);
    },
  },
];

