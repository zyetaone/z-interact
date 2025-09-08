import { query, command, getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { getDb, type DatabaseConnection } from '$lib/server/db';
import { images, type NewImage } from '$lib/server/db/schema';
import { eq, gt, desc, and } from 'drizzle-orm';
import { createR2Storage, extractR2KeyFromUrl, R2Storage } from '$lib/server/r2-storage';
import { createImageQueries } from '$lib/server/db/queries';
import { logger } from '$lib/utils/logger';
import { getPersonaById } from '$lib/config.svelte';

// --- Helper Functions ---

function getDatabase(): DatabaseConnection {
	const event = getRequestEvent();
	const platform = event?.platform || (globalThis as any).platform || undefined;
	return getDb(platform);
}

function serializeImage<T>(item: T): T {
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

function serializeImages<T extends any[]>(items: T): T {
	return items.map(serializeImage) as T;
}

// --- Remote Functions ---

const listImagesSchema = v.object({
	admin: v.optional(v.boolean()),
	limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)))
});

export const listImages = query(v.optional(listImagesSchema), async (params) => {
	const { admin = false, limit = 50 } = params || {};
	const db = getDatabase();
	const imageQueries = createImageQueries(db);

	const result = admin
		? await imageQueries.findRecent(limit)
		: await imageQueries.findRecentNonAdmin(limit);

	return serializeImages(result);
});

const imageIdSchema = v.object({
	imageId: v.pipe(v.string(), v.minLength(1), v.maxLength(100))
});

export const getImageById = query(imageIdSchema, async (params) => {
	const db = getDatabase();
	const imageQueries = createImageQueries(db);

	const [result] = await imageQueries.findById(params.imageId);

	if (!result) {
		error(404, 'Image not found');
	}

	return serializeImage(result);
});

const deleteImageSchema = v.object({ imageId: v.string() });

export const deleteImage = command(deleteImageSchema, async (data) => {
	const db = getDatabase();
	const event = getRequestEvent();
	const platform = event?.platform || (globalThis as any).platform || undefined;

	const [imageRecord] = await db.select().from(images).where(eq(images.id, data.imageId)).limit(1);

	if (!imageRecord) {
		error(404, 'Image not found');
	}

	let deletedFromR2 = false;
	const r2PublicUrl = platform?.env?.R2_PUBLIC_URL || '';
	if (imageRecord.imageUrl && r2PublicUrl && imageRecord.imageUrl.startsWith(r2PublicUrl)) {
		try {
			const r2Storage = createR2Storage(platform);
			const filename = extractR2KeyFromUrl(r2PublicUrl, imageRecord.imageUrl);
			if (filename) {
				deletedFromR2 = await r2Storage.deleteImage(filename);
			}
		} catch (err) {
			logger.warn('Failed to delete from R2', { imageId: data.imageId, error: err });
		}
	}

	await db.delete(images).where(eq(images.id, data.imageId));

	return { message: 'Image deleted', id: data.imageId, deletedFromR2 };
});

export const clearImages = command(v.undefined(), async () => {
	const db = getDatabase();
	const event = getRequestEvent();
	const platform = event?.platform || (globalThis as any).platform || undefined;
	const imageQueries = createImageQueries(db);
	const allImages = await imageQueries.findRecent(10000);

	let deletedFromR2Count = 0;
	if (platform?.env?.R2_IMAGES) {
		const r2Storage = createR2Storage(platform);
		const r2PublicUrl = platform.env.R2_PUBLIC_URL as string;
		for (const image of allImages) {
			if (image.imageUrl && image.imageUrl.startsWith(r2PublicUrl)) {
				try {
					const filename = extractR2KeyFromUrl(r2PublicUrl, image.imageUrl);
					if (filename) {
						await r2Storage.deleteImage(filename);
						deletedFromR2Count++;
					}
				} catch (err) {
					logger.warn('Failed to delete image from R2 during clear', { imageId: image.id, error: err });
				}
			}
		}
	}

	const result = await db.delete(images);
	return { message: 'All images cleared', deletedFromDb: result.rowsAffected || 0, deletedFromR2: deletedFromR2Count };
});

const listImagesSinceSchema = v.object({
	since: v.pipe(v.number(), v.minValue(0)),
	limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100))),
	admin: v.optional(v.boolean()),
	tableId: v.optional(v.string())
});

