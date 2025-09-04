import { getDb } from '$lib/server/db';
import { images } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET(event: RequestEvent) {
	try {
		const { params } = event;
		const imageId = params.imageId;

		if (!imageId) {
			return new Response(JSON.stringify({ error: 'Image ID is required' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const database = getDb();

		// Fetch image from database
		const [imageRecord] = await database
			.select()
			.from(images)
			.where(eq(images.id, imageId))
			.limit(1);

		if (!imageRecord) {
			throw new Error('Image not found');
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
				Location: imageRecord.imageUrl || '',
				'Cache-Control': 'public, max-age=31536000, s-maxage=31536000', // 1 year cache
				'X-Image-Storage': 'r2',
				'X-Image-ID': imageRecord.id,
				'X-Image-Persona': imageRecord.personaId,
				'X-Image-Created': imageRecord.createdAt.toISOString()
			});

			// Content type is determined from R2 metadata or defaults to image/jpeg

			// Add prompt metadata (truncated and sanitized for header safety)
			if (imageRecord.prompt) {
				const sanitizedPrompt = imageRecord.prompt
					.replace(/[\r\n\t]/g, ' ') // Replace newlines and tabs with spaces
					.replace(/[^\x20-\x7E]/g, '') // Remove non-printable ASCII characters
					.trim();

				const truncatedPrompt =
					sanitizedPrompt.length > 100 ? sanitizedPrompt.substring(0, 97) + '...' : sanitizedPrompt;

				if (truncatedPrompt) {
					headers.set('X-Image-Prompt', truncatedPrompt);
				}
			}

			return new Response(null, {
				status: 302,
				headers
			});
		}

		// Fallback to original URL if no base64 data (legacy support)
		if (imageRecord.imageUrl) {
			const headers = new Headers({
				'Cache-Control': 'public, max-age=3600, s-maxage=3600', // 1 hour cache for external URLs
				'X-Image-Storage': 'external',
				'X-Image-ID': imageRecord.id,
				'X-Image-Persona': imageRecord.personaId,
				'X-Image-Created': imageRecord.createdAt.toISOString()
			});

			// Add prompt metadata (truncated and sanitized for header safety)
			if (imageRecord.prompt) {
				const sanitizedPrompt = imageRecord.prompt
					.replace(/[\r\n\t]/g, ' ') // Replace newlines and tabs with spaces
					.replace(/[^\x20-\x7E]/g, '') // Remove non-printable ASCII characters
					.trim();

				const truncatedPrompt =
					sanitizedPrompt.length > 100 ? sanitizedPrompt.substring(0, 97) + '...' : sanitizedPrompt;

				if (truncatedPrompt) {
					headers.set('X-Image-Prompt', truncatedPrompt);
				}
			}

			return new Response(null, {
				status: 302,
				headers
			});
		}

		// No image data available
		return new Response(JSON.stringify({ error: 'No image data available' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Failed to serve image' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
