import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { images } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET({ params, platform, request }) {
	try {
		const { imageId } = params;

		if (!imageId) {
			throw error(400, 'Image ID is required');
		}

		const database = getDb(platform);

		// Fetch image from database
		const [imageRecord] = await database
			.select()
			.from(images)
			.where(eq(images.id, imageId))
			.limit(1);

		if (!imageRecord) {
			throw error(404, 'Image not found');
		}

		// Check if image is stored in R2 (has R2 URL)
		const isR2Image =
			imageRecord.imageUrl &&
			(imageRecord.imageUrl.includes('r2.') ||
				imageRecord.imageUrl.includes('cloudflarestorage.com') ||
				imageRecord.imageUrl.includes('r2.cloudflarestorage.com'));

		if (isR2Image) {
			// Redirect to R2 URL with proper cache headers
			const headers = new Headers({
				Location: imageRecord.imageUrl,
				'Cache-Control': 'public, max-age=31536000, s-maxage=31536000', // 1 year cache
				'X-Image-Storage': 'r2',
				'X-Image-ID': imageRecord.id,
				'X-Image-Persona': imageRecord.personaId,
				'X-Image-Provider': imageRecord.provider,
				'X-Image-Status': imageRecord.status,
				'X-Image-Created': imageRecord.createdAt.toISOString()
			});

			// Add content type if available
			if (imageRecord.imageMimeType) {
				headers.set('X-Image-Content-Type', imageRecord.imageMimeType);
			}

			// Add prompt metadata (truncated for header safety)
			if (imageRecord.prompt) {
				const truncatedPrompt =
					imageRecord.prompt.length > 100
						? imageRecord.prompt.substring(0, 97) + '...'
						: imageRecord.prompt;
				headers.set('X-Image-Prompt', truncatedPrompt);
			}

			return new Response(null, {
				status: 302,
				headers
			});
		}

		// Handle base64 images (backward compatibility)
		if (imageRecord.imageData && imageRecord.imageMimeType) {
			const imageBuffer = Buffer.from(imageRecord.imageData, 'base64');

			const headers = new Headers({
				'Content-Type': imageRecord.imageMimeType,
				'Content-Length': imageBuffer.length.toString(),
				'Cache-Control': 'public, max-age=31536000, s-maxage=31536000', // 1 year cache
				'X-Image-Storage': 'base64',
				'X-Image-ID': imageRecord.id,
				'X-Image-Persona': imageRecord.personaId,
				'X-Image-Provider': imageRecord.provider,
				'X-Image-Status': imageRecord.status,
				'X-Image-Created': imageRecord.createdAt.toISOString()
			});

			// Add prompt metadata (truncated for header safety)
			if (imageRecord.prompt) {
				const truncatedPrompt =
					imageRecord.prompt.length > 100
						? imageRecord.prompt.substring(0, 97) + '...'
						: imageRecord.prompt;
				headers.set('X-Image-Prompt', truncatedPrompt);
			}

			return new Response(imageBuffer, {
				headers
			});
		}

		// Fallback to original URL if no base64 data (legacy support)
		if (imageRecord.imageUrl) {
			const headers = new Headers({
				Location: imageRecord.imageUrl,
				'Cache-Control': 'public, max-age=3600, s-maxage=3600', // 1 hour cache for external URLs
				'X-Image-Storage': 'external',
				'X-Image-ID': imageRecord.id,
				'X-Image-Persona': imageRecord.personaId,
				'X-Image-Provider': imageRecord.provider,
				'X-Image-Status': imageRecord.status,
				'X-Image-Created': imageRecord.createdAt.toISOString()
			});

			// Add prompt metadata (truncated for header safety)
			if (imageRecord.prompt) {
				const truncatedPrompt =
					imageRecord.prompt.length > 100
						? imageRecord.prompt.substring(0, 97) + '...'
						: imageRecord.prompt;
				headers.set('X-Image-Prompt', truncatedPrompt);
			}

			return new Response(null, {
				status: 302,
				headers
			});
		}

		// No image data available
		throw error(404, 'No image data available');
	} catch (err) {
		console.error('Error serving image:', err);

		// Handle different error types
		if (err instanceof Response) {
			// Already a SvelteKit error response
			throw err;
		}

		// Handle database or other errors
		if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
			if (err.message.includes('not found')) {
				throw error(404, 'Image not found');
			}

			// Handle R2 or storage-related errors
			if (err.message.includes('R2') || err.message.includes('storage')) {
				throw error(503, 'Storage service temporarily unavailable');
			}
		}

		// Generic server error
		throw error(500, 'Failed to serve image');
	}
}
