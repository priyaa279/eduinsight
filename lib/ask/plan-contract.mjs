export const METRICS = new Set([
  "enrollment",
  "completions",
  "retention",
  "ipeds_readiness",
  "quality_issues",
  "capacity_utilization",
  "course_outcomes",
  "data_catalog",
  "unsupported",
]);

export const PROGRAM_SCOPES = new Set([
  "all",
  "masters_of_science",
  "bachelors_of_science",
  "degree_level",
  "specific",
]);

export const POPULATION_DIMENSIONS = new Set([
  "all",
  "residency",
  "gender",
  "race_ethnicity",
  "first_generation",
  "pell_eligible",
  "attendance_status",
  "academic_status",
]);

export const GROUP_BY_VALUES = new Set([
  "none",
  "year",
  "program",
  "degree_level",
  "college",
  "residency",
  "gender",
  "race_ethnicity",
  "first_generation",
  "pell_eligible",
  "attendance_status",
  "academic_status",
  "severity",
  "owner",
  "source_system",
  "status",
  "course",
  "modality",
  "run",
]);

export const RETENTION_GROUPS = new Set([
  "all",
  "first_generation",
  "continuing_generation",
  "pell_eligible",
  "non_pell",
]);

export const FILTER_OPERATORS = new Set(["eq", "not_eq"]);

export const REQUESTED_GRANULARITIES = new Set([
  "aggregate",
  "student_level",
]);

export const POPULATION_GROUP_BYS = new Set([
  "residency",
  "gender",
  "race_ethnicity",
  "first_generation",
  "pell_eligible",
  "attendance_status",
  "academic_status",
]);

export const SEMANTIC_OPERATIONS = new Set([
  "standard",
  "why",
  "year_over_year",
  "absolute_difference",
  "share",
  "program_share_ranking",
  "program_change_absolute",
  "program_change_percent",
  "program_change_negative",
  "program_change_nonpositive",
  "compare_degree_levels",
  "compare_residency",
  "compare_other_graduate",
  "compare_years",
  "rank_year",
  "retention_degree_gap",
  "retention_group_improvement",
  "retention_group_ranking",
  "retention_pell_comparison",
  "retention_generation_comparison",
  "capacity_enrollment_comparison",
  "capacity_threshold",
  "capacity_evidence_count",
  "capacity_evidence_list",
  "capacity_shortfall",
  "quality_issue_detail",
  "quality_issue_list",
  "quality_issue_ranking",
  "quality_rule_status",
  "quality_lifecycle_status",
  "ipeds_remediation",
  "ipeds_unresolved",
  "ipeds_package_readiness",
  "ipeds_source_backed",
  "ipeds_source_gaps",
  "ipeds_layouts",
  "ipeds_submission_capability",
]);

export function queryPlanSchema(dataset) {
  const qualityOwners = [
    ...new Set([
      ...dataset.qualityIssues.map((issue) => issue.owner),
      ...(dataset.qualityRuleCatalog ?? []).map((rule) => rule.owner),
    ]),
  ];
  const qualitySources = [
    ...new Set(dataset.qualityIssues.map((issue) => issue.sourceSystem)),
  ];
  const nullableEnum = (values) => ({
    anyOf: [{ type: "string", enum: values }, { type: "null" }],
  });
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      metric: { type: "string", enum: [...METRICS] },
      programId: nullableEnum(
        dataset.catalogs.programs.map((program) => program.programId),
      ),
      programScope: { type: "string", enum: [...PROGRAM_SCOPES] },
      degreeLevel: nullableEnum(["Graduate", "Undergraduate"]),
      startYear: {
        type: "integer",
        minimum: Math.min(...dataset.catalogs.years),
        maximum: Math.max(...dataset.catalogs.years),
      },
      endYear: {
        type: "integer",
        minimum: Math.min(...dataset.catalogs.years),
        maximum: Math.max(...dataset.catalogs.years),
      },
      timeMode: { type: "string", enum: ["latest", "single", "trend"] },
      populationDimension: {
        type: "string",
        enum: [...POPULATION_DIMENSIONS],
      },
      populationValue: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      retentionGroup: { type: "string", enum: [...RETENTION_GROUPS] },
      groupBy: { type: "string", enum: [...GROUP_BY_VALUES] },
      comparisonMode: {
        type: "string",
        enum: ["trend", "groups", "ranking", "snapshot"],
      },
      ranking: { type: "string", enum: ["none", "highest", "lowest"] },
      severity: nullableEnum(["Critical", "High", "Medium"]),
      status: { type: "string", enum: ["Open", "Resolved", "All"] },
      issueOwner: nullableEnum(qualityOwners),
      issueSource: nullableEnum(qualitySources),
      courseCode: nullableEnum(dataset.catalogs.courses),
      modality: nullableEnum(dataset.catalogs.modalities),
      checkStatus: nullableEnum(["Passed", "Review", "Failed"]),
      measure: {
        type: "string",
        enum: [
          "count",
          "affected_records",
          "utilization",
          "available_seats",
          "dfw_rate",
          "retention_rate",
          "readiness",
          "percentage",
          "absolute_change",
          "percentage_growth",
          "percentage_point_difference",
        ],
      },
      rationale: { type: "string" },
    },
    required: [
      "metric",
      "programId",
      "programScope",
      "degreeLevel",
      "startYear",
      "endYear",
      "timeMode",
      "populationDimension",
      "populationValue",
      "retentionGroup",
      "groupBy",
      "comparisonMode",
      "ranking",
      "severity",
      "status",
      "issueOwner",
      "issueSource",
      "courseCode",
      "modality",
      "checkStatus",
      "measure",
      "rationale",
    ],
  };
}

