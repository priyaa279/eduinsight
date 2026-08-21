import { DATA_QUALITY_FINDING_TYPES, evaluatedResult } from "../contracts.mjs";

export const aidRules = [
  {
    ruleId: "DQ-AID-001",
    implementationRule: "AID_WITHOUT_ENROLLMENT",
    domain: "Financial aid",
    title: "Financial-aid records have matching term enrollment",
    description:
      "Every financial-aid record must match student-term enrollment on student_id and term_id.",
    category: "Referential integrity",
    severity: "High",
    owner: "Student Financial Services",
    findingType: DATA_QUALITY_FINDING_TYPES.DATA_DEFECT,
    sourceSystem: "Financial aid system",
    sourceFiles: ["financial_aid.csv", "student_terms.csv"],
    sourceFields: [
      "financial_aid.aid_record_id",
      "financial_aid.student_id",
      "financial_aid.term_id",
      "student_terms.student_id",
      "student_terms.term_id",
    ],
    scopeDescription: "All financial-aid rows",
    countSemantics: "Aid rows without a matching student_id + term_id enrollment key",
    evaluate(context, rule) {
      const enrollmentKeys = new Set(
        context.studentTerms.map((row) => `${row.student_id}|${row.term_id}`),
      );
      const violations = context.financialAid
        .filter((row) => !enrollmentKeys.has(`${row.student_id}|${row.term_id}`))
        .map((row) => ({
          aid_record_id: row.aid_record_id,
          student_id: row.student_id,
          term_id: row.term_id,
        }));
      return evaluatedResult(rule, violations, {
        evidence: { scopedAidRowCount: context.financialAid.length },
      });
    },
  },
];

