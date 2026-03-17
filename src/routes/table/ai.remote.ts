import { query, command, getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import { images } from '$lib/server/db/schema';
import { fal } from '@fal-ai/client';
import { getDatabase } from '$lib/server/db/utils';
import { createImage } from '$lib/server/db/queries';
import { createImageGenerator } from '$lib/server/ai/image-generator';
import { isValidImageUrl } from '$lib/utils/image-utils';
import { and, eq } from 'drizzle-orm';
import { uploadFromUrl } from '../storage/r2.remote';
import { logger } from '$lib/utils/logger';
import {
	GenerateImageSchema,
	LockImageSchema,
	EditImageSchema,
	type GenerateImageRequest,
	type LockImageRequest,
	type EditImageRequest
} from '$lib/validation/schemas';

// Simple async command to generate image (no fake streaming)
export const generateImage = command(GenerateImageSchema, async (data: GenerateImageRequest) => {
	const event = getRequestEvent();
	const platform = event?.platform || (globalThis as any).platform || undefined;
	const generator = createImageGenerator(platform);

	if (!generator.isAvailable()) {
		error(503, 'Image generator not available');
	}

	try {
			// Generate image
			const result = await generator.generateImage({
				prompt: data.prompt.trim(),
				personaId: data.personaId.trim(),
				tableId: data.tableId?.trim()
			});

			// Return the temporary URL from Fal.ai
			// Image will be uploaded to R2 only when locked
			return {
				success: true,
				data: {
					imageUrl: result.imageUrl,
					provider: result.provider,
					prompt: result.prompt
				},
				message: 'Image generated successfully'
			};
	} catch (err) {
		logger.error('Image generation failed', { component: 'ai.generateImage' }, err as any);
		const message = err instanceof Error ? err.message : 'Image generation failed';
		error(500, message);
	}
});

// Command to lock an image (saves locked status to database)
export const lockImage = command(LockImageSchema, async (data: LockImageRequest) => {
	const database = getDatabase();

	// Validate that imageUrl is not empty and is a valid URL or data URL
	if (!data.imageUrl || data.imageUrl.trim() === '') {
		error(400, 'No image URL provided - cannot lock without an image');
	}

	// Check if it's a valid URL or data URL
	const url = data.imageUrl.trim();
	if (!isValidImageUrl(url)) {
		error(400, 'Invalid image URL format');
	}

	// Check if an image already exists for this table/persona to prevent duplicates
	if (data.tableId) {
		const database = getDatabase();
		const existing = await database
			.select()
			.from(images)
			.where(
				and(
					eq(images.tableId, data.tableId),
					eq(images.personaId, data.personaId.trim()),
					eq(images.status, 'locked')
				)
			);

		if (existing.length > 0) {
			// Already locked, return existing
			const existingImage = existing[0];
			return {
				success: true,
				data: {
					id: existingImage.id,
					tableId: existingImage.tableId,
					personaId: existingImage.personaId,
					personaTitle: existingImage.personaTitle,
					sessionId: existingImage.sessionId,
					participantId: existingImage.participantId,
					imageUrl: existingImage.imageUrl,
					prompt: existingImage.prompt,
					provider: existingImage.provider,
					status: existingImage.status,
					createdAt: existingImage.createdAt || Date.now(),
					updatedAt: existingImage.updatedAt || Date.now()
				},
				message: 'Image already locked'
			};
		}
	}

	let finalImageUrl = url;

	// If the image is from Fal.ai (temporary URL), upload to R2 for permanent storage
	if (url.startsWith('https://fal.') || url.includes('fal.ai') || url.includes('fal.run')) {
		try {
			const timestamp = Date.now();
			const random = Math.random().toString(36).substring(2, 8);
			const filename = `images/${data.personaId.trim()}/${timestamp}-${random}.png`;

			const upload = await uploadFromUrl({ imageUrl: url, filename });
			finalImageUrl = upload.url;
		} catch (error) {
			// Log error but continue with the original URL
			logger.error(
				'Failed to upload to R2 during lock',
				{ component: 'ai.lockImage' },
				error as any
			);
		}
	}

    const db = getDatabase();
    const newImage = await createImage(db, {
        imageUrl: finalImageUrl,
        prompt: data.prompt,
        personaId: data.personaId,
        tableId: data.tableId,
        provider: 'fal.ai/nano-banana',
        status: 'locked'
    });

	// Note: Gallery polling will detect this new image on next iteration

	// Note: The streaming query (subscribeToGalleryUpdates) will detect this change
	// on its next iteration and push it to all connected clients automatically

	return {
		success: true,
		data: {
			id: newImage.id,
			tableId: newImage.tableId,
			personaId: newImage.personaId,
			personaTitle: newImage.personaTitle,
			sessionId: newImage.sessionId,
			participantId: newImage.participantId,
			imageUrl: newImage.imageUrl,
			prompt: newImage.prompt,
			provider: newImage.provider,
			status: newImage.status,
			createdAt: newImage.createdAt || Date.now(),
			updatedAt: newImage.updatedAt || Date.now()
		},
		message: 'Image locked successfully'
	};
});

// Command to edit an existing image
export const editImage = command(EditImageSchema, async (data: EditImageRequest) => {
	const event = getRequestEvent();
	const platform = event?.platform || (globalThis as any).platform || undefined;

	// Use the factory function for consistency
	const generator = createImageGenerator(platform);

	try {
		// Edit the image using nano-banana/edit
		const result = await generator.editImage({
			imageUrl: data.imageUrl,
			editPrompt: data.editPrompt.trim(),
			personaId: data.personaId?.trim(),
			tableId: data.tableId?.trim()
		});

		// Return the edited image URL (temporary from Fal.ai)
		// Will be uploaded to R2 only when locked
		return {
			imageUrl: result.imageUrl,
			provider: result.provider,
			prompt: data.editPrompt,
			metadata: result.metadata
		};
	} catch (err) {
		logger.error('Image edit failed', { component: 'ai.editImage' }, err as any);
		const message = err instanceof Error ? err.message : 'Image edit failed';
		error(500, `Image edit failed: ${message}`);
	}
});

// Streaming generation with progress events
type ProgressEvent = { type: 'progress'; data: { status: string; message: string; progress: number } };
type ResultEvent = { type: 'result'; data: { imageUrl: string; provider: string; prompt: string } };
type ErrorEvent = { type: 'error'; message: string };

export const startGenerationStream = query(
    GenerateImageSchema,
    async function* (data: GenerateImageRequest) {
        const event = getRequestEvent();
        const platform = event?.platform || (globalThis as any).platform || undefined;

        // Ensure Fal client is configured (reuse ImageGenerator config)
        const generator = createImageGenerator(platform);
        if (!generator.isAvailable()) error(503, 'Image generator not available');

        // Simple enhancer (keep in sync with server generator intent)
        const enhancedPrompt = data.prompt;

        const updates: Array<{ status: string; message: string; progress: number }> = [];
        let settled = false;

        const mapStatus = (status: string, queuePosition?: number) => {
            if (status === 'IN_QUEUE') return { progress: Math.max(5, queuePosition ? 20 - queuePosition * 2 : 10), message: 'Queued for generation' };
            if (status === 'IN_PROGRESS') return { progress: 50, message: 'Generating image...' };
            if (status === 'COMPLETED') return { progress: 100, message: 'Done' };
            return { progress: 0, message: 'Starting...' };
        };

        const promise = fal.subscribe('fal-ai/nano-banana', {
            input: {
                prompt: enhancedPrompt,
                num_images: 1,
                output_format: 'jpeg'
            },
            logs: true,
            onQueueUpdate: (update: any) => {
                const qp = 'queue_position' in update ? update.queue_position : undefined;
                const mapped = mapStatus(update.status, qp);
                updates.push({ status: update.status, message: mapped.message, progress: mapped.progress });
            }
        });

        // Pump progress updates periodically until settled
        let idx = 0;
        while (!settled) {
            while (idx < updates.length) {
                const u = updates[idx++];
                yield { type: 'progress', data: { status: u.status, message: u.message, progress: u.progress } };
            }
            const done = await Promise.race([
                promise.then(() => true).catch(() => true),
                new Promise<boolean>((r) => setTimeout(() => r(false), 300))
            ]);
            if (done) settled = true;
        }

        // Final result
        const result = await promise;
        const imageUrl = result?.data?.images?.[0]?.url || (result as any)?.images?.[0]?.url;
        if (!imageUrl) {
            yield { type: 'error', message: 'No image URL in response' };
            return;
        }
        yield { type: 'result', data: { imageUrl, provider: 'fal.ai/nano-banana', prompt: data.prompt } };
    }
);

// Streaming edit with progress events
export const startEditStream = query(
    EditImageSchema,
    async function* (data: EditImageRequest) {
        const event = getRequestEvent();
        const platform = event?.platform || (globalThis as any).platform || undefined;

        const generator = createImageGenerator(platform);
        if (!generator.isAvailable()) error(503, 'Image generator not available');

        const updates: Array<{ status: string; message: string; progress: number }> = [];
        let settled = false;

        const mapStatus = (status: string, queuePosition?: number) => {
            if (status === 'IN_QUEUE') return { progress: Math.max(5, queuePosition ? 20 - queuePosition * 2 : 10), message: 'Queued for edit' };
            if (status === 'IN_PROGRESS') return { progress: 50, message: 'Editing image...' };
            if (status === 'COMPLETED') return { progress: 100, message: 'Done' };
            return { progress: 0, message: 'Starting...' };
        };

        const promise = fal.subscribe('fal-ai/nano-banana/edit', {
            input: {
                prompt: data.editPrompt,
                image_urls: [data.imageUrl],
                num_images: 1,
                output_format: 'jpeg'
            },
            logs: true,
            onQueueUpdate: (update: any) => {
                const qp = 'queue_position' in update ? update.queue_position : undefined;
                const mapped = mapStatus(update.status, qp);
                updates.push({ status: update.status, message: mapped.message, progress: mapped.progress });
            }
        });

        let idx = 0;
        while (!settled) {
            while (idx < updates.length) {
                const u = updates[idx++];
                yield { type: 'progress', data: { status: u.status, message: u.message, progress: u.progress } } as any;
            }
            const done = await Promise.race([
                promise.then(() => true).catch(() => true),
                new Promise<boolean>((r) => setTimeout(() => r(false), 300))
            ]);
            if (done) settled = true;
        }

        const result = await promise;
        const imageUrl = result?.data?.images?.[0]?.url || (result as any)?.images?.[0]?.url;
        if (!imageUrl) {
            yield { type: 'error', message: 'No edited image in response' } as any;
            return;
        }
        yield { type: 'result', data: { imageUrl, provider: 'fal-ai/nano-banana/edit', prompt: data.editPrompt } } as any;
    }
);
