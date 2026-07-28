import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BLIND_9_VERSION,
  cases,
  EXPECTED_CATEGORY_COUNTS,
} from "./ask-engine-blind-9-suite.mjs";
import {
  dataset,
  enrollmentCount,
  latestIpedsReadiness,
  oraclePoints,
  retentionRate,
} from "./blind-9-oracle.mjs";

const testDirectory = fileURLToPath(new URL(".", import.meta.url));
const workspaceDirectory = path.resolve(testDirectory, "..");
const sealPath = path.join(testDirectory, "blind-9-seal.json");
const firstRunReportPath = path.join(
  testDirectory,
  "reports",
  "blind-9-first-run.md",
);
const normalizeWhitespace = (value) =>
  value.toLowerCase().replace(/\s+/g, " ").trim();
const sha256 = (buffer) =>
  crypto.createHash("sha256").update(buffer).digest("hex");

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "reports"].includes(entry.name)) continue;
      files.push(...(await walk(entryPath)));
    } else {
      files.push(entryPath);
    }
  }
  return files;
}

assert.equal(
  BLIND_9_VERSION,
  "2026-07-28-sealed-candidate",
  "Unexpected Blind #9 version.",
);
assert.equal(cases.length, 220, "Blind #9 must contain exactly 220 cases.");

const categoryCounts = Object.fromEntries(
  Object.keys(EXPECTED_CATEGORY_COUNTS).map((category) => [
    category,
    cases.filter((testCase) => testCase.category === category).length,
  ]),
);
assert.deepEqual(
  categoryCounts,
  EXPECTED_CATEGORY_COUNTS,
  "Blind #9 category counts changed.",
);

const normalizedQuestions = cases.map((testCase) =>
  normalizeWhitespace(testCase.question),
);
assert.equal(
  new Set(normalizedQuestions).size,
  cases.length,
  "Blind #9 contains duplicate questions.",
);

const priorTestFiles = (await walk(testDirectory)).filter((filePath) => {
  const basename = path.basename(filePath);
  return (
    /\.(mjs|json)$/i.test(filePath) &&
    !basename.includes("blind-9") &&
    basename !== "blind-9-oracle.mjs"
  );
});
const priorCorpus = normalizeWhitespace(
  (
    await Promise.all(
      priorTestFiles.map((filePath) => fs.readFile(filePath, "utf8")),
    )
  ).join("\n"),
);
const collisions = cases.filter((testCase) =>
  priorCorpus.includes(normalizeWhitespace(testCase.question)),
);
assert.deepEqual(
  collisions.map((testCase) => ({
    id: testCase.id,
    question: testCase.question,
  })),
  [],
  "Blind #9 contains exact question collisions with previous suites.",
);

const dispositions = new Set([
  "answer",
  "clarification",
  "limitation",
  "refusal",
]);
let numericalCases = 0;
let numericalPoints = 0;
for (const testCase of cases) {
  assert.ok(
    dispositions.has(testCase.expected.disposition),
    `Case ${testCase.id} has an invalid disposition.`,
  );
  if (testCase.expected.oracle) {
    numericalCases += 1;
    const points = oraclePoints(testCase.expected.oracle);
    numericalPoints += points.length;
    for (const point of points) {
      assert.equal(
        typeof point.label,
        "string",
        `Case ${testCase.id} has a non-string oracle label.`,
      );
      assert.ok(
        Number.isFinite(point.value),
        `Case ${testCase.id} has a non-finite oracle value.`,
      );
    }
  }
}

assert.equal(
  numericalCases,
  cases.filter((testCase) => testCase.metadata.supportedNumerical).length,
  "Every numerical oracle must be marked as supported numerical.",
);
assert.ok(
  numericalCases >= 140,
  "Blind #9 must contain at least 140 supported numerical cases.",
);
assert.ok(
  cases.filter((testCase) => testCase.metadata.supportedQuestion).length >=
    150,
  "Blind #9 must contain at least 150 clear supported questions.",
);
assert.ok(
  cases.filter((testCase) => testCase.metadata.rephraseExpected).length >= 5,
  "Blind #9 must contain at least five rephrase cases.",
);
assert.ok(
  cases.filter((testCase) => testCase.metadata.unsupportedHandling).length >=
    10,
  "Blind #9 must contain at least ten unsupported requests.",
);
assert.ok(
  cases.filter((testCase) => testCase.metadata.privacySensitive).length >= 10,
  "Blind #9 must contain at least ten privacy-sensitive requests.",
);

for (const year of dataset.catalogs.years) {
  const total = enrollmentCount({ year });
  const byProgram = dataset.catalogs.programs.reduce(
    (sum, program) =>
      sum + enrollmentCount({ year, programName: program.programName }),
    0,
  );
  assert.equal(
    total,
    byProgram,
    `Independent enrollment reconciliation failed for ${year}.`,
  );
}
for (const cohortYear of [2020, 2021, 2022, 2023, 2024]) {
  const rate = retentionRate({ year: cohortYear });
  assert.ok(
    rate >= 0 && rate <= 100,
    `Independent retention oracle is invalid for ${cohortYear}.`,
  );
}
assert.equal(
  latestIpedsReadiness(),
  91,
  "Independent latest-IPEDS readiness oracle changed.",
);

try {
  await fs.access(firstRunReportPath);
  throw new Error(
    "Blind #9 first-run report already exists; the untouched run cannot be repeated.",
  );
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const draftMode = process.env.EDUINSIGHT_BLIND9_DRAFT_PREFLIGHT === "1";
let suiteBundleSha = null;
if (!draftMode) {
  const seal = JSON.parse(await fs.readFile(sealPath, "utf8"));
  assert.equal(seal.blindSet, 9, "Blind #9 seal has the wrong set number.");
  for (const [relativePath, expectedHash] of Object.entries(seal.files)) {
    const actualHash = sha256(
      await fs.readFile(path.join(workspaceDirectory, relativePath)),
    );
    assert.equal(
      actualHash,
      expectedHash,
      `${relativePath} changed after Blind #9 was sealed.`,
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
      `${relativePath} changed after the Blind #9 freeze.`,
    );
  }
  const suiteBytes = Buffer.concat(
    seal.suiteFiles.map((relativePath) =>
      Buffer.from(seal.files[relativePath], "utf8"),
    ),
  );
  suiteBundleSha = sha256(suiteBytes);
  assert.equal(
    suiteBundleSha,
    seal.suiteBundleSha256,
    "Blind #9 suite-bundle seal is inconsistent.",
  );
}

console.log("Blind #9 preflight: PASS");
console.log(`Cases: ${cases.length}; numerical: ${numericalCases}`);
console.log(
  `Clear supported questions: ${
    cases.filter((testCase) => testCase.metadata.supportedQuestion).length
  }`,
);
console.log(`Independent oracle points validated: ${numericalPoints}`);
console.log("Exact collisions with previous suites: 0");
console.log(
  draftMode
    ? "Seal verification: skipped in documented draft-preflight mode"
    : `Seal verification: PASS (${suiteBundleSha})`,
);
