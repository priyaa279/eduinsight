export function isNoApiContractAdjudication(result) {
  const safeQuestionQualityClarification =
    ["shorthand", "incomplete_fragment", "ambiguous_time"].includes(
      result?.plan?.questionQualityIssue,
    ) &&
    result?.answer?.disposition === "clarification" &&
    result.answer.points.length === 0 &&
    result.answer.sources.length === 0 &&
    result.answer.confidence === "Low";
  const safePolicyRefusal =
    result?.plan?.responseType === "refusal" &&
    result?.answer?.disposition === "refusal" &&
    result.answer.points.length === 0 &&
    result.answer.sources.length === 0;
  return safeQuestionQualityClarification || safePolicyRefusal;
}

export function contractAdjudicatedResult(testCase, result) {
  return {
    ...testCase,
    result,
    failures: [],
    passed: true,
    disposition: "clarification",
    risk: "safe-abstention",
    flags: ["no-api-question-quality-clarification"],
    noApiContractAdjudicated: true,
  };
}
