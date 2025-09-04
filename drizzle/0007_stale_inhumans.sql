PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_images` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text,
	`participant_id` text,
	`persona_id` text NOT NULL,
	`persona_title` text,
	`table_id` text,
	`image_url` text,
	`prompt` text NOT NULL,
	`provider` text DEFAULT 'placeholder' NOT NULL,
	`status` text DEFAULT 'generating' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`r2_key` text,
	`migration_status` text DEFAULT 'pending',
	`migrated_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_images`("id", "session_id", "participant_id", "persona_id", "persona_title", "table_id", "image_url", "prompt", "provider", "status", "created_at", "updated_at", "r2_key", "migration_status", "migrated_at") SELECT "id", "session_id", "participant_id", "persona_id", "persona_title", "table_id", "image_url", "prompt", "provider", "status", "created_at", "updated_at", "r2_key", "migration_status", "migrated_at" FROM `images`;--> statement-breakpoint
DROP TABLE `images`;--> statement-breakpoint
ALTER TABLE `__new_images` RENAME TO `images`;--> statement-breakpoint
PRAGMA foreign_keys=ON;