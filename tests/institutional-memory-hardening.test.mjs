import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import memory from "../app/data/institutional-memory.json" with { type: "json" };
import expandedMemory from "../app/data/institutional-memory-expanded.json" with {
  type: "json",
};
import {
  buildInstitutionalMemoryCatalog,
  isActiveMemoryPolicy,
  MemoryCatalogValidationError,
  resolveMemoryRelatedReference,
  selectVisibleMemoryRecord,
} from "../lib/institutional-memory-contract.mjs";
import { searchMemoryRecords } from "../lib/institutional-memory-search.mjs";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const catalog = buildInstitutionalMemoryCatalog([memory, expandedMemory]);

function validRecord(overrides = {}) {
  return {
    id: "definition-fixture",
    kind: "Definition",
    title: "Fixture definition",
    term: "Fixture",
    excerpt: "A governed fixture.",
    body: "A governed fixture used by tests.",
    updated: "Verified Jan 1, 2026",
    effective: "Current",
    owner: "Institutional Research",
    status: "Current",
    source: "Test source",
    sourceUrl: null,
    use: "Use only in validation tests.",
    tags: ["fixture"],
    related: [],
    ...overrides,
  };
}

function fixtureCatalog(records, catalogVersion = "fixture.v1") {
  return { catalogVersion, verifiedAt: "2026-01-01", records };
}

test("combined catalog preserves every governed inventory invariant", () => {
  assert.deepEqual(catalog.counts, {
    records: 89,
    definitions: 81,
    policies: 5,
    submissions: 1,
    analyses: 1,
    accreditation: 1,
    sourceReferences: 67,
    ownerReferences: 10,
  });
});

test("combined definition contract is complete, unique, and deterministic", () => {
  assert.equal(catalog.definitions.length, 81);
  assert.equal(new Set(catalog.definitions.map((entry) => entry.id)).size, 81);
  for (const entry of catalog.definitions) {
    assert.ok(entry.title.trim());
    assert.ok(entry.definition.trim());
    assert.ok(entry.institutionalUse.trim());
    assert.ok(entry.source.trim());
    assert.ok(entry.owner.trim());
    assert.ok(entry.catalogVersion.trim());
  }
  const repeat = buildInstitutionalMemoryCatalog([memory, expandedMemory]);
  assert.deepEqual(
    repeat.definitions.map((entry) => entry.id),
    catalog.definitions.map((entry) => entry.id),
  );
});

test("source catalog provenance and historical verification metadata remain separate", () => {
  assert.deepEqual(catalog.sourceCatalogs, [
    {
      catalogVersion: "institutional-memory.v2025_26",
      verifiedAt: "2026-07-29",
      recordCount: 36,
    },
    {
      catalogVersion: "institutional-memory.expansion.v2026_07_30",
      verifiedAt: "2026-07-30",
      recordCount: 53,
    },
  ]);
  assert.doesNotMatch(page, /Governed records verified/);
  assert.match(page, /Governed knowledge catalog/);
  assert.deepEqual(catalog.technicalValidation, {
    status: "passed",
    schemaVersion: "institutional-memory-record.v1",
    validatedRecordCount: 89,
    rejectedRecordCount: 0,
    validationIssueCount: 0,
  });
  assert.match(page, /Combined technical validation/);
});

test("record IDs must satisfy the stable governed identifier structure", () => {
  const result = buildInstitutionalMemoryCatalog(
    [fixtureCatalog([validRecord({ id: "Invalid ID" }), validRecord({ id: "valid-id" })])],
    { isolateInvalidRecords: true },
  );
  assert.deepEqual(result.records.map((record) => record.id), ["valid-id"]);
  assert.ok(result.errors.some((error) => error.code === "INVALID_ID"));
});

test("records without IDs are quarantined by record identity", () => {
  const missingId = validRecord();
  delete missingId.id;
  const result = buildInstitutionalMemoryCatalog(
    [fixtureCatalog([missingId, validRecord({ id: "valid-id" })])],
    { isolateInvalidRecords: true },
  );
  assert.deepEqual(result.records.map((record) => record.id), ["valid-id"]);
  assert.ok(result.errors.some((error) => error.code === "MISSING_ID"));
});

