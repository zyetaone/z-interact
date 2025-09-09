import { images, type NewImage } from './schema';
import { eq, gte, gt, desc, and } from 'drizzle-orm';
import type { DatabaseConnection } from './index';
import { getPersonaById } from '../../stores/config-store.svelte';

/**
 * Common query builders for images
 * Optimized with better type safety and performance
 */
export const ImageQueries = {
	byId: (db: DatabaseConnection, id: string) =>
		db.select().from(images).where(eq(images.id, id)).limit(1),

	byPersona: (db: DatabaseConnection, personaId: string) =>
		db.select().from(images).where(eq(images.personaId, personaId)),

	byTable: (db: DatabaseConnection, tableId: string) =>
		db.select().from(images).where(eq(images.tableId, tableId)),

	byStatus: (db: DatabaseConnection, status: string) =>
		db.select().from(images).where(eq(images.status, status)),

	lockedByTable: (db: DatabaseConnection, tableId: string) =>
		db
			.select()
			.from(images)
			.where(and(eq(images.tableId, tableId), eq(images.status, 'locked'))),

	recent: (db: DatabaseConnection, limit = 50) =>
		db.select().from(images).orderBy(desc(images.createdAt)).limit(limit),

	recentNonAdmin: (db: DatabaseConnection, limit = 50) => {
		const yesterday = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
		return db
			.select()
			.from(images)
			.where(gte(images.createdAt, yesterday))
			.orderBy(desc(images.createdAt))
			.limit(limit);
	},

	since: (db: DatabaseConnection, sinceTimestamp: number, limit = 50) =>
		db
			.select()
			.from(images)
			.where(gt(images.updatedAt, sinceTimestamp))
			.orderBy(desc(images.updatedAt))
			.limit(limit)
};

/**
 * Create image queries instance with database connection
 * Enhanced with more query methods
 */
export function createImageQueries(db: DatabaseConnection) {
	return {
		findById: (id: string) => ImageQueries.byId(db, id),
		findByPersona: (personaId: string) => ImageQueries.byPersona(db, personaId),
		findByTable: (tableId: string) => ImageQueries.byTable(db, tableId),
		findByStatus: (status: string) => ImageQueries.byStatus(db, status),
		findLockedByTable: (tableId: string) => ImageQueries.lockedByTable(db, tableId),
		findRecent: (limit?: number) => ImageQueries.recent(db, limit),
		findRecentNonAdmin: (limit?: number) => ImageQueries.recentNonAdmin(db, limit),
		findSince: (sinceTimestamp: number, limit?: number) =>
			ImageQueries.since(db, sinceTimestamp, limit)
	};
}

// Image creation interface
export interface CreateImageOptions {
	imageUrl: string;
	prompt: string;
	personaId?: string;
	tableId?: string;
	provider?: string;
	status?: 'locked' | 'pending' | 'failed';
	sessionId?: string;
	participantId?: string;
}

/**
 * Create and insert a new image record with consistent defaults
 * Consolidated from separate image-operations.ts file
 */
export async function createImage(
	db: DatabaseConnection,
	options: CreateImageOptions
): Promise<NewImage> {
	const {
		imageUrl,
		prompt,
		personaId = 'upload',
		tableId = null,
		provider = 'upload',
		status = 'locked',
		sessionId = null,
		participantId = null
	} = options;

	const newImage: NewImage = {
		id: crypto.randomUUID(),
		tableId: tableId?.trim() || null,
		personaId: personaId.trim(),
		personaTitle:
			getPersonaById(personaId)?.title ||
			personaId
				.trim()
				.replace('-', ' ')
				.replace(/\b\w/g, (l: string) => l.toUpperCase()),
		sessionId,
		participantId,
		imageUrl,
		prompt: prompt.trim(),
		provider,
		status,
		createdAt: Date.now(),
		updatedAt: Date.now()
	};

	await db.insert(images).values(newImage);
	return newImage;
}
