DROP TABLE `activity_logs`;--> statement-breakpoint
DROP TABLE `auth_sessions`;--> statement-breakpoint
DROP TABLE `participants`;--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_images` (
	`id` text PRIMARY KEY NOT NULL,
	`table_id` text NOT NULL,
	`persona_id` text NOT NULL,
	`image_url` text NOT NULL,
	`prompt` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_images`("id", "table_id", "persona_id", "image_url", "prompt", "created_at") SELECT "id", "table_id", "persona_id", "image_url", "prompt", "created_at" FROM `images`;--> statement-breakpoint
DROP TABLE `images`;--> statement-breakpoint
ALTER TABLE `__new_images` RENAME TO `images`;--> statement-breakpoint
PRAGMA foreign_keys=ON;