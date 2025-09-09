import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-valibot';
import * as v from 'valibot';
import {
	personaIdPipe,
	optionalTableIdPipe,
	urlPipe,
	optionalUrlPipe,
	promptPipe,
	requiredStringPipe
} from '../../validation/common';

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
	createdAt: integer('created_at').notNull(), // Unix timestamp (milliseconds)
	updatedAt: integer('updated_at') // Unix timestamp (milliseconds)
});

// Drizzle-inferred types
export type Image = typeof images.$inferSelect;
export type NewImage = typeof images.$inferInsert;

// Valibot validation schemas - using shared validation utilities
export const insertImageSchema = createInsertSchema(images, {
	// Custom refinements using shared validation pipes
	prompt: v.pipe(promptPipe, v.maxLength(1000, 'Prompt must be less than 1000 characters')),
	personaId: personaIdPipe,
	tableId: optionalTableIdPipe,
	imageUrl: optionalUrlPipe
});

export const selectImageSchema = createSelectSchema(images);

// API-specific validation schemas using shared utilities

export const generateImageRequestSchema = v.object({
	prompt: promptPipe,
	personaId: personaIdPipe,
	tableId: optionalTableIdPipe
});

export const saveImageRequestSchema = v.object({
	personaId: personaIdPipe,
	imageUrl: urlPipe,
	prompt: requiredStringPipe('Prompt'),
	tableId: optionalTableIdPipe
});
