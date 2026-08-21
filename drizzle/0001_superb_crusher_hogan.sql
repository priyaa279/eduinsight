CREATE TABLE `data_quality_finding_lifecycle` (
	`finding_key` text PRIMARY KEY NOT NULL,
	`issue_id` text NOT NULL,
	`rule_id` text NOT NULL,
	`status` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`reviewer_identity` text,
	`reviewer_display_name` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`last_seen_evaluation_at` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
