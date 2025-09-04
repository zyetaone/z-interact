import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-valibot';
import * as v from 'valibot';

// Images table - compatible with existing structure, no foreign keys
export const images = sqliteTable('images', {
	id: text('id').primaryKey(),
	sessionId: text('session_id'),
	participantId: text('participant_id'),
	personaId: text('persona_id').notNull(),
	personaTitle: text('persona_title'),
	tableId: text('table_id'), // e.g., '1', '2', etc.
	imageUrl: text('image_url'), // R2 or base64 URL
	prompt: text('prompt').notNull(),
	provider: text('provider').default('placeholder').notNull(),
	status: text('status').default('generating').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }),
	// r2Key: text('r2_key'), // Temporarily commented - column doesn't exist in Cloudflare D1
	migrationStatus: text('migration_status').default('pending'),
	migratedAt: integer('migrated_at', { mode: 'timestamp' })
});

// Drizzle-inferred types
export type Image = typeof images.$inferSelect;
export type NewImage = typeof images.$inferInsert;

// Valibot validation schemas - auto-generated from Drizzle schema
export const insertImageSchema = createInsertSchema(images, {
	// Custom refinements for better validation
	prompt: v.pipe(
		v.string('Prompt must be a string'),
		v.minLength(10, 'Prompt must be at least 10 characters'),
		v.maxLength(1000, 'Prompt must be less than 1000 characters')
	),
	personaId: v.pipe(
		v.string('PersonaId must be a string'),
		v.regex(/^(baby-boomer|gen-x|millennial|gen-z|gen-alpha)$/, 'Invalid persona ID')
	),
	tableId: v.optional(
		v.pipe(
			v.string('TableId must be a string'),
			v.regex(/^([1-9]|10)$/, 'TableId must be between 1-10')
		)
	),
	imageUrl: v.optional(
		v.pipe(v.string('ImageUrl must be a string'), v.url('ImageUrl must be a valid URL'))
	)
});

export const selectImageSchema = createSelectSchema(images);

// API-specific validation schemas
export const generateImageRequestSchema = v.object({
	prompt: v.pipe(
		v.string('Prompt is required'),
		v.minLength(10, 'Prompt must be at least 10 characters')
		// TODO: Re-add maxLength validation once we optimize prompt generation to stay under 1000 chars
	),
	personaId: v.pipe(
		v.string('PersonaId is required'),
		v.regex(/^(baby-boomer|gen-x|millennial|gen-z|gen-alpha)$/, 'Invalid persona ID')
	),
	tableId: v.optional(
		v.pipe(
			v.string('TableId must be a string'),
			v.regex(/^([1-9]|10)$/, 'TableId must be between 1-10')
		)
	)
});

export const saveImageRequestSchema = v.object({
	personaId: v.pipe(
		v.string('PersonaId is required'),
		v.regex(/^(baby-boomer|gen-x|millennial|gen-z|gen-alpha)$/, 'Invalid persona ID')
	),
	imageUrl: v.pipe(v.string('ImageUrl is required'), v.url('ImageUrl must be a valid URL')),
	prompt: v.pipe(v.string('Prompt is required'), v.minLength(1, 'Prompt cannot be empty')),
	tableId: v.optional(
		v.pipe(
			v.string('TableId must be a string'),
			v.regex(/^([1-9]|10)$/, 'TableId must be between 1-10')
		)
	)
});
