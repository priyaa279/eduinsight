import { DATA_QUALITY_FINDING_TYPES, evaluatedResult } from "../contracts.mjs";

export const completionRules = [
  {
    ruleId: "DQ-COM-001",
    implementationRule: "COMPLETION_WITH_ENROLLMENT",
    domain: "Completions",
    title: "Completers have enrollment history",
    description: "Every completion student must appear in student-term enrollment history.",
    category: "Referential integrity",
    severity: "Critical",
    owner: "Registrar",
    findingType: DATA_QUALITY_FINDING_TYPES.DATA_DEFECT,
    sourceSystem: "SIS degree history",
    sourceFiles: ["completions.csv", "student_terms.csv"],
    sourceFields: ["completions.student_id", "student_terms.student_id"],
    scopeDescription: "All completion rows",
    countSemantics: "Completion rows whose student has no enrollment history",
    evaluate(context, rule) {
      const enrolledStudentIds = new Set(context.studentTerms.map((row) => row.student_id));
      const violations = context.completions
        .filter((row) => !enrolledStudentIds.has(row.student_id))
        .map((row) => ({
          completion_id: row.completion_id,
          student_id: row.student_id,
          program_id: row.program_id,
        }));
      return evaluatedResult(rule, violations);
    },
  },
  {
    ruleId: "DQ-COM-002",
    implementationRule: "CIP_FORMAT_VALID",
    domain: "Completions",
    title: "Completion CIP codes use the governed format",
    description: "The completion program CIP must use numeric xx.xxxx format.",
    category: "Invalid values",
    severity: "High",
    owner: "Academic Affairs",
    findingType: DATA_QUALITY_FINDING_TYPES.DATA_DEFECT,
    sourceSystem: "SIS degree history",
    sourceFiles: ["completions.csv", "programs.csv"],
    sourceFields: ["completions.program_id", "programs.program_id", "programs.cip_code"],
    scopeDescription: "All completion rows joined to their governed program",
    countSemantics: "Completion rows with a missing or malformed program CIP",
    evaluate(context, rule) {
      const programs = new Map(context.programs.map((row) => [row.program_id, row]));
      const violations = context.completions
        .filter((row) => !/^\d{2}\.\d{4}$/.test(programs.get(row.program_id)?.cip_code ?? ""))
        .map((row) => ({
          completion_id: row.completion_id,
          program_id: row.program_id,
          cip_code: programs.get(row.program_id)?.cip_code || "(missing)",
        }));
      return evaluatedResult(rule, violations, {
        evidence: { requiredFormat: "xx.xxxx" },
      });
    },
  },
  {
    ruleId: "DQ-COM-004",
    implementationRule: "COMPLETION_TIMELINE",
    findingId: "DQ-COM-004",
    domain: "Completions",
    title: "Completion date precedes the governed entry-term start",
    description:
      "A completion award date cannot be earlier than the start date of the student's governed entry term.",
    category: "Invalid values",
    severity: "High",
    owner: "Registrar",
    findingType: DATA_QUALITY_FINDING_TYPES.DATA_DEFECT,
    sourceSystem: "SIS degree history",
    sourceFiles: ["completions.csv", "students.csv", "terms.csv"],
    sourceFields: [
      "completions.completion_id",
      "completions.student_id",
      "completions.award_date",
      "students.entry_term_id",
      "terms.start_date",
    ],
    scopeDescription:
      "Completion rows under the single-career source contract with a resolvable first institutional entry term",
    countSemantics: "Completion rows where award_date is earlier than entry-term start_date",
    applicabilityLimitation:
      "Current demo assumption: entry_term_id represents first institutional entry in this synthetic single-career dataset. A production implementation would require career/program-specific entry logic.",
    evaluate(context, rule) {
      const students = new Map(context.students.map((row) => [row.student_id, row]));
      const terms = new Map(context.terms.map((row) => [row.term_id, row]));
      const firstEnrollmentTerm = new Map();
      for (const row of context.studentTerms) {
        const prior = firstEnrollmentTerm.get(row.student_id);
        if (!prior || row.term_id < prior) {
          firstEnrollmentTerm.set(row.student_id, row.term_id);
        }
      }
      const violations = context.completions
        .filter((row) => {
          const student = students.get(row.student_id);
          const term = student ? terms.get(student.entry_term_id) : null;
          if (!term?.start_date || !row.award_date) return false;
          return new Date(`${row.award_date}T00:00:00Z`) < new Date(`${term.start_date}T00:00:00Z`);
        })
        .map((row) => {
          const student = students.get(row.student_id);
          const term = terms.get(student.entry_term_id);
          return {
            completion_id: row.completion_id,
            student_id: row.student_id,
            award_date: row.award_date,
            entry_term_id: student.entry_term_id,
            entry_term_start_date: term.start_date,
          };
        });
      return evaluatedResult(rule, violations, {
        evidence: {
          entryDateDerivation: "terms.start_date for students.entry_term_id",
          entryTermContract:
            "students.entry_term_id is the first institutional entry in this single-career source model",
          comparison: "completions.award_date < terms.start_date",
          entryContractMismatchCount: context.students.filter(
            (row) => firstEnrollmentTerm.get(row.student_id) !== row.entry_term_id,
          ).length,
          violationsWithEarlierEnrollment: violations.filter((row) =>
            context.studentTerms.some(
              (termRow) =>
                termRow.student_id === row.student_id &&
                termRow.term_id < row.entry_term_id,
            ),
          ).length,
          unresolvedRowsExcluded: context.completions.filter((row) => {
            const student = students.get(row.student_id);
            return !student || !terms.get(student.entry_term_id);
          }).length,
        },
      });
    },
  },
];
