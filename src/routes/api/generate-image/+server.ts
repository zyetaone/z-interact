import { json } from '@sveltejs/kit';
import { imageGenerator } from '$lib/server/ai/image-generator';
import { imageStorage } from '$lib/server/image-storage';

export async function POST({ request }) {
	try {
		const { prompt, personaId, size = '1024x1024', quality = 'standard' } = await request.json();

		if (!prompt) {
			return json({ error: 'Prompt is required' }, { status: 400 });
		}

		console.log(`🎨 Generating image for persona: ${personaId}`);
		console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);

		// Generate image using AI service
		const result = await imageGenerator.generateImage({
			prompt,
			size: size as any,
			quality: quality as any
		});

		console.log(`✅ Image generated with ${result.provider}: ${result.imageUrl.substring(0, 50)}...`);

		// Download and store the image locally for permanent access
		let localImageUrl: string;
		try {
			const filename = `${personaId}-${Date.now()}.jpg`;
			localImageUrl = await imageStorage.downloadAndStoreImage(result.imageUrl, filename);
			console.log(`💾 Image stored locally: ${localImageUrl}`);
		} catch (storageError) {
			console.error('❌ Failed to store image locally:', storageError);
			// Fall back to original URL if local storage fails
			localImageUrl = result.imageUrl;
		}

		return json({
			success: true,
			imageUrl: localImageUrl,
			originalUrl: result.imageUrl,
			provider: result.provider,
			prompt: result.prompt,
			metadata: result.metadata
		});

	} catch (error) {
		console.error('❌ Image generation error:', error);
		return json({
			error: 'Failed to generate image',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
}