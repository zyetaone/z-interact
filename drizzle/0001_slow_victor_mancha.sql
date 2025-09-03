PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_images` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text,
	`participant_id` text,
	`persona_id` text NOT NULL,
	`persona_title` text NOT NULL,
	`image_url` text,
	`image_data` text,
	`image_mime_type` text,
	`prompt` text NOT NULL,
	`provider` text DEFAULT 'placeholder' NOT NULL,
	`status` text DEFAULT 'generating' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_images`("id", "session_id", "participant_id", "persona_id", "persona_title", "image_url", "image_data", "image_mime_type", "prompt", "provider", "status", "created_at", "updated_at") SELECT "id", "session_id", "participant_id", "persona_id", "persona_title", "image_url", "image_data", "image_mime_type", "prompt", "provider", "status", "created_at", "updated_at" FROM `images`;--> statement-breakpoint
DROP TABLE `images`;--> statement-breakpoint
ALTER TABLE `__new_images` RENAME TO `images`;--> statement-breakpoint
PRAGMA foreign_keys=ON;