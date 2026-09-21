import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import {
  analyzeQuestion,
  planQuestionLocally,
  validateSemanticPlan,
} from "../lib/ask-engine.mjs";
import { normalizeQuestion } from "../lib/ask/normalization.mjs";

const dataset = JSON.parse(
  await fs.readFile(
    new URL("../app/data/ask-eduinsight.generated.json", import.meta.url),
    "utf8",
  ),
);

function degreeEvidence(result) {
  return result.plan.semanticEvidence.find(
    (item) => item.kind === "degree_level",
  );
}

test("MS Computer Science trend remains program-specific and unchanged", () => {
  const result = analyzeQuestion(
    "How has MS Computer Science enrollment changed since 2021?",
    dataset,
  );

  assert.equal(result.plan.responseType, "answer");
  assert.equal(result.plan.programId, "PCS");
  assert.equal(result.plan.degreeLevel, "Graduate");
  assert.equal(degreeEvidence(result).value, "MS");
  assert.deepEqual(
    result.answer.points.map((point) => point.value),
    [475, 510, 560, 600, 678],
  );
  assert.match(result.answer.headline, /up 42\.7% since 2021/);
});

test("unsupported BS Computer Science fails closed without executing MS data", () => {
  const result = analyzeQuestion(
    "How has BS Computer Science enrollment changed since 2021?",
    dataset,
  );

  assert.equal(result.plan.responseType, "limitation");
  assert.equal(result.plan.programId, "PCS");
  assert.equal(degreeEvidence(result).value, "BS");
  assert.equal(result.plan.filterAudit.complete, false);
  assert.deepEqual(result.plan.filterAudit.applied, []);
  assert.equal(result.plan.contradictions.length, 1);
  assert.match(result.plan.responseReason, /BS does not match.*MS Computer Science/s);
  assert.deepEqual(result.answer.points, []);
  assert.equal(result.answer.confidence, "Low");
});

test("unsupported BS Computer Science snapshot fails closed", () => {
  const result = analyzeQuestion(
    "What is enrollment for BS Computer Science in 2025?",
    dataset,
  );

  assert.equal(result.plan.responseType, "limitation");
  assert.equal(degreeEvidence(result).value, "BS");
  assert.deepEqual(result.answer.points, []);
  assert.doesNotMatch(result.answer.headline, /678/);
});

test("discipline-only Computer Science behavior remains unchanged", () => {
  const result = analyzeQuestion(
    "What is enrollment for Computer Science in 2025?",
    dataset,
  );

  assert.equal(result.plan.responseType, "answer");
  assert.equal(result.plan.programId, "PCS");
  assert.equal(result.answer.points[0].value, 678);
  assert.match(result.answer.notes[0], /resolved to catalog program MS Computer Science/);
});

test("punctuated and full MS qualifications resolve to the canonical program", () => {
  for (const question of [
    "What is enrollment for M.S. Computer Science in 2025?",
    "What is enrollment for Master of Science Computer Science in 2025?",
  ]) {
    const result = analyzeQuestion(question, dataset);
    assert.equal(result.plan.responseType, "answer", question);
    assert.equal(result.plan.programId, "PCS", question);
    assert.equal(degreeEvidence(result).value, "MS", question);
    assert.equal(result.answer.points[0].value, 678, question);
  }
});

test("punctuated and full BS qualifications cannot cross into the MS program", () => {
  for (const question of [
    "What is enrollment for B.S. Computer Science in 2025?",
    "What is enrollment for Bachelor of Science Computer Science in 2025?",
  ]) {
    const result = analyzeQuestion(question, dataset);
    assert.equal(result.plan.responseType, "limitation", question);
    assert.equal(degreeEvidence(result).value, "BS", question);
    assert.deepEqual(result.answer.points, [], question);
  }
});

test("degree-qualified BA, BS, and BBA catalog programs resolve exactly", () => {
  for (const [question, programId, qualifier] of [
    ["What is enrollment for B.A. Psychology in 2025?", "PPSY", "BA"],
    ["What is enrollment for Bachelor of Arts English in 2025?", "PENG", "BA"],
    ["What is enrollment for B.S. Biology in 2025?", "PBIO", "BS"],
    ["What is enrollment for BBA Business Administration in 2025?", "PBUS", "BBA"],
  ]) {
    const result = analyzeQuestion(question, dataset);
    assert.equal(result.plan.responseType, "answer", question);
    assert.equal(result.plan.programId, programId, question);
    assert.equal(degreeEvidence(result).value, qualifier, question);
  }
});

test("incorrect degree and real discipline combinations fail closed", () => {
  for (const [question, qualifier] of [
    ["What is enrollment for M.A. Psychology in 2025?", "MA"],
    ["What is enrollment for B.A. Biology in 2025?", "BA"],
    ["What is enrollment for M.S. Public Administration in 2025?", "MS"],
  ]) {
    const result = analyzeQuestion(question, dataset);
    assert.equal(result.plan.responseType, "limitation", question);
    assert.equal(degreeEvidence(result).value, qualifier, question);
    assert.equal(result.plan.filterAudit.complete, false, question);
    assert.deepEqual(result.answer.points, [], question);
  }
});

test("degree abbreviation punctuation normalizes without losing the credential", () => {
  assert.equal(normalizeQuestion("B.S. Biology enrollment"), "bs biology enrollment");
  assert.equal(normalizeQuestion("M.S. Nursing enrollment"), "ms nursing enrollment");
  assert.equal(normalizeQuestion("B.A. English enrollment"), "ba english enrollment");
  assert.equal(normalizeQuestion("M.A. Psychology enrollment"), "ma psychology enrollment");
});

test("the semantic validator independently blocks a conserved degree mismatch", () => {
  const plan = planQuestionLocally(
    "What is enrollment for MS Computer Science in 2025?",
    dataset,
  );
  plan.semanticEvidence = [
    { kind: "degree_level", value: "BS", sourceSpan: "BS" },
  ];

  const validation = validateSemanticPlan(plan, dataset);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.includes("degreeProgramMismatch"));
});

test("an unsupported credential-only scope fails closed instead of broadening", () => {
  for (const question of [
    "How has BA enrollment changed since 2021?",
    "How has MA enrollment changed since 2021?",
  ]) {
    const result = analyzeQuestion(question, dataset);
    assert.equal(result.plan.responseType, "limitation", question);
    assert.equal(result.plan.filterAudit.complete, false, question);
    assert.deepEqual(result.plan.filterAudit.applied, [], question);
    assert.deepEqual(result.answer.points, [], question);
  }
});

test("a credential on one named program cannot drop another named program", () => {
  const result = analyzeQuestion(
    "Why is MS Business Analytics closer to full capacity than MPA?",
    dataset,
  );

  assert.deepEqual(result.plan.requestedProgramIds, ["PBA", "PPA"]);
  assert.equal(result.plan.responseType, "limitation");
  assert.deepEqual(result.answer.points, []);
});
