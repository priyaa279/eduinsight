const SOURCE_COLLECTIONS = Object.freeze({
  "institution.csv": "institutions",
  "terms.csv": "terms",
  "programs.csv": "programs",
  "students.csv": "students",
  "student_terms.csv": "studentTerms",
  "sections.csv": "sections",
  "section_enrollments.csv": "sectionEnrollments",
  "completions.csv": "completions",
  "financial_aid.csv": "financialAid",
});

const field = (name, kind = "value", allowBlank = false) => ({
  name,
  kind,
  allowBlank,
});

const RULE_INPUT_CONTRACTS = Object.freeze({
  "DQ-ENR-001": {
    sources: {
      studentTerms: [
        field("student_id", "key"), field("term_id", "key"),
        field("program_id", "key"), field("census_enrolled"),
        field("reportable"), field("level"), field("attendance_status"),
        field("attempted_credits", "number"),
      ],
      terms: [field("term_id", "key"), field("season"), field("is_current")],
    },
    currentAndPriorFall: false,
  },
  "DQ-ENR-002": {
    sources: { studentTerms: [field("student_id", "key"), field("term_id", "key"), field("attendance_status")] },
  },
  "DQ-ENR-003": {
    sources: {
      studentTerms: [field("student_id", "key"), field("term_id", "key"), field("program_id", "key")],
      programs: [field("program_id", "key"), field("active_from", "key"), field("active_to", "value", true)],
    },
  },
  "DQ-ENR-004": {
    sources: { studentTerms: [field("student_id", "key"), field("term_id", "key"), field("program_id", "key")] },
  },
  "DQ-ENR-008": {
    sources: {
      students: [field("student_id", "key"), field("birth_year", "number"), field("entry_term_id", "key")],
      terms: [field("term_id", "key"), field("start_date", "date")],
    },
  },
  "DQ-ENR-009": {
    sources: {
      studentTerms: [field("student_id", "key"), field("term_id", "key")],
      terms: [field("term_id", "key")],
    },
  },
  "DQ-DEM-001": {
    sources: {
      students: [
        field("student_id", "key"), field("race_ethnicity", "value", true),
        field("entry_term_id", "key"), field("primary_program_id", "key"),
      ],
      studentTerms: [
        field("student_id", "key"), field("term_id", "key"),
        field("census_enrolled"), field("reportable"),
      ],
      terms: [field("term_id", "key"), field("season"), field("is_current")],
    },
  },
  "DQ-COM-001": {
    sources: {
      completions: [field("completion_id", "key"), field("student_id", "key"), field("program_id", "key")],
      studentTerms: [field("student_id", "key")],
    },
  },
  "DQ-COM-002": {
    sources: {
      completions: [field("completion_id", "key"), field("program_id", "key")],
      programs: [field("program_id", "key"), field("cip_code", "value", true)],
    },
  },
  "DQ-COM-004": {
    sources: {
      completions: [field("completion_id", "key"), field("student_id", "key"), field("award_date", "date")],
      students: [field("student_id", "key"), field("entry_term_id", "key")],
      terms: [field("term_id", "key"), field("start_date", "date")],
      studentTerms: [field("student_id", "key"), field("term_id", "key")],
    },
  },
  "DQ-AID-001": {
    sources: {
      financialAid: [field("aid_record_id", "key"), field("student_id", "key"), field("term_id", "key")],
      studentTerms: [field("student_id", "key"), field("term_id", "key")],
    },
  },
  "DQ-CRS-001": {
    sources: {
      sections: [field("section_id", "key"), field("term_id", "key"), field("section_capacity", "number")],
      sectionEnrollments: [field("section_id", "key"), field("enrollment_status")],
    },
  },
  "DQ-X-001": {
    sources: {
      students: [field("student_id", "key")],
      terms: [field("term_id", "key")],
      programs: [field("program_id", "key")],
      studentTerms: [field("student_id", "key"), field("term_id", "key"), field("program_id", "key")],
      completions: [field("student_id", "key"), field("program_id", "key")],
      financialAid: [field("student_id", "key"), field("term_id", "key")],
      sections: [field("section_id", "key"), field("term_id", "key"), field("program_id", "key")],
      sectionEnrollments: [field("student_id", "key"), field("section_id", "key"), field("term_id", "key")],
    },
  },
  "DQ-X-004": {
    sources: {
      studentTerms: [
        field("student_id", "key"), field("term_id", "key"),
        field("census_enrolled"), field("reportable"),
      ],
      terms: [field("term_id", "key"), field("season"), field("is_current")],
    },
    currentAndPriorFall: true,
  },
});

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function valueError(value, definition) {
  if (definition.allowBlank && String(value ?? "").trim() === "") return null;
  if (definition.kind === "number") {
    return String(value ?? "").trim() !== "" && Number.isFinite(Number(value))
      ? null
      : "must be a finite parseable number";
  }
  if (definition.kind === "date") return validDate(value) ? null : "must be a valid YYYY-MM-DD date";
  if (definition.kind === "key") {
    return (typeof value === "string" || typeof value === "number") && String(value).trim()
      ? null
      : "must be a usable nonblank key";
  }
  return value === null || value === undefined || typeof value === "object"
    ? "must be a scalar value"
    : null;
}

