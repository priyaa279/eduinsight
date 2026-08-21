import {
  defaultLifecycleForFinding,
  reconcileFindingLifecycles,
} from "./lifecycle.mjs";

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
}

export async function synchronizeLifecycleRecords(
  db,
  activeFindings,
  evaluatedAt,
) {
  const activeKeys = activeFindings.map(
    (finding) => defaultLifecycleForFinding(finding).findingKey,
  );
  const statements = [];
  if (activeKeys.length) {
    statements.push(
      db.prepare(
        `UPDATE data_quality_finding_lifecycle SET is_active = 0
         WHERE finding_key NOT IN (${activeKeys.map(() => "?").join(", ")})`,
      ).bind(...activeKeys),
    );
  } else {
    statements.push(
      db.prepare("UPDATE data_quality_finding_lifecycle SET is_active = 0"),
    );
  }
  for (const finding of activeFindings) {
    const lifecycle = defaultLifecycleForFinding(finding);
    const createdAt = lifecycle.createdAt ?? evaluatedAt;
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
    statements.push(
      db.prepare(
        `UPDATE data_quality_finding_lifecycle
         SET previous_status = CASE WHEN is_active = 0 THEN status ELSE previous_status END,
             status = CASE WHEN is_active = 0 THEN 'Open' ELSE status END,
             reopened_at = CASE WHEN is_active = 0 THEN ? ELSE reopened_at END,
             occurrence_count = CASE WHEN is_active = 0 THEN occurrence_count + 1 ELSE occurrence_count END,
             updated_at = CASE WHEN is_active = 0 THEN ? ELSE updated_at END,
             is_active = 1, last_seen_evaluation_at = ?
         WHERE finding_key = ?`,
      ).bind(evaluatedAt, evaluatedAt, evaluatedAt, lifecycle.findingKey),
    );
  }
  await db.batch(statements);
}

export async function readLifecycleRecords(db) {
  const result = await db.prepare(
    `SELECT finding_key AS findingKey, issue_id AS issueId, rule_id AS ruleId,
      status, notes, reviewer_identity AS reviewerIdentity,
      reviewer_display_name AS reviewerDisplayName, created_at AS createdAt,
      updated_at AS updatedAt, last_seen_evaluation_at AS lastSeenEvaluationAt,
      is_active AS isActive, occurrence_count AS occurrenceCount,
      previous_status AS previousStatus, reopened_at AS reopenedAt
     FROM data_quality_finding_lifecycle
     ORDER BY is_active DESC, updated_at DESC`,
  ).all();
  return result.results.map((row) => ({
    ...row,
    isActive: Boolean(row.isActive),
  }));
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
  },
) {
  await db.prepare(
    `UPDATE data_quality_finding_lifecycle
     SET status = ?, notes = ?, reviewer_identity = ?,
         reviewer_display_name = ?, updated_at = ?
     WHERE finding_key = ? AND is_active = 1`,
  )
    .bind(
      status,
      notes,
      reviewerIdentity,
      reviewerDisplayName,
      updatedAt,
      findingKey,
    )
    .run();
  const rows = await readLifecycleRecords(db);
  return rows.find((record) => record.findingKey === findingKey) ?? null;
}

export async function reconcileStoredLifecycles(
  db,
  activeFindings,
  evaluatedAt,
) {
  await ensureLifecycleSchema(db);
  await synchronizeLifecycleRecords(db, activeFindings, evaluatedAt);
  const rows = await readLifecycleRecords(db);
  return reconcileFindingLifecycles(activeFindings, rows);
}
