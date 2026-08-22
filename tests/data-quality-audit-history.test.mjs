import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import commandCenter from "../app/data/command-center.generated.json" with { type: "json" };
import { stableFindingIdentity } from "../lib/data-quality/lifecycle.mjs";
import {
  CREATE_LIFECYCLE_TABLE_SQL,
  DATA_QUALITY_AUDIT_SCHEMA_VERSION,
  ensureLifecycleSchema,
  readLifecycleAuditEvents,
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
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  close() {
    this.database.close();
  }
}

const findings = commandCenter.qualityFindings.map((finding) =>
  structuredClone(finding),
);
const evaluationAt = commandCenter.generatedAt;

async function fixture({ synchronize = true } = {}) {
  const directory = mkdtempSync(path.join(tmpdir(), "eduinsight-dq-audit-"));
  const databasePath = path.join(directory, "audit.sqlite");
  const db = new NodeD1Database(databasePath);
  await ensureLifecycleSchema(db);
  if (synchronize) {
    await synchronizeLifecycleRecords(
      db,
      findings,
      evaluationAt,
      "2026-08-21T09:00:00.000Z",
    );
  }
  return {
    db,
    databasePath,
    close() {
      db.close();
      rmSync(directory, { recursive: true, force: true });
    },
    directory,
  };
}

async function currentRecord(db, findingKey) {
  return (await readLifecycleRecords(db)).find(
    (record) => record.findingKey === findingKey,
  );
}

async function review(
  db,
  finding,
  status,
  notes,
  updatedAt,
  expectedUpdatedAt = null,
) {
  const findingKey = stableFindingIdentity(finding);
  const existing = await currentRecord(db, findingKey);
  return updateLifecycleRecord(db, {
    findingKey,
    status,
    notes,
    reviewerIdentity: "local-ir-admin",
    reviewerDisplayName: "Institutional Research",
    updatedAt,
    expectedUpdatedAt: expectedUpdatedAt ?? existing.updatedAt,
  });
}

test("creating lifecycle records produces versioned creation audit events", async () => {
  const state = await fixture();
  try {
    const events = await readLifecycleAuditEvents(state.db);
    assert.equal(events.length, findings.length);
    assert.ok(events.every((event) => event.eventType === "FINDING_CREATED"));
    assert.ok(
      events.every(
        (event) => event.schemaVersion === DATA_QUALITY_AUDIT_SCHEMA_VERSION,
      ),
    );
    assert.equal(new Set(events.map((event) => event.eventId)).size, events.length);
  } finally {
    state.close();
  }
});

test("Open to In Review appends a status event", async () => {
  const state = await fixture();
  try {
    const finding = findings[0];
    await review(
      state.db,
      finding,
      "In Review",
      "Registrar review started.",
      "2026-08-21T10:00:00.000Z",
    );
    const events = await readLifecycleAuditEvents(
      state.db,
      stableFindingIdentity(finding),
    );
    assert.ok(
      events.some(
        (event) =>
          event.eventType === "STATUS_CHANGED" &&
          event.previousStatus === "Open" &&
          event.newStatus === "In Review",
      ),
    );
  } finally {
    state.close();
  }
});

test("In Review to Resolved appends a resolution event", async () => {
  const state = await fixture();
  try {
    const finding = findings[0];
    await review(
      state.db,
      finding,
      "In Review",
      "Review started.",
      "2026-08-21T10:00:00.000Z",
    );
    await review(
      state.db,
      finding,
      "Resolved",
      "Corrected in the governed source.",
      "2026-08-21T11:00:00.000Z",
    );
    const events = await readLifecycleAuditEvents(
      state.db,
      stableFindingIdentity(finding),
    );
    const resolved = events.find(
      (event) => event.eventType === "FINDING_RESOLVED",
    );
    assert.equal(resolved.previousStatus, "In Review");
    assert.equal(resolved.newStatus, "Resolved");
    assert.equal(resolved.actorIdentity, "local-ir-admin");
  } finally {
    state.close();
  }
});

