import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { analyzeQuestion } from "../lib/ask-engine.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(projectRoot, "data", "sample-university-upload");
const commandPath = path.join(projectRoot, "app", "data", "command-center.generated.json");
const pagePath = path.join(projectRoot, "app", "page.tsx");
const cssPath = path.join(projectRoot, "app", "globals.css");
const builderPath = path.join(projectRoot, "scripts", "build-command-center.mjs");
const legacyReadmePath = path.join(projectRoot, "data", "command-center", "README.md");
const lifecycleRoutePath = path.join(projectRoot, "app", "api", "data-quality", "lifecycle", "route.ts");

const commandCenter = JSON.parse(fs.readFileSync(commandPath, "utf8"));
const ipedsSuite = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "app", "data", "ipeds-suite.generated.json"), "utf8"),
);
const askDataset = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "app", "data", "ask-eduinsight.generated.json"), "utf8"),
);
const page = fs.readFileSync(pagePath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");
const builder = fs.readFileSync(builderPath, "utf8");
const legacyReadme = fs.readFileSync(legacyReadmePath, "utf8");
const lifecycleRoute = fs.readFileSync(lifecycleRoutePath, "utf8");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  const [headers, ...records] = rows.filter((values) => values.some(Boolean));
  return records.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );
}

function readSource(name) {
  return parseCsv(fs.readFileSync(path.join(sourceDir, name), "utf8"));
}

const terms = readSource("terms.csv");
const students = readSource("students.csv");
const studentTerms = readSource("student_terms.csv");
const currentTerm = terms.find((term) => term.is_current === "1");
const fallTerms = terms.filter((term) => term.season === "Fall").sort((a, b) => a.term_id.localeCompare(b.term_id));
const priorTerm = fallTerms.at(-2);
const distinctCensus = (termId) =>
  new Set(
    studentTerms
      .filter((row) => row.term_id === termId && row.census_enrolled === "1" && row.reportable === "1")
      .map((row) => row.student_id),
  ).size;
const sourceCurrent = distinctCensus(currentTerm.term_id);
const sourcePrior = distinctCensus(priorTerm.term_id);
const sourceDelta = sourceCurrent - sourcePrior;
const sourceDeltaRate = sourceDelta / sourcePrior;
const retainedIn2025 = new Set(
  studentTerms
    .filter((row) => row.term_id === "2025FA" && row.census_enrolled === "1" && row.reportable === "1")
    .map((row) => row.student_id),
);
const cohort2024 = students.filter((student) => student.ftft_cohort_term_id === "2024FA");
const sourceRetention = cohort2024.filter((student) => retainedIn2025.has(student.student_id)).length / cohort2024.length;
const dqX004 = commandCenter.qualityFindings.find((finding) => finding.ruleId === "DQ-X-004");
const dqEnr001 = commandCenter.qualityRuleResults.find((result) => result.ruleId === "DQ-ENR-001");
const packages = Object.values(ipedsSuite.packages);
const classCount = (value) => packages.filter((item) => item.sourceReadiness === value).length;

// 1-10: independent KPI and Data Quality truth.
test("CC01 Fall 2025 source headcount is 18,426", () => assert.equal(sourceCurrent, 18426));
test("CC02 Fall 2024 source headcount is 19,234", () => assert.equal(sourcePrior, 19234));
test("CC03 source-derived enrollment change is -808", () => assert.equal(sourceDelta, -808));
test("CC04 source-derived enrollment rate is approximately -4.2%", () => assert.ok(Math.abs(sourceDeltaRate + 0.04200894249766039) < 1e-12));
test("CC05 source-derived 2024 FTFT retention is 78.4%", () => assert.equal(sourceRetention, 0.784));
test("CC06 retention delta is +0.8 percentage points", () => assert.equal(commandCenter.kpis.firstYearRetention.delta, 0.008));
test("CC07 active Data Quality findings remain four evaluator findings", () => assert.equal(commandCenter.qualityFindings.length, 4));
test("CC08 exactly one active finding is Critical", () => assert.equal(commandCenter.qualityFindings.filter((item) => item.severity === "Critical").length, 1));
test("CC09 DQ-ENR-001 reconciles to 146 records", () => assert.equal(dqEnr001.violationCount, 146));
test("CC10 DQ-X-004 has zero defective records", () => assert.equal(dqX004.defectiveRecordCount, 0));

