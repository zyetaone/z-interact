import { getDb } from '$lib/server/db';
import { images } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';
import { getCorsHeaders, createOptionsResponse } from '$lib/server/cors';
import { createR2Storage } from '$lib/server/r2-storage';
import { json } from '@sveltejs/kit';

export async function GET(event: RequestEvent) {
	const corsHeaders = getCorsHeaders(event.request.headers.get('origin'));
	try {
		const { params } = event;
		const imageId = params.imageId;

		if (!imageId) {
			return new Response(JSON.stringify({ error: 'Image ID is required' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json', ...corsHeaders }
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
				'X-Image-Created': imageRecord.createdAt.toISOString(),
				...corsHeaders
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
				'X-Image-Created': imageRecord.createdAt.toISOString(),
				...corsHeaders
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
			headers: { 'Content-Type': 'application/json', ...corsHeaders }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Failed to serve image' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json', ...corsHeaders }
		});
	}
}

export async function DELETE(event: RequestEvent) {
	const corsHeaders = getCorsHeaders(event.request.headers.get('origin'));
	try {
		const { params } = event;
		const imageId = params.imageId;

		if (!imageId) {
			return json({ error: 'Image ID is required' }, { 
				status: 400, 
				headers: corsHeaders 
			});
		}

		console.log(`Deleting image: ${imageId}`);
		const database = getDb(event.platform);

		// First, get the image record to check if it's stored in R2
		const [imageRecord] = await database
			.select()
			.from(images)
			.where(eq(images.id, imageId))
			.limit(1);

		if (!imageRecord) {
			return json({ error: 'Image not found' }, { 
				status: 404, 
				headers: corsHeaders 
			});
		}

		// Delete from R2 storage if it's an R2 URL
		let deletedFromR2 = false;
		const r2PublicUrl = event.platform?.env?.R2_PUBLIC_URL || '';
		
		if (imageRecord.imageUrl && r2PublicUrl && imageRecord.imageUrl.includes(r2PublicUrl)) {
			try {
				console.log('Deleting from R2 storage:', imageRecord.imageUrl);
				const r2Storage = createR2Storage(event.platform);
				
				// Extract filename from URL
				const urlParts = imageRecord.imageUrl.split('/');
				const filename = urlParts.slice(-3).join('/'); // images/persona/filename.png
				
				deletedFromR2 = await r2Storage.deleteImage(filename);
				console.log(`R2 deletion result: ${deletedFromR2}`);
			} catch (error) {
				console.warn('Failed to delete from R2 storage:', error);
				// Continue with database deletion even if R2 fails
			}
		}

		// Delete from database
		const deleteResult = await database
			.delete(images)
			.where(eq(images.id, imageId));

		console.log('Image deleted from database');

		return json({ 
			message: 'Image deleted successfully',
			id: imageId,
			deletedFromR2,
			deletedFromDatabase: true
		}, { headers: corsHeaders });

	} catch (error) {
		console.error('Failed to delete image:', error);
		return json({ 
			error: 'Failed to delete image',
			debug: error instanceof Error ? error.message : String(error)
		}, { status: 500, headers: corsHeaders });
	}
}

// Handle preflight OPTIONS requests
export async function OPTIONS(event: RequestEvent) {
	return createOptionsResponse(event.request.headers.get('origin'));
}
