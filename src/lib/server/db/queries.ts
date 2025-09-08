import { images } from './schema';
import { eq, gte, gt, desc, and } from 'drizzle-orm';
import type { DatabaseConnection } from './index';

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
