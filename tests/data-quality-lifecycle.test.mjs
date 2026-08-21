import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after, before } from "node:test";
import { DatabaseSync } from "node:sqlite";
import commandCenter from "../app/data/command-center.generated.json" with { type: "json" };
import {
  reconcileFindingLifecycles,
  stableFindingIdentity,
} from "../lib/data-quality/lifecycle.mjs";
import {
  ensureLifecycleSchema,
  readLifecycleRecords,
  synchronizeLifecycleRecords,
  updateLifecycleRecord,
} from "../lib/data-quality/lifecycle-store.mjs";

class NodeD1Statement {
  constructor(statement) {
    this.statement = statement;
    this.parameters = [];
  }

  bind(...parameters) {
    this.parameters = parameters;
    return this;
  }

  async run() {
    return this.statement.run(...this.parameters);
  }

  async all() {
    return { results: this.statement.all(...this.parameters) };
  }

  async first() {
    return this.statement.get(...this.parameters) ?? null;
  }
}

class NodeD1Database {
  constructor(filePath) {
    this.database = new DatabaseSync(filePath);
  }

  prepare(sql) {
    return new NodeD1Statement(this.database.prepare(sql));
  }

  async batch(statements) {
    const results = [];
    for (const statement of statements) results.push(await statement.run());
    return results;
  }

  close() {
    this.database.close();
  }
}

const workingDirectory = mkdtempSync(path.join(tmpdir(), "eduinsight-dq-lifecycle-"));
const databasePath = path.join(workingDirectory, "lifecycle.sqlite");
const findings = commandCenter.qualityFindings.map((finding) => structuredClone(finding));
const evaluationAt = commandCenter.generatedAt;
let db;

before(async () => {
  db = new NodeD1Database(databasePath);
  await ensureLifecycleSchema(db);
  await synchronizeLifecycleRecords(db, findings, evaluationAt);
});

after(() => {
  db?.close();
  rmSync(workingDirectory, { recursive: true, force: true });
});

test("stable identity is versioned and survives finding regeneration", () => {
  const original = findings[0];
  const regenerated = {
    ...structuredClone(original),
    affectedRecords: original.affectedRecords + 50,
    sampleRows: [],
  };
  assert.equal(stableFindingIdentity(regenerated), stableFindingIdentity(original));
  assert.match(stableFindingIdentity(original), /^dq-finding:v1:/);
});

test("file-backed lifecycle state survives an application/server restart", async () => {
  const finding = findings[0];
  const findingKey = stableFindingIdentity(finding);
  const updated = await updateLifecycleRecord(db, {
    findingKey,
    status: "In Review",
    notes: "Registrar confirmed the census extract is under review.",
    reviewerIdentity: "local-ir-admin",
    reviewerDisplayName: "Institutional Research",
    updatedAt: "2026-08-20T18:00:00.000Z",
  });
  assert.equal(updated.status, "In Review");
  assert.equal(updated.notes, "Registrar confirmed the census extract is under review.");
  assert.equal(updated.reviewerIdentity, "local-ir-admin");

  db.close();
  db = new NodeD1Database(databasePath);
  await ensureLifecycleSchema(db);
  const reloaded = (await readLifecycleRecords(db)).find(
    (record) => record.findingKey === findingKey,
  );
  assert.equal(reloaded.status, "In Review");
  assert.equal(reloaded.notes, "Registrar confirmed the census extract is under review.");
  assert.equal(reloaded.updatedAt, "2026-08-20T18:00:00.000Z");
});

test("resolving one finding does not affect another", async () => {
  const firstKey = stableFindingIdentity(findings[0]);
  const secondKey = stableFindingIdentity(findings[1]);
  await updateLifecycleRecord(db, {
    findingKey: firstKey,
    status: "Resolved",
    notes: "Corrected in the governed source.",
    reviewerIdentity: "local-ir-admin",
    reviewerDisplayName: "Institutional Research",
    updatedAt: "2026-08-20T18:05:00.000Z",
  });
  const records = await readLifecycleRecords(db);
  assert.equal(records.find((record) => record.findingKey === firstKey).status, "Resolved");
  assert.equal(records.find((record) => record.findingKey === secondKey).status, "Open");
});

test("regenerated matching findings reconnect without changing evaluator values", async () => {
  const regenerated = findings.map((finding) => ({
    ...structuredClone(finding),
    sampleRows: [...(finding.sampleRows ?? [])],
  }));
  await synchronizeLifecycleRecords(
    db,
    regenerated,
    "2026-08-21T00:00:00.000Z",
  );
  const records = await readLifecycleRecords(db);
  const reconciled = reconcileFindingLifecycles(regenerated, records);
  assert.equal(reconciled.findings[0].lifecycle.status, "Resolved");
  assert.equal(reconciled.findings[0].lifecycle.notes, "Corrected in the governed source.");
  assert.deepEqual(
    reconciled.findings.map((finding) => finding.affectedRecords),
    [146, 119, 211, 0],
  );
  assert.equal(
    reconciled.findings.find((finding) => finding.ruleId === "DQ-X-004")
      .observation.absoluteChange,
    -808,
  );
});

test("stale lifecycle records are retained safely when a finding stops occurring", async () => {
  const disappeared = findings[0];
  const stillActive = findings.slice(1);
  await synchronizeLifecycleRecords(
    db,
    stillActive,
    "2026-08-22T00:00:00.000Z",
  );
  const records = await readLifecycleRecords(db);
  const reconciled = reconcileFindingLifecycles(stillActive, records);
  const stale = reconciled.staleLifecycleRecords.find(
    (record) => record.findingKey === stableFindingIdentity(disappeared),
  );
  assert.ok(stale);
  assert.equal(stale.isActive, false);
  assert.equal(stale.status, "Resolved");
  assert.equal(stale.notes, "Corrected in the governed source.");
  assert.equal(reconciled.findings.length, 3);
});

test("a disappeared finding that recurs is explicitly reopened without losing prior review context", async () => {
  const recurring = findings[0];
  const recurringKey = stableFindingIdentity(recurring);
  await synchronizeLifecycleRecords(
    db,
    findings,
    "2026-08-23T00:00:00.000Z",
  );
  const records = await readLifecycleRecords(db);
  const reappeared = records.find(
    (record) => record.findingKey === recurringKey,
  );
  assert.equal(reappeared.isActive, true);
  assert.equal(reappeared.status, "Open");
  assert.equal(reappeared.previousStatus, "Resolved");
  assert.equal(reappeared.occurrenceCount, 2);
  assert.equal(reappeared.reopenedAt, "2026-08-23T00:00:00.000Z");
  assert.equal(reappeared.notes, "Corrected in the governed source.");
  assert.equal(reappeared.reviewerIdentity, "local-ir-admin");
});

test("lifecycle timestamps remain separate from evaluator timestamps and counts", async () => {
  const records = await readLifecycleRecords(db);
  const record = records.find(
    (candidate) => candidate.findingKey === stableFindingIdentity(findings[0]),
  );
  assert.equal(record.createdAt, findings[0].openedAt);
  assert.equal(record.updatedAt, "2026-08-23T00:00:00.000Z");
  assert.equal(findings[0].affectedRecords, 146);
  assert.equal(findings[1].affectedRecords, 119);
  assert.equal(findings[2].affectedRecords, 211);
});
