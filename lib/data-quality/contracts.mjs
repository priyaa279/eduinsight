export const DATA_QUALITY_RESULT_STATUSES = Object.freeze({
  PASS: "PASS",
  FAIL: "FAIL",
  NOT_EVALUATED: "NOT_EVALUATED",
});

export const DATA_QUALITY_FINDING_TYPES = Object.freeze({
  DATA_DEFECT: "DATA_DEFECT",
  ANOMALY: "ANOMALY",
});

export function evaluatedResult(rule, violations, options = {}) {
  const metadata = { ...rule };
  delete metadata.evaluate;
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
  };
}

export function notEvaluatedResult(rule, reasonNotEvaluated) {
  return {
    ...rule,
    status: DATA_QUALITY_RESULT_STATUSES.NOT_EVALUATED,
    violationCount: null,
    evidence: {},
    sampleRows: [],
    reasonNotEvaluated,
  };
}
