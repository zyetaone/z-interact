import { getRequestEvent } from '$app/server';
import { getDb, type DatabaseConnection } from './index';

/**
 * Get database connection from current request context
 * Centralized database connection helper
 */
export function getDatabase(): DatabaseConnection {
	const event = getRequestEvent();
	const platform = event?.platform || (globalThis as any).platform || undefined;
	return getDb(platform);
}

/**
 * Serialize image object by converting Date objects to ISO strings
 * Ensures proper serialization for remote functions
 */
export function serializeImage<T>(item: T): T {
	if (!item || typeof item !== 'object') return item;
	const newItem = { ...item } as any;
	if (newItem.createdAt instanceof Date) {
		newItem.createdAt = newItem.createdAt.toISOString();
	}
	if (newItem.updatedAt instanceof Date) {
		newItem.updatedAt = newItem.updatedAt.toISOString();
	}
	return newItem;
}

/**
 * Serialize array of image objects
 */
export function serializeImages<T extends any[]>(items: T): T {
	return items.map(serializeImage) as T;
}
