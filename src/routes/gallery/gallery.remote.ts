import { query, command, getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { images, type NewImage } from '$lib/server/db/schema';
import { eq, gt, desc, and } from 'drizzle-orm';
import { deleteFromR2 } from '../storage/r2.remote';
import { createImageQueries } from '$lib/server/db/queries';
import { logger } from '$lib/utils/logger';
import { getDatabase, serializeImage, serializeImages } from '$lib/server/db/utils';
import { createImage } from '$lib/server/db/queries';
import { uploadFromUrl, uploadFromBase64, uploadFromBuffer } from '../storage/r2.remote';
import {
	ListImagesSchema,
	ImageIdSchema,
	DeleteImageSchema,
	ListImagesSinceSchema,
	SubscribeSchema,
	UploadSchema,
	UploadImageUrlSchema,
	UploadBlobSchema,
	type ListImagesRequest,
	type ImageIdRequest,
	type DeleteImageRequest,
	type ListImagesSinceRequest,
	type SubscribeRequest,
	type UploadRequest,
	type UploadImageUrlRequest,
	type UploadBlobRequest
} from '$lib/validation/schemas';

// --- Helper Functions ---
function extractR2KeyFromUrl(publicBase: string, url: string): string | null {
	if (!publicBase || !url) return null;
	const base = publicBase.endsWith('/') ? publicBase.slice(0, -1) : publicBase;
	if (!url.startsWith(base)) return null;
	let key = url.slice(base.length);
	if (key.startsWith('/')) key = key.slice(1);
	return key || null;
}

// --- Remote Functions ---

export const listImages = query(ListImagesSchema, async (params: ListImagesRequest) => {
	const { admin = false, limit = 50 } = params || {};
	const db = getDatabase();
	const imageQueries = createImageQueries(db);

	const result = admin
		? await imageQueries.findRecent(limit)
		: await imageQueries.findRecentNonAdmin(limit);

	return serializeImages(result);
});

export const getImageById = query(ImageIdSchema, async (params: ImageIdRequest) => {
	const db = getDatabase();
	const imageQueries = createImageQueries(db);

	const [result] = await imageQueries.findById(params.imageId);

	if (!result) {
		error(404, 'Image not found');
	}

	return serializeImage(result);
});

export const deleteImage = command(DeleteImageSchema, async (data: DeleteImageRequest) => {
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
			const filename = extractR2KeyFromUrl(r2PublicUrl, imageRecord.imageUrl);
			if (filename) {
				const result = await deleteFromR2({ filename });
				deletedFromR2 = result.success;
			}
		} catch (err) {
			logger.warn('Failed to delete from R2', { imageId: data.imageId, error: err });
		}
	}

	await db.delete(images).where(eq(images.id, data.imageId));

	return {
		success: true,
		data: { id: data.imageId, deletedFromR2 },
		message: 'Image deleted successfully'
	};
});

export const clearImages = command(v.undefined(), async () => {
	const db = getDatabase();
	const event = getRequestEvent();
	const platform = event?.platform || (globalThis as any).platform || undefined;
	const imageQueries = createImageQueries(db);
	const allImages = await imageQueries.findRecent(10000);

	let deletedFromR2Count = 0;
	if (platform?.env?.R2_IMAGES) {
		const r2PublicUrl = platform.env.R2_PUBLIC_URL as string;
		for (const image of allImages) {
			if (image.imageUrl && image.imageUrl.startsWith(r2PublicUrl)) {
				try {
					const filename = extractR2KeyFromUrl(r2PublicUrl, image.imageUrl);
					if (filename) {
						const result = await deleteFromR2({ filename });
						if (result.success) {
							deletedFromR2Count++;
						}
					}
				} catch (err) {
					logger.warn('Failed to delete image from R2 during clear', {
						imageId: image.id,
						error: err
					});
				}
			}
		}
	}

	const result = await db.delete(images);
	return {
		success: true,
		data: {
			deletedFromDb: result.rowsAffected || 0,
			deletedFromR2: deletedFromR2Count
		},
		message: 'All images cleared successfully'
	};
});