test("missing tags are rejected without crashing unrelated valid records", () => {
  const malformed = validRecord({ id: "bad-tags" });
  delete malformed.tags;
  const result = buildInstitutionalMemoryCatalog(
    [fixtureCatalog([validRecord({ id: "valid" }), malformed])],
    { isolateInvalidRecords: true },
  );
  assert.deepEqual(result.records.map((record) => record.id), ["valid"]);
  assert.ok(result.errors.some((error) => error.code === "MALFORMED_TAGS"));
  assert.doesNotThrow(() => searchMemoryRecords(result.records, "fixture"));
});

test("malformed tag entries return structured validation errors", () => {
  const result = buildInstitutionalMemoryCatalog(
    [fixtureCatalog([validRecord({ tags: ["valid", 42] })])],
    { isolateInvalidRecords: true },
  );
  assert.equal(result.records.length, 0);
  assert.equal(result.errors[0].code, "MALFORMED_TAGS_ENTRY");
});

test("duplicate IDs are rejected deterministically while unrelated records survive", () => {
  const result = buildInstitutionalMemoryCatalog(
    [
      fixtureCatalog([
        validRecord({ id: "duplicate" }),
        validRecord({ id: "duplicate", title: "Second duplicate" }),
        validRecord({ id: "unrelated" }),
      ]),
    ],
    { isolateInvalidRecords: true },
  );
  assert.deepEqual(result.records.map((record) => record.id), ["unrelated"]);
  assert.equal(
    result.errors.filter((error) => error.code === "DUPLICATE_ID").length,
    2,
  );
});

test("invalid categories and missing definition text are rejected", () => {
  const badCategory = validRecord({ id: "bad-category", kind: "Other" });
  const missingText = validRecord({ id: "missing-text", body: "" });
  const result = buildInstitutionalMemoryCatalog(
    [fixtureCatalog([badCategory, missingText])],
    { isolateInvalidRecords: true },
  );
  assert.equal(result.records.length, 0);
  assert.ok(result.errors.some((error) => error.code === "INVALID_CATEGORY"));
  assert.ok(result.errors.some((error) => error.code === "MISSING_REQUIRED_TEXT"));
});

test("malformed related references are rejected and reported", () => {
  const malformed = validRecord({ id: "bad-related", related: [{ id: "x" }] });
  const result = buildInstitutionalMemoryCatalog(
    [fixtureCatalog([malformed])],
    { isolateInvalidRecords: true },
  );
  assert.equal(result.records.length, 0);
  assert.ok(
    result.errors.some((error) => error.code === "MALFORMED_RELATED_ENTRY"),
  );
});

test("unresolved related aliases are quarantined with a structured reason", () => {
  const result = buildInstitutionalMemoryCatalog(
    [fixtureCatalog([validRecord({ related: ["Unknown target"] })])],
    { isolateInvalidRecords: true },
  );
  assert.equal(result.records.length, 0);
  assert.equal(result.errors[0].code, "UNRESOLVED_RELATED_REFERENCE");
});

test("catalog-level absence and malformed JSON fail explicitly", () => {
  assert.throws(
    () => buildInstitutionalMemoryCatalog([]),
    MemoryCatalogValidationError,
  );
  assert.throws(() => JSON.parse("{not-json"), SyntaxError);
});

test("collection-period related references resolve to one exact governed target", () => {
  const source = catalog.records.find(
    (record) => record.id === "definition-ipeds-component",
  );
  for (const reference of ["Fall collection", "Winter collection", "Spring collection"]) {
    const target = resolveMemoryRelatedReference(catalog.records, source, reference);
    assert.equal(target?.id, "definition-collection-periods");
  }
});

test("Award level is an explicit governed alias", () => {
  const source = catalog.records.find((record) => record.id === "definition-completion");
  assert.equal(
    resolveMemoryRelatedReference(catalog.records, source, "Award level")?.id,
    "definition-credential-level",
  );
});

