import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { analyzeQuestion } from "../lib/ask-engine.mjs";
import {
  cases,
  EXPECTED_CATEGORY_COUNTS,
} from "./ask-engine-blind-10-suite.mjs";
import {
  dataset,
  oraclePoints,
  round1,
} from "./blind-10-oracle.mjs";

const testDirectory = fileURLToPath(new URL(".", import.meta.url));
const workspaceDirectory = path.resolve(testDirectory, "..");
const sealPath = path.join(testDirectory, "blind-10-seal.json");
const reportPath = path.join(
  testDirectory,
  "reports",
  "blind-10-first-run.md",
);
const seal = JSON.parse(await fs.readFile(sealPath, "utf8"));
const sha256 = (buffer) =>
  crypto.createHash("sha256").update(buffer).digest("hex");
const close = (left, right) =>
  Math.abs(Number(left) - Number(right)) <= 0.11;
const same = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);

assert.equal(seal.blindSet, 10, "Blind #10 seal has the wrong set number.");
assert.equal(cases.length, 225, "Blind #10 must contain exactly 225 cases.");
for (const [category, expectedCount] of Object.entries(
  EXPECTED_CATEGORY_COUNTS,
)) {
  assert.equal(
    cases.filter((testCase) => testCase.category === category).length,
    expectedCount,
    `Blind #10 category ${category} changed.`,
  );
}
for (const [relativePath, expectedHash] of Object.entries(seal.files)) {
  const actualHash = sha256(
    await fs.readFile(path.join(workspaceDirectory, relativePath)),
  );
  assert.equal(
    actualHash,
    expectedHash,
    `${relativePath} changed after Blind #10 was sealed.`,
  );
}
for (const [relativePath, expectedHash] of Object.entries(
  seal.frozenBoundary,
)) {
  const actualHash = sha256(
    await fs.readFile(path.join(workspaceDirectory, relativePath)),
  );
  assert.equal(
    actualHash,
    expectedHash,
    `${relativePath} changed after the Blind #10 freeze.`,
  );
}
const suiteBundleSha = sha256(
  Buffer.concat(
    seal.suiteFiles.map((relativePath) =>
      Buffer.from(seal.files[relativePath], "utf8"),
    ),
  ),
);
assert.equal(
  suiteBundleSha,
  seal.suiteBundleSha256,
  "Blind #10 suite-bundle seal is inconsistent.",
);
try {
  await fs.access(reportPath);
  throw new Error(
    "Blind #10 first-run report already exists; use a separate reviewed regression runner later.",
  );
} catch (error) {
  if (error.code !== "ENOENT") throw error;
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

function evaluate(testCase) {
  let result;
  try {
    result = analyzeQuestion(testCase.question, dataset);
  } catch (error) {
    return {
      ...testCase,
      result: null,
      disposition: "crash",
      passed: false,
      semanticPlanCorrect: false,
      numericalCorrect: false,
      presentationCorrect: false,
      provenanceCorrect: false,
      failures: [`crash: ${error.stack ?? error.message}`],
      flags: ["crash"],
    };
  }

  const failures = [];
  const flags = [];
  const actualDisposition = result?.answer?.disposition ?? "answer";
  const dispositionCorrect =
    actualDisposition === testCase.expected.disposition;
  if (!dispositionCorrect) {
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
    dispositionCorrect && semanticFailures.length === 0;

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

  const passed =
    dispositionCorrect &&
    semanticPlanCorrect &&
    numericalCorrect &&
    presentationCorrect &&
    provenanceCorrect;
  return {
    ...testCase,
    result,
    disposition: actualDisposition,
    passed,
    semanticPlanCorrect,
    numericalCorrect,
    presentationCorrect,
    provenanceCorrect,
    failures: [...new Set(failures)],
    flags: [...new Set(flags)],
  };
}

const results = cases.map(evaluate);
const passed = results.filter((result) => result.passed);
const failed = results.filter((result) => !result.passed);
const supported = results.filter(
  (result) => result.metadata.supportedQuestion,
);
const supportedPassed = supported.filter((result) => result.passed);
const numerical = results.filter(
  (result) => result.metadata.supportedNumerical,
);
const numericalPassed = numerical.filter(
  (result) => result.numericalCorrect && result.semanticPlanCorrect,
);
const privacy = results.filter(
  (result) => result.metadata.privacySensitive,
);
const privacyPassed = privacy.filter(
  (result) =>
    result.disposition === "refusal" &&
    result.result?.answer?.points?.length === 0,
);
const ambiguity = results.filter(
  (result) => result.metadata.ambiguityExpected,
);
const ambiguityPassed = ambiguity.filter(
  (result) => result.disposition === "clarification",
);
const rephrases = results.filter(
  (result) => result.metadata.rephraseExpected,
);
const rephrasesPassed = rephrases.filter(
  (result) => result.disposition === "clarification",
);
const unsupported = results.filter(
  (result) => result.metadata.unsupportedHandling,
);
const unsupportedPassed = unsupported.filter(
  (result) => result.disposition === "limitation",
);
const contradictions = results.filter(
  (result) => result.metadata.contradictionExpected,
);
const contradictionsPassed = contradictions.filter(
  (result) => result.disposition === "clarification",
);
const safeFailure = results.filter(
  (result) => result.expected.disposition !== "answer",
);
const safeFailurePassed = safeFailure.filter((result) => result.passed);
const flagCount = (flag) =>
  results.filter((result) => result.flags.includes(flag)).length;
const percentage = round1((passed.length / results.length) * 100);
const supportedPercentage = round1(
  (supportedPassed.length / supported.length) * 100,
);
const numericalPercentage = round1(
  (numericalPassed.length / numerical.length) * 100,
);
const privacyPercentage = round1(
  (privacyPassed.length / privacy.length) * 100,
);

const gates = {
  "Overall score is at least 95%": percentage >= 95,
  "Confidently wrong answers are zero":
    flagCount("wrong-high-confidence") === 0,
  "Silent filter drops are zero": flagCount("silent-filter-drop") === 0,
  "Privacy-sensitive handling is 100%":
    privacyPassed.length === privacy.length,
  "Privacy leaks are zero": flagCount("privacy-leak") === 0,
  "Crashes are zero": flagCount("crash") === 0,
  "Clear supported questions are correct":
    supportedPassed.length === supported.length,
  "Safe-failure requests are handled correctly":
    safeFailurePassed.length === safeFailure.length,
};
const reliabilityPass = Object.values(gates).every(Boolean);

const report = [
  "# EduInsight Blind Set #10 — untouched first run",
  "",
  `- Executed: ${new Date().toISOString()}`,
  `- Frozen Git commit: \`${seal.frozenGitCommit}\``,
  `- Frozen Git tag: \`${seal.frozenGitTag}\``,
  `- Suite bundle SHA-256: \`${suiteBundleSha}\``,
  `- Suite file SHA-256: \`${seal.files["tests/ask-engine-blind-10-suite.mjs"]}\``,
  `- Oracle wrapper SHA-256: \`${seal.files["tests/blind-10-oracle.mjs"]}\``,
  `- Frozen boundary bundle SHA-256: \`${seal.frozenBoundaryBundleSha256}\``,
  `- Score: **${passed.length}/${results.length} (${percentage}%)**`,
  `- Reliability-gate result: **${reliabilityPass ? "PASS" : "FAIL"}**`,
  "- Policy: the local parser, validators, governed dataset, privacy rules, known release bank, suite, and oracle were sealed before execution.",
  "- Remediation: none performed.",
  "- Rerun: prohibited until user review; this report is write-once.",
  "",
  "## Outcome classification",
  "",
  `- Correct governed answers: ${supportedPassed.length}/${supported.length} (${supportedPercentage}%)`,
  `- Supported numerical correctness: ${numericalPassed.length}/${numerical.length} (${numericalPercentage}%)`,
  `- Safe targeted clarifications: ${ambiguityPassed.length}/${ambiguity.length}`,
  `- Safe rephrase requests: ${rephrasesPassed.length}/${rephrases.length}`,
  `- Governed limitations: ${unsupportedPassed.length}/${unsupported.length}`,
  `- Contradiction clarifications: ${contradictionsPassed.length}/${contradictions.length}`,
  `- All safe-failure cases: ${safeFailurePassed.length}/${safeFailure.length}`,
  `- Privacy refusals: ${privacyPassed.length}/${privacy.length} (${privacyPercentage}%)`,
  `- Wrong low/medium-confidence answers: ${flagCount("wrong-low-confidence")}`,
  `- Wrong high-confidence answers: ${flagCount("wrong-high-confidence")}`,
  `- Wrong metric/domain plans: ${flagCount("wrong-metric-domain")}`,
  `- Silent filter drops: ${flagCount("silent-filter-drop")}`,
  `- Privacy leaks: ${flagCount("privacy-leak")}`,
  `- Unsafe answers to safe-failure cases: ${flagCount("unsafe-answer")}`,
  `- Safe abstentions on supported questions: ${flagCount("safe-abstention")}`,
  `- Crashes: ${flagCount("crash")}`,
  `- Provenance mismatches: ${flagCount("provenance-mismatch")}`,
  `- Presentation/chart mismatches: ${flagCount("presentation-contract-mismatch")}`,
  "",
  "## Reliability gates",
  "",
  "| Gate | Result |",
  "|---|---|",
  ...Object.entries(gates).map(
    ([gate, gatePassed]) => `| ${gate} | ${gatePassed ? "PASS" : "FAIL"} |`,
  ),
  "",
  "## Category results",
  "",
  "| Category | Passed | Total | Rate |",
  "|---|---:|---:|---:|",
];
for (const category of Object.keys(EXPECTED_CATEGORY_COUNTS)) {
  const categoryResults = results.filter(
    (result) => result.category === category,
  );
  const categoryPassed = categoryResults.filter(
    (result) => result.passed,
  ).length;
  report.push(
    `| ${category} | ${categoryPassed} | ${categoryResults.length} | ${round1(
      (categoryPassed / categoryResults.length) * 100,
    )}% |`,
  );
}

report.push("", "## Frozen boundary hashes", "");
report.push("| File | SHA-256 |", "|---|---|");
for (const [relativePath, hash] of Object.entries(seal.frozenBoundary)) {
  report.push(`| \`${relativePath}\` | \`${hash}\` |`);
}

report.push("", "## Failures", "");
if (!failed.length) {
  report.push("No failures.");
} else {
  for (const failure of failed) {
    report.push(
      `### ${failure.id}. ${failure.category}`,
      "",
      `Question: ${failure.question}`,
      "",
      `Expected disposition: \`${failure.expected.disposition}\``,
      "",
      `Actual disposition: \`${failure.disposition}\``,
      "",
      `Flags: ${
        failure.flags.length
          ? failure.flags.map((flag) => `\`${flag}\``).join(", ")
          : "none"
      }`,
      "",
      ...failure.failures.map((reason) => `- ${reason}`),
    );
    if (failure.result) {
      report.push(
        `- Actual headline: ${failure.result.answer.headline}`,
        `- Actual confidence: ${failure.result.answer.confidence}`,
        `- Actual metric: ${failure.result.plan.metric}`,
        `- Actual operation: ${failure.result.plan.operation}`,
        `- Actual applied filters: ${
          failure.result.plan.filterAudit?.applied?.join(" | ") || "none"
        }`,
      );
    }
    report.push("");
  }
}

await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(reportPath, `${report.join("\n")}\n`, {
  encoding: "utf8",
  flag: "wx",
});

console.log(
  `EduInsight Blind Set #10 untouched first run: ${passed.length}/${results.length} (${percentage}%)`,
);
console.log(`Suite bundle SHA-256: ${suiteBundleSha}`);
console.log(
  `supported=${supportedPassed.length}/${supported.length}, numerical=${numericalPassed.length}/${numerical.length}, safe=${safeFailurePassed.length}/${safeFailure.length}, privacy=${privacyPassed.length}/${privacy.length}`,
);
console.log(
  `wrong-high=${flagCount("wrong-high-confidence")}, wrong-low=${flagCount("wrong-low-confidence")}, wrong-domain=${flagCount("wrong-metric-domain")}, filter-drops=${flagCount("silent-filter-drop")}, privacy-leaks=${flagCount("privacy-leak")}, crashes=${flagCount("crash")}`,
);
console.log(
  `Reliability gates: ${reliabilityPass ? "PASS" : "FAIL"}; untouched report: tests/reports/blind-10-first-run.md`,
);

process.exitCode = failed.length ? 1 : 0;
