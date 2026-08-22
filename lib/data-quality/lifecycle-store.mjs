import {
  defaultLifecycleForFinding,
  reconcileFindingLifecycles,
} from "./lifecycle.mjs";

export const DATA_QUALITY_AUDIT_SCHEMA_VERSION = "dq-lifecycle-audit:v1";

export const DATA_QUALITY_AUDIT_EVENT_TYPES = Object.freeze([
  "LIFECYCLE_BASELINE_CREATED",
  "FINDING_CREATED",
  "STATUS_CHANGED",
  "REVIEW_NOTE_UPDATED",
  "FINDING_BECAME_INACTIVE",
  "FINDING_REOPENED",
  "FINDING_RESOLVED",
  "FINDING_SUPPRESSED",
]);

const SYSTEM_ACTOR_IDENTITY = "eduinsight-data-quality-evaluator";
const SYSTEM_ACTOR_DISPLAY_NAME = "EduInsight Data Quality";

export class LifecycleConflictError extends Error {
  constructor() {
    super("This finding was updated elsewhere. Reload before saving.");
    this.name = "LifecycleConflictError";
  }
}

export const CREATE_LIFECYCLE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS data_quality_finding_lifecycle (
    finding_key TEXT PRIMARY KEY,
    issue_id TEXT NOT NULL,
    rule_id TEXT NOT NULL,
    status TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    reviewer_identity TEXT,
    reviewer_display_name TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_seen_evaluation_at TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    occurrence_count INTEGER NOT NULL DEFAULT 1,
    previous_status TEXT,
    reopened_at TEXT
  )
`;

export const CREATE_LIFECYCLE_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS data_quality_lifecycle_active_idx
  ON data_quality_finding_lifecycle (is_active, updated_at DESC)
`;

export const CREATE_AUDIT_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS data_quality_lifecycle_audit_events (
    event_sequence INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL UNIQUE,
    finding_key TEXT NOT NULL,
    issue_id TEXT NOT NULL,
    rule_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    previous_status TEXT,
    new_status TEXT,
    actor_identity TEXT,
    actor_display_name TEXT,
    occurred_at TEXT NOT NULL,
    note_snapshot TEXT,
    reason_snapshot TEXT,
    occurrence_count INTEGER NOT NULL DEFAULT 1,
    schema_version TEXT NOT NULL
  )
`;

export const CREATE_AUDIT_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS data_quality_audit_finding_time_idx
  ON data_quality_lifecycle_audit_events
    (finding_key, occurred_at, event_sequence)
`;

export const CREATE_AUDIT_BASELINE_UNIQUE_INDEX_SQL = `
  CREATE UNIQUE INDEX IF NOT EXISTS data_quality_audit_one_baseline_idx
  ON data_quality_lifecycle_audit_events (finding_key)
  WHERE event_type = 'LIFECYCLE_BASELINE_CREATED'
`;

export const CREATE_AUDIT_CREATED_UNIQUE_INDEX_SQL = `
  CREATE UNIQUE INDEX IF NOT EXISTS data_quality_audit_one_creation_idx
  ON data_quality_lifecycle_audit_events (finding_key)
  WHERE event_type = 'FINDING_CREATED'
`;

export const CREATE_AUDIT_UPDATE_GUARD_SQL = `
  CREATE TRIGGER IF NOT EXISTS data_quality_audit_prevent_update
  BEFORE UPDATE ON data_quality_lifecycle_audit_events
  BEGIN
    SELECT RAISE(ABORT, 'Data Quality audit events are append-only');
  END
`;

export const CREATE_AUDIT_DELETE_GUARD_SQL = `
  CREATE TRIGGER IF NOT EXISTS data_quality_audit_prevent_delete
  BEFORE DELETE ON data_quality_lifecycle_audit_events
  BEGIN
    SELECT RAISE(ABORT, 'Data Quality audit events are append-only');
  END
`;