function sourceFileForCollection(collection) {
  return Object.entries(SOURCE_COLLECTIONS).find(([, name]) => name === collection)?.[0] ?? collection;
}

export function prepareDataQualityContext(context) {
  if (!context || typeof context !== "object" || Array.isArray(context)) return context;
  if (!Array.isArray(context.terms) || !Array.isArray(context.studentTerms)) return context;
  const fallTerms = context.terms
    .filter((term) => term?.season === "Fall")
    .sort((left, right) => String(left.term_id).localeCompare(String(right.term_id)));
  const currentTerm = fallTerms.find((term) => term?.is_current === "1") ?? context.currentTerm;
  const currentIndex = currentTerm
    ? fallTerms.findIndex((term) => term.term_id === currentTerm.term_id)
    : -1;
  const priorTerm = currentIndex > 0 ? fallTerms[currentIndex - 1] : context.priorTerm;
  const currentStudentTermRows = currentTerm
    ? context.studentTerms.filter(
        (row) =>
          row?.term_id === currentTerm.term_id &&
          row?.census_enrolled === "1" &&
          row?.reportable === "1",
      )
    : [];
  return { ...context, currentTerm, priorTerm, currentStudentTermRows };
}

export function validateRuleInput(context, rule) {
  const contract = RULE_INPUT_CONTRACTS[rule.ruleId];
  const requiredSources = rule.sourceFiles ?? [];
  const requiredFields = rule.sourceFields ?? [];
  const errors = [];
  if (!contract) {
    errors.push({
      code: "READINESS_CONTRACT_MISSING",
      message: `${rule.ruleId} has no evaluator input-readiness contract.`,
    });
    return { valid: false, errors, requiredSources, requiredFields };
  }
  if (!context || typeof context !== "object" || Array.isArray(context)) {
    errors.push({ code: "CONTEXT_INVALID", message: `${rule.ruleId} requires an object evaluation context.` });
    return { valid: false, errors, requiredSources, requiredFields };
  }

  for (const [collection, fields] of Object.entries(contract.sources)) {
    const sourceFile = sourceFileForCollection(collection);
    const rows = context[collection];
    if (!Array.isArray(rows)) {
      errors.push({ code: "COLLECTION_INVALID", sourceFile, collection, message: `${sourceFile} is missing or is not an array.` });
      continue;
    }
    if (rows.length === 0) {
      errors.push({ code: "COLLECTION_EMPTY", sourceFile, collection, message: `${sourceFile} is unexpectedly empty.` });
      continue;
    }
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        errors.push({ code: "ROW_INVALID", sourceFile, rowIndex: index, message: `${sourceFile} row ${index + 1} is not an object.` });
        break;
      }
      for (const definition of fields) {
        if (!Object.hasOwn(row, definition.name)) {
          errors.push({ code: "FIELD_MISSING", sourceFile, field: definition.name, rowIndex: index, message: `${sourceFile}.${definition.name} is missing at row ${index + 1}.` });
          continue;
        }
        const problem = valueError(row[definition.name], definition);
        if (problem) {
          errors.push({ code: "VALUE_INVALID", sourceFile, field: definition.name, rowIndex: index, message: `${sourceFile}.${definition.name} ${problem} at row ${index + 1}.` });
        }
      }
      if (errors.length >= 20) break;
    }
    if (errors.length >= 20) break;
  }

  if (contract.currentAndPriorFall) {
    if (!context.currentTerm?.term_id) {
      errors.push({ code: "CURRENT_TERM_UNRESOLVED", sourceFile: "terms.csv", message: "terms.csv does not resolve one current Fall term." });
    }
    if (!context.priorTerm?.term_id) {
      errors.push({ code: "PRIOR_TERM_UNRESOLVED", sourceFile: "terms.csv", message: "terms.csv does not resolve a prior Fall comparison term." });
    }
  } else if (["DQ-ENR-001", "DQ-DEM-001"].includes(rule.ruleId) && !context.currentTerm?.term_id) {
    errors.push({ code: "CURRENT_TERM_UNRESOLVED", sourceFile: "terms.csv", message: "terms.csv does not resolve one current Fall term." });
  }

  return { valid: errors.length === 0, errors, requiredSources, requiredFields };
}

export { RULE_INPUT_CONTRACTS, SOURCE_COLLECTIONS };
