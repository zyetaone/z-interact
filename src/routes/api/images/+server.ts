import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { images, generateImageRequestSchema, saveImageRequestSchema } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import { unifiedImageGenerator } from '$lib/server/ai/unified-image-generator';
import type { NewImage } from '$lib/server/db/schema';
import type { RequestEvent } from '@sveltejs/kit';
import { parse, ValiError } from 'valibot';
import { getCorsHeaders, createOptionsResponse } from '$lib/server/cors';
import { createR2Storage, R2Storage } from '$lib/server/r2-storage';

export async function GET(event: RequestEvent) {
	const corsHeaders = getCorsHeaders(event.request.headers.get('origin'));
	try {
		const database = getDb(event.platform);
		const allImages = await database.select().from(images).orderBy(desc(images.createdAt));
		return json(allImages, { headers: corsHeaders });
	} catch (error) {
		console.error('Failed to fetch images:', error);
		return json(
			{
				error: 'Failed to fetch images',
				debug: error instanceof Error ? error.message : String(error)
			},
			{ status: 500, headers: corsHeaders }
		);
	}
}

export async function POST(event: RequestEvent) {
	const corsHeaders = getCorsHeaders(event.request.headers.get('origin'));
	try {
		console.log('POST /api/images started');
		const { request, platform } = event;
		console.log('Platform available:', !!platform, 'D1 binding:', !!platform?.env?.z_interact_db);

		const body = await request.json();
		console.log('Request body parsed:', {
			...body,
			prompt: body.prompt ? '[truncated]' : undefined
		});

		// Check if this is an image generation request or just saving an existing image
		const isGenerationRequest = body.prompt && body.personaId && !body.imageUrl;
		const isSaveRequest = body.personaId && body.imageUrl && body.prompt;

		// Validate request using appropriate Valibot schema
		let validatedBody;
		try {
			if (isGenerationRequest) {
				validatedBody = parse(generateImageRequestSchema, body);
			} else if (isSaveRequest) {
				validatedBody = parse(saveImageRequestSchema, body);
			} else {
				return json(
					{
						error:
							'Invalid request. Provide either (prompt + personaId) for generation or (personaId + imageUrl + prompt) for saving'
					},
					{ status: 400 }
				);
			}
		} catch (error) {
			if (error instanceof ValiError) {
				return json(
					{
						error: 'Validation failed',
						details: error.issues.map((issue) => issue.message)
					},
					{ status: 400 }
				);
			}
			throw error;
		}

		let imageUrl: string | undefined =
			'imageUrl' in validatedBody ? (validatedBody.imageUrl as string) : undefined;

		// If this is a generation request, generate the image first
		if (isGenerationRequest) {
			try {
				console.log('Generating image with Unified Generator...');
				const result = await unifiedImageGenerator.generateImage({
					prompt: validatedBody.prompt,
					mode: 'legacy', // Use legacy API for gpt-image-1
					model: 'gpt-image-1', // Now verified! $0.01 per image
					size: '1024x1024', // Square format - most cost effective
					quality: 'low' // Low quality for $0.01 per image
				});

				console.log('Image generated:', {
					provider: result.provider,
					hasBase64: !!result.imageBase64,
					hasUrl: !!result.imageUrl,
					model: result.metadata?.model
				});

				// Get image URL (either provided or convert from base64)
				let imageUrl: string;
				if (result.imageUrl) {
					imageUrl = result.imageUrl;
				} else if (result.imageBase64) {
					imageUrl = `data:image/png;base64,${result.imageBase64}`;
				} else {
					throw new Error('No image data returned from generator');
				}

				// Upload to R2 storage for permanent storage
				const r2Storage = createR2Storage(platform);
				const filename = R2Storage.generateFilename(validatedBody.personaId, 'png');

				console.log('Uploading to R2 storage...');
				const uploadResult = result.imageBase64
					? await r2Storage.uploadImageFromBase64(result.imageBase64, filename)
					: await r2Storage.uploadImageFromUrl(imageUrl, filename);

				if (uploadResult.success && uploadResult.url) {
					imageUrl = uploadResult.url;
					console.log('Image uploaded to R2 successfully:', imageUrl);
				} else {
					console.warn('R2 upload failed, using data URL:', uploadResult.error);
					// imageUrl already set to data URL above
				}
			} catch (error) {
				console.error('Failed to generate image:', error);
				return json(
					{
						error: 'Failed to generate image',
						debug: error instanceof Error ? error.message : String(error)
					},
					{ status: 500, headers: corsHeaders }
				);
			}
		}

		// Save image to database
		console.log('Getting database connection...');
		const database = getDb(platform);
		console.log('Database connection obtained');

		const newImage: NewImage = {
			id: crypto.randomUUID(),
			tableId: validatedBody.tableId || null,
			personaId: validatedBody.personaId,
			personaTitle: validatedBody.personaId
				.replace('-', ' ')
				.replace(/\b\w/g, (l) => l.toUpperCase()), // Convert persona ID to title format
			sessionId: null,
			participantId: null,
			imageUrl: imageUrl as string,
			prompt: validatedBody.prompt,
			provider: 'openai',
			status: 'completed',
			createdAt: new Date(),
			updatedAt: new Date()
			// migrationStatus: 'completed',  // Column may not exist in Cloudflare D1
			// migratedAt: null
		};

		console.log('Inserting image into database...');
		await database.insert(images).values(newImage);
		console.log('Image inserted successfully');

		// Return format that matches the expected interface
		if (isGenerationRequest) {
			// Return format expected by generateImage calls
			return json(
				{
					imageUrl: imageUrl as string,
					personaId: body.personaId,
					prompt: body.prompt
				},
				{ headers: corsHeaders }
			);
		} else {
			// For save requests, also try to upload to R2 for persistence
			if (
				isSaveRequest &&
				imageUrl &&
				typeof imageUrl === 'string' &&
				!imageUrl.includes(platform?.env?.R2_PUBLIC_URL || '')
			) {
				try {
					const r2Storage = createR2Storage(platform);
					const filename = R2Storage.generateFilename(validatedBody.personaId, 'png');
					const uploadResult = await r2Storage.uploadImageFromUrl(imageUrl, filename);

					if (uploadResult.success && uploadResult.url) {
						console.log('Saved image also uploaded to R2:', uploadResult.url);
						// Note: We don't update the imageUrl here since the image is already saved to DB
						// Future enhancement: update the DB record with the R2 URL
					}
				} catch (error) {
					console.warn('Failed to upload saved image to R2:', error);
					// Continue with the original URL - this is not a critical failure
				}
			}

			// Return format expected by lockImage calls
			return json({ image: newImage }, { headers: corsHeaders });
		}
	} catch (error) {
		console.error('Failed to process image request:', error);
		return json(
			{
				error: 'Failed to process image request',
				debug: error instanceof Error ? error.message : String(error),
				platform: !!event.platform,
				hasDb: !!event.platform?.env?.z_interact_db
			},
			{ status: 500, headers: corsHeaders }
		);
	}
}

