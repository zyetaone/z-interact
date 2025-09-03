import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { images } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET({ params, platform }) {
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

		// If we have base64 data, serve it directly
		if (imageRecord.imageData && imageRecord.imageMimeType) {
			const imageBuffer = Buffer.from(imageRecord.imageData, 'base64');

			return new Response(imageBuffer, {
				headers: {
					'Content-Type': imageRecord.imageMimeType,
					'Content-Length': imageBuffer.length.toString(),
					'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
				},
			});
		}

		// Fallback to original URL if no base64 data
		if (imageRecord.imageUrl) {
			// Redirect to the stored image URL
			return new Response(null, {
				status: 302,
				headers: {
					Location: imageRecord.imageUrl,
				},
			});
		}

		throw error(404, 'No image data available');

	} catch (err) {
		console.error('Error serving image:', err);
		throw error(500, 'Failed to serve image');
	}
}