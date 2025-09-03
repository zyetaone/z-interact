import { imageGenerator } from './src/lib/server/ai/image-generator.js';

async function testOpenAI() {
	try {
		console.log('🧪 Testing OpenAI integration...');

		const result = await imageGenerator.generateImage({
			prompt: 'A modern office workspace with natural light and ergonomic furniture',
			size: '1024x1024',
			quality: 'standard'
		});

		console.log('✅ OpenAI integration successful!');
		console.log('📊 Result:', {
			provider: result.provider,
			imageUrl: result.imageUrl.substring(0, 50) + '...',
			prompt: result.prompt.substring(0, 50) + '...',
			metadata: result.metadata
		});

	} catch (error) {
		console.error('❌ OpenAI integration failed:', error.message);
		process.exit(1);
	}
}

testOpenAI();