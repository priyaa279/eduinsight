import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { analyzeQuestion } from "../lib/ask-engine.mjs";
import {
  cases,
  EXPECTED_CATEGORY_COUNTS,
} from "./ask-engine-blind-8-suite.mjs";
import {
  dataset,
  oraclePoints,
  round1,
} from "./blind-8-oracle.mjs";

const testDirectory = fileURLToPath(new URL(".", import.meta.url));
const workspaceDirectory = path.resolve(testDirectory, "..");
const sealPath = path.join(testDirectory, "blind-8-seal.json");
const reportPath = path.join(
  testDirectory,
  "reports",
  "blind-8-first-run.md",
);
const seal = JSON.parse(await fs.readFile(sealPath, "utf8"));
const sha256 = (buffer) =>
  crypto.createHash("sha256").update(buffer).digest("hex");
const close = (left, right) =>
  Math.abs(Number(left) - Number(right)) <= 0.11;
const same = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);

assert.equal(seal.blindSet, 8, "Blind #8 seal has the wrong set number.");
assert.equal(cases.length, 250, "Blind #8 must contain exactly 250 cases.");
for (const [category, expectedCount] of Object.entries(
  EXPECTED_CATEGORY_COUNTS,
)) {
  assert.equal(
    cases.filter((testCase) => testCase.category === category).length,
    expectedCount,
    `Blind #8 category ${category} changed.`,
  );
}
for (const [relativePath, expectedHash] of Object.entries(seal.files)) {
  const actualHash = sha256(
    await fs.readFile(path.join(workspaceDirectory, relativePath)),
  );
  assert.equal(
    actualHash,
    expectedHash,
    `${relativePath} changed after Blind #8 was sealed.`,
  );
}
for (const [relativePath, expectedHash] of Object.entries(
  seal.frozenImplementation,
)) {
  const actualHash = sha256(
    await fs.readFile(path.join(workspaceDirectory, relativePath)),
  );
  assert.equal(
    actualHash,
    expectedHash,
    `${relativePath} changed after the architecture freeze.`,
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
  "Blind #8 suite-bundle seal is inconsistent.",
);
try {
  await fs.access(reportPath);
  throw new Error(
    "Blind #8 first-run report already exists; use a separate regression runner.",
  );
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

function dispositionOf(result) {
  return result?.answer?.disposition ?? "answer";
}

function allowedDispositions(expected) {
  if (expected.allowed) return expected.allowed;
  if (expected.disposition === "limitation") {
    return ["limitation", "clarification"];
  }
  return [expected.disposition];
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

function matchNumericalPoints(expectedPoints, actualPoints) {
  if (expectedPoints.length !== actualPoints.length) return false;
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

function matchPresentationPoints(expectedPoints, actualPoints) {
  if (expectedPoints.length !== actualPoints.length) return false;
  return expectedPoints.every(
    (expectedPoint, index) =>
      actualPoints[index]?.label === expectedPoint.label &&
      close(actualPoints[index]?.value, expectedPoint.value),
  );
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
  const actualDisposition = dispositionOf(result);
  const allowed = allowedDispositions(testCase.expected);
  const dispositionCorrect = allowed.includes(actualDisposition);
  if (!dispositionCorrect) {
    failures.push(
      `disposition ${actualDisposition}; expected ${allowed.join(" or ")}`,
    );
  }

  const semanticFailures = [];
  for (const [field, expectedValue] of Object.entries(
    testCase.expected.plan ?? {},
  )) {
    if (
      field === "responseType" &&
      allowed.includes(result.plan.responseType)
    ) {
      continue;
    }
    if (!same(result.plan[field], expectedValue)) {
      semanticFailures.push(
        `plan.${field} ${JSON.stringify(result.plan[field])}; expected ${JSON.stringify(expectedValue)}`,
      );
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
      matchNumericalPoints(expectedPoints, actualPoints)
    : true;
  if (!numericalCorrect) {
    failures.push(
      `numerical points ${JSON.stringify(actualPoints)}; expected ${JSON.stringify(expectedPoints)}`,
    );
  }

  let presentationCorrect = true;
  if (expectedPoints) {
    presentationCorrect = matchPresentationPoints(
      expectedPoints,
      actualPoints,
    );
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
  if (
    testCase.expected.confidence &&
    result.answer.confidence !== testCase.expected.confidence
  ) {
    presentationCorrect = false;
    failures.push(
      `confidence ${result.answer.confidence}; expected ${testCase.expected.confidence}`,
    );
  }
  if (!presentationCorrect) flags.push("presentation-contract-mismatch");

  let provenanceCorrect = true;
  if (testCase.expected.sources?.length) {
    const expectedSources = [...testCase.expected.sources].sort();
    const actualSources = [...(result.answer.sources ?? [])].sort();
    provenanceCorrect = same(actualSources, expectedSources);
    if (!provenanceCorrect) {
      failures.push(
        `sources ${JSON.stringify(actualSources)}; expected ${JSON.stringify(expectedSources)}`,
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
const numerical = results.filter(
  (result) => result.metadata.supportedNumerical,
);
const numericalPassed = numerical.filter(
  (result) => result.numericalCorrect && result.semanticPlanCorrect,
);
const planPassed = results.filter((result) => result.semanticPlanCorrect);
const privacy = results.filter((result) => result.metadata.privacySensitive);
const privacyPassed = privacy.filter(
  (result) =>
    result.disposition === "refusal" &&
    result.result?.answer?.points?.length === 0,
);
const unsupported = results.filter(
  (result) => result.metadata.unsupportedHandling,
);
const unsupportedPassed = unsupported.filter((result) =>
  ["limitation", "clarification"].includes(result.disposition),
);
const provenance = results.filter(
  (result) =>
    result.metadata.provenanceContract ||
    (result.expected.sources?.length ?? 0) > 0,
);
const provenancePassed = provenance.filter(
  (result) => result.provenanceCorrect,
);
const presentationPassed = results.filter(
  (result) => result.presentationCorrect,
);
const flagCount = (flag) =>
  results.filter((result) => result.flags.includes(flag)).length;
const safeClarifications = results.filter(
  (result) =>
    result.disposition === "clarification" &&
    result.expected.disposition !== "answer",
);
const safeRefusals = results.filter(
  (result) =>
    result.disposition === "refusal" &&
    result.expected.disposition === "refusal",
);
const percentage = round1((passed.length / results.length) * 100);
const numericalPercentage = round1(
  (numericalPassed.length / numerical.length) * 100,
);
const planPercentage = round1((planPassed.length / results.length) * 100);
const privacyPercentage = round1(
  (privacyPassed.length / privacy.length) * 100,
);
const unsupportedPercentage = round1(
  (unsupportedPassed.length / unsupported.length) * 100,
);

const gates = {
  "Overall unseen score is at least 95%": percentage >= 95,
  "Supported numerical correctness is 100%":
    numericalPassed.length === numerical.length,
  "Confidently wrong institutional answers are zero":
    flagCount("wrong-high-confidence") === 0,
  "Silent filter drops are zero": flagCount("silent-filter-drop") === 0,
  "Privacy-sensitive handling is 100%":
    privacyPassed.length === privacy.length,
  "Crashes are zero": flagCount("crash") === 0,
};
const releaseReady = Object.values(gates).every(Boolean);
const categories = Object.keys(EXPECTED_CATEGORY_COUNTS);

const report = [
  "# EduInsight Blind Set #8 — untouched first run",
  "",
  `- Executed: ${new Date().toISOString()}`,
  `- Suite bundle SHA-256: \`${suiteBundleSha}\``,
  `- Suite file SHA-256: \`${seal.files["tests/ask-engine-blind-8-suite.mjs"]}\``,
  `- Oracle file SHA-256: \`${seal.files["tests/blind-8-oracle.mjs"]}\``,
  `- Frozen execution-engine SHA-256: \`${seal.frozenImplementation["lib/ask-engine.mjs"]}\``,
  `- Score: **${passed.length}/${results.length} (${percentage}%)**`,
  `- Reliability-gate result: **${releaseReady ? "PASS" : "FAIL"}**`,
  "- Policy: implementation and suite were frozen before execution; this write-once report preserves the single untouched run.",
  "- Remediation: none performed.",
  "",
  "## Required outcome classification",
  "",
  `- Overall pass rate: ${passed.length}/${results.length} (${percentage}%)`,
  `- Supported numerical correctness: ${numericalPassed.length}/${numerical.length} (${numericalPercentage}%)`,
  `- Semantic-plan correctness: ${planPassed.length}/${results.length} (${planPercentage}%)`,
  `- Confidently wrong answers: ${flagCount("wrong-high-confidence")}`,
  `- Wrong low/medium-confidence answers: ${flagCount("wrong-low-confidence")}`,
  `- Safe clarifications: ${safeClarifications.length}`,
  `- Safe refusals: ${safeRefusals.length}`,
  `- Safe abstentions on supported questions: ${flagCount("safe-abstention")}`,
  `- Silent filter drops: ${flagCount("silent-filter-drop")}`,
  `- Privacy-sensitive pass rate: ${privacyPassed.length}/${privacy.length} (${privacyPercentage}%)`,
  `- Unsupported-question handling: ${unsupportedPassed.length}/${unsupported.length} (${unsupportedPercentage}%)`,
  `- Crashes: ${flagCount("crash")}`,
  `- Provenance mismatches: ${flagCount("provenance-mismatch")} (${provenancePassed.length}/${provenance.length} provenance contracts passed)`,
  `- Chart/presentation-contract mismatches: ${flagCount("presentation-contract-mismatch")} (${presentationPassed.length}/${results.length} passed)`,
  "",
  "## Reliability gates",
  "",
  "| Gate | Result |",
  "|---|---|",
  ...Object.entries(gates).map(
    ([gate, passedGate]) => `| ${gate} | ${passedGate ? "PASS" : "FAIL"} |`,
  ),
  "",
  "## Category results",
  "",
  "| Category | Passed | Total | Rate |",
  "|---|---:|---:|---:|",
];
for (const category of categories) {
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

report.push("", "## Frozen implementation hashes", "");
report.push("| File | SHA-256 |", "|---|---|");
for (const [relativePath, hash] of Object.entries(
  seal.frozenImplementation,
)) {
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
  `EduInsight Blind Set #8 untouched first run: ${passed.length}/${results.length} (${percentage}%)`,
);
console.log(`Suite bundle SHA-256: ${suiteBundleSha}`);
console.log(
  `Semantic plans: ${planPassed.length}/${results.length}; supported numerical: ${numericalPassed.length}/${numerical.length}`,
);
console.log(
  `wrong-high=${flagCount("wrong-high-confidence")}, wrong-low=${flagCount("wrong-low-confidence")}, filter-drops=${flagCount("silent-filter-drop")}, privacy=${privacyPassed.length}/${privacy.length}, crashes=${flagCount("crash")}`,
);
console.log(
  `provenance mismatches=${flagCount("provenance-mismatch")}; presentation mismatches=${flagCount("presentation-contract-mismatch")}`,
);
console.log(
  `Reliability gates: ${releaseReady ? "PASS" : "FAIL"}; untouched report: tests/reports/blind-8-first-run.md`,
);

process.exitCode = failed.length ? 1 : 0;