function auditEventId() {
  return `dq-audit:v1:${crypto.randomUUID()}`;
}

function lifecycleSelectSql(whereClause = "") {
  return `SELECT finding_key AS findingKey, issue_id AS issueId, rule_id AS ruleId,
    status, notes, reviewer_identity AS reviewerIdentity,
    reviewer_display_name AS reviewerDisplayName, created_at AS createdAt,
    updated_at AS updatedAt, last_seen_evaluation_at AS lastSeenEvaluationAt,
    is_active AS isActive, occurrence_count AS occurrenceCount,
    previous_status AS previousStatus, reopened_at AS reopenedAt
   FROM data_quality_finding_lifecycle ${whereClause}`;
}

function normalizeLifecycleRow(row) {
  return row ? { ...row, isActive: Boolean(row.isActive) } : null;
}

export async function ensureLifecycleSchema(db) {
  await db.prepare(CREATE_LIFECYCLE_TABLE_SQL).run();
  const columns = await db
    .prepare("PRAGMA table_info(data_quality_finding_lifecycle)")
    .all();
  const columnNames = new Set(columns.results.map((column) => column.name));
  if (!columnNames.has("occurrence_count")) {
    await db
      .prepare(
        "ALTER TABLE data_quality_finding_lifecycle ADD COLUMN occurrence_count INTEGER NOT NULL DEFAULT 1",
      )
      .run();
  }
  if (!columnNames.has("previous_status")) {
    await db
      .prepare(
        "ALTER TABLE data_quality_finding_lifecycle ADD COLUMN previous_status TEXT",
      )
      .run();
  }
  if (!columnNames.has("reopened_at")) {
    await db
      .prepare(
        "ALTER TABLE data_quality_finding_lifecycle ADD COLUMN reopened_at TEXT",
      )
      .run();
  }
  await db.prepare(CREATE_LIFECYCLE_INDEX_SQL).run();
  await db.prepare(CREATE_AUDIT_TABLE_SQL).run();
  await db.prepare(CREATE_AUDIT_INDEX_SQL).run();
  await db.prepare(CREATE_AUDIT_BASELINE_UNIQUE_INDEX_SQL).run();
  await db.prepare(CREATE_AUDIT_CREATED_UNIQUE_INDEX_SQL).run();
  await db.prepare(CREATE_AUDIT_UPDATE_GUARD_SQL).run();
  await db.prepare(CREATE_AUDIT_DELETE_GUARD_SQL).run();
}

export async function readLifecycleRecords(db) {
  const result = await db.prepare(
    `${lifecycleSelectSql()}
     ORDER BY is_active DESC, updated_at DESC`,
  ).all();
  return result.results.map(normalizeLifecycleRow);
}

async function readLifecycleRecord(db, findingKey) {
  const row = await db
    .prepare(lifecycleSelectSql("WHERE finding_key = ?"))
    .bind(findingKey)
    .first();
  return normalizeLifecycleRow(row);
}

export async function readLifecycleAuditEvents(db, findingKey = null) {
  const statement = db.prepare(
    `SELECT event_sequence AS eventSequence, event_id AS eventId,
      finding_key AS findingKey, issue_id AS issueId, rule_id AS ruleId,
      event_type AS eventType, previous_status AS previousStatus,
      new_status AS newStatus, actor_identity AS actorIdentity,
      actor_display_name AS actorDisplayName, occurred_at AS occurredAt,
      note_snapshot AS noteSnapshot, reason_snapshot AS reasonSnapshot,
      occurrence_count AS occurrenceCount, schema_version AS schemaVersion
     FROM data_quality_lifecycle_audit_events
     ${findingKey ? "WHERE finding_key = ?" : ""}
     ORDER BY occurred_at ASC, event_sequence ASC`,
  );
  const result = findingKey
    ? await statement.bind(findingKey).all()
    : await statement.all();
  return result.results;
}

