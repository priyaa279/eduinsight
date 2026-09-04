import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import memory from "../app/data/institutional-memory.json" with { type: "json" };
import expandedMemory from "../app/data/institutional-memory-expanded.json" with {
  type: "json",
};
import annualChanges from "../data/ipeds/specs/2025-26/annual-changes.json" with {
  type: "json",
};
import {
  formatMemoryVerificationDate,
  memoryKindDisplayLabel,
} from "../lib/institutional-memory-presentation.mjs";
import {
  buildInstitutionalMemoryCatalog,
  resolveMemoryRelatedReference,
} from "../lib/institutional-memory-contract.mjs";

const combinedCatalog = buildInstitutionalMemoryCatalog([memory, expandedMemory]);
const records = combinedCatalog.records;
const pageSource = readFileSync(
  new URL("../app/page.tsx", import.meta.url),
  "utf8",
);
const cssSource = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);

test("institutional memory hero search is wide on desktop and full-width on narrow screens", () => {
  assert.match(
    cssSource,
    /\.memory-search\s*\{[^}]*grid-template-columns:\s*44px minmax\(0, 1fr\) minmax\(340px, min\(40%, 600px\)\);/s,
  );
  assert.match(
    cssSource,
    /\.memory-search h2\s*\{[^}]*font-size:\s*clamp\(16px, 1\.25vw, 20px\);[^}]*white-space:\s*nowrap;/s,
  );
  const narrowLayout = cssSource.slice(
    cssSource.indexOf("@media (max-width: 1250px)"),
    cssSource.indexOf("@media (max-width: 900px)"),
  );
  assert.match(
    narrowLayout,
    /\.memory-search\s*\{[^}]*grid-template-columns:\s*44px minmax\(0, 1fr\);/s,
  );
  assert.match(
    narrowLayout,
    /\.memory-search label\s*\{[^}]*grid-column:\s*1 \/ -1;[^}]*width:\s*100%;[^}]*margin-left:\s*0;/s,
  );
  assert.match(pageSource, /placeholder="Search definitions, policies, IPEDS, retention, census\.\.\."/);
});

