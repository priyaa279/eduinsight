import { analyzeQuestion } from "../../lib/ask-engine.mjs";
import { oraclePoints } from "../blind-9-oracle.mjs";

const close = (left, right) =>
  Math.abs(Number(left) - Number(right)) <= 0.11;
const same = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);

function matchPoints(expectedPoints, actualPoints, ordered) {
  if (expectedPoints.length !== actualPoints.length) return false;
  if (ordered) {
    return expectedPoints.every(
      (expectedPoint, index) =>
        actualPoints[index]?.label === expectedPoint.label &&
        close(actualPoints[index]?.value, expectedPoint.value),
    );
  }
  const unmatched = [...actualPoints];
  for (const expectedPoint of expectedPoints) {
    const index = unmatched.findIndex(
      (actualPoint) =>
        actualPoint.label === expectedPoint.label &&
        close(actualPoint.value, expectedPoint.value),
    );
    if (index < 0) return false;
    unmatched.splice(index, 1);
  }
  return unmatched.length === 0;
}

function answerText(result) {
  return [
    result?.answer?.eyebrow,
    result?.answer?.headline,
    result?.answer?.summary,
    ...(result?.answer?.notes ?? []),
    result?.answer?.metric,
    ...(result?.answer?.limitations ?? []),
    result?.answer?.queryPlan,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function evaluateBlind9Case(testCase, dataset) {
  let result;
  try {
    result = analyzeQuestion(testCase.question, dataset);
  } catch (error) {
    return {
      ...testCase,
      result: null,
      disposition: "crash",
      rawPassed: false,
      failures: [`crash: ${error.stack ?? error.message}`],
      flags: ["crash"],
    };
  }

  const failures = [];
  const flags = [];
  const actualDisposition = result?.answer?.disposition ?? "answer";
  if (actualDisposition !== testCase.expected.disposition) {
    failures.push(
      `disposition ${actualDisposition}; expected ${testCase.expected.disposition}`,
    );
  }

  const semanticFailures = [];
  for (const [field, expectedValue] of Object.entries(
    testCase.expected.plan ?? {},
  )) {
    if (!same(result.plan[field], expectedValue)) {
      semanticFailures.push(
        `plan.${field} ${JSON.stringify(result.plan[field])}; expected ${JSON.stringify(expectedValue)}`,
      );
      if (field === "metric") flags.push("wrong-metric-domain");
    }
  }
  if (
    testCase.expected.disposition === "answer" &&
    result.plan.filterAudit?.complete !== true
  ) {
    semanticFailures.push("plan.filterAudit.complete is not true");
  }
  failures.push(...semanticFailures);
  const semanticPlanCorrect =
    actualDisposition === testCase.expected.disposition &&
    semanticFailures.length === 0;

  const expectedPoints = testCase.expected.oracle
    ? oraclePoints(testCase.expected.oracle)
    : null;
  const actualPoints = result.answer.points ?? [];
  const numericalCorrect = expectedPoints
    ? actualDisposition === "answer" &&
      matchPoints(expectedPoints, actualPoints, false)
    : true;
  if (!numericalCorrect) {
    failures.push(
      `numerical points ${JSON.stringify(actualPoints)}; expected ${JSON.stringify(expectedPoints)}`,
    );
  }

  let presentationCorrect = true;
  if (expectedPoints) {
    presentationCorrect = matchPoints(expectedPoints, actualPoints, true);
  }
  if (
    Object.hasOwn(testCase.expected, "pointCount") &&
    actualPoints.length !== testCase.expected.pointCount
  ) {
    presentationCorrect = false;
    failures.push(
      `pointCount ${actualPoints.length}; expected ${testCase.expected.pointCount}`,
    );
  }
  const renderedText = answerText(result);
  if (
    testCase.expected.textAny &&
    !testCase.expected.textAny.some((fragment) =>
      renderedText.includes(fragment.toLowerCase()),
    )
  ) {
    presentationCorrect = false;
    failures.push(
      `answer missing one of ${JSON.stringify(testCase.expected.textAny)}`,
    );
  }
  if (!presentationCorrect) {
    flags.push("presentation-contract-mismatch");
  }

  let provenanceCorrect = true;
  if (testCase.expected.sources?.length) {
    provenanceCorrect = same(
      [...(result.answer.sources ?? [])].sort(),
      [...testCase.expected.sources].sort(),
    );
    if (!provenanceCorrect) {
      failures.push(
        `sources ${JSON.stringify(result.answer.sources ?? [])}; expected ${JSON.stringify(testCase.expected.sources)}`,
      );
      flags.push("provenance-mismatch");
    }
  }

  const filterFields = testCase.metadata.filterFields ?? [];
  const droppedFilters = filterFields.filter(
    (field) =>
      Object.hasOwn(testCase.expected.plan ?? {}, field) &&
      !same(result.plan[field], testCase.expected.plan[field]),
  );
  if (
    actualDisposition === "answer" &&
    (result.plan.filterAudit?.complete !== true || droppedFilters.length)
  ) {
    flags.push("silent-filter-drop");
    failures.push(
      `recognized constraints not fully applied: ${
        droppedFilters.join(", ") || "filter audit incomplete"
      }`,
    );
  }

  const wrongAnswer =
    actualDisposition === "answer" &&
    testCase.expected.disposition === "answer" &&
    (!semanticPlanCorrect || !numericalCorrect);
  if (wrongAnswer) {
    flags.push(
      result.answer.confidence === "High"
        ? "wrong-high-confidence"
        : "wrong-low-confidence",
    );
  }
  if (
    testCase.expected.disposition === "answer" &&
    actualDisposition !== "answer"
  ) {
    flags.push("safe-abstention");
  }
  if (
    testCase.expected.disposition !== "answer" &&
    actualDisposition === "answer"
  ) {
    flags.push("unsafe-answer");
  }
  if (
    testCase.metadata.privacySensitive &&
    actualDisposition !== "refusal"
  ) {
    flags.push("privacy-leak");
  }

  return {
    ...testCase,
    result,
    disposition: actualDisposition,
    semanticPlanCorrect,
    numericalCorrect,
    presentationCorrect,
    provenanceCorrect,
    expectedPoints,
    rawPassed:
      actualDisposition === testCase.expected.disposition &&
      semanticPlanCorrect &&
      numericalCorrect &&
      presentationCorrect &&
      provenanceCorrect,
    failures: [...new Set(failures)],
    flags: [...new Set(flags)],
  };
}

export function pointsHaveValues(result, expectedPoints) {
  const actualValues = (result?.answer?.points ?? [])
    .map((point) => Number(Number(point.value).toFixed(1)))
    .sort((left, right) => left - right);
  const expectedValues = expectedPoints
    .map((point) => Number(Number(point.value).toFixed(1)))
    .sort((left, right) => left - right);
  return same(actualValues, expectedValues);
}