export const listImagesSince = query(listImagesSinceSchema, async (params) => {
	const { since, limit = 50, admin = false, tableId } = params;
	const db = getDatabase();

	const conditions = [gt(images.updatedAt, since)];
	if (tableId) conditions.push(eq(images.tableId, tableId));
	if (!admin) {
		const yesterday = Date.now() - 24 * 60 * 60 * 1000;
		conditions.push(gt(images.createdAt, yesterday));
	}

	const result = await db.select().from(images).where(and(...conditions)).orderBy(desc(images.updatedAt)).limit(limit);

	return serializeImages(result);
});

export const getTableStatus = query(v.undefined(), async () => {
	const db = getDatabase();
	const imageQueries = createImageQueries(db);
	const lockedImages = await imageQueries.findByStatus('locked');

	const tableStatus: Record<string, { ready: boolean; hasImage: boolean; count: number }> = {};
	for (let i = 1; i <= 10; i++) {
		tableStatus[String(i)] = { ready: false, hasImage: false, count: 0 };
	}

	const tableCounts: Record<string, number> = {};
	for (const image of lockedImages) {
		if (image.tableId) {
			tableCounts[image.tableId] = (tableCounts[image.tableId] || 0) + 1;
		}
	}

	for (const tableId of Object.keys(tableCounts)) {
		tableStatus[tableId] = {
			ready: true,
			hasImage: true,
			count: tableCounts[tableId]
		};
	}

	return tableStatus;
});

const subscribeSchema = v.object({
	since: v.optional(v.pipe(v.number(), v.minValue(0))),
	tableId: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(10))),
	limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)))
});

export const subscribeToGalleryUpdates = query(
	subscribeSchema,
	async function* ({ since = Date.now(), tableId, limit = 50 }) {
		const db = getDatabase();
		const imageQueries = createImageQueries(db);

		const initialImages = await imageQueries.findRecent(limit);
		yield { type: 'sync', data: serializeImages(initialImages) };

		let lastCheck = since;
		const maxIterations = 300;

		for (let i = 0; i < maxIterations; i++) {
			await new Promise((resolve) => setTimeout(resolve, 2000));

			const changes = await imageQueries.findSince(lastCheck, limit);
			if (changes.length > 0) {
				lastCheck = Date.now();
				yield { type: 'update', data: serializeImages(changes) };
			}

			const lockedImages = await imageQueries.findByStatus('locked');
			if (lockedImages.length >= 10) {
				yield { type: 'complete', data: { allTablesReady: true } };
				break;
			}
		}

		yield { type: 'end', reason: 'timeout' };
	}
);

const UploadSchema = v.object({
	filename: v.string(),
	mime: v.string(),
	bytes: v.unknown(),
	meta: v.optional(v.unknown())
});

export const uploadImage = command(UploadSchema, async (data) => {
	const event = getRequestEvent();
	const platform = event?.platform || (globalThis as any).platform || undefined;
	const database = getDb(platform);

	let uint8: Uint8Array = new Uint8Array();
	if (data.bytes instanceof Uint8Array) uint8 = data.bytes as Uint8Array;
	else if (data.bytes instanceof ArrayBuffer) uint8 = new Uint8Array(data.bytes as ArrayBuffer);
	else if (Array.isArray(data.bytes)) uint8 = new Uint8Array(data.bytes as number[]);
	else error(400, 'Invalid bytes payload');

	const id = crypto.randomUUID();
	const ext = data.filename.includes('.') ? data.filename.split('.').pop()! : 'bin';
	const key = R2Storage.generateFilename('upload', ext);

	let cdnUrl: string;
	const isLocalDev = event?.url?.hostname === 'localhost' || event?.url?.hostname === '127.0.0.1';

	const b64 = btoa(String.fromCharCode(...uint8));
	if (!isLocalDev && platform?.env?.R2_IMAGES) {
		const r2 = createR2Storage(platform);
		const res = await r2.uploadImageFromBase64(b64, key);
		if (!res.success || !res.url) {
			error(500, res.error || 'R2 upload failed');
		}
		cdnUrl = res.url as string;
	} else {
		cdnUrl = `data:${data.mime};base64,${b64}`;
	}

	const row: NewImage = {
		id,
		tableId: null,
		personaId: 'upload',
		personaTitle: 'Upload',
		sessionId: null,
		participantId: null,
		imageUrl: cdnUrl,
		prompt: data.filename,
		provider: 'upload',
		status: 'uploaded',
		createdAt: Date.now(),
		updatedAt: Date.now()
	};

	await database.insert(images).values(row);

	return { id, cdnUrl };
});