test("no current related link is unresolved or self-referential", () => {
  for (const record of catalog.records) {
    for (const reference of record.related) {
      const target = resolveMemoryRelatedReference(catalog.records, record, reference);
      assert.ok(target, `${record.id}: ${reference}`);
      assert.notEqual(target.id, record.id, `${record.id}: ${reference}`);
    }
  }
});

test("course-seat utilization is a direct alias for Capacity utilization", () => {
  const results = searchMemoryRecords(catalog.records, "course-seat utilization");
  assert.equal(results[0]?.record.id, "definition-capacity");
  assert.equal(results[0]?.match.matchType, "direct");
});

test("search contract covers exact, partial, owner, source, case, and punctuation", () => {
  assert.equal(searchMemoryRecords(catalog.records, "Persistence")[0].record.id, "definition-persistence");
  assert.ok(searchMemoryRecords(catalog.records, "retent").length > 0);
  assert.ok(searchMemoryRecords(catalog.records, "Registrar").every(({ record }) =>
    [record.owner, record.title, record.term, record.excerpt, record.body, record.source, ...record.tags]
      .join(" ")
      .toLowerCase()
      .includes("registrar"),
  ));
  assert.ok(searchMemoryRecords(catalog.records, "NCES").length > 0);
  assert.deepEqual(
    searchMemoryRecords(catalog.records, "IPEDS").map(({ record }) => record.id),
    searchMemoryRecords(catalog.records, "ipeds").map(({ record }) => record.id),
  );
  assert.doesNotThrow(() => searchMemoryRecords(catalog.records, "[?*"));
});

test("category and search constraints remain combined", () => {
  const policies = catalog.records.filter((record) => record.kind === "Policy");
  const results = searchMemoryRecords(policies, "enrollment");
  assert.ok(results.length > 0);
  assert.ok(results.every(({ record }) => record.kind === "Policy"));
});

test("visible selection clears at zero results and cannot retain an excluded record", () => {
  assert.equal(selectVisibleMemoryRecord([], "definition-fall-headcount"), null);
  const visible = catalog.records.filter((record) => record.kind === "Policy");
  assert.equal(
    selectVisibleMemoryRecord(visible, "definition-fall-headcount")?.id,
    visible[0].id,
  );
});

test("Data Quality lifecycle terminology matches the frozen operational contract", () => {
  const finding = catalog.records.find(
    (record) => record.id === "definition-quality-finding",
  );
  assert.match(finding.use, /Open, In Review, Resolved, and Suppressed/);
  assert.doesNotMatch(finding.use, /investigating|reviewed/i);
});

test("active policy count is status-aware", () => {
  assert.equal(catalog.records.filter(isActiveMemoryPolicy).length, 5);
  assert.equal(
    [
      validRecord({ kind: "Policy", status: "Approved" }),
      validRecord({ id: "historical", kind: "Policy", status: "Historical" }),
    ].filter(isActiveMemoryPolicy).length,
    1,
  );
});

test("metadata labels describe references and internal demo governance accurately", () => {
  assert.match(page, /Distinct source references/);
  assert.match(page, /Distinct owner references/);
  assert.match(page, /internal demonstration governance metadata/);
  assert.match(page, /record-level references, not field-level lineage/);
  assert.match(page, /Synthetic institutional dataset created for demonstration and testing/);
});

test("Institutional Memory controls expose accessible names and selected state", () => {
  assert.match(page, /aria-label="Search institutional memory"/);
  assert.match(page, /aria-pressed=\{kind === item\}/);
  assert.match(page, /aria-pressed=\{displayedSelected\?\.id === item\.id\}/);
  assert.match(page, /role="status" aria-live="polite"/);
  assert.match(page, /isolateInvalidRecords: true/);
  assert.match(page, /catalog validation issue/);
});

test("responsive contract stacks the catalog by 1100px without changing 1280px hero behavior", () => {
  assert.match(
    css,
    /@media \(max-width: 1100px\)[\s\S]*?\.memory-layout\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/,
  );
  assert.match(
    css,
    /\.memory-search\s*\{[\s\S]*?grid-template-columns:\s*44px minmax\(0, 1fr\) minmax\(340px, min\(40%, 600px\)\)/,
  );
  assert.match(css, /@media \(max-width: 900px\)/);
});