test("institutional memory preserves each source catalog verification event", () => {
  assert.equal(formatMemoryVerificationDate(expandedMemory.verifiedAt), "July 30, 2026");
  assert.equal(formatMemoryVerificationDate(memory.verifiedAt), "July 29, 2026");
  assert.match(pageSource, /Governed knowledge catalog/);
  assert.match(pageSource, /memoryCatalog\.sourceCatalogs\.map/);
  assert.match(pageSource, /Catalog version/);
  assert.doesNotMatch(pageSource, /Governed records verified/);
  assert.deepEqual(combinedCatalog.sourceCatalogs, [
    {
      catalogVersion: memory.catalogVersion,
      verifiedAt: memory.verifiedAt,
      recordCount: memory.records.length,
    },
    {
      catalogVersion: expandedMemory.catalogVersion,
      verifiedAt: expandedMemory.verifiedAt,
      recordCount: expandedMemory.records.length,
    },
  ]);
  assert.doesNotMatch(pageSource, /· version|>version</i);
  assert.doesNotMatch(cssSource, /content:\s*["']\s*· version["']/i);
});

test("institutional memory uses reusable portfolio-facing category labels", () => {
  assert.deepEqual(
    Object.fromEntries(
      ["All", "Definition", "Policy", "Submission", "Analysis", "Accreditation"].map(
        (kind) => [kind, memoryKindDisplayLabel(kind)],
      ),
    ),
    {
      All: "All",
      Definition: "Definitions",
      Policy: "Policies",
      Submission: "Prior submissions",
      Analysis: "Analyses",
      Accreditation: "Accreditation evidence",
    },
  );
  assert.match(pageSource, /memoryKindDisplayLabel\(item\)/);
});

test("portfolio wording broadens Memory without changing its generated counts", () => {
  const counts = Object.fromEntries(
    ["Definition", "Policy", "Submission", "Analysis", "Accreditation"].map(
      (kind) => [kind, records.filter((record) => record.kind === kind).length],
    ),
  );
  assert.deepEqual(counts, {
    Definition: 81,
    Policy: 5,
    Submission: 1,
    Analysis: 1,
    Accreditation: 1,
  });
  assert.equal(records.length, 89);
  assert.equal(new Set(records.map((record) => record.source)).size, 67);
  assert.equal(new Set(records.map((record) => record.owner)).size, 10);
  assert.match(pageSource, /Distinct source references/);
  assert.match(pageSource, /Distinct owner references/);
  assert.match(
    pageSource,
    /Understand the definition, source, and history behind the number\./,
  );
  assert.doesNotMatch(pageSource, /Find the definition before using the number\./);
  assert.match(pageSource, /<h3>Summary<\/h3>/);
  assert.match(pageSource, /<h3>Institutional use<\/h3>/);
});

test("Policy, Analysis, and Accreditation selections retain governed detail fields", () => {
  assert.match(pageSource, /onClick=\{\(\) => setSelected\(item\)\}/);
  for (const kind of ["Policy", "Analysis", "Accreditation"]) {
    const record = records.find((candidate) => candidate.kind === kind);
    assert.ok(record, `${kind} record exists`);
    for (const field of ["title", "status", "updated", "effective", "owner", "source"]) {
      assert.ok(record[field]?.trim(), `${kind}.${field}`);
    }
  }
});

test("institutional memory exposes a governed, searchable catalog", () => {
  assert.ok(records.length >= 65);
  assert.equal(new Set(records.map((record) => record.id)).size, records.length);
  for (const record of records) {
    for (const field of [
      "id",
      "kind",
      "title",
      "term",
      "excerpt",
      "body",
      "updated",
      "effective",
      "owner",
      "status",
      "source",
      "use",
    ]) {
      assert.equal(typeof record[field], "string", `${record.id}.${field}`);
      assert.ok(record[field].trim(), `${record.id}.${field} must not be blank`);
    }
    assert.ok(record.tags.length > 0, `${record.id} needs search tags`);
    assert.ok(record.related.length > 0, `${record.id} needs related records`);
  }
});

test("core institutional and IPEDS definitions are present", () => {
  const terms = new Set(
    records
      .filter((record) => record.kind === "Definition")
      .map((record) => record.term.toLowerCase()),
  );
  for (const term of [
    "ipeds",
    "keyholder",
    "explanation edit",
    "fall headcount",
    "12-month enrollment",
    "ftft",
    "first-year retention",
    "completion",
    "completer",
    "cip code",
    "awlevel",
    "dfw",
    "dfw rate",
    "pell eligible",
    "pell recipient",
    "capacity utilization",
    "data-quality finding",
    "graduation rate",
    "200% graduation rate",
    "outcome measures",
    "admission rate",
    "admissions yield",
    "cost of attendance",
    "average net price",
    "total revenue",
    "total expenses",
    "instructional staff",
    "ipeds occupational category",
    "faculty headcount",
    "student-to-faculty ratio",
    "institutional control",
    "institution level",
    "calendar system",
    "credit hour",
    "clock hour",
    "academic term",
    "academic year",
    "degree/certificate-seeking",
    "credential level",
    "academic program",
    "major",
    "concentration",
    "full-time status",
    "instructional activity",
    "distance education status",
    "dual enrollment",
    "u.s. nonresident",
    "race/ethnicity reporting category",
    "sex reporting category",
    "instructional-staff fte",
    "normal time",
    "duplicated headcount",
    "unduplicated headcount",
    "new student",
    "transfer-in student",
    "transfer-out student",
    "stop-out",
    "dropout",
    "persistence",
    "tuition discount rate",
    "accreditation",
    "title iv",
    "ferpa",
  ]) {
    assert.ok(terms.has(term), `Missing definition: ${term}`);
  }
});

test("every related-term link resolves to another governed record", () => {
  for (const record of records) {
    for (const related of record.related) {
      const target = resolveMemoryRelatedReference(records, record, related);
      assert.ok(target, `${record.id} has an unresolved related term: ${related}`);
      assert.notEqual(target.id, record.id, `${record.id} cannot relate to itself`);
    }
  }
});

test("every live IPEDS generator domain has governed memory coverage", () => {
  const terms = new Set(
    records
      .filter((record) => record.kind === "Definition")
      .map((record) => record.term.toLowerCase()),
  );
  const generatorCoverage = {
    C: [
      "completion",
      "completer",
      "cip code",
      "awlevel",
      "distance education status",
    ],
    E12: [
      "12-month enrollment",
      "unduplicated headcount",
      "full-time equivalent enrollment",
      "instructional activity",
      "distance education status",
      "dual enrollment",
    ],
    EF: [
      "fall headcount",
      "first-year retention",
      "student-to-faculty ratio",
      "race/ethnicity reporting category",
      "sex reporting category",
    ],
    SFA: ["student financial aid", "pell recipient", "average net price"],
    GR: ["graduation rate", "adjusted cohort", "normal time"],
    GR200: ["200% graduation rate", "normal time"],
    OM: ["outcome measures"],
    ADM: ["admission rate", "admissions yield"],
    CST: ["cost of attendance", "tuition and required fees"],
    F: ["total revenue", "total expenses", "net position"],
    HR: [
      "instructional staff",
      "ipeds occupational category",
      "tenure status",
      "faculty headcount",
      "faculty full-time equivalent",
      "instructional-staff fte",
    ],
    IC: ["institutional control", "institution level", "calendar system"],
  };
  for (const [component, requiredTerms] of Object.entries(generatorCoverage)) {
    for (const term of requiredTerms) {
      assert.ok(terms.has(term), `${component} missing governed definition: ${term}`);
    }
  }
});

test("catalog states important source and policy limitations instead of inventing definitions", () => {
  const byTerm = new Map(records.map((record) => [record.term.toLowerCase(), record]));
  assert.match(byTerm.get("admission rate").use, /production admissions-system extract/i);
  assert.match(byTerm.get("total revenue").use, /audited GASB-aligned source/i);
  assert.match(byTerm.get("full-time status").use, /graduate full-time policy has not been supplied/i);
  assert.match(byTerm.get("persistence").use, /not supported without Clearinghouse/i);
  assert.match(byTerm.get("tuition discount rate").use, /lacks an approved/i);
});

test("annual IPEDS change control covers the material 2025-26 changes", () => {
  const components = annualChanges.changes
    .map((change) => change.component)
    .join(" ");
  assert.match(components, /\bAL\b/);
  assert.match(components, /\bIC\/ADM\b/);
  assert.match(components, /\bSFA\b/);
  assert.match(components, /\bADM\b/);
  assert.match(annualChanges.changes.map((change) => change.summary).join(" "), /IASG/i);
  assert.match(
    annualChanges.changes.map((change) => change.summary).join(" "),
    /Another Gender is no longer collected/i,
  );
});
