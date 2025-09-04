-- Add base64 storage columns
ALTER TABLE `images` ADD `image_data` text;--> statement-breakpoint
ALTER TABLE `images` ADD `image_mime_type` text;--> statement-breakpoint

-- Add R2 storage tracking columns
ALTER TABLE `images` ADD `r2_key` text;--> statement-breakpoint
ALTER TABLE `images` ADD `r2_uploaded_at` integer;--> statement-breakpoint
ALTER TABLE `images` ADD `migration_status` text default 'pending';--> statement-breakpoint
ALTER TABLE `images` ADD `migration_attempted_at` integer;--> statement-breakpoint
ALTER TABLE `images` ADD `migration_completed_at` integer;--> statement-breakpoint
ALTER TABLE `images` ADD `original_size_bytes` integer;--> statement-breakpoint
ALTER TABLE `images` ADD `r2_size_bytes` integer;