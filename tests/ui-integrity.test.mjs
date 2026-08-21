import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = fs.readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const commandCenter = JSON.parse(
  fs.readFileSync(
    new URL("../app/data/command-center.generated.json", import.meta.url),
    "utf8",
  ),
);

test("Data Quality summary values reconcile to qualityFindings", () => {
  const findings = commandCenter.qualityFindings;
  const counts = {
    critical: findings.filter((finding) => finding.severity === "Critical")
      .length,
    high: findings.filter((finding) => finding.severity === "High").length,
    medium: findings.filter((finding) => finding.severity === "Medium").length,
    open: findings.filter(
      (finding) => finding.lifecycleStatus !== "Resolved",
    ).length,
    resolved: findings.filter(
      (finding) => finding.lifecycleStatus === "Resolved",
    ).length,
  };

  assert.deepEqual(counts, {
    critical: 1,
    high: 3,
    medium: 0,
    open: 4,
    resolved: 0,
  });
  assert.match(page, /qualitySummary\.critical/);
  assert.match(page, /qualitySummary\.notEvaluated/);
  assert.match(page, /Rule coverage: \{qualitySummary\.evaluated\} of \{qualitySummary\.catalogRules\} evaluated/);
  assert.equal(commandCenter.qualityEvaluationSummary.executed, 14);
  assert.equal(commandCenter.qualityEvaluationSummary.totalRules, 35);
  assert.equal(commandCenter.qualityEvaluationSummary.notEvaluated, 21);
  assert.equal(commandCenter.qualityEvaluationSummary.dataDefects, 3);
  assert.equal(commandCenter.qualityEvaluationSummary.anomalies, 1);
  assert.match(page, /qualitySummary\.dataDefects/);
  assert.match(page, /qualitySummary\.anomalies/);
  assert.match(page, /Executed · \$\{rule\.lastResult === "PASS" \? "Pass" : "Fail"\}/);
  assert.match(page, /Period and threshold evidence/);
  assert.match(page, /selected\.observation\?\.previousTerm/);
  assert.match(page, /selected\.observation\?\.currentTerm/);
  assert.match(page, /selected\.observation\?\.thresholdPercent/);
  assert.doesNotMatch(page, /Silent errors|<strong>94<\/strong>|<strong>41<\/strong>/);
  assert.match(page, /item\.id === "quality" && <em>\{qualitySummary\.open\}<\/em>/);
});

test("static rings and legacy IPEDS implementations are absent", () => {
  assert.doesNotMatch(page, /LegacyIpeds|LegacyIpedsGenerated|readiness-dial|score-ring/);
  assert.doesNotMatch(css, /\.readiness-dial|\.score-ring/);
  assert.doesNotMatch(page, /49 automated checks/);
});

test("small typography, icons, colors, and serif fonts use shared primitives", () => {
  assert.doesNotMatch(css, /font-size:\s*[789]px/);
  assert.doesNotMatch(css, /font-family:\s*Georgia/);
  assert.match(css, /--font-serif:/);
  assert.match(page, /<svg viewBox="0 0 24 24"/);
  assert.doesNotMatch(page, /[⌂✦✓▤⌁◫⌘↻⌕]/u);

  const rootStart = css.indexOf(":root {");
  const rootEnd = css.indexOf("\n}", rootStart) + 2;
  const outsideRoot = `${css.slice(0, rootStart)}${css.slice(rootEnd)}`;
  assert.doesNotMatch(
    outsideRoot,
    /#[0-9a-f]{8}(?![0-9a-f])|#[0-9a-f]{6}(?![0-9a-f])|#[0-9a-f]{4}(?![0-9a-f])|#[0-9a-f]{3}(?![0-9a-f])/i,
  );
});