function baselineEventStatement(db, record, auditAt) {
  return db.prepare(
    `INSERT OR IGNORE INTO data_quality_lifecycle_audit_events
      (event_id, finding_key, issue_id, rule_id, event_type,
       previous_status, new_status, actor_identity, actor_display_name,
       occurred_at, note_snapshot, reason_snapshot, occurrence_count,
       schema_version)
     SELECT ?, finding_key, issue_id, rule_id, 'LIFECYCLE_BASELINE_CREATED',
       NULL, status, NULL, NULL, ?, notes,
       'Audit history began with the existing lifecycle snapshot; earlier actions are unavailable.',
       occurrence_count, ?
     FROM data_quality_finding_lifecycle
     WHERE finding_key = ?
       AND NOT EXISTS (
         SELECT 1 FROM data_quality_lifecycle_audit_events
         WHERE finding_key = ?
       )`,
  ).bind(
    auditEventId(),
    auditAt,
    DATA_QUALITY_AUDIT_SCHEMA_VERSION,
    record.findingKey,
    record.findingKey,
  );
}

function creationEventStatement(db, lifecycle, occurredAt) {
  return db.prepare(
    `INSERT OR IGNORE INTO data_quality_lifecycle_audit_events
      (event_id, finding_key, issue_id, rule_id, event_type,
       previous_status, new_status, actor_identity, actor_display_name,
       occurred_at, note_snapshot, reason_snapshot, occurrence_count,
       schema_version)
     SELECT ?, finding_key, issue_id, rule_id, 'FINDING_CREATED',
       NULL, 'Open', ?, ?, ?, NULL,
       'Finding was first detected by the governed Data Quality evaluation.',
       occurrence_count, ?
     FROM data_quality_finding_lifecycle
     WHERE finding_key = ?
       AND NOT EXISTS (
         SELECT 1 FROM data_quality_lifecycle_audit_events
         WHERE finding_key = ?
       )`,
  ).bind(
    auditEventId(),
    SYSTEM_ACTOR_IDENTITY,
    SYSTEM_ACTOR_DISPLAY_NAME,
    occurredAt,
    DATA_QUALITY_AUDIT_SCHEMA_VERSION,
    lifecycle.findingKey,
    lifecycle.findingKey,
  );
}

function inactivityEventStatement(db, record, occurredAt) {
  return db.prepare(
    `INSERT INTO data_quality_lifecycle_audit_events
      (event_id, finding_key, issue_id, rule_id, event_type,
       previous_status, new_status, actor_identity, actor_display_name,
       occurred_at, note_snapshot, reason_snapshot, occurrence_count,
       schema_version)
     SELECT ?, finding_key, issue_id, rule_id, 'FINDING_BECAME_INACTIVE',
       status, status, ?, ?, ?, notes,
       'Finding was absent from the latest governed Data Quality evaluation.',
       occurrence_count, ?
     FROM data_quality_finding_lifecycle
     WHERE finding_key = ? AND is_active = 1`,
  ).bind(
    auditEventId(),
    SYSTEM_ACTOR_IDENTITY,
    SYSTEM_ACTOR_DISPLAY_NAME,
    occurredAt,
    DATA_QUALITY_AUDIT_SCHEMA_VERSION,
    record.findingKey,
  );
}

function reopenedEventStatement(db, lifecycle, occurredAt) {
  return db.prepare(
    `INSERT INTO data_quality_lifecycle_audit_events
      (event_id, finding_key, issue_id, rule_id, event_type,
       previous_status, new_status, actor_identity, actor_display_name,
       occurred_at, note_snapshot, reason_snapshot, occurrence_count,
       schema_version)
     SELECT ?, finding_key, issue_id, rule_id, 'FINDING_REOPENED',
       status, 'Open', ?, ?, ?, notes,
       'The same source-derived finding recurred and was explicitly reopened.',
       occurrence_count + 1, ?
     FROM data_quality_finding_lifecycle
     WHERE finding_key = ? AND is_active = 0`,
  ).bind(
    auditEventId(),
    SYSTEM_ACTOR_IDENTITY,
    SYSTEM_ACTOR_DISPLAY_NAME,
    occurredAt,
    DATA_QUALITY_AUDIT_SCHEMA_VERSION,
    lifecycle.findingKey,
  );
}