// 11-18: IPEDS derivation and completeness semantics.
test("CC11 source-backed count is derived from the suite", () => assert.equal(commandCenter.ipedsCoverageSummary.sourceBacked, classCount("source_backed")));
test("CC12 modeled-demo count is derived from the suite", () => assert.equal(commandCenter.ipedsCoverageSummary.modeledDemo, classCount("modeled_demo")));
test("CC13 source-gap count is derived from the suite", () => assert.equal(commandCenter.ipedsCoverageSummary.sourceGap, classCount("source_gap")));
test("CC14 questionnaire count is derived from non-importable workflows", () => assert.equal(commandCenter.ipedsCoverageSummary.questionnaire, Object.keys(ipedsSuite.nonImportable).length));
test("CC15 layout count is derived from official layout codes", () => assert.equal(commandCenter.ipedsCoverageSummary.officialLayouts, ipedsSuite.officialImportLayoutCodes.length));
test("CC16 current IPEDS counts remain 1/8/2/1/11", () => assert.deepEqual([commandCenter.ipedsCoverageSummary.sourceBacked, commandCenter.ipedsCoverageSummary.modeledDemo, commandCenter.ipedsCoverageSummary.sourceGap, commandCenter.ipedsCoverageSummary.questionnaire, commandCenter.ipedsCoverageSummary.officialLayouts], [1, 8, 2, 1, 11]));
test("CC17 retired 91% readiness is absent from current output", () => assert.doesNotMatch(JSON.stringify(commandCenter), /91%|0\.91/));
test("CC18 Completions remains source-backed but incomplete", () => { assert.equal(ipedsSuite.packages.C.sourceReadiness, "source_backed"); assert.equal(ipedsSuite.packages.C.completeSurveyPackage, false); assert.deepEqual(commandCenter.ipedsCoverageSummary.incompleteSourceBackedCodes, ["C"]); });

// 19-23: program signal presentation contracts.
test("CC19 growth and utilization are separate explicit fields", () => commandCenter.programSignals.forEach((signal) => { assert.equal(signal.enrollmentGrowth, signal.growth); assert.equal(signal.courseSeatUtilization, signal.utilization); }));
test("CC20 utilization controls the bar width", () => assert.match(page, /width: signal\.courseSeatUtilizationDisplay/));
test("CC21 enrollment growth is labeled separately", () => { assert.match(page, />Enrollment growth</); assert.match(page, /signal\.enrollmentGrowthDisplay/); });
test("CC22 causal capacity headline is removed", () => assert.doesNotMatch(page, /demand is reshaping capacity/i));
test("CC23 program panel introduces no forecast or prediction claim", () => { const section = page.slice(page.indexOf("Enrollment signal"), page.indexOf("Processing summary")); assert.doesNotMatch(section, /forecast|predict|will cause|shortage/i); });

// 24-28: chronology and freshness contracts.
test("CC24 data period differs from artifact build time", () => { assert.equal(commandCenter.snapshotMetadata.dataPeriod.termId, "2025FA"); assert.notEqual(commandCenter.snapshotMetadata.artifactBuiltAt, commandCenter.snapshotMetadata.institutionalSourceSnapshotAt); });
test("CC25 module verification remains separately labeled", () => { assert.equal(commandCenter.snapshotMetadata.moduleVerification.ipeds.generatedAt, ipedsSuite.generatedAt); assert.ok(commandCenter.snapshotMetadata.moduleVerification.institutionalMemory.verifiedAt); });
test("CC26 artifact build follows the 2026 module verification chronology", () => assert.ok(new Date(commandCenter.snapshotMetadata.artifactBuiltAt) >= new Date(ipedsSuite.generatedAt)));
test("CC27 static-snapshot mode is explicit", () => assert.equal(commandCenter.snapshotMetadata.artifactMode, "static_snapshot"));
test("CC28 retained-snapshot failure metadata is explicit", () => { assert.equal(commandCenter.snapshotMetadata.rebuildFailureMode, "fail_closed_previous_snapshot_retained"); assert.equal(commandCenter.snapshotMetadata.runtimeFreshnessMonitoring, false); });

