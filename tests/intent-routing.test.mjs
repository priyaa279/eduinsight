import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { analyzeQuestionRequest } from "../lib/ask/request-service.mjs";

const dataset = JSON.parse(
  await readFile(new URL("../app/data/ask-eduinsight.generated.json", import.meta.url)),
);

test("definitional questions route to the governed glossary without a chart", async () => {
  const result = await analyzeQuestionRequest("What is IPEDS?", dataset);
  assert.equal(result.intent, "definition");
  assert.equal(result.answer.chartType, "none");
  assert.match(result.answer.summary, /Integrated Postsecondary Education Data System/);
});

test("capability questions return the governed catalog", async () => {
  const result = await analyzeQuestionRequest("What data is available?", dataset);
  assert.equal(result.intent, "capability");
  assert.equal(result.answer.points.length, 0);
});

test("compact partial questions return a structured resolution panel", async () => {
  const result = await analyzeQuestionRequest("CS 2021?", dataset);
  assert.equal(result.intent, "partial");
  assert.equal(result.answer.disposition, "clarification");
  assert.ok(result.resolution.fields.some((field) => field.id === "program"));
  assert.ok(result.resolution.fields.some((field) => field.id === "time"));
  assert.equal(result.answer.chartType, "none");
});

test("recognized shorthand preserves every resolved program, time, and population constraint", async () => {
  const result = await analyzeQuestionRequest("intl cs fall25", dataset);
  assert.equal(result.intent, "partial");
  const ids = result.resolution.fields.map((field) => field.id);
  assert.deepEqual(ids.sort(), ["metric", "population", "program", "time"]);
  assert.equal(
    result.resolution.fields.find((field) => field.id === "population").options[0].value,
    "international students",
  );
  assert.equal(
    result.resolution.fields.find((field) => field.id === "time").options[0].value,
    "Fall 2025",
  );
});

test("single values have no chart and trends use a line", async () => {
  const single = await analyzeQuestionRequest(
    "What was total enrollment in Fall 2025?",
    dataset,
  );
  assert.equal(single.answer.chartType, "none");
  const trend = await analyzeQuestionRequest(
    "How has total enrollment changed since 2021?",
    dataset,
  );
  assert.equal(trend.answer.chartType, "line");
});