export async function DELETE(event: RequestEvent) {
	const corsHeaders = getCorsHeaders(event.request.headers.get('origin'));
	try {
		console.log('Clearing all images from database and R2 storage...');
		const database = getDb(event.platform);

		// First, get all images to delete from R2 storage
		const allImages = await database.select().from(images);
		console.log(`Found ${allImages.length} images to delete`);

		// Delete images from R2 storage
		if (allImages.length > 0) {
			const r2Storage = createR2Storage(event.platform);
			let deletedFromR2 = 0;

			for (const image of allImages) {
				// Check if this is an R2 URL that we should delete
				const r2PublicUrl = event.platform?.env?.R2_PUBLIC_URL || '';
				if (image.imageUrl && r2PublicUrl && image.imageUrl.includes(r2PublicUrl)) {
					try {
						// Extract filename from URL
						const urlParts = image.imageUrl.split('/');
						const filename = urlParts.slice(-3).join('/'); // images/persona/filename.png

						const deleted = await r2Storage.deleteImage(filename);
						if (deleted) {
							deletedFromR2++;
						}
					} catch (error) {
						console.warn(`Failed to delete image from R2: ${image.imageUrl}`, error);
					}
				}
			}

			console.log(`Deleted ${deletedFromR2} images from R2 storage`);
		}

		// Then delete all records from database
		await database.delete(images);
		console.log('All image records deleted from database');

		return json(
			{
				message: 'All images cleared',
				deletedFromDatabase: allImages.length,
				deletedFromR2: allImages.filter(
					(img) =>
						img.imageUrl &&
						event.platform?.env?.R2_PUBLIC_URL &&
						img.imageUrl.includes(event.platform.env.R2_PUBLIC_URL)
				).length
			},
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Failed to clear images:', error);
		return json(
			{
				error: 'Failed to clear images',
				debug: error instanceof Error ? error.message : String(error)
			},
			{ status: 500, headers: corsHeaders }
		);
	}
}

// Handle preflight OPTIONS requests
export async function OPTIONS(event: RequestEvent) {
	return createOptionsResponse(event.request.headers.get('origin'));
}