export async function synchronizeLifecycleRecords(
  db,
  activeFindings,
  evaluatedAt,
  auditAt = evaluatedAt,
) {
  await ensureLifecycleSchema(db);
  const existingRecords = await readLifecycleRecords(db);
  const recordsByKey = new Map(
    existingRecords.map((record) => [record.findingKey, record]),
  );
  const activeLifecycles = activeFindings.map(defaultLifecycleForFinding);
  const activeKeys = new Set(
    activeLifecycles.map((lifecycle) => lifecycle.findingKey),
  );
  const statements = existingRecords.map((record) =>
    baselineEventStatement(db, record, auditAt),
  );

  for (const record of existingRecords) {
    if (record.isActive && !activeKeys.has(record.findingKey)) {
      statements.push(inactivityEventStatement(db, record, auditAt));
      statements.push(
        db.prepare(
          `UPDATE data_quality_finding_lifecycle
           SET is_active = 0, last_seen_evaluation_at = ?
           WHERE finding_key = ? AND is_active = 1`,
        ).bind(evaluatedAt, record.findingKey),
      );
    }
  }

  for (const lifecycle of activeLifecycles) {
    const createdAt = lifecycle.createdAt ?? evaluatedAt;
    const stored = recordsByKey.get(lifecycle.findingKey);
    if (!stored) {
      statements.push(
        db.prepare(
          `INSERT OR IGNORE INTO data_quality_finding_lifecycle
            (finding_key, issue_id, rule_id, status, notes, reviewer_identity,
             reviewer_display_name, created_at, updated_at,
             last_seen_evaluation_at, is_active)
           VALUES (?, ?, ?, 'Open', '', NULL, NULL, ?, ?, ?, 1)`,
        ).bind(
          lifecycle.findingKey,
          lifecycle.issueId,
          lifecycle.ruleId,
          createdAt,
          createdAt,
          evaluatedAt,
        ),
      );
      statements.push(creationEventStatement(db, lifecycle, createdAt));
    } else if (!stored.isActive) {
      statements.push(reopenedEventStatement(db, lifecycle, auditAt));
      statements.push(
        db.prepare(
          `UPDATE data_quality_finding_lifecycle
           SET previous_status = status, status = 'Open', reopened_at = ?,
               occurrence_count = occurrence_count + 1, updated_at = ?,
               is_active = 1, last_seen_evaluation_at = ?
           WHERE finding_key = ? AND is_active = 0`,
        ).bind(auditAt, auditAt, evaluatedAt, lifecycle.findingKey),
      );
    } else {
      statements.push(
        db.prepare(
          `UPDATE data_quality_finding_lifecycle
           SET last_seen_evaluation_at = ?
           WHERE finding_key = ? AND is_active = 1`,
        ).bind(evaluatedAt, lifecycle.findingKey),
      );
    }
  }

  if (statements.length) await db.batch(statements);
}

function statusEventType(status) {
  if (status === "Resolved") return "FINDING_RESOLVED";
  if (status === "Suppressed") return "FINDING_SUPPRESSED";
  return "STATUS_CHANGED";
}

