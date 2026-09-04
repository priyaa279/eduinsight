import assert from "node:assert/strict";
import test from "node:test";
import askDataset from "../app/data/ask-eduinsight.generated.json" with { type: "json" };
import ipedsSuite from "../app/data/ipeds-suite.generated.json" with { type: "json" };
import { analyzeQuestionRequest } from "../lib/ask/request-service.mjs";
import {
  evaluateDataQuality,
  summarizeDataQuality,
} from "../lib/data-quality/evaluate.mjs";
import {
  loadDataQualityContext,
  parseGovernedCsv,
} from "./helpers/data-quality-context.mjs";

test("core governed values reconcile independently from source files", () => {
  const students = parseGovernedCsv("students.csv");
  const studentTerms = parseGovernedCsv("student_terms.csv");
  const completions = parseGovernedCsv("completions.csv");
  const sections = parseGovernedCsv("sections.csv");
  const sectionEnrollments = parseGovernedCsv("section_enrollments.csv");

  const currentEnrollment = new Set(
    studentTerms
      .filter(
        (row) =>
          row.term_id === "2025FA" &&
          row.census_enrolled === "1" &&
          row.reportable === "1",
      )
      .map((row) => row.student_id),
  ).size;
  assert.equal(currentEnrollment, 18_426);

  const cohort = new Set(
    students
      .filter(
        (student) =>
          student.ftft_cohort_term_id === "2024FA" &&
          student.degree_seeking === "1",
      )
      .map((student) => student.student_id),
  );
  const retained = new Set(
    studentTerms
      .filter(
        (row) =>
          row.term_id === "2025FA" &&
          row.census_enrolled === "1" &&
          row.reportable === "1" &&
          cohort.has(row.student_id),
      )
      .map((row) => row.student_id),
  );
  assert.equal(cohort.size, 3_000);
  assert.equal(retained.size, 2_352);
  assert.equal(retained.size / cohort.size, 0.784);

  assert.equal(
    completions.filter((row) => row.reporting_year === "2025").length,
    1_056,
  );

  const currentSections = sections.filter((row) => row.term_id === "2025FA");
  const evidenceProgramIds = new Set(currentSections.map((row) => row.program_id));
  assert.equal(evidenceProgramIds.size, 4);
  const csSections = currentSections.filter((row) => row.program_id === "PCS");
  const csSectionIds = new Set(csSections.map((row) => row.section_id));
  const csSeats = csSections.reduce(
    (sum, row) => sum + Number(row.section_capacity),
    0,
  );
  const csRegistrations = sectionEnrollments.filter(
    (row) =>
      csSectionIds.has(row.section_id) && row.enrollment_status === "Enrolled",
  ).length;
  assert.equal(csSeats, 2_520);
  assert.equal(csRegistrations, 2_441);
  assert.equal(csRegistrations / csSeats, 2_441 / 2_520);
});

test("Data Quality rule and finding counts reconcile from the evaluator", () => {
  const evaluation = evaluateDataQuality(loadDataQualityContext());
  const summary = summarizeDataQuality(
    evaluation.results,
    evaluation.activeFindings,
  );
  assert.deepEqual(
    {
      pass: summary.pass,
      fail: summary.fail,
      notEvaluated: summary.notEvaluated,
      activeFindings: summary.activeFindings,
    },
    { pass: 10, fail: 4, notEvaluated: 21, activeFindings: 4 },
  );
});

test("current IPEDS package classifications reconcile outside Ask", () => {
  const packages = Object.values(ipedsSuite.packages);
  assert.equal(ipedsSuite.officialImportLayoutCodes.length, 11);
  assert.equal(
    packages.filter((item) => item.sourceReadiness === "source_backed").length,
    1,
  );
  assert.equal(
    packages.filter((item) => item.sourceReadiness === "modeled_demo").length,
    8,
  );
  assert.deepEqual(
    packages
      .filter((item) => item.sourceReadiness === "source_gap")
      .map((item) => item.code)
      .sort(),
    ["F", "OM"],
  );
  assert.equal(Object.keys(ipedsSuite.nonImportable).length, 1);
});

test("representative governed interpretations are deterministic across 20 runs", async () => {
  for (const question of [
    "What is total enrollment in 2025?",
    "How many quality rules were not evaluated?",
    "Which IPEDS components have source gaps?",
  ]) {
    const serialized = [];
    for (let run = 0; run < 20; run += 1) {
      const result = await analyzeQuestionRequest(question, askDataset);
      serialized.push(
        JSON.stringify({
          plan: result.plan,
          headline: result.answer.headline,
          points: result.answer.points,
          sources: result.answer.sources,
        }),
      );
    }
    assert.equal(new Set(serialized).size, 1, question);
  }
});
