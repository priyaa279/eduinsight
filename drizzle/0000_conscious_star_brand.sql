CREATE TABLE `ipeds_package_approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_code` text NOT NULL,
	`collection_year` text NOT NULL,
	`spec_id` text NOT NULL,
	`file_name` text NOT NULL,
	`object_key` text NOT NULL,
	`sha256` text NOT NULL,
	`approver` text NOT NULL,
	`approved_at` text NOT NULL,
	`validation_summary` text NOT NULL,
	`explanations_json` text NOT NULL,
	`status` text NOT NULL,
	`created_at_epoch` integer NOT NULL
);
