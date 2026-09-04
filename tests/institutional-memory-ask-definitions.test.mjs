import assert from "node:assert/strict";
import test from "node:test";
import memory from "../app/data/institutional-memory.json" with { type: "json" };
import expandedMemory from "../app/data/institutional-memory-expanded.json" with {
  type: "json",
};
import dataset from "../app/data/ask-eduinsight.generated.json" with { type: "json" };
import { analyzeQuestionRequest } from "../lib/ask/request-service.mjs";
import { buildInstitutionalMemoryCatalog } from "../lib/institutional-memory-contract.mjs";

const catalog = buildInstitutionalMemoryCatalog([memory, expandedMemory]);

test("Ask receives the complete shared Institutional Memory definition contract", () => {
  assert.equal(dataset.governedDefinitions.length, 81);
  assert.equal(dataset.governedDefinitionContract.definitionCount, 81);
  assert.equal(dataset.governedDefinitionContract.contractVersion, catalog.contractVersion);
  assert.deepEqual(dataset.governedDefinitionContract.sourceCatalogs, catalog.sourceCatalogs);
  assert.deepEqual(
    dataset.governedDefinitionContract.technicalValidation,
    catalog.technicalValidation,
  );
  assert.deepEqual(
    dataset.governedDefinitions.map((entry) => entry.id),
    catalog.definitions.map((entry) => entry.id),
  );
});

for (const definition of catalog.definitions) {
  test(`Ask resolves governed definition: ${definition.title}`, async () => {
    const result = await analyzeQuestionRequest(
      `What is the definition of ${definition.title}?`,
      dataset,
    );
    assert.equal(result.intent, "definition");
    assert.equal(result.answer.disposition, "answer");
    assert.equal(result.answer.queryPlan, `glossary_lookup(term=${definition.term})`);
    assert.match(result.answer.summary, new RegExp(definition.definition
      .slice(0, 35)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    assert.match(result.answer.notes.join(" "), /Institutional Memory shared governed definitions/);
  });
}

test("previously wrong direct-title glossary substitutions now resolve exactly", async () => {
  const cases = [
    ["instructional activity", "Instructional activity"],
    ["graduation rate", "Graduation rate"],
    ["faculty headcount", "Faculty headcount"],
    ["tuition discount rate", "Tuition discount rate"],
    ["dual enrollment", "Dual enrollment"],
    ["persistence", "Persistence"],
  ];
  for (const [questionTerm, expectedTerm] of cases) {
    const result = await analyzeQuestionRequest(`What is ${questionTerm}?`, dataset);
    assert.equal(result.answer.queryPlan, `glossary_lookup(term=${expectedTerm})`);
  }
});

test("course-seat utilization uses the explicit Capacity utilization alias", async () => {
  const result = await analyzeQuestionRequest(
    "What does course-seat utilization mean?",
    dataset,
  );
  assert.equal(result.answer.queryPlan, "glossary_lookup(term=Capacity utilization)");
});

test("unknown definition requests fail closed", async () => {
  const result = await analyzeQuestionRequest("What is the moonbeam index?", dataset);
  assert.equal(result.intent, "definition");
  assert.equal(result.answer.disposition, "clarification");
  assert.equal(result.answer.confidence, "Low");
  assert.match(result.answer.summary, /did not substitute a nearby concept/i);
});

test("analytical questions remain analytical after the glossary expansion", async () => {
  const enrollment = await analyzeQuestionRequest(
    "What is total enrollment in 2025?",
    dataset,
  );
  assert.equal(enrollment.intent, "analytical");
  assert.match(enrollment.answer.headline, /18,426/);

  const completions = await analyzeQuestionRequest(
    "How many degrees were awarded in 2025?",
    dataset,
  );
  assert.equal(completions.intent, "analytical");
  assert.match(completions.answer.headline, /1,056/);
});
