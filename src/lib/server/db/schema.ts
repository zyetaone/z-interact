import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Users table for authentication
export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	email: text('email').unique().notNull(),
	passwordHash: text('password_hash').notNull(),
	role: text('role', { enum: ['admin', 'presenter', 'participant'] }).default('participant').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Sessions table for managing presentation sessions
export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	code: text('code').unique().notNull(),
	status: text('status', { enum: ['active', 'ended', 'paused'] }).default('active').notNull(),
	createdBy: text('created_by').references(() => users.id).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Auth sessions table for user authentication
export const authSessions = sqliteTable('auth_sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id').references(() => users.id).notNull(),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
});

// Participants table for session attendees
export const participants = sqliteTable('participants', {
	id: text('id').primaryKey(),
	sessionId: text('session_id').references(() => sessions.id).notNull(),
	name: text('name'),
	personaId: text('persona_id').notNull(),
	joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull(),
	lastActivity: integer('last_activity', { mode: 'timestamp' }).notNull(),
});

// Images table for generated workspace images
export const images = sqliteTable('images', {
	id: text('id').primaryKey(),
	sessionId: text('session_id').references(() => sessions.id),
	participantId: text('participant_id').references(() => participants.id),
	tableId: text('table_id'), // e.g., '1', '2', etc.
	personaId: text('persona_id').notNull(),
	personaTitle: text('persona_title').notNull(),
	imageUrl: text('image_url'), // Keep for backward compatibility, can be null
	imageData: text('image_data'), // Base64 encoded image data
	imageMimeType: text('image_mime_type'), // MIME type (e.g., 'image/png', 'image/jpeg')
	prompt: text('prompt').notNull(),
	provider: text('provider', { enum: ['openai', 'stability', 'midjourney', 'placeholder'] }).default('placeholder').notNull(),
	status: text('status', { enum: ['generating', 'completed', 'failed'] }).default('generating').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Activity logs for analytics
export const activityLogs = sqliteTable('activity_logs', {
	id: text('id').primaryKey(),
	sessionId: text('session_id').references(() => sessions.id),
	participantId: text('participant_id').references(() => participants.id),
	action: text('action').notNull(), // 'join', 'generate_image', 'lock_image', etc.
	data: text('data'), // JSON string for additional data
	timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
	sessions: many(sessions),
	authSessions: many(authSessions),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
	creator: one(users, {
		fields: [sessions.createdBy],
		references: [users.id],
	}),
	participants: many(participants),
	images: many(images),
	activityLogs: many(activityLogs),
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
	user: one(users, {
		fields: [authSessions.userId],
		references: [users.id],
	}),
}));

export const participantsRelations = relations(participants, ({ one, many }) => ({
	session: one(sessions, {
		fields: [participants.sessionId],
		references: [sessions.id],
	}),
	images: many(images),
	activityLogs: many(activityLogs),
}));

export const imagesRelations = relations(images, ({ one }) => ({
	session: one(sessions, {
		fields: [images.sessionId],
		references: [sessions.id],
	}),
	participant: one(participants, {
		fields: [images.participantId],
		references: [participants.id],
	}),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
	session: one(sessions, {
		fields: [activityLogs.sessionId],
		references: [sessions.id],
	}),
	participant: one(participants, {
		fields: [activityLogs.participantId],
		references: [participants.id],
	}),
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;

export type Image = typeof images.$inferSelect;
export type NewImage = typeof images.$inferInsert;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
