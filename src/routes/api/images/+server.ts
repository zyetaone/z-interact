import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { images } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { NewImage } from '$lib/server/db/schema';
import { sseManager } from '$lib/server/sse-manager';

export async function GET({ platform }) {
	try {
		const database = getDb(platform);
		const allImages = await database.select().from(images).orderBy(desc(images.createdAt));
		return json(allImages);
	} catch (error) {
		console.error('Failed to fetch images:', error);
		return json({ error: 'Failed to fetch images' }, { status: 500 });
	}
}

export async function POST({ request, platform }) {
	try {
		const body = await request.json();

		if (!body.personaId || !body.personaTitle || !body.prompt) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		const database = getDb(platform);

		const newImage: NewImage = {
			id: crypto.randomUUID(),
			personaId: body.personaId,
			personaTitle: body.personaTitle,
			imageUrl: body.imageUrl || null,
			imageData: body.imageData || null,
			imageMimeType: body.imageMimeType || null,
			prompt: body.prompt,
			provider: body.provider || 'placeholder',
			status: body.status || 'completed',
			createdAt: new Date(),
			updatedAt: new Date(),
			sessionId: body.sessionId || null,
			participantId: body.participantId || null
		};

		const [insertedImage] = await database.insert(images).values(newImage).returning();

		// Broadcast the new image to all connected clients
		sseManager.broadcastMessage('image_locked', {
			id: insertedImage.id,
			personaId: insertedImage.personaId,
			personaTitle: insertedImage.personaTitle,
			imageUrl: insertedImage.imageUrl,
			imageData: insertedImage.imageData,
			imageMimeType: insertedImage.imageMimeType,
			prompt: insertedImage.prompt,
			provider: insertedImage.provider,
			createdAt: insertedImage.createdAt
		});

		return json({ success: true, image: insertedImage });

	} catch (error) {
		console.error('Failed to save image:', error);
		return json({ error: 'Failed to save image' }, { status: 500 });
	}
}

// DELETE endpoint to clear all images (for testing/demo purposes)
export async function DELETE({ platform }) {
	try {
		const database = getDb(platform);
		await database.delete(images);
		return json({ success: true, message: 'All images cleared' });
	} catch (error) {
		console.error('Failed to clear images:', error);
		return json({ error: 'Failed to clear images' }, { status: 500 });
	}
}