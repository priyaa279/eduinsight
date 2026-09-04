import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import suite from "../app/data/ipeds-suite.generated.json" with { type: "json" };
import {
  summarizeReviewWorkflow,
  summarizeValidationWorkflow,
} from "../lib/ipeds-validation-presentation.mjs";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("validation is neutral and explicitly not run before execution", () => {
  const summary = summarizeValidationWorkflow(
    [{ status: "Passed" }, { status: "Failed" }],
    false,
  );

  assert.equal(summary.state, "pending");
  assert.equal(summary.label, "Validation");
  assert.equal(summary.summary, "2 checks not run");
  assert.equal(summary.ariaLabel, "Validation not run; 2 checks not run");
});

test("an executed all-pass bank receives completed success semantics", () => {
  const summary = summarizeValidationWorkflow(
    [{ status: "Passed" }, { status: "Passed" }],
    true,
  );

  assert.equal(summary.state, "passed");
  assert.equal(summary.label, "Validation completed");
  assert.equal(summary.summary, "2 passed");
  assert.equal(
    summary.ariaLabel,
    "Validation completed with all 2 checks passed.",
  );
});

test("an executed bank with failures receives completed warning semantics", () => {
  const summary = summarizeValidationWorkflow(
    [{ status: "Passed" }, { status: "Failed" }],
    true,
  );

  assert.equal(summary.state, "failed");
  assert.equal(summary.label, "Validation completed");
  assert.equal(summary.summary, "1 passed · 1 failed");
  assert.equal(
    summary.ariaLabel,
    "Validation completed with 1 passed and 1 failed.",
  );
});

test("an execution failure receives error semantics rather than a check-failure warning", () => {
  const summary = summarizeValidationWorkflow(
    [{ status: "Passed" }, { status: "Failed" }],
    false,
    true,
  );

  assert.equal(summary.state, "error");
  assert.equal(summary.label, "Validation could not run");
  assert.equal(summary.summary, "Validation error");
  assert.equal(summary.ariaLabel, "Validation could not run.");
  assert.equal(summary.passedCount, 0);
  assert.equal(summary.failedCount, 0);
});

test("current Completions workflow uses the actual validation-record counts", () => {
  const summary = summarizeValidationWorkflow(suite.packages.C.validations, true);

  assert.equal(summary.totalCount, 15);
  assert.equal(summary.passedCount, 14);
  assert.equal(summary.failedCount, 1);
  assert.equal(summary.summary, "14 passed · 1 failed");
  assert.equal(suite.packages.C.completenessFailureCount, 2);
});

test("the UI executes validation without changing approval eligibility", () => {
  assert.match(page, /function validate\(\)[\s\S]*setValidationComplete\(true\)/);
  assert.match(
    page,
    /catch \{[\s\S]*setValidationComplete\(false\)[\s\S]*setValidationExecutionError\(true\)/,
  );
  assert.match(page, /validation could not run\./);
  assert.match(page, /onClick=\{validate\}/);
  assert.match(page, /validationComplete &&[\s\S]*validationFailures === 0/);
  assert.match(page, /!packageComplete[\s\S]*Complete every required survey part/);
  assert.match(page, /disabled=\{!canApprove \|\| approved \|\| approvalSaving\}/);
});

test("workflow warning and blocked states are textual as well as visual", () => {
  assert.match(page, /Step 2 completed with failures:/);
  assert.match(page, /<AppIcon name="warning" \/>/);
  assert.match(page, /Blocked · required evidence remains/);
  assert.match(css, /\.approval-flow > div\.warning > span/);
  assert.match(css, /\.approval-flow > div\.error > span/);
  assert.match(css, /\.approval-flow > div\.blocked > span/);
  const warningRule = css.match(/\.approval-flow > div\.warning > span\s*\{([^}]*)\}/s)?.[1];
  assert.ok(warningRule);
  assert.match(warningRule, /var\(--brass\)/);
  assert.match(warningRule, /var\(--brass-deep\)/);
  assert.match(warningRule, /var\(--brass-tint\)/);
  assert.doesNotMatch(warningRule, /var\(--claret\)/);
  const errorRule = css.match(/\.approval-flow > div\.error > span\s*\{([^}]*)\}/s)?.[1];
  assert.ok(errorRule);
  assert.match(errorRule, /var\(--claret\)/);
  assert.match(errorRule, /var\(--claret-deep\)/);
  assert.match(errorRule, /var\(--claret-tint\)/);
});

test("initial workflow makes Prepared current and keeps review blocked", () => {
  const workflow = summarizeReviewWorkflow({
    generated: false,
    validationState: "pending",
    hasBlockers: true,
    eligible: false,
    approved: false,
  });

  assert.deepEqual(workflow, {
    prepared: "current",
    validation: "pending",
    review: "blocked",
  });
});

test("generation completes Prepared and makes pending Validation current", () => {
  const workflow = summarizeReviewWorkflow({
    generated: true,
    validationState: "pending",
    hasBlockers: true,
    eligible: false,
    approved: false,
  });

  assert.deepEqual(workflow, {
    prepared: "completed",
    validation: "current",
    review: "blocked",
  });
});

test("failed and all-pass validation preserve a blocked future review step", () => {
  const failed = summarizeReviewWorkflow({
    generated: true,
    validationState: "failed",
    hasBlockers: true,
    eligible: false,
    approved: false,
  });
  const passed = summarizeReviewWorkflow({
    generated: true,
    validationState: "passed",
    hasBlockers: true,
    eligible: false,
    approved: false,
  });

  assert.deepEqual(failed, {
    prepared: "completed",
    validation: "warning",
    review: "blocked",
  });
  assert.deepEqual(passed, {
    prepared: "completed",
    validation: "completed",
    review: "blocked",
  });
});

test("an execution error is distinct from a completed check-failure warning", () => {
  const workflow = summarizeReviewWorkflow({
    generated: true,
    validationState: "error",
    hasBlockers: true,
    eligible: false,
    approved: false,
  });

  assert.deepEqual(workflow, {
    prepared: "completed",
    validation: "error",
    review: "blocked",
  });
});

test("review becomes current only from governed eligibility and completed only after approval", () => {
  const eligible = summarizeReviewWorkflow({
    generated: true,
    validationState: "passed",
    hasBlockers: false,
    eligible: true,
    approved: false,
  });
  const approved = summarizeReviewWorkflow({
    generated: true,
    validationState: "passed",
    hasBlockers: false,
    eligible: false,
    approved: true,
  });

  assert.equal(eligible.review, "current");
  assert.equal(approved.review, "completed");
});

test("workflow progression states are exposed without color-only meaning", () => {
  assert.match(page, /aria-current=\{reviewWorkflow\.prepared === "current" \? "step" : undefined\}/);
  assert.match(page, /Step 1 current: Prepared; generate file/);
  assert.match(page, /Step 2 current:/);
  assert.match(page, /Step 2 completed with failures:/);
  assert.match(page, /Step 3 blocked: Ready for review unavailable because required evidence remains/);
  assert.match(css, /\.approval-flow > div\.current > span/);
  assert.match(css, /\.approval-flow > div\.blocked > span/);
});

test("validation rows switch from Not run to their executed source status", () => {
  assert.match(page, /validationComplete \? check\.status : "Not run"/);
  assert.match(
    page,
    /validationComplete\s*\? check\.status === "Passed"[\s\S]*check\.failedCount/,
  );
});

test("toast reports readable, dynamic pass and fail counts", () => {
  assert.match(
    page,
    /`\$\{survey\.name\} validation completed · \$\{validationWorkflow\.passedCount\} passed · \$\{validationWorkflow\.failedCount\} failed\.`/,
  );
  assert.doesNotMatch(page, /\$\{survey\.code\} checks completed/);
});
