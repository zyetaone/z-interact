ALTER TABLE `images` ADD `r2_key` text;--> statement-breakpoint
ALTER TABLE `images` ADD `migration_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `images` ADD `migrated_at` integer;--> statement-breakpoint
CREATE INDEX `images_session_id_idx` ON `images` (`session_id`);--> statement-breakpoint
CREATE INDEX `images_participant_id_idx` ON `images` (`participant_id`);--> statement-breakpoint
CREATE INDEX `images_persona_id_idx` ON `images` (`persona_id`);--> statement-breakpoint
CREATE INDEX `images_status_idx` ON `images` (`status`);--> statement-breakpoint
CREATE INDEX `images_created_at_idx` ON `images` (`created_at`);--> statement-breakpoint
CREATE INDEX `images_migration_status_idx` ON `images` (`migration_status`);--> statement-breakpoint
CREATE INDEX `images_session_persona_idx` ON `images` (`session_id`,`persona_id`);--> statement-breakpoint
CREATE INDEX `images_session_status_idx` ON `images` (`session_id`,`status`);--> statement-breakpoint
CREATE INDEX `activity_logs_session_id_idx` ON `activity_logs` (`session_id`);--> statement-breakpoint
CREATE INDEX `activity_logs_participant_id_idx` ON `activity_logs` (`participant_id`);--> statement-breakpoint
CREATE INDEX `activity_logs_action_idx` ON `activity_logs` (`action`);--> statement-breakpoint
CREATE INDEX `activity_logs_timestamp_idx` ON `activity_logs` (`timestamp`);--> statement-breakpoint
CREATE INDEX `activity_logs_session_action_idx` ON `activity_logs` (`session_id`,`action`);--> statement-breakpoint
CREATE INDEX `activity_logs_session_timestamp_idx` ON `activity_logs` (`session_id`,`timestamp`);--> statement-breakpoint
CREATE INDEX `participants_session_id_idx` ON `participants` (`session_id`);--> statement-breakpoint
CREATE INDEX `participants_persona_id_idx` ON `participants` (`persona_id`);--> statement-breakpoint
CREATE INDEX `participants_joined_at_idx` ON `participants` (`joined_at`);--> statement-breakpoint
CREATE INDEX `participants_last_activity_idx` ON `participants` (`last_activity`);--> statement-breakpoint
CREATE INDEX `participants_session_persona_idx` ON `participants` (`session_id`,`persona_id`);--> statement-breakpoint
CREATE INDEX `sessions_code_idx` ON `sessions` (`code`);--> statement-breakpoint
CREATE INDEX `sessions_status_idx` ON `sessions` (`status`);--> statement-breakpoint
CREATE INDEX `sessions_created_by_idx` ON `sessions` (`created_by`);--> statement-breakpoint
CREATE INDEX `sessions_created_at_idx` ON `sessions` (`created_at`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);