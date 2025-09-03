// Direct test of image generation without API
import fs from 'fs';
import path from 'path';

// Load environment variables
function loadEnv() {
	try {
		const envPath = path.join(process.cwd(), '.env');
		if (fs.existsSync(envPath)) {
			const envContent = fs.readFileSync(envPath, 'utf-8');
			const envVars = envContent.split('\n').reduce((acc, line) => {
				const [key, ...valueParts] = line.split('=');
				if (key && valueParts.length > 0) {
					acc[key.trim()] = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
				}
				return acc;
			}, {});

			return envVars;
		}
	} catch (error) {
		console.error('Error loading .env:', error);
	}
	return {};
}

async function testDirectGeneration() {
	try {
		console.log('🧪 Testing direct OpenAI image generation...');

		const envVars = loadEnv();
		const apiKey = envVars.OPENAI_API_KEY;

		if (!apiKey) {
			throw new Error('OPENAI_API_KEY not found in .env file');
		}

		console.log('✅ OpenAI API key loaded');

		// Test the actual image generation
		const response = await fetch('https://api.openai.com/v1/images/generations', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				prompt: 'A modern office workspace designed for a CEO in their 60s, professional and elegant',
				model: 'dall-e-3',
				size: '1024x1024',
				quality: 'standard',
				n: 1,
			}),
		});

		if (response.ok) {
			const data = await response.json();
			console.log('✅ Image generation successful!');
			console.log('📊 Response details:');
			console.log('   - Created:', new Date(data.created * 1000).toISOString());
			console.log('   - Image count:', data.data?.length || 0);
			console.log('   - Image URL:', data.data?.[0]?.url ? 'Available' : 'Not available');
			console.log('   - Revised prompt:', data.data?.[0]?.revised_prompt ? 'Yes' : 'No');

			if (data.data?.[0]?.url) {
				console.log('🎨 Generated image URL:', data.data[0].url.substring(0, 60) + '...');
			}
		} else {
			const error = await response.text();
			console.log('❌ OpenAI API call failed:', response.status);
			console.log('Error details:', error);
		}

	} catch (error) {
		console.error('❌ Direct test failed:', error.message);
		console.error('Stack:', error.stack);
	}
}

testDirectGeneration();