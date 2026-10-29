CREATE TABLE `evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`subject_id` text,
	`created_at` text NOT NULL,
	`record` text NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `evaluations_owner` ON `evaluations` (`owner_id`);--> statement-breakpoint
CREATE INDEX `evaluations_subject` ON `evaluations` (`subject_id`);--> statement-breakpoint
CREATE TABLE `risk_settings` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`criteria` text NOT NULL,
	`factor_weights` text NOT NULL,
	`thresholds` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`document_key` text NOT NULL,
	`tax_id` text NOT NULL,
	`subject_name` text NOT NULL,
	`subject_type` text NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`activity` text DEFAULT '' NOT NULL,
	`pep_status` integer DEFAULT false NOT NULL,
	`pep_details` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subjects_owner_document` ON `subjects` (`owner_id`,`document_key`);--> statement-breakpoint
CREATE INDEX `subjects_owner_name` ON `subjects` (`owner_id`,`subject_name`);