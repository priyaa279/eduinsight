import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const ipedsPackageApprovals = sqliteTable("ipeds_package_approvals", {
  id: text("id").primaryKey(),
  surveyCode: text("survey_code").notNull(),
  collectionYear: text("collection_year").notNull(),
  specId: text("spec_id").notNull(),
  fileName: text("file_name").notNull(),
  objectKey: text("object_key").notNull(),
  sha256: text("sha256").notNull(),
  approver: text("approver").notNull(),
  approvedAt: text("approved_at").notNull(),
  validationSummary: text("validation_summary").notNull(),
  explanationsJson: text("explanations_json").notNull(),
  status: text("status").notNull(),
  createdAtEpoch: integer("created_at_epoch").notNull(),
});

export const dataQualityFindingLifecycle = sqliteTable(
  "data_quality_finding_lifecycle",
  {
    findingKey: text("finding_key").primaryKey(),
    issueId: text("issue_id").notNull(),
    ruleId: text("rule_id").notNull(),
    status: text("status").notNull(),
    notes: text("notes").notNull().default(""),
    reviewerIdentity: text("reviewer_identity"),
    reviewerDisplayName: text("reviewer_display_name"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    lastSeenEvaluationAt: text("last_seen_evaluation_at").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    occurrenceCount: integer("occurrence_count").notNull().default(1),
    previousStatus: text("previous_status"),
    reopenedAt: text("reopened_at"),
  },
  (table) => [
    index("data_quality_lifecycle_active_idx").on(
      table.isActive,
      table.updatedAt,
    ),
  ],
);

export const dataQualityLifecycleAuditEvents = sqliteTable(
  "data_quality_lifecycle_audit_events",
  {
    eventSequence: integer("event_sequence").primaryKey({ autoIncrement: true }),
    eventId: text("event_id").notNull().unique(),
    findingKey: text("finding_key").notNull(),
    issueId: text("issue_id").notNull(),
    ruleId: text("rule_id").notNull(),
    eventType: text("event_type").notNull(),
    previousStatus: text("previous_status"),
    newStatus: text("new_status"),
    actorIdentity: text("actor_identity"),
    actorDisplayName: text("actor_display_name"),
    occurredAt: text("occurred_at").notNull(),
    noteSnapshot: text("note_snapshot"),
    reasonSnapshot: text("reason_snapshot"),
    occurrenceCount: integer("occurrence_count").notNull().default(1),
    schemaVersion: text("schema_version").notNull(),
  },
  (table) => [
    index("data_quality_audit_finding_time_idx").on(
      table.findingKey,
      table.occurredAt,
      table.eventSequence,
    ),
  ],
);
