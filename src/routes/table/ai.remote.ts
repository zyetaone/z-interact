import { command, getRequestEvent, query } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { getDb } from '$lib/server/db';
import { images, type NewImage } from '$lib/server/db/schema';
import { createImageGenerator } from '$lib/server/ai/image-generator';
import { getPersonaById } from '$lib/config.svelte';
import { listImages } from '../gallery/gallery.remote';
import { and, eq } from 'drizzle-orm';

// Validation schemas
const GenerateImageSchema = v.object({
	prompt: v.string(),
	personaId: v.string(),
	tableId: v.optional(v.string())
});

const LockImageSchema = v.object({
	personaId: v.string(),
	imageUrl: v.string(),
	prompt: v.string(),
	tableId: v.optional(v.string())
});

// Simple async command to generate image (no fake streaming)
export const generateImage = query(
	GenerateImageSchema,
	async (data: { prompt: string; personaId: string; tableId?: string }) => {
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
				imageUrl: result.imageUrl,
				provider: result.provider,
				prompt: result.prompt
			};
		} catch (err) {
			console.error('Image generation failed:', err);
			error(500, 'Image generation failed');
		}
	}
);

// Command to lock an image (saves locked status to database)
export const lockImage = command(
	LockImageSchema,
	async (data: { personaId: string; imageUrl: string; prompt: string; tableId?: string }) => {
		const event = getRequestEvent();
		const platform = event?.platform || (globalThis as any).platform || undefined;
		const database = getDb(platform);

		// Validate that imageUrl is not empty and is a valid URL or data URL
		if (!data.imageUrl || data.imageUrl.trim() === '') {
			error(400, 'No image URL provided - cannot lock without an image');
		}

		// Check if it's a valid URL or data URL
		const url = data.imageUrl.trim();
		const isValidUrl =
			url.startsWith('http://') ||
			url.startsWith('https://') ||
			url.startsWith('data:') ||
			url.startsWith('blob:');
		if (!isValidUrl) {
			error(400, 'Invalid image URL format');
		}

		const personaTitle =
			getPersonaById(data.personaId)?.title ||
			data.personaId
				.trim()
				.replace('-', ' ')
				.replace(/\b\w/g, (l: string) => l.toUpperCase());

		// Check if an image already exists for this table/persona to prevent duplicates
		if (data.tableId) {
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
				};
			}
		}

		let finalImageUrl = url;

		// If the image is from Fal.ai (temporary URL), upload to R2 for permanent storage
		if (url.startsWith('https://fal.') || url.includes('fal.ai') || url.includes('fal.run')) {
			try {
				const { uploadImageUrl } = await import('../gallery/gallery.remote');
				const uploadResult = await uploadImageUrl({
					imageUrl: url,
					personaId: data.personaId.trim(),
					tableId: data.tableId?.trim(),
					prompt: data.prompt.trim()
				});

				if (uploadResult && uploadResult.success && uploadResult.url) {
					finalImageUrl = uploadResult.url;
				}
			} catch (error) {
				// Log error but continue with the original URL
				console.error('Failed to upload to R2 during lock:', error);
			}
		}

		const newImage: NewImage = {
			id: crypto.randomUUID(),
			tableId: data.tableId?.trim() || null,
			personaId: data.personaId.trim(),
			personaTitle,
			sessionId: null,
			participantId: null,
			imageUrl: finalImageUrl,
			prompt: data.prompt.trim(),
			provider: 'fal.ai/nano-banana',
			status: 'locked',
			createdAt: Date.now(),
			updatedAt: Date.now()
		};

		await database.insert(images).values(newImage);

		// Trigger refresh for all active gallery queries
		// This will push updates to all connected streaming clients
		// Use setTimeout to ensure this doesn't interfere with return serialization
		setTimeout(() => {
			listImages({})
				.refresh()
				.catch(() => {
					// Ignore errors from refresh - it's fire-and-forget
				});
		}, 0);

		// Note: The streaming query (subscribeToGalleryUpdates) will detect this change
		// on its next iteration and push it to all connected clients automatically

		return {
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
		};
	}
);
