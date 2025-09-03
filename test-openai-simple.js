// Simple test for OpenAI integration
async function testOpenAI() {
	try {
		console.log('🧪 Testing OpenAI API key...');

		// Load .env file manually
		const fs = await import('fs');
		const path = await import('path');

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

			process.env.OPENAI_API_KEY = envVars.OPENAI_API_KEY;
		}

		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey) {
			throw new Error('OPENAI_API_KEY not found in .env file');
		}

		console.log('✅ OpenAI API key found:', apiKey.substring(0, 20) + '...');

		// Test API call
		const response = await fetch('https://api.openai.com/v1/models', {
			headers: {
				'Authorization': `Bearer ${apiKey}`,
			}
		});

		if (response.ok) {
			console.log('✅ OpenAI API connection successful!');
			const data = await response.json();
			console.log('📊 Available models:', data.data.length);
		} else {
			console.log('❌ OpenAI API connection failed:', response.status);
		}

	} catch (error) {
		console.error('❌ Test failed:', error.message);
	}
}

testOpenAI();