export const listImagesSince = query(
	ListImagesSinceSchema,
	async (params: ListImagesSinceRequest) => {
		const { since, limit = 50, admin = false, tableId } = params;
		const db = getDatabase();

		const conditions = [gt(images.updatedAt, since)];
		if (tableId) conditions.push(eq(images.tableId, tableId));
		if (!admin) {
			const yesterday = Date.now() - 24 * 60 * 60 * 1000;
			conditions.push(gt(images.createdAt, yesterday));
		}

		const result = await db
			.select()
			.from(images)
			.where(and(...conditions))
			.orderBy(desc(images.updatedAt))
			.limit(limit);

		return serializeImages(result);
	}
);

export const getTableStatus = query(v.undefined(), async () => {
	const db = getDatabase();
	const imageQueries = createImageQueries(db);
	const lockedImages = await imageQueries.findByStatus('locked');

	// Build dynamic status map from actual locked images
	const tableStatus: Record<string, { ready: boolean; hasImage: boolean; count: number }> = {};
	for (const img of lockedImages) {
		const id = img.tableId || 'unknown';
		if (!tableStatus[id]) {
			tableStatus[id] = { ready: false, hasImage: false, count: 0 };
		}
		tableStatus[id].count += 1;
		tableStatus[id].hasImage = true;
		tableStatus[id].ready = true;
	}

	return tableStatus;
});

export const subscribeToGalleryUpdates = query(
	SubscribeSchema,
	async function* ({ since = Date.now(), tableId, limit = 50 }: SubscribeRequest) {
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

export const uploadImage = command(UploadSchema, async (data: UploadRequest) => {
	let uint8: Uint8Array = new Uint8Array();
	if (data.bytes instanceof Uint8Array) uint8 = data.bytes as Uint8Array;
	else if (data.bytes instanceof ArrayBuffer) uint8 = new Uint8Array(data.bytes as ArrayBuffer);
	else if (Array.isArray(data.bytes)) uint8 = new Uint8Array(data.bytes as number[]);
	else error(400, 'Invalid bytes payload');

	const filename = data.filename || `upload-${Date.now()}`;
	const res = await uploadFromBuffer({
		buffer: uint8,
		filename,
		contentType: data.mime || 'image/png'
	});

	// Create a database record for the uploaded image
	const db = getDatabase();
	const newImage = await createImage(db, {
		imageUrl: res.url,
		prompt: filename,
		personaId: 'upload',
		provider: 'upload',
		status: 'locked'
	});

	return {
		success: true,
		data: { id: newImage.id, cdnUrl: res.url },
		message: 'Image uploaded successfully'
	};
});

export const uploadImageUrl = command(UploadImageUrlSchema, async (data: UploadImageUrlRequest) => {
	try {
		logger.info('Server-side image download requested', {
			component: 'uploadImageUrl',
			url: data.imageUrl.substring(0, 50)
		});

		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 8);
		const filename = `images/${data.personaId}/${timestamp}-${random}.png`;

		const result = await uploadFromUrl({
			imageUrl: data.imageUrl,
			filename
		});

		// Create a database record for the uploaded image
		const db = getDatabase();
		const newImage = await createImage(db, {
			imageUrl: result.url,
			prompt: data.prompt,
			personaId: data.personaId,
			tableId: data.tableId,
			provider: 'upload',
			status: 'locked'
		});

		return {
			success: true,
			data: { url: result.url, id: newImage.id },
			message: 'Image uploaded successfully'
		};
	} catch (err) {
		logger.error('Image upload failed', { component: 'uploadImageUrl', error: err as any });
		error(500, 'Image upload failed');
	}
});

export const uploadBlob = command(UploadBlobSchema, async (data: UploadBlobRequest) => {
	try {
		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 8);
		const ext = data.mimeType === 'image/jpeg' ? 'jpg' : 'png';
		const filename = `images/${data.personaId}/${timestamp}-${random}.${ext}`;

		const result = await uploadFromBase64({
			base64Data: data.base64,
			filename
		});

		// Create a database record for the uploaded image
		const db = getDatabase();
		const newImage = await createImage(db, {
			imageUrl: result.url,
			prompt: data.prompt,
			personaId: data.personaId,
			tableId: data.tableId,
			provider: 'upload',
			status: 'locked'
		});

		return {
			success: true,
			url: result.url,
			id: newImage.id
		};
	} catch (err) {
		logger.error('Blob upload failed', { component: 'uploadBlob', error: err as any });
		error(500, 'Blob upload failed');
	}
});
