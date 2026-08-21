ALTER TABLE `data_quality_finding_lifecycle` ADD `occurrence_count` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `data_quality_finding_lifecycle` ADD `previous_status` text;--> statement-breakpoint
ALTER TABLE `data_quality_finding_lifecycle` ADD `reopened_at` text;