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
const readme = fs.readFileSync(new URL("../README.md", import.meta.url), "utf8");

test("global page header has no Audit trail trigger", () => {
  const headerSource = page.slice(
    page.indexOf("function Header"),
    page.indexOf("function Overview"),
  );
  assert.doesNotMatch(headerSource, /Audit trail|onAudit|<button/);
  assert.doesNotMatch(headerSource, /demo-disclosure|Demo environment|Synthetic higher-education data/);
  assert.doesNotMatch(css, /\.demo-disclosure|\.header-actions/);
});

test("synthetic-data disclosure is subtle, singular, and documented", () => {
  const disclosure =
    "Data: Synthetic institutional dataset created for demonstration and testing.";
  assert.equal(page.split(disclosure).length - 1, 1);
  assert.match(page, /<div className="audit-note">\s*<strong>Data disclosure<\/strong>/);
  assert.match(readme, /prototype are synthetic/i);
  assert.match(
    readme,
    /No FERPA-regulated or institution-owned data is\s+included\./,
  );
});

test("governed workspace card uses data-status wording without changing its destination", () => {
  assert.match(page, /<strong>Governed workspace<\/strong>/);
  assert.match(page, /<small>Source snapshot loaded<\/small>/);
  assert.match(
    page,
    /<button onClick=\{openAudit\}>\s*View data status <AppIcon name="arrow-right" \/>/,
  );
  assert.doesNotMatch(page, /View system status/);
});

test("audit drawer has modal keyboard and focus-management contracts", () => {
  assert.match(page, /role="dialog"/);
  assert.match(page, /aria-modal="true"/);
  assert.match(page, /aria-labelledby="audit-drawer-title"/);
  assert.match(page, /event\.key === "Escape"/);
  assert.match(page, /event\.key !== "Tab"/);
  assert.match(page, /setAttribute\("inert", ""\)/);
  assert.match(page, /returnFocusRef\.current\?\.focus\(\)/);
});

test("closed mobile navigation is not keyboard interactive off screen", () => {
  const mobileRule = css.slice(css.indexOf("@media (max-width: 1020px)"));
  assert.match(mobileRule, /\.sidebar\s*\{[^}]*visibility:\s*hidden;[^}]*pointer-events:\s*none;/s);
  assert.match(mobileRule, /\.sidebar\.mobile-open\s*\{[^}]*visibility:\s*visible;[^}]*pointer-events:\s*auto;/s);
});

test("IPEDS approval UI uses portfolio-facing review terminology", () => {
  const ipedsUiSource = page.slice(
    page.indexOf("function Ipeds("),
    page.indexOf("function Scenario("),
  );
  const approvalHistorySource = page.slice(
    page.indexOf("function AuditDrawer("),
    page.indexOf("export default function EduInsightApp"),
  );
  const renderedIpedsUi = `${ipedsUiSource}\n${approvalHistorySource}`;
  assert.match(page, /Ready for IPEDS keyholder review/);
  assert.match(page, /Demo workflow · EduInsight does not submit data to NCES\./);
  assert.match(page, /Modeled demo packages/);
  assert.match(page, /The public portfolio is read-only/);
  assert.match(page, /Institutional review/);
  assert.match(page, /Approval history/);
  assert.match(page, /Institutional explanations/);
  assert.match(page, /ipedsApprovalStatusLabel\(approval\.status\)/);
  assert.match(page, /Historical event wording is retained in the immutable record/);
  assert.doesNotMatch(
    renderedIpedsUi,
    /NCES DCS|DCS upload|keyholder upload|keyholder handoff/i,
  );
  assert.match(css, /\.demo-workflow-note/);
});

test("Data Quality summary values reconcile to qualityFindings", () => {
  const findings = commandCenter.qualityFindings;
  const counts = {
    critical: findings.filter((finding) => finding.severity === "Critical")
      .length,
    high: findings.filter((finding) => finding.severity === "High").length,
    medium: findings.filter((finding) => finding.severity === "Medium").length,
    active: findings.length,
  };

  assert.deepEqual(counts, {
    critical: 1,
    high: 3,
    medium: 0,
    active: 4,
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
  assert.match(page, /item\.id === "quality" && <em>\{qualitySummary\.active\}<\/em>/);
});

test("static rings and legacy IPEDS implementations are absent", () => {
  assert.doesNotMatch(page, /LegacyIpeds|LegacyIpedsGenerated|readiness-dial|score-ring/);
  assert.doesNotMatch(css, /\.readiness-dial|\.score-ring/);
  assert.doesNotMatch(page, /49 automated checks/);
});

test("Data Quality finding details expose compact immutable lifecycle history", () => {
  assert.match(page, /Lifecycle audit history/);
  assert.match(page, /selectedAuditEvents\.map/);
  assert.match(page, /auditEventLabel\(event\)/);
  assert.match(page, /Earlier lifecycle actions are unavailable/);
  assert.match(css, /\.lifecycle-history/);
  assert.match(css, /\.history-marker/);
});

test("Data Quality findings expose safe filtering, accessibility state, and selected lineage", () => {
  assert.match(page, /No \{filter === "All" \? "active" : filter\} findings in the current view/);
  assert.match(page, /aria-pressed=\{filter === item\}/);
  assert.match(page, /aria-pressed=\{selected\?\.findingKey === issue\.findingKey\}/);
  assert.match(page, /Why this check flagged the observation/);
  assert.match(page, /Selected finding source trace/);
  assert.match(page, /selected\.sourceFiles\.join/);
  assert.match(page, /selected\.sourceFields\.join/);
  assert.match(page, /selected\.applicabilityLimitation/);
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
