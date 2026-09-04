import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { analyzeQuestionRequest } from "../lib/ask/request-service.mjs";
import dataset from "../app/data/ask-eduinsight.generated.json" with { type: "json" };
import suite from "../app/data/ipeds-suite.generated.json" with { type: "json" };
import commandCenter from "../app/data/command-center.generated.json" with { type: "json" };

test("Fall Enrollment readiness uses current package semantics without retired 91 percent", async () => {
  const result = await analyzeQuestionRequest("How ready is Fall Enrollment?", dataset);
  assert.match(result.answer.headline, /modeled demo/i);
  assert.doesNotMatch(JSON.stringify(result.answer), /91%/i);
});

test("broad IPEDS readiness reports package classifications rather than a score", async () => {
  const result = await analyzeQuestionRequest("Are we ready for IPEDS submission?", dataset);
  assert.match(JSON.stringify(result.answer), /1 source-backed|8 modeled|2 source gap/i);
  assert.doesNotMatch(JSON.stringify(result.answer), /91%/);
});

test("current Command Center artifact has no retired IPEDS readiness percentage", () => {
  assert.equal(commandCenter.kpis.ipedsReadiness.display, "1 source-backed");
  assert.doesNotMatch(JSON.stringify(commandCenter), /91%/i);
});

test("current live builders and fixtures do not reintroduce retired readiness", async () => {
  const paths = [
    "../scripts/build-command-center.mjs",
    "../data/command-center/agent_brief.csv",
    "../data/command-center/kpi_snapshot.csv",
    "../data/command-center/kpi_history.csv",
    "../data/command-center/metric_dictionary.csv",
  ];
  for (const path of paths) {
    const value = await fs.readFile(new URL(path, import.meta.url), "utf8");
    assert.doesNotMatch(value, /91%|0\.91(?:\D|$)|submission-ready/i, path);
  }
});

test("historical frozen reports may preserve the old 91 percent evidence", async () => {
  const report = await fs.readFile(new URL("./reports/blind-10-first-run.md", import.meta.url), "utf8");
  assert.match(report, /91%/);
});

test("current package classification remains one source, eight modeled, two gaps, one questionnaire", () => {
  const packages = Object.values(suite.packages);
  assert.equal(packages.filter((item) => item.sourceReadiness === "source_backed").length, 1);
  assert.equal(packages.filter((item) => item.sourceReadiness === "modeled_demo").length, 8);
  assert.equal(packages.filter((item) => item.sourceReadiness === "source_gap").length, 2);
  assert.equal(Object.keys(suite.nonImportable).includes("IC"), true);
  assert.equal(suite.generatorCount, 11);
});

test("Completions stays source-backed while OM and Finance stay source gaps", () => {
  assert.equal(suite.packages.C.sourceReadiness, "source_backed");
  assert.equal(suite.packages.OM.sourceReadiness, "source_gap");
  assert.equal(suite.packages.F.sourceReadiness, "source_gap");
});