test("suppression is an explicit auditable event", async () => {
  const state = await fixture();
  try {
    const finding = findings[1];
    await review(
      state.db,
      finding,
      "Suppressed",
      "Approved exception for the current collection.",
      "2026-08-21T12:00:00.000Z",
    );
    const events = await readLifecycleAuditEvents(
      state.db,
      stableFindingIdentity(finding),
    );
    assert.ok(
      events.some(
        (event) =>
          event.eventType === "FINDING_SUPPRESSED" &&
          event.newStatus === "Suppressed",
      ),
    );
  } finally {
    state.close();
  }
});

test("note updates append snapshots without deleting prior note history", async () => {
  const state = await fixture();
  try {
    const finding = findings[2];
    await review(
      state.db,
      finding,
      "Open",
      "First evidence snapshot.",
      "2026-08-21T10:00:00.000Z",
    );
    await review(
      state.db,
      finding,
      "Open",
      "Second evidence snapshot.",
      "2026-08-21T11:00:00.000Z",
    );
    const noteEvents = (
      await readLifecycleAuditEvents(state.db, stableFindingIdentity(finding))
    ).filter((event) => event.eventType === "REVIEW_NOTE_UPDATED");
    assert.deepEqual(
      noteEvents.map((event) => event.noteSnapshot),
      ["First evidence snapshot.", "Second evidence snapshot."],
    );
  } finally {
    state.close();
  }
});

test("database guards reject updates and deletes of existing audit events", async () => {
  const state = await fixture();
  try {
    const event = (await readLifecycleAuditEvents(state.db))[0];
    await assert.rejects(
      state.db
        .prepare(
          "UPDATE data_quality_lifecycle_audit_events SET note_snapshot = 'changed' WHERE event_id = ?",
        )
        .bind(event.eventId)
        .run(),
      /append-only/,
    );
    await assert.rejects(
      state.db
        .prepare(
          "DELETE FROM data_quality_lifecycle_audit_events WHERE event_id = ?",
        )
        .bind(event.eventId)
        .run(),
      /append-only/,
    );
  } finally {
    state.close();
  }
});

test("a finding becoming inactive appends an inactivity event", async () => {
  const state = await fixture();
  try {
    const finding = findings[0];
    await synchronizeLifecycleRecords(
      state.db,
      findings.slice(1),
      "2026-08-22T00:00:00.000Z",
      "2026-08-22T00:01:00.000Z",
    );
    const events = await readLifecycleAuditEvents(
      state.db,
      stableFindingIdentity(finding),
    );
    assert.equal(events.at(-1).eventType, "FINDING_BECAME_INACTIVE");
    assert.equal((await currentRecord(state.db, stableFindingIdentity(finding))).isActive, false);
  } finally {
    state.close();
  }
});

test("recurrence appends a reopen event and restores active status to Open", async () => {
  const state = await fixture();
  try {
    const finding = findings[0];
    await review(
      state.db,
      finding,
      "Resolved",
      "Resolved before recurrence.",
      "2026-08-21T11:00:00.000Z",
    );
    await synchronizeLifecycleRecords(
      state.db,
      findings.slice(1),
      "2026-08-22T00:00:00.000Z",
      "2026-08-22T00:01:00.000Z",
    );
    await synchronizeLifecycleRecords(
      state.db,
      findings,
      "2026-08-23T00:00:00.000Z",
      "2026-08-23T00:01:00.000Z",
    );
    const record = await currentRecord(state.db, stableFindingIdentity(finding));
    const events = await readLifecycleAuditEvents(
      state.db,
      stableFindingIdentity(finding),
    );
    assert.equal(record.status, "Open");
    assert.equal(record.isActive, true);
    assert.equal(record.occurrenceCount, 2);
    assert.equal(events.at(-1).eventType, "FINDING_REOPENED");
    assert.equal(events.at(-1).previousStatus, "Resolved");
    assert.equal(events.at(-1).newStatus, "Open");
  } finally {
    state.close();
  }
});