// 29-35: brief and activity semantics.
test("CC29 brief headline derives from brief.length with singular handling", () => { assert.match(page, /briefAttentionHeadline\(commandCenter\.brief\.length\)/); assert.match(page, /count === 1/); });
test("CC30 unsupported causal Ask suggestion is absent", () => assert.doesNotMatch(page, /Why did first-generation retention decline/));
test("CC31 replacement Ask suggestion succeeds", () => { const result = analyzeQuestion("What was overall first-year retention in 2024?", askDataset); assert.equal(result.answer.disposition, "answer"); assert.match(result.answer.headline, /78\.4%/); });
test("CC32 activity wording does not imply human IPEDS review", () => { assert.match(page, /Assessed IPEDS package coverage|item\.activity/); assert.doesNotMatch(JSON.stringify(commandCenter.activity), /Reviewed IPEDS/); });
test("CC33 processing completion is scoped to the processing step", () => commandCenter.activity.forEach((item) => assert.equal(item.statusLabel, "Processing step complete")));
test("CC34 every brief has visible attention-state text", () => { commandCenter.brief.forEach((item) => assert.ok(item.attentionState)); assert.match(page, /className="brief-state"/); });
test("CC35 IPEDS informational state has no governed severity", () => { const item = commandCenter.brief.find((brief) => brief.destination === "ipeds"); assert.equal(item.attentionState, "Informational package coverage"); assert.equal(item.governedSeverity, null); });

