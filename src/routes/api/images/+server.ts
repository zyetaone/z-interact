import { getDb } from '$lib/server/db';
import { images } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { NewImage } from '$lib/server/db/schema';
import { withApiHandler, Validation, ApiResponse, HTTP_STATUS } from '$lib/server/api-utils';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET(event: RequestEvent) {
	return withApiHandler(
		event,
		async () => {
			const database = getDb();
			const allImages = await database.select().from(images).orderBy(desc(images.createdAt));

			console.log(`✅ Successfully fetched ${allImages.length} images`);
			return allImages;
		},
		'get-images'
	);
}

export async function POST(event: RequestEvent) {
	return withApiHandler(
		event,
		async () => {
			const { request, platform } = event;
			const body = await request.json();

			// Validate required fields
			Validation.required(body.tableId, 'tableId');
			Validation.required(body.personaId, 'personaId');
			Validation.required(body.personaTitle, 'personaTitle');
			Validation.required(body.prompt, 'prompt');

			const database = getDb();

			const newImage: NewImage = {
				id: crypto.randomUUID(),
				tableId: body.tableId,
				personaId: body.personaId,
				personaTitle: body.personaTitle,
				imageUrl: body.imageUrl || null,
				prompt: body.prompt,
				provider: body.provider || 'placeholder',
				status: body.status || 'completed',
				createdAt: new Date(),
				updatedAt: new Date(),
				sessionId: body.sessionId || null,
				participantId: body.participantId || null
			};

			console.log('🔍 Attempting to insert image:', newImage.id);
			await database.insert(images).values(newImage);

			console.log(`✅ Image successfully saved to database: ${newImage.id}`);
			return { image: newImage };
		},
		'create-image'
	);
}

// DELETE endpoint to clear all images (for testing/demo purposes)
export async function DELETE(event: RequestEvent) {
	return withApiHandler(
		event,
		async () => {
			const database = getDb();
			await database.delete(images);
			console.log('✅ All images cleared successfully');
			return { message: 'All images cleared' };
		},
		'clear-images'
	);
}
