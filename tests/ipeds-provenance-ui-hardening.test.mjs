import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import suite from "../app/data/ipeds-suite.generated.json" with { type: "json" };

const [page, css] = await Promise.all([
  fs.readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  fs.readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
]);
const ipeds = page.slice(page.indexOf("function Ipeds("), page.indexOf("function Scenario("));

test("modeled demo and source-gap artifacts are not labeled source-backed", () => {
  assert.match(ipeds, /generated from modeled demonstration inputs/);
  assert.match(ipeds, /partial demonstration output · source gap/);
  assert.doesNotMatch(ipeds, /generated from source-backed controls/);
});

test("model-internal consistency is not mislabeled as source reconciliation", () => {
  for (const item of Object.values(suite.packages).filter((pkg) => pkg.sourceReadiness !== "source_backed")) {
    assert.doesNotMatch(item.sourceReadinessDetail, /source-backed|source reconciliation/i);
  }
  assert.match(JSON.stringify(suite.packages.EF.validations), /modeled|internal/i);
});

test("source-backed Completions provenance is explicitly synthetic and source-derived", () => {
  assert.match(ipeds, /generated from synthetic source records/);
});

test("questionnaire workflow uses questionnaire and keyholder-response language", () => {
  assert.match(ipeds, /questionnaire/i);
  assert.match(ipeds, /keyholder questionnaire responses/i);
});

test("Not run uses neutral styling and accessible actual-state text", () => {
  assert.match(ipeds, /!validationComplete\s*\? "not-run"/);
  assert.match(ipeds, /validationComplete \? check\.status : "Not run"/);
  assert.match(css, /\.validation-row\.not-run/);
  assert.match(css, /\.validation-row\.not-run > span/);
});

test("Not run does not share the passed checkmark branch", () => {
  assert.match(ipeds, /!validationComplete\s*\? "refresh"\s*: check\.status === "Passed"\s*\? "check"\s*: "warning"/);
});

test("passed and failed validation states remain visibly distinct", () => {
  assert.match(ipeds, /check\.status === "Passed"\s*\? "passed"\s*: "attention"/);
  assert.match(css, /\.validation-row\.attention/);
});

test("selected package controls expose pressed state", () => {
  assert.match(ipeds, /aria-pressed=\{selected === index\}/);
});

test("official layout availability is presented separately from package readiness", () => {
  assert.match(ipeds, /Official import layouts available/);
  assert.match(ipeds, /packageComplete/);
  assert.match(ipeds, /packageSourceBacked/);
  assert.match(ipeds, /packageData\.reconciliationFailureCount/);
});

test("EduInsight explicitly states it does not submit data to NCES", () => {
  assert.match(page, /EduInsight does not submit data to NCES\./);
});

test("current IPEDS UI has no successful NCES submission claim", () => {
  assert.doesNotMatch(ipeds, /submitted to NCES|accepted by NCES|NCES approved/i);
});
