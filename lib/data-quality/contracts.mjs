export const DATA_QUALITY_RESULT_STATUSES = Object.freeze({
  PASS: "PASS",
  FAIL: "FAIL",
  NOT_EVALUATED: "NOT_EVALUATED",
});

export const DATA_QUALITY_FINDING_TYPES = Object.freeze({
  DATA_DEFECT: "DATA_DEFECT",
  ANOMALY: "ANOMALY",
});

export const DATA_QUALITY_REASON_CODES = Object.freeze({
  SOURCE_CAPABILITY_UNAVAILABLE: "SOURCE_CAPABILITY_UNAVAILABLE",
  SOURCE_INVALID: "SOURCE_INVALID",
  EVALUATION_ERROR: "EVALUATION_ERROR",
});

function resultMetadata(rule) {
  const metadata = { ...rule };
  delete metadata.evaluate;
  return metadata;
}

export function evaluatedResult(rule, violations, options = {}) {
  const metadata = resultMetadata(rule);
  const violationCount = Number(options.violationCount ?? violations.length);
  return {
    ...metadata,
    status:
      violationCount > 0
        ? DATA_QUALITY_RESULT_STATUSES.FAIL
        : DATA_QUALITY_RESULT_STATUSES.PASS,
    violationCount,
    evidence: options.evidence ?? {},
    sampleRows: violations.slice(0, options.sampleLimit ?? 5),
    reasonNotEvaluated: null,
    reasonCode: null,
    evaluationErrors: [],
  };
}

export function notEvaluatedResult(rule, reasonNotEvaluated, options = {}) {
  return {
    ...resultMetadata(rule),
    status: DATA_QUALITY_RESULT_STATUSES.NOT_EVALUATED,
    violationCount: null,
    evidence: {},
    sampleRows: [],
    reasonNotEvaluated,
    reasonCode:
      options.reasonCode ?? DATA_QUALITY_REASON_CODES.SOURCE_CAPABILITY_UNAVAILABLE,
    requiredSources: options.requiredSources ?? [],
    requiredFields: options.requiredFields ?? [],
    requiredCapabilities: options.requiredCapabilities ?? [],
    evaluationErrors: options.evaluationErrors ?? [],
  };
}

export function sourceInvalidResult(rule, validation, reasonCode) {
  const errors = Array.isArray(validation?.errors) ? validation.errors : [];
  const summary = errors.length
    ? errors.map((error) => error.message).join("; ")
    : "The required source evidence is structurally invalid.";
  return notEvaluatedResult(rule, summary, {
    reasonCode,
    requiredSources: validation?.requiredSources ?? rule.sourceFiles ?? [],
    requiredFields: validation?.requiredFields ?? rule.sourceFields ?? [],
    evaluationErrors: errors,
  });
}