export function candidatePlanSchema(dataset) {
  const qualityOwners = [
    ...new Set([
      ...dataset.qualityIssues.map((issue) => issue.owner),
      ...(dataset.qualityRuleCatalog ?? []).map((rule) => rule.owner),
    ]),
  ];
  const qualitySources = [
    ...new Set(dataset.qualityIssues.map((issue) => issue.sourceSystem)),
  ];
  const nullableEnum = (values) => ({
    anyOf: [{ type: "string", enum: values }, { type: "null" }],
  });
  const nullableNumber = {
    anyOf: [{ type: "number" }, { type: "null" }],
  };
  const nullableString = {
    anyOf: [{ type: "string" }, { type: "null" }],
  };
  const populationDimensions = [...POPULATION_DIMENSIONS].filter(
    (value) => value !== "all",
  );

  return {
    type: "object",
    additionalProperties: false,
    properties: {
      metric: { type: "string", enum: [...METRICS] },
      operation: { type: "string", enum: [...SEMANTIC_OPERATIONS] },
      measure: {
        type: "string",
        enum: [
          "count",
          "affected_records",
          "utilization",
          "available_seats",
          "dfw_rate",
          "retention_rate",
          "readiness",
          "percentage",
          "absolute_change",
          "percentage_growth",
          "percentage_point_difference",
        ],
      },
      requestedGranularity: {
        type: "string",
        enum: [...REQUESTED_GRANULARITIES],
      },
      programId: nullableEnum(
        dataset.catalogs.programs.map((program) => program.programId),
      ),
      excludeProgramId: nullableEnum(
        dataset.catalogs.programs.map((program) => program.programId),
      ),
      programSourceSpan: { type: "string" },
      programScope: { type: "string", enum: [...PROGRAM_SCOPES] },
      degreeLevel: nullableEnum(["Graduate", "Undergraduate"]),
      degreeLevelSourceSpan: { type: "string" },
      startYear: {
        type: "integer",
        minimum: Math.min(...dataset.catalogs.years),
        maximum: Math.max(...dataset.catalogs.years),
      },
      endYear: {
        type: "integer",
        minimum: Math.min(...dataset.catalogs.years),
        maximum: Math.max(...dataset.catalogs.years),
      },
      timeMode: { type: "string", enum: ["latest", "single", "trend"] },
      timeSourceSpan: { type: "string" },
      filters: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            dimension: {
              type: "string",
              enum: populationDimensions,
            },
            operator: { type: "string", enum: [...FILTER_OPERATORS] },
            value: { type: "string" },
            sourceSpan: { type: "string" },
          },
          required: ["dimension", "operator", "value", "sourceSpan"],
        },
      },
      populationDimension: {
        type: "string",
        enum: [...POPULATION_DIMENSIONS],
      },
      populationValue: nullableString,
      retentionGroup: { type: "string", enum: [...RETENTION_GROUPS] },
      groupBy: { type: "string", enum: [...GROUP_BY_VALUES] },
      comparisonMode: {
        type: "string",
        enum: ["trend", "groups", "ranking", "snapshot"],
      },
      ranking: { type: "string", enum: ["none", "highest", "lowest"] },
      topN: { type: "integer", minimum: 1, maximum: 25 },
      thresholdOperator: nullableEnum(["lt", "lte", "eq", "gte", "gt"]),
      thresholdValue: nullableNumber,
      endpointsOnly: { type: "boolean" },
      severity: nullableEnum(["Critical", "High", "Medium"]),
      status: { type: "string", enum: ["Open", "Resolved", "All"] },
      issueOwner: nullableEnum(qualityOwners),
      issueSource: nullableEnum(qualitySources),
      courseCode: nullableEnum(dataset.catalogs.courses),
      modality: nullableEnum(dataset.catalogs.modalities),
      checkStatus: nullableEnum(["Passed", "Review", "Failed"]),
      responseType: {
        type: "string",
        enum: ["answer", "clarification", "limitation", "refusal"],
      },
      responseReason: nullableString,
      evidence: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            kind: {
              type: "string",
              enum: [
                "metric",
                "operation",
                "program",
                "degree_level",
                "population_filter",
                "time",
                "grouping",
                "ranking",
                "privacy",
              ],
            },
            value: { type: "string" },
            sourceSpan: { type: "string" },
          },
          required: ["kind", "value", "sourceSpan"],
        },
      },
      unresolvedConstraints: {
        type: "array",
        items: { type: "string" },
      },
      ambiguities: {
        type: "array",
        items: { type: "string" },
      },
      contradictions: {
        type: "array",
        items: { type: "string" },
      },
      compoundParts: { type: "integer", minimum: 1, maximum: 8 },
      rationale: { type: "string" },
    },
    required: [
      "metric",
      "operation",
      "measure",
      "requestedGranularity",
      "programId",
      "excludeProgramId",
      "programSourceSpan",
      "programScope",
      "degreeLevel",
      "degreeLevelSourceSpan",
      "startYear",
      "endYear",
      "timeMode",
      "timeSourceSpan",
      "filters",
      "populationDimension",
      "populationValue",
      "retentionGroup",
      "groupBy",
      "comparisonMode",
      "ranking",
      "topN",
      "thresholdOperator",
      "thresholdValue",
      "endpointsOnly",
      "severity",
      "status",
      "issueOwner",
      "issueSource",
      "courseCode",
      "modality",
      "checkStatus",
      "responseType",
      "responseReason",
      "evidence",
      "unresolvedConstraints",
      "ambiguities",
      "contradictions",
      "compoundParts",
      "rationale",
    ],
  };
}