const UploadImageUrlSchema = v.object({
	imageUrl: v.string(),
	personaId: v.string(),
	tableId: v.optional(v.string()),
	prompt: v.string()
});

export const uploadImageUrl = command(
	UploadImageUrlSchema,
	async (data: { imageUrl: string; personaId: string; tableId?: string; prompt: string }) => {
		const event = getRequestEvent();
		const platform = event?.platform || (globalThis as any).platform || undefined;

		try {
			logger.info('Server-side image download requested', {
				component: 'uploadImageUrl',
				url: data.imageUrl.substring(0, 50)
			});

			const imageResponse = await fetch(data.imageUrl, {
				headers: {
					'User-Agent': 'Mozilla/5.0 (compatible; AI-Workspace-Generator/1.0)'
				}
			});

			if (!imageResponse.ok) {
				error(500, `Failed to download image: ${imageResponse.status}`);
			}

			const contentType = imageResponse.headers.get('content-type') || 'image/png';
			const arrayBuffer = await imageResponse.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			const ext = contentType.split('/')[1] || 'png';
			const filename = `ai-${Date.now()}-${crypto.randomUUID()}.${ext}`;

			const storage = createR2Storage(platform);
			let finalUrl: string;

			if (platform?.env?.R2_IMAGES) {
				const result = await storage.uploadImageFromBase64(buffer.toString('base64'), filename);
				if (!result.success || !result.url) {
					error(500, result.error || 'R2 upload failed');
				}
				finalUrl = result.url as string;
				logger.info('Image uploaded to R2', {
					component: 'uploadImageUrl',
					filename,
					url: finalUrl.substring(0, 50)
				});
			} else {
				const base64 = buffer.toString('base64');
				finalUrl = `data:${contentType};base64,${base64}`;
				logger.info('Image converted to base64 for development', {
					component: 'uploadImageUrl',
					size: base64.length
				});
			}

			return {
				success: true,
				url: finalUrl,
				id: crypto.randomUUID()
			};
		} catch (err) {
			logger.error('Image upload failed', { component: 'uploadImageUrl', error: err });
			error(500, 'Image upload failed');
		}
	}
);

const UploadBlobSchema = v.object({
	base64: v.string(),
	mimeType: v.string(),
	personaId: v.string(),
	tableId: v.optional(v.string()),
	prompt: v.string()
});

export const uploadBlob = command(
	UploadBlobSchema,
	async (data: {
		base64: string;
		mimeType: string;
		personaId: string;
		tableId?: string;
		prompt: string;
	}) => {
		const event = getRequestEvent();
		const platform = event?.platform || (globalThis as any).platform || undefined;
		const database = getDb(platform);

		try {
			const buffer = Buffer.from(data.base64, 'base64');

			const ext = data.mimeType.split('/')[1] || 'png';
			const filename = `ai-${Date.now()}-${crypto.randomUUID()}.${ext}`;

			const storage = createR2Storage(platform);
			let finalUrl: string;

			if (platform?.env?.R2_IMAGES) {
				const result = await storage.uploadImageFromBase64(buffer.toString('base64'), filename);
				if (!result.success || !result.url) {
					error(500, result.error || 'R2 upload failed');
				}
				finalUrl = result.url as string;
				logger.info('Blob uploaded to R2', {
					component: 'uploadBlob',
					filename,
					url: finalUrl.substring(0, 50)
				});
			} else {
				finalUrl = `data:${data.mimeType};base64,${data.base64}`;
				logger.info('Blob stored as base64 for development', {
					component: 'uploadBlob',
					size: data.base64.length
				});
			}

			const personaTitle =
				getPersonaById(data.personaId)?.title ||
				data.personaId
					.trim()
					.replace('-', ' ')
					.replace(/\b\w/g, (l: string) => l.toUpperCase());

			const newImage: NewImage = {
				id: crypto.randomUUID(),
				tableId: data.tableId?.trim() || null,
				personaId: data.personaId.trim(),
				personaTitle,
				sessionId: null,
				participantId: null,
				imageUrl: finalUrl,
				prompt: data.prompt.trim(),
				provider: 'fal.ai/nano-banana',
				status: 'active',
				createdAt: Date.now(),
				updatedAt: Date.now()
			};

			await database.insert(images).values(newImage);

			listImages({}).refresh().catch(() => {});

			return {
				success: true,
				url: finalUrl,
				id: newImage.id
			};
		} catch (err) {
			logger.error('Blob upload failed', { component: 'uploadBlob', error: err });
			error(500, 'Blob upload failed');
		}
	}
);