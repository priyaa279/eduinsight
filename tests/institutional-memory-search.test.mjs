import assert from "node:assert/strict";
import test from "node:test";
import memory from "../app/data/institutional-memory.json" with { type: "json" };
import expandedMemory from "../app/data/institutional-memory-expanded.json" with {
  type: "json",
};
import {
  getMemorySearchMatch,
  searchMemoryRecords,
} from "../lib/institutional-memory-search.mjs";

const records = [...memory.records, ...expandedMemory.records];

test("persistence search preserves the intended direct and related result cluster", () => {
  const results = records
    .map((record) => ({
      record,
      match: getMemorySearchMatch(record, "Persistence"),
    }))
    .filter(({ match }) => match.matches);

  assert.deepEqual(
    results.map(({ record }) => record.term).sort(),
    [
      "Dropout",
      "Outcome Measures",
      "Persistence",
      "Stop-out",
      "Transfer-out student",
    ].sort(),
  );
  assert.equal(
    results.find(({ record }) => record.term === "Persistence").match.reason,
    "Direct match",
  );
  for (const term of [
    "Dropout",
    "Outcome Measures",
    "Stop-out",
    "Transfer-out student",
  ]) {
    assert.equal(
      results.find(({ record }) => record.term === term).match.reason,
      "Related to: Persistence",
    );
  }
});

test("empty searches have no match-reason badge", () => {
  for (const record of records) {
    assert.deepEqual(getMemorySearchMatch(record, ""), {
      matches: true,
      reason: null,
      matchType: "all",
    });
  }
});

test("search remains deterministic and does not use fuzzy matching", () => {
  assert.equal(
    records.some((record) => getMemorySearchMatch(record, "persistance").matches),
    false,
  );
});

test("short acronym searches use token boundaries and rank exact FTE definitions first", () => {
  const results = searchMemoryRecords(records, "FTE");
  assert.deepEqual(
    results.slice(0, 3).map(({ record }) => record.term),
    [
      "Full-time equivalent enrollment",
      "Faculty full-time equivalent",
      "Instructional-staff FTE",
    ],
  );
  assert.equal(
    results.some(({ record }) => record.term === "Fall headcount"),
    false,
  );
  assert.equal(
    results.some(({ record }) => record.term === "Adjusted cohort"),
    false,
  );
});

test("common full-time equivalency wording resolves to the governed student FTE definition", () => {
  const results = searchMemoryRecords(records, "full time equivalency");
  assert.equal(results[0].record.id, "definition-fte-enrollment");
});

test("all direct matches precede all related matches while preserving order within each group", () => {
  const fixtures = [
    {
      id: "related-first",
      term: "Transfer-out",
      title: "Transfer-out",
      excerpt: "A movement outcome.",
      body: "A movement outcome.",
      source: "Policy",
      owner: "IR",
      tags: ["movement"],
      related: ["Persistence"],
    },
    {
      id: "direct-first",
      term: "Persistence",
      title: "Persistence",
      excerpt: "Continued enrollment.",
      body: "Continued enrollment.",
      source: "Policy",
      owner: "IR",
      tags: ["student success"],
      related: [],
    },
    {
      id: "related-second",
      term: "Stop-out",
      title: "Stop-out",
      excerpt: "A temporary break.",
      body: "A temporary break.",
      source: "Policy",
      owner: "IR",
      tags: ["movement"],
      related: ["Persistence"],
    },
    {
      id: "direct-second",
      term: "Persistence cohort",
      title: "Persistence cohort",
      excerpt: "A defined cohort.",
      body: "A defined cohort.",
      source: "Policy",
      owner: "IR",
      tags: ["student success"],
      related: [],
    },
  ];

  const ordered = searchMemoryRecords(fixtures, "Persistence");
  assert.deepEqual(
    ordered.map(({ record }) => record.id),
    ["direct-first", "direct-second", "related-first", "related-second"],
  );
  assert.deepEqual(
    ordered.map(({ match }) => match.matchType),
    ["direct", "direct", "related", "related"],
  );
});