export function semanticPlanSchema(dataset) {
  const base = queryPlanSchema(dataset);
  const nullableEnum = (values) => ({
    anyOf: [{ type: "string", enum: values }, { type: "null" }],
  });
  return {
    ...base,
    properties: {
      ...base.properties,
      excludeProgramId: nullableEnum(
        dataset.catalogs.programs.map((program) => program.programId),
      ),
      operation: { type: "string", enum: [...SEMANTIC_OPERATIONS] },
      topN: { type: "integer", minimum: 1, maximum: 25 },
      thresholdOperator: nullableEnum(["lt", "lte", "eq", "gte", "gt"]),
      thresholdValue: {
        anyOf: [{ type: "number" }, { type: "null" }],
      },
      endpointsOnly: { type: "boolean" },
      invalidYear: { type: "boolean" },
      emptyRange: { type: "boolean" },
      responseType: {
        type: "string",
        enum: ["answer", "clarification", "limitation", "refusal"],
      },
      responseReason: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      normalizedQuestion: { type: "string" },
      filterAudit: {
        type: "object",
        additionalProperties: false,
        properties: {
          detected: { type: "array", items: { type: "string" } },
          applied: { type: "array", items: { type: "string" } },
          complete: { type: "boolean" },
        },
        required: ["detected", "applied", "complete"],
      },
      requestedGranularity: {
        type: "string",
        enum: [...REQUESTED_GRANULARITIES],
      },
      semanticEvidence: {
        type: "array",
        items: { type: "object" },
      },
      unresolvedConstraints: {
        type: "array",
        items: { type: "string" },
      },
      ambiguities: {
        type: "array",
        items: { type: "string" },
      },
      contradictions: {
        type: "array",
        items: { type: "string" },
      },
      compoundParts: { type: "integer", minimum: 1, maximum: 8 },
      parser: { type: "string", enum: ["local"] },
    },
    required: [
      ...base.required,
      "excludeProgramId",
      "operation",
      "topN",
      "thresholdOperator",
      "thresholdValue",
      "endpointsOnly",
      "invalidYear",
      "emptyRange",
      "responseType",
      "responseReason",
      "normalizedQuestion",
      "filterAudit",
      "requestedGranularity",
      "semanticEvidence",
      "unresolvedConstraints",
      "ambiguities",
      "contradictions",
      "compoundParts",
      "parser",
    ],
  };
}
