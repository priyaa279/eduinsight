import { DATA_QUALITY_FINDING_TYPES, evaluatedResult } from "../contracts.mjs";

export const enrollmentRules = [
  {
    ruleId: "DQ-ENR-001",
    implementationRule: "UG_FT_CREDIT_THRESHOLD",
    findingId: "DQ-1001",
    domain: "Enrollment",
    title: "Full-time undergraduate attempted credits are below the governed threshold",
    description:
      "Reportable Fall census undergraduate rows coded full-time must carry at least 12 attempted credits.",
    category: "Invalid values",
    severity: "Critical",
    owner: "Registrar",
    findingType: DATA_QUALITY_FINDING_TYPES.DATA_DEFECT,
    sourceSystem: "SIS student term",
    sourceFiles: ["student_terms.csv", "terms.csv"],
    sourceFields: [
      "student_terms.term_id",
      "student_terms.level",
      "student_terms.attendance_status",
      "student_terms.attempted_credits",
      "student_terms.census_enrolled",
      "student_terms.reportable",
      "terms.is_current",
    ],
    scopeDescription: "Current Fall reportable census undergraduate enrollment",
    countSemantics: "Distinct violating student-term rows",
    evaluate(context, rule) {
      const violations = context.studentTerms
        .filter(
          (row) =>
            row.term_id === context.currentTerm.term_id &&
            row.census_enrolled === "1" &&
            row.reportable === "1" &&
            row.level === "UG" &&
            row.attendance_status === "F" &&
            Number(row.attempted_credits) < 12,
        )
        .map((row) => ({
          student_id: row.student_id,
          term_id: row.term_id,
          program_id: row.program_id,
          attempted_credits: Number(row.attempted_credits),
          attendance_status: row.attendance_status,
        }));
      return evaluatedResult(rule, violations, {
        evidence: {
          thresholdCredits: 12,
          scopedRowCount: context.currentStudentTermRows.filter(
            (row) => row.level === "UG",
          ).length,
        },
      });
    },
  },
  {
    ruleId: "DQ-ENR-002",
    implementationRule: "ENROLLMENT_STATUS_VALID",
    domain: "Enrollment",
    title: "Attendance status uses the governed FT/PT code set",
    description: "Attendance status must be F or P in the current source contract.",
    category: "Unknown codes",
    severity: "High",
    owner: "Registrar",
    findingType: DATA_QUALITY_FINDING_TYPES.DATA_DEFECT,
    sourceSystem: "SIS student term",
    sourceFiles: ["student_terms.csv"],
    sourceFields: ["student_terms.attendance_status"],
    scopeDescription: "All student-term rows",
    countSemantics: "Student-term rows with an unrecognized attendance code",
    evaluate(context, rule) {
      const violations = context.studentTerms
        .filter((row) => !["F", "P"].includes(row.attendance_status))
        .map((row) => ({
          student_id: row.student_id,
          term_id: row.term_id,
          attendance_status: row.attendance_status || "(blank)",
        }));
      return evaluatedResult(rule, violations, {
        evidence: { governedCodes: ["F", "P"] },
      });
    },
  },
  {
    ruleId: "DQ-ENR-003",
    implementationRule: "ACTIVE_PROGRAM_REFERENCE",
    domain: "Enrollment",
    title: "Student-term program references are active for the term",
    description: "Every student-term program must exist and be active for that term.",
    category: "Referential integrity",
    severity: "Critical",
    owner: "Registrar",
    findingType: DATA_QUALITY_FINDING_TYPES.DATA_DEFECT,
    sourceSystem: "SIS student term",
    sourceFiles: ["student_terms.csv", "programs.csv"],
    sourceFields: [
      "student_terms.program_id",
      "student_terms.term_id",
      "programs.program_id",
      "programs.active_from",
      "programs.active_to",
    ],
    scopeDescription: "All student-term rows",
    countSemantics: "Student-term rows with a missing or inactive program",
    evaluate(context, rule) {
      const programs = new Map(context.programs.map((row) => [row.program_id, row]));
      const violations = context.studentTerms
        .filter((row) => {
          const program = programs.get(row.program_id);
          return (
            !program ||
            program.active_from > row.term_id ||
            Boolean(program.active_to && program.active_to < row.term_id)
          );
        })
        .map((row) => ({
          student_id: row.student_id,
          term_id: row.term_id,
          program_id: row.program_id,
        }));
      return evaluatedResult(rule, violations);
    },
  },
  {
    ruleId: "DQ-ENR-004",
    implementationRule: "DUPLICATE_ENROLLMENT",
    domain: "Enrollment",
    title: "Student-term-program rows are unique",
    description: "Only one row may exist for a student, term, and program combination.",
    category: "Duplicates",
    severity: "High",
    owner: "Enterprise Systems",
    findingType: DATA_QUALITY_FINDING_TYPES.DATA_DEFECT,
    sourceSystem: "SIS student term",
    sourceFiles: ["student_terms.csv"],
    sourceFields: [
      "student_terms.student_id",
      "student_terms.term_id",
      "student_terms.program_id",
    ],
    scopeDescription: "All student-term rows",
    countSemantics: "Rows after the first occurrence of a duplicate composite key",
    evaluate(context, rule) {
      const seen = new Set();
      const violations = [];
      for (const row of context.studentTerms) {
        const key = `${row.student_id}|${row.term_id}|${row.program_id}`;
        if (seen.has(key)) {
          violations.push({
            student_id: row.student_id,
            term_id: row.term_id,
            program_id: row.program_id,
          });
        } else {
          seen.add(key);
        }
      }
      return evaluatedResult(rule, violations);
    },
  },
  {
    ruleId: "DQ-ENR-008",
    implementationRule: "AGE_AT_ENTRY_RANGE",
    domain: "Enrollment",
    title: "Age at entry is within the governed range",
    description: "Derived age at the entry-term start must be between 14 and 100.",
    category: "Anomalies",
    severity: "Medium",
    owner: "Admissions",
    findingType: DATA_QUALITY_FINDING_TYPES.DATA_DEFECT,
    sourceSystem: "SIS student",
    sourceFiles: ["students.csv", "terms.csv"],
    sourceFields: ["students.birth_year", "students.entry_term_id", "terms.start_date"],
    scopeDescription: "All students with a governed entry term",
    countSemantics: "Student rows with derived age outside 14–100",
    evaluate(context, rule) {
      const terms = new Map(context.terms.map((row) => [row.term_id, row]));
      const violations = context.students
        .filter((row) => {
          const term = terms.get(row.entry_term_id);
          if (!term || !row.birth_year) return false;
          const age = new Date(`${term.start_date}T00:00:00Z`).getUTCFullYear() - Number(row.birth_year);
          return age < 14 || age > 100;
        })
        .map((row) => ({
          student_id: row.student_id,
          birth_year: Number(row.birth_year),
          entry_term_id: row.entry_term_id,
        }));
      return evaluatedResult(rule, violations, {
        evidence: { minimumAge: 14, maximumAge: 100 },
      });
    },
  },
  {
    ruleId: "DQ-ENR-009",
    implementationRule: "TERM_REFERENCE",
    domain: "Enrollment",
    title: "Student-term rows reference governed terms",
    description: "Every student-term term identifier must exist in terms.csv.",
    category: "Referential integrity",
    severity: "Critical",
    owner: "Enterprise Systems",
    findingType: DATA_QUALITY_FINDING_TYPES.DATA_DEFECT,
    sourceSystem: "SIS student term",
    sourceFiles: ["student_terms.csv", "terms.csv"],
    sourceFields: ["student_terms.term_id", "terms.term_id"],
    scopeDescription: "All student-term rows",
    countSemantics: "Student-term rows with an unresolved term foreign key",
    evaluate(context, rule) {
      const termIds = new Set(context.terms.map((row) => row.term_id));
      const violations = context.studentTerms
        .filter((row) => !termIds.has(row.term_id))
        .map((row) => ({ student_id: row.student_id, term_id: row.term_id }));
      return evaluatedResult(rule, violations);
    },
  },
];

