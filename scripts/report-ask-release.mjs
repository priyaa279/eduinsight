import assert from "node:assert/strict";
import fs from "node:fs/promises";

const reportDirectory = new URL("../tests/reports/", import.meta.url);

async function scoreFromReport(fileName) {
  const markdown = await fs.readFile(
    new URL(fileName, reportDirectory),
    "utf8",
  );
  const match = markdown.match(/- Score: \*\*(\d+)\/(\d+)/);
  assert.ok(match, `${fileName} does not contain a raw Score line.`);
  return {
    raw: Number(match[1]),
    total: Number(match[2]),
  };
}

async function blindNineScore() {
  const markdown = await fs.readFile(
    new URL("blind-9-regression-latest.md", reportDirectory),
    "utf8",
  );
  const rawMatch = markdown.match(
    /Raw original-contract result after remediation: \*\*(\d+)\/(\d+)/,
  );
  const adjudicatedMatch = markdown.match(
    /Adjudicated regression result: \*\*(\d+)\/(\d+)/,
  );
  assert.ok(rawMatch, "Blind #9 report does not contain its raw score.");
  assert.ok(
    adjudicatedMatch,
    "Blind #9 report does not contain its adjudicated score.",
  );
  return {
    raw: Number(rawMatch[1]),
    adjudicated: Number(adjudicatedMatch[1]),
    total: Number(rawMatch[2]),
  };
}

const regressionSuites = await Promise.all(
  [
    ["Blind #3", "blind-3-regression-latest.md", 238],
    ["Blind #4", "blind-4-regression-latest.md", 267],
    ["Blind #5", "blind-5-regression-latest.md", 257],
    ["Blind #6", "blind-6-regression-latest.md", 243],
    ["Blind #7", "blind-7-regression-latest.md", 240],
  ].map(async ([name, fileName, expectedRaw]) => {
    const score = await scoreFromReport(fileName);
    assert.equal(
      score.raw,
      expectedRaw,
      `${name} raw score drifted; fix the regression or explicitly revise its governed oracle.`,
    );
    return {
      name,
      ...score,
      adjudicated: score.total,
    };
  }),
);

const blindNine = await blindNineScore();
assert.equal(
  blindNine.raw,
  186,
  "Blind #9 raw score drifted; audit its contracts before changing the baseline.",
);
assert.equal(blindNine.adjudicated, blindNine.total);

const rows = [
  { name: "Known evaluation", raw: 184, adjudicated: 184, total: 184 },
  { name: "Blind #1", raw: 100, adjudicated: 100, total: 100 },
  { name: "Blind #2", raw: 180, adjudicated: 180, total: 180 },
  ...regressionSuites,
  { name: "Blind #9", ...blindNine },
];

const currentActiveSuites = [
  "Core Ask unit suite",
  "Semantic hardening",
  "Intent routing",
  "Completion hardening",
  "Semantic-boundary blockers",
];

const totals = rows.reduce(
  (sum, row) => ({
    raw: sum.raw + row.raw,
    adjudicated: sum.adjudicated + row.adjudicated,
    total: sum.total + row.total,
  }),
  { raw: 0, adjudicated: 0, total: 0 },
);
const percent = (value, total) =>
  `${Number(((value / total) * 100).toFixed(1))}%`;
const gap = totals.adjudicated - totals.raw;
const generatedAt = new Date().toISOString();

const tableRows = rows.map(
  (row) =>
    `| ${row.name} | ${row.raw}/${row.total} | ${row.adjudicated}/${row.total} | ${row.adjudicated - row.raw} |`,
);
const markdown = [
  "# Ask EduInsight release summary",
  "",
  `Generated: ${generatedAt}`,
  "",
  "| Suite | Raw contract | Adjudicated | Documented gap |",
  "|---|---:|---:|---:|",
  ...tableRows,
  `| **Total** | **${totals.raw}/${totals.total} (${percent(totals.raw, totals.total)})** | **${totals.adjudicated}/${totals.total} (${percent(totals.adjudicated, totals.total)})** | **${gap}** |`,
  "",
  "Raw and adjudicated results are intentionally reported side by side. Adjudication may document an accepted oracle or presentation-contract difference, but it never changes the preserved raw result.",
  "",
  `Current active raw suites (run before the historical bank): ${currentActiveSuites.join(", ")}. Their exact current pass count is reported by the node:test runner and is not replaced by historical adjudication.`,
  "",
];

await fs.writeFile(
  new URL("ask-release-summary-latest.md", reportDirectory),
  `${markdown.join("\n")}\n`,
  "utf8",
);

console.log("\nAsk EduInsight release summary");
console.table(
  rows.map((row) => ({
    suite: row.name,
    raw: `${row.raw}/${row.total}`,
    adjudicated: `${row.adjudicated}/${row.total}`,
    gap: row.adjudicated - row.raw,
  })),
);
console.log(
  `Raw contract total: ${totals.raw}/${totals.total} (${percent(totals.raw, totals.total)})`,
);
console.log(
  `Adjudicated total: ${totals.adjudicated}/${totals.total} (${percent(totals.adjudicated, totals.total)})`,
);
console.log(`Documented adjudication gap: ${gap}`);