// 36-40: legacy-fixture isolation.
test("CC36 builder does not read data/command-center", () => assert.doesNotMatch(builder, /data["'],\s*["']command-center|data\\command-center/));
test("CC37 retired 91% fixture is explicitly excluded", () => { assert.match(legacyReadme, /91% IPEDS readiness score/); assert.match(legacyReadme, /legacy presentation fixtures/i); });
test("CC38 retired 27-issue fixture cannot affect current output", () => { assert.match(legacyReadme, /27 open issues/); assert.equal(commandCenter.kpis.openQualityIssues.value, 4); });
test("CC39 retired 684-record anomaly cannot affect current output", () => { assert.match(legacyReadme, /684 affected enrollment records/); assert.equal(dqX004.defectiveRecordCount, 0); });
test("CC40 obsolete approval fixture cannot affect the IPEDS brief", () => { assert.match(legacyReadme, /ready for approval/); assert.equal(ipedsSuite.packages.C.completeSurveyPackage, false); });

// 41-44: provenance contracts.
test("CC41 provenance wording avoids exhaustive chain-of-custody claim", () => { assert.match(page, /Key metrics include governed source and calculation context/); assert.doesNotMatch(page, /Every number has a chain of custody/); });
test("CC42 source manifest uses package-classification terminology", () => assert.ok(commandCenter.sourceManifest.some((item) => item.role === "IPEDS package classification")));
test("CC43 key KPI objects retain source arrays", () => Object.values(commandCenter.kpis).forEach((kpi) => assert.ok(kpi.sources.length > 0)));
test("CC44 static snapshot provenance is visible in the drawer", () => { assert.match(page, /Command Center snapshot chronology/); assert.match(page, /freshnessDisclosure/); });

// 45-50: navigation and accessibility.
test("CC45 Start an analysis routes to Ask", () => assert.match(page, /Start an analysis[\s\S]{0,160}onClick=\{\(\) => onNavigate\("analyst"\)\}|onClick=\{\(\) => onNavigate\("analyst"\)\}[\s\S]{0,160}Start an analysis/));
test("CC46 Data Quality briefs route to Data Quality", () => assert.equal(commandCenter.brief.filter((item) => item.destination === "quality").length, 2));
test("CC47 IPEDS brief routes to IPEDS Center", () => assert.equal(commandCenter.brief.find((item) => item.destination === "ipeds").priority, 3));
test("CC48 Explore routes to Ask", () => { const section = page.slice(page.indexOf("Enrollment signal"), page.indexOf("Processing summary")); assert.match(section, /onClick=\{\(\) => onNavigate\("analyst"\)\}/); });
test("CC49 View data status opens the provenance drawer", () => assert.match(page, /onClick=\{openAudit\}>\s*View data status/));
test("CC50 brief state is not conveyed by color alone", () => assert.match(page, /<small className="brief-state">\{item\.attentionState\}<\/small>/));

function runWithFixture(mutator) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eduinsight-cc-"));
  const fixtureDir = path.join(temporaryRoot, "upload");
  fs.cpSync(sourceDir, fixtureDir, { recursive: true });
  mutator(fixtureDir);
  const artifactBefore = fs.readFileSync(commandPath, "utf8");
  const result = spawnSync(process.execPath, [builderPath], {
    cwd: projectRoot,
    env: { ...process.env, EDUINSIGHT_UPLOAD_DIR: fixtureDir },
    encoding: "utf8",
    timeout: 120000,
  });
  assert.notEqual(result.status, 0);
  assert.equal(fs.readFileSync(commandPath, "utf8"), artifactBefore);
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
  return `${result.stderr}\n${result.stdout}`;
}

// 51-58: failure, determinism, integration, and responsive safeguards.
test("CC51 missing required source fails closed without replacing the artifact", () => { const output = runWithFixture((dir) => fs.unlinkSync(path.join(dir, "terms.csv"))); assert.match(output, /terms\.csv|ENOENT/); });
test("CC52 malformed required source fails closed without replacing the artifact", () => { const output = runWithFixture((dir) => { const file = path.join(dir, "students.csv"); fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace(/^student_id,/, "missing_student_id,")); }); assert.match(output, /missing required columns: student_id/); });
test("CC53 duplicate source key is rejected as invalid schema", () => { const output = runWithFixture((dir) => { const file = path.join(dir, "programs.csv"); const text = fs.readFileSync(file, "utf8"); const lines = text.trimEnd().split(/\r?\n/); fs.writeFileSync(file, `${text.trimEnd()}\n${lines[1]}\n`); }); assert.match(output, /duplicate program_id key/); });
test("CC54 builder is byte-deterministic when build metadata is fixed", { timeout: 120000 }, () => { const before = fs.readFileSync(commandPath, "utf8"); const result = spawnSync(process.execPath, [builderPath], { cwd: projectRoot, env: { ...process.env, EDUINSIGHT_ARTIFACT_BUILT_AT: commandCenter.generatedAt }, encoding: "utf8", timeout: 120000 }); assert.equal(result.status, 0, result.stderr); assert.equal(fs.readFileSync(commandPath, "utf8"), before); });
test("CC55 processed and application Command Center artifacts agree", () => assert.equal(fs.readFileSync(path.join(projectRoot, "data", "processed", "command-center.json"), "utf8"), fs.readFileSync(commandPath, "utf8")));
test("CC56 Data Quality lifecycle reconciliation uses source snapshot time, not build time", () => { assert.match(lifecycleRoute, /evaluationSnapshotAt[\s\S]*institutionalSourceSnapshotAt/); assert.doesNotMatch(lifecycleRoute, /commandCenter\.generatedAt/); });
test("CC57 Scenario Lab outputs are not imported as Command Center truth", () => { assert.doesNotMatch(builder, /scenario-baselines\.generated|scenario-model/); assert.ok(commandCenter.sourceManifest.every((item) => !/scenario/i.test(item.file))); });
test("CC58 responsive KPI and mobile navigation CSS contracts remain intact", () => { assert.match(css, /grid-template-columns:\s*repeat\(4,\s*1fr\)/); assert.match(css, /@media[^]*grid-template-columns:\s*repeat\(2,\s*1fr\)/); assert.match(css, /grid-template-columns:\s*1fr/); assert.match(page, /className="mobile-menu"/); });
