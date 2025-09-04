import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { images, generateImageRequestSchema, saveImageRequestSchema } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import { imageGenerator } from '$lib/server/ai/image-generator';
import type { NewImage } from '$lib/server/db/schema';
import type { RequestEvent } from '@sveltejs/kit';
import { parse, ValiError } from 'valibot';

export async function GET(event: RequestEvent) {
	try {
		const database = getDb(event.platform);
		const allImages = await database.select().from(images).orderBy(desc(images.createdAt));
		return json(allImages);
	} catch (error) {
		return json({ error: 'Failed to fetch images' }, { status: 500 });
	}
}

export async function POST(event: RequestEvent) {
	try {
		const { request, platform } = event;
		const body = await request.json();

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
				return json({ error: 'Failed to generate image' }, { status: 500 });
			}
		}

		// Save image to database
		const database = getDb(platform);

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
			updatedAt: new Date(),
			r2Key: null,
			migrationStatus: 'completed',
			migratedAt: null
		};

		await database.insert(images).values(newImage);

		// Return format that matches the expected interface
		if (isGenerationRequest) {
			// Return format expected by generateImage calls
			return json({
				imageUrl: imageUrl as string,
				personaId: body.personaId,
				prompt: body.prompt
			});
		} else {
			// Return format expected by lockImage calls
			return json({ image: newImage });
		}
	} catch (error) {
		return json({ error: 'Failed to process image request' }, { status: 500 });
	}
}

export async function DELETE(event: RequestEvent) {
	try {
		const database = getDb(event.platform);
		await database.delete(images);
		return json({ message: 'All images cleared' });
	} catch (error) {
		return json({ error: 'Failed to clear images' }, { status: 500 });
	}
}
