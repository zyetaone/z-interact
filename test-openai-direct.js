// Direct test of OpenAI image generation
import { ImageGenerator } from './src/lib/server/ai/image-generator.js';

async function testDirect() {
	try {
		console.log('🧪 Testing OpenAI image generation directly...');

		const generator = new ImageGenerator();
		const result = await generator.generateImage({
			prompt: 'A modern office workspace for a CEO',
			size: '1024x1024',
			quality: 'standard'
		});

		console.log('✅ Image generated successfully!');
		console.log('📊 Result:', {
			provider: result.provider,
			imageUrl: result.imageUrl.substring(0, 50) + '...',
			prompt: result.prompt.substring(0, 30) + '...'
		});

	} catch (error) {
		console.error('❌ Direct test failed:', error.message);
		console.error('Stack:', error.stack);
	}
}

testDirect();