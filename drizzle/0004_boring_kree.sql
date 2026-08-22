CREATE TABLE `data_quality_lifecycle_audit_events` (
	`event_sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` text NOT NULL,
	`finding_key` text NOT NULL,
	`issue_id` text NOT NULL,
	`rule_id` text NOT NULL,
	`event_type` text NOT NULL,
	`previous_status` text,
	`new_status` text,
	`actor_identity` text,
	`actor_display_name` text,
	`occurred_at` text NOT NULL,
	`note_snapshot` text,
	`reason_snapshot` text,
	`occurrence_count` integer DEFAULT 1 NOT NULL,
	`schema_version` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `data_quality_lifecycle_audit_events_event_id_unique` ON `data_quality_lifecycle_audit_events` (`event_id`);--> statement-breakpoint
CREATE INDEX `data_quality_audit_finding_time_idx` ON `data_quality_lifecycle_audit_events` (`finding_key`,`occurred_at`,`event_sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `data_quality_audit_one_baseline_idx` ON `data_quality_lifecycle_audit_events` (`finding_key`) WHERE `event_type` = 'LIFECYCLE_BASELINE_CREATED';--> statement-breakpoint
CREATE UNIQUE INDEX `data_quality_audit_one_creation_idx` ON `data_quality_lifecycle_audit_events` (`finding_key`) WHERE `event_type` = 'FINDING_CREATED';--> statement-breakpoint
CREATE TRIGGER `data_quality_audit_prevent_update`
BEFORE UPDATE ON `data_quality_lifecycle_audit_events`
BEGIN
	SELECT RAISE(ABORT, 'Data Quality audit events are append-only');
END;--> statement-breakpoint
CREATE TRIGGER `data_quality_audit_prevent_delete`
BEFORE DELETE ON `data_quality_lifecycle_audit_events`
BEGIN
	SELECT RAISE(ABORT, 'Data Quality audit events are append-only');
END;--> statement-breakpoint
PRAGMA optimize;