function reviewerEventStatement(
  db,
  {
    eventType,
    eventId,
    findingKey,
    expectedUpdatedAt,
    previousStatus,
    newStatus,
    reviewerIdentity,
    reviewerDisplayName,
    occurredAt,
    noteSnapshot,
    reasonSnapshot,
    occurrenceCount,
  },
) {
  return db.prepare(
    `INSERT INTO data_quality_lifecycle_audit_events
      (event_id, finding_key, issue_id, rule_id, event_type,
       previous_status, new_status, actor_identity, actor_display_name,
       occurred_at, note_snapshot, reason_snapshot, occurrence_count,
       schema_version)
     SELECT ?, finding_key, issue_id, rule_id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
     FROM data_quality_finding_lifecycle
     WHERE finding_key = ? AND is_active = 1 AND updated_at = ?`,
  ).bind(
    eventId,
    eventType,
    previousStatus,
    newStatus,
    reviewerIdentity,
    reviewerDisplayName,
    occurredAt,
    noteSnapshot,
    reasonSnapshot,
    occurrenceCount,
    DATA_QUALITY_AUDIT_SCHEMA_VERSION,
    findingKey,
    expectedUpdatedAt,
  );
}

export async function updateLifecycleRecord(
  db,
  {
    findingKey,
    status,
    notes,
    reviewerIdentity,
    reviewerDisplayName,
    updatedAt,
    expectedUpdatedAt = null,
  },
) {
  await ensureLifecycleSchema(db);
  const existing = await readLifecycleRecord(db, findingKey);
  if (!existing || !existing.isActive) return null;
  const expected = expectedUpdatedAt ?? existing.updatedAt;
  const statusChanged = status !== existing.status;
  const notesChanged = notes !== existing.notes;
  if (!statusChanged && !notesChanged) return existing;

  const statements = [];
  if (statusChanged) {
    statements.push(
      reviewerEventStatement(db, {
        eventType: statusEventType(status),
        eventId: auditEventId(),
        findingKey,
        expectedUpdatedAt: expected,
        previousStatus: existing.status,
        newStatus: status,
        reviewerIdentity,
        reviewerDisplayName,
        occurredAt: updatedAt,
        noteSnapshot: notes || null,
        reasonSnapshot:
          status === "Resolved"
            ? "Reviewer marked the finding resolved."
            : status === "Suppressed"
              ? "Reviewer suppressed the finding."
              : "Reviewer changed the lifecycle status.",
        occurrenceCount: existing.occurrenceCount,
      }),
    );
  }
  if (notesChanged) {
    statements.push(
      reviewerEventStatement(db, {
        eventType: "REVIEW_NOTE_UPDATED",
        eventId: auditEventId(),
        findingKey,
        expectedUpdatedAt: expected,
        previousStatus: null,
        newStatus: null,
        reviewerIdentity,
        reviewerDisplayName,
        occurredAt: updatedAt,
        noteSnapshot: notes || null,
        reasonSnapshot: "Reviewer updated the persisted review note.",
        occurrenceCount: existing.occurrenceCount,
      }),
    );
  }
  statements.push(
    db.prepare(
      `UPDATE data_quality_finding_lifecycle
       SET status = ?, notes = ?, reviewer_identity = ?,
           reviewer_display_name = ?, updated_at = ?
       WHERE finding_key = ? AND is_active = 1 AND updated_at = ?`,
    ).bind(
      status,
      notes,
      reviewerIdentity,
      reviewerDisplayName,
      updatedAt,
      findingKey,
      expected,
    ),
  );
  await db.batch(statements);
  const updated = await readLifecycleRecord(db, findingKey);
  if (
    !updated ||
    updated.updatedAt !== updatedAt ||
    updated.status !== status ||
    updated.notes !== notes
  ) {
    throw new LifecycleConflictError();
  }
  return updated;
}

export async function reconcileStoredLifecycles(
  db,
  activeFindings,
  evaluatedAt,
  auditAt = evaluatedAt,
) {
  await synchronizeLifecycleRecords(db, activeFindings, evaluatedAt, auditAt);
  const rows = await readLifecycleRecords(db);
  const auditEvents = await readLifecycleAuditEvents(db);
  return {
    ...reconcileFindingLifecycles(activeFindings, rows),
    auditEvents,
  };
}