test("resolution history remains preserved after inactivity and recurrence", async () => {
  const state = await fixture();
  try {
    const finding = findings[0];
    await review(
      state.db,
      finding,
      "Resolved",
      "Prior resolution evidence.",
      "2026-08-21T11:00:00.000Z",
    );
    await synchronizeLifecycleRecords(
      state.db,
      findings.slice(1),
      "2026-08-22T00:00:00.000Z",
      "2026-08-22T00:01:00.000Z",
    );
    await synchronizeLifecycleRecords(
      state.db,
      findings,
      "2026-08-23T00:00:00.000Z",
      "2026-08-23T00:01:00.000Z",
    );
    const events = await readLifecycleAuditEvents(
      state.db,
      stableFindingIdentity(finding),
    );
    assert.deepEqual(
      events
        .filter((event) =>
          [
            "FINDING_RESOLVED",
            "FINDING_BECAME_INACTIVE",
            "FINDING_REOPENED",
          ].includes(event.eventType),
        )
        .map((event) => event.eventType),
      [
        "FINDING_RESOLVED",
        "FINDING_BECAME_INACTIVE",
        "FINDING_REOPENED",
      ],
    );
    assert.equal(
      events.find((event) => event.eventType === "FINDING_RESOLVED").noteSnapshot,
      "Prior resolution evidence.",
    );
  } finally {
    state.close();
  }
});

test("actions on one finding create no audit events for another", async () => {
  const state = await fixture();
  try {
    const target = findings[0];
    const other = findings[1];
    const otherBefore = await readLifecycleAuditEvents(
      state.db,
      stableFindingIdentity(other),
    );
    await review(
      state.db,
      target,
      "In Review",
      "Only the target changed.",
      "2026-08-21T10:00:00.000Z",
    );
    const otherAfter = await readLifecycleAuditEvents(
      state.db,
      stableFindingIdentity(other),
    );
    assert.deepEqual(otherAfter, otherBefore);
  } finally {
    state.close();
  }
});

test("audit history survives a real database close and reopen", async () => {
  const state = await fixture();
  let reopened;
  try {
    const finding = findings[0];
    await review(
      state.db,
      finding,
      "In Review",
      "Persist across restart.",
      "2026-08-21T10:00:00.000Z",
    );
    state.db.close();
    reopened = new NodeD1Database(state.databasePath);
    await ensureLifecycleSchema(reopened);
    const events = await readLifecycleAuditEvents(
      reopened,
      stableFindingIdentity(finding),
    );
    assert.ok(events.some((event) => event.noteSnapshot === "Persist across restart."));
  } finally {
    reopened?.close();
    rmSync(state.directory, { recursive: true, force: true });
  }
});

test("Phase 2A evaluator values remain unchanged", async () => {
  assert.deepEqual(
    findings.map((finding) => finding.affectedRecords),
    [146, 119, 211, 0],
  );
  const anomaly = findings.find((finding) => finding.ruleId === "DQ-X-004");
  assert.equal(anomaly.observation.previousValue, 19234);
  assert.equal(anomaly.observation.currentValue, 18426);
  assert.equal(anomaly.observation.absoluteChange, -808);
  assert.equal(Number(anomaly.observation.percentChange.toFixed(1)), -4.2);
});

test("audit history is returned in deterministic chronological order", async () => {
  const state = await fixture();
  try {
    const finding = findings[0];
    await review(
      state.db,
      finding,
      "In Review",
      "Chronology one.",
      "2026-08-21T10:00:00.000Z",
    );
    await review(
      state.db,
      finding,
      "Resolved",
      "Chronology two.",
      "2026-08-21T11:00:00.000Z",
    );
    const firstRead = await readLifecycleAuditEvents(
      state.db,
      stableFindingIdentity(finding),
    );
    const secondRead = await readLifecycleAuditEvents(
      state.db,
      stableFindingIdentity(finding),
    );
    assert.deepEqual(secondRead, firstRead);
    assert.deepEqual(
      firstRead.map((event) => event.occurredAt),
      [...firstRead.map((event) => event.occurredAt)].sort(),
    );
  } finally {
    state.close();
  }
});

