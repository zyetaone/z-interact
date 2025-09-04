import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { images, generateImageRequestSchema, saveImageRequestSchema } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import { imageGenerator } from '$lib/server/ai/image-generator';
import type { NewImage } from '$lib/server/db/schema';
import type { RequestEvent } from '@sveltejs/kit';
import { parse, ValiError } from 'valibot';
import { getCorsHeaders, createOptionsResponse } from '$lib/server/cors';

export async function GET(event: RequestEvent) {
	const corsHeaders = getCorsHeaders(event.request.headers.get('origin'));
	try {
		const database = getDb(event.platform);
		const allImages = await database.select().from(images).orderBy(desc(images.createdAt));
		return json(allImages, { headers: corsHeaders });
	} catch (error) {
		console.error('Failed to fetch images:', error);
		return json({ 
			error: 'Failed to fetch images', 
			debug: error instanceof Error ? error.message : String(error) 
		}, { status: 500, headers: corsHeaders });
	}
}

export async function POST(event: RequestEvent) {
	const corsHeaders = getCorsHeaders(event.request.headers.get('origin'));
	try {
		console.log('POST /api/images started');
		const { request, platform } = event;
		console.log('Platform available:', !!platform, 'D1 binding:', !!platform?.env?.z_interact_db);
		
		const body = await request.json();
		console.log('Request body parsed:', { ...body, prompt: body.prompt ? '[truncated]' : undefined });

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

		let imageUrl = 'imageUrl' in validatedBody ? validatedBody.imageUrl : undefined;

		// If this is a generation request, generate the image first
		if (isGenerationRequest) {
			try {
				const result = await imageGenerator.generateImage({
					prompt: validatedBody.prompt,
					size: '1024x1024',
					quality: 'standard'
				});
				imageUrl = result.imageUrl;
			} catch (error) {
				console.error('Failed to generate image:', error);
				return json({ 
					error: 'Failed to generate image',
					debug: error instanceof Error ? error.message : String(error)
				}, { status: 500, headers: corsHeaders });
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
			personaTitle: null,
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
			return json({
				imageUrl: imageUrl as string,
				personaId: body.personaId,
				prompt: body.prompt
			}, { headers: corsHeaders });
		} else {
			// Return format expected by lockImage calls
			return json({ image: newImage }, { headers: corsHeaders });
		}
	} catch (error) {
		console.error('Failed to process image request:', error);
		return json({ 
			error: 'Failed to process image request',
			debug: error instanceof Error ? error.message : String(error),
			platform: !!event.platform,
			hasDb: !!(event.platform?.env?.z_interact_db)
		}, { status: 500, headers: corsHeaders });
	}
}

export async function DELETE(event: RequestEvent) {
	const corsHeaders = getCorsHeaders(event.request.headers.get('origin'));
	try {
		const database = getDb(event.platform);
		await database.delete(images);
		return json({ message: 'All images cleared' }, { headers: corsHeaders });
	} catch (error) {
		console.error('Failed to clear images:', error);
		return json({ 
			error: 'Failed to clear images',
			debug: error instanceof Error ? error.message : String(error)
		}, { status: 500, headers: corsHeaders });
	}
}

// Handle preflight OPTIONS requests
export async function OPTIONS(event: RequestEvent) {
	return createOptionsResponse(event.request.headers.get('origin'));
}
