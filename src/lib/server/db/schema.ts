import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Users table for authentication
export const users = sqliteTable(
	'users',
	{
		id: text('id').primaryKey(),
		email: text('email').unique().notNull(),
		passwordHash: text('password_hash').notNull(),
		role: text('role', { enum: ['admin', 'presenter', 'participant'] })
			.default('participant')
			.notNull(),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
	},
	(table) => ({
		emailIdx: index('users_email_idx').on(table.email),
		roleIdx: index('users_role_idx').on(table.role)
	})
);

// Sessions table for managing presentation sessions
export const sessions = sqliteTable(
	'sessions',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		code: text('code').unique().notNull(),
		status: text('status', { enum: ['active', 'ended', 'paused'] })
			.default('active')
			.notNull(),
		createdBy: text('created_by')
			.references(() => users.id)
			.notNull(),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
	},
	(table) => ({
		codeIdx: index('sessions_code_idx').on(table.code),
		statusIdx: index('sessions_status_idx').on(table.status),
		createdByIdx: index('sessions_created_by_idx').on(table.createdBy),
		createdAtIdx: index('sessions_created_at_idx').on(table.createdAt)
	})
);

// Auth sessions table for user authentication
export const authSessions = sqliteTable('auth_sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.references(() => users.id)
		.notNull(),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

// Participants table for session attendees
export const participants = sqliteTable(
	'participants',
	{
		id: text('id').primaryKey(),
		sessionId: text('session_id')
			.references(() => sessions.id)
			.notNull(),
		name: text('name'),
		personaId: text('persona_id').notNull(),
		joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull(),
		lastActivity: integer('last_activity', { mode: 'timestamp' }).notNull()
	},
	(table) => ({
		sessionIdIdx: index('participants_session_id_idx').on(table.sessionId),
		personaIdIdx: index('participants_persona_id_idx').on(table.personaId),
		joinedAtIdx: index('participants_joined_at_idx').on(table.joinedAt),
		lastActivityIdx: index('participants_last_activity_idx').on(table.lastActivity),
		// Composite index for session-persona queries
		sessionPersonaIdx: index('participants_session_persona_idx').on(
			table.sessionId,
			table.personaId
		)
	})
);

// Images table for generated workspace images - optimized for R2 storage
export const images = sqliteTable(
	'images',
	{
		id: text('id').primaryKey(),
		sessionId: text('session_id').references(() => sessions.id),
		participantId: text('participant_id').references(() => participants.id),
		tableId: text('table_id'), // e.g., '1', '2', etc.
		personaId: text('persona_id').notNull(),
		personaTitle: text('persona_title').notNull(),
		imageUrl: text('image_url'), // R2 public URL (primary storage location)
		imageData: text('image_data'), // Base64 encoded image data (deprecated, use R2)
		imageMimeType: text('image_mime_type'), // MIME type (deprecated, inferred from R2)
		prompt: text('prompt').notNull(),
		provider: text('provider', { enum: ['openai', 'stability', 'midjourney', 'placeholder'] })
			.default('placeholder')
			.notNull(),
		status: text('status', { enum: ['generating', 'completed', 'failed'] })
			.default('generating')
			.notNull(),
		// Essential R2 storage fields
		r2Key: text('r2_key'), // R2 object key for direct access
		migrationStatus: text('migration_status', {
			enum: ['pending', 'migrating', 'completed', 'failed', 'rolled_back']
		})
			.default('pending')
			.notNull(),
		migratedAt: integer('migrated_at', { mode: 'timestamp' }), // When migration completed
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
	},
	(table) => ({
		// Performance indexes
		sessionIdIdx: index('images_session_id_idx').on(table.sessionId),
		participantIdIdx: index('images_participant_id_idx').on(table.participantId),
		personaIdIdx: index('images_persona_id_idx').on(table.personaId),
		statusIdx: index('images_status_idx').on(table.status),
		createdAtIdx: index('images_created_at_idx').on(table.createdAt),
		migrationStatusIdx: index('images_migration_status_idx').on(table.migrationStatus),
		// Composite indexes for common queries
		sessionPersonaIdx: index('images_session_persona_idx').on(table.sessionId, table.personaId),
		sessionStatusIdx: index('images_session_status_idx').on(table.sessionId, table.status)
	})
);

// Activity logs for analytics
export const activityLogs = sqliteTable(
	'activity_logs',
	{
		id: text('id').primaryKey(),
		sessionId: text('session_id').references(() => sessions.id),
		participantId: text('participant_id').references(() => participants.id),
		action: text('action').notNull(), // 'join', 'generate_image', 'lock_image', etc.
		data: text('data'), // JSON string for additional data
		timestamp: integer('timestamp', { mode: 'timestamp' }).notNull()
	},
	(table) => ({
		sessionIdIdx: index('activity_logs_session_id_idx').on(table.sessionId),
		participantIdIdx: index('activity_logs_participant_id_idx').on(table.participantId),
		actionIdx: index('activity_logs_action_idx').on(table.action),
		timestampIdx: index('activity_logs_timestamp_idx').on(table.timestamp),
		// Composite indexes for common queries
		sessionActionIdx: index('activity_logs_session_action_idx').on(table.sessionId, table.action),
		sessionTimestampIdx: index('activity_logs_session_timestamp_idx').on(
			table.sessionId,
			table.timestamp
		)
	})
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
	sessions: many(sessions),
	authSessions: many(authSessions)
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
	creator: one(users, {
		fields: [sessions.createdBy],
		references: [users.id]
	}),
	participants: many(participants),
	images: many(images),
	activityLogs: many(activityLogs)
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
	user: one(users, {
		fields: [authSessions.userId],
		references: [users.id]
	})
}));

export const participantsRelations = relations(participants, ({ one, many }) => ({
	session: one(sessions, {
		fields: [participants.sessionId],
		references: [sessions.id]
	}),
	images: many(images),
	activityLogs: many(activityLogs)
}));

export const imagesRelations = relations(images, ({ one }) => ({
	session: one(sessions, {
		fields: [images.sessionId],
		references: [sessions.id]
	}),
	participant: one(participants, {
		fields: [images.participantId],
		references: [participants.id]
	})
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
	session: one(sessions, {
		fields: [activityLogs.sessionId],
		references: [sessions.id]
	}),
	participant: one(participants, {
		fields: [activityLogs.participantId],
		references: [participants.id]
	})
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