test("concurrent updates cannot create corrupted status sequences", async () => {
  const state = await fixture();
  try {
    const finding = findings[0];
    const findingKey = stableFindingIdentity(finding);
    const expected = (await currentRecord(state.db, findingKey)).updatedAt;
    const results = await Promise.allSettled([
      review(
        state.db,
        finding,
        "In Review",
        "Concurrent review A.",
        "2026-08-21T10:00:00.000Z",
        expected,
      ),
      review(
        state.db,
        finding,
        "Suppressed",
        "Concurrent review B.",
        "2026-08-21T10:00:01.000Z",
        expected,
      ),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(results.filter((result) => result.status === "rejected").length, 1);
    const events = await readLifecycleAuditEvents(state.db, findingKey);
    assert.equal(
      events.filter((event) =>
        ["STATUS_CHANGED", "FINDING_SUPPRESSED"].includes(event.eventType),
      ).length,
      1,
    );
    assert.equal(
      events.filter((event) => event.eventType === "REVIEW_NOTE_UPDATED").length,
      1,
    );
  } finally {
    state.close();
  }
});

test("pre-audit lifecycle rows receive one honest baseline event only", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "eduinsight-dq-baseline-"));
  const databasePath = path.join(directory, "baseline.sqlite");
  const db = new NodeD1Database(databasePath);
  try {
    await db.prepare(CREATE_LIFECYCLE_TABLE_SQL).run();
    const finding = findings[0];
    const findingKey = stableFindingIdentity(finding);
    await db.prepare(
      `INSERT INTO data_quality_finding_lifecycle
        (finding_key, issue_id, rule_id, status, notes, reviewer_identity,
         reviewer_display_name, created_at, updated_at,
         last_seen_evaluation_at, is_active, occurrence_count)
       VALUES (?, ?, ?, 'Resolved', 'Existing note', 'local-ir-admin',
         'Institutional Research', ?, ?, ?, 1, 1)`,
    ).bind(
      findingKey,
      finding.issueId,
      finding.ruleId,
      finding.openedAt,
      "2026-08-20T12:00:00.000Z",
      evaluationAt,
    ).run();
    await synchronizeLifecycleRecords(
      db,
      findings,
      evaluationAt,
      "2026-08-21T09:00:00.000Z",
    );
    const events = await readLifecycleAuditEvents(db, findingKey);
    assert.equal(events.length, 1);
    assert.equal(events[0].eventType, "LIFECYCLE_BASELINE_CREATED");
    assert.equal(events[0].actorIdentity, null);
    assert.match(events[0].reasonSnapshot, /earlier actions are unavailable/i);
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("the generated D1 migration creates indexes and append-only guards", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "eduinsight-dq-migration-"));
  const databasePath = path.join(directory, "migration.sqlite");
  const database = new DatabaseSync(databasePath);
  try {
    const sql = readFileSync(
      new URL("../drizzle/0004_boring_kree.sql", import.meta.url),
      "utf8",
    );
    for (const statement of sql.split("--> statement-breakpoint")) {
      if (statement.trim()) database.exec(statement);
    }
    const objects = database
      .prepare(
        `SELECT name, type FROM sqlite_schema
         WHERE name LIKE 'data_quality_audit_%'
         ORDER BY name`,
      )
      .all();
    assert.deepEqual(
      objects.map((row) => [row.name, row.type]),
      [
        ["data_quality_audit_finding_time_idx", "index"],
        ["data_quality_audit_one_baseline_idx", "index"],
        ["data_quality_audit_one_creation_idx", "index"],
        ["data_quality_audit_prevent_delete", "trigger"],
        ["data_quality_audit_prevent_update", "trigger"],
      ],
    );
  } finally {
    database.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
