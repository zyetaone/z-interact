import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { images } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { NewImage } from '$lib/server/db/schema';

export async function GET({ platform }) {
	try {
		// Debug logging for production issues
		console.log('🔍 GET /api/images - Platform object:', platform ? 'exists' : 'missing');
		console.log('🔍 D1 binding available:', !!platform?.env?.z_interact_db);
		
		const database = getDb(platform);
		const allImages = await database.select().from(images).orderBy(desc(images.createdAt));
		
		console.log(`✅ Successfully fetched ${allImages.length} images`);
		return json(allImages);
	} catch (error) {
		console.error('❌ Failed to fetch images:', error);
		console.error('❌ Error details:', {
			message: error.message,
			stack: error.stack,
			platform: platform ? 'exists' : 'missing',
			d1Binding: !!platform?.env?.z_interact_db
		});
		return json({ error: 'Failed to fetch images' }, { status: 500 });
	}
}

export async function POST({ request, platform }) {
	try {
		// Debug logging for production issues
		console.log('🔍 POST /api/images - Platform object:', platform ? 'exists' : 'missing');
		console.log('🔍 D1 binding available:', !!platform?.env?.z_interact_db);
		
		// Early validation of platform and D1 binding
		if (!platform?.env?.z_interact_db) {
			console.error('❌ D1 binding not found in platform object');
			console.error('❌ Platform details:', {
				platform: !!platform,
				env: !!platform?.env,
				envKeys: platform?.env ? Object.keys(platform.env) : 'no env'
			});
			return json({ 
				error: 'Database connection not available - D1 binding missing',
				details: 'The application cannot connect to the database. Please check Cloudflare Pages D1 bindings.'
			}, { status: 503 });
		}

		const body = await request.json();
		console.log('🔍 Request body received:', { 
			hasTableId: !!body.tableId,
			hasPersonaId: !!body.personaId,
			hasPersonaTitle: !!body.personaTitle,
			hasPrompt: !!body.prompt,
			hasImageUrl: !!body.imageUrl
		});

		if (!body.tableId || !body.personaId || !body.personaTitle || !body.prompt) {
			console.error('❌ Missing required fields in request body');
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		const database = getDb(platform);

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
		return json({ success: true, image: newImage });

	} catch (error) {
		console.error('❌ Failed to save image:', error);
		console.error('❌ Insert error details:', {
			message: error.message,
			stack: error.stack,
			name: error.name,
			cause: error.cause,
			platform: platform ? 'exists' : 'missing',
			d1Binding: !!platform?.env?.z_interact_db,
			imageId: newImage?.id
		});
		
		// Return more specific error message
		const errorMessage = error.message.includes('no such table') 
			? 'Database table not found - migrations may not be applied'
			: error.message.includes('binding') 
			? 'Database connection error - D1 binding issue'
			: 'Failed to save image to database';
			
		return json({ 
			error: errorMessage,
			details: error.message 
		}, { status: 500 });
	}
}

// DELETE endpoint to clear all images (for testing/demo purposes)
export async function DELETE({ platform }) {
	try {
		console.log('🔍 DELETE /api/images - Platform object:', platform ? 'exists' : 'missing');
		console.log('🔍 D1 binding available:', !!platform?.env?.z_interact_db);
		
		if (!platform?.env?.z_interact_db) {
			console.error('❌ D1 binding not found for DELETE operation');
			return json({ 
				error: 'Database connection not available - D1 binding missing' 
			}, { status: 503 });
		}

		const database = getDb(platform);
		await database.delete(images);
		console.log('✅ All images cleared successfully');
		return json({ success: true, message: 'All images cleared' });
	} catch (error) {
		console.error('❌ Failed to clear images:', error);
		console.error('❌ Delete error details:', {
			message: error.message,
			stack: error.stack,
			platform: platform ? 'exists' : 'missing',
			d1Binding: !!platform?.env?.z_interact_db
		});
		return json({ error: 'Failed to clear images' }, { status: 500 });
	}
}