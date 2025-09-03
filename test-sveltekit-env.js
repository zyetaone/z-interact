// Test SvelteKit-style environment variable access
import fs from 'fs';
import path from 'path';

// Simulate SvelteKit's $env/dynamic/private behavior
function createEnvProxy() {
	const envPath = path.join(process.cwd(), '.env');
	const envVars = {};

	if (fs.existsSync(envPath)) {
		const envContent = fs.readFileSync(envPath, 'utf-8');
		envContent.split('\n').forEach(line => {
			const [key, ...valueParts] = line.split('=');
			if (key && valueParts.length > 0) {
				envVars[key.trim()] = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
			}
		});
	}

	return new Proxy(envVars, {
		get(target, prop) {
			return target[prop] || process.env[prop];
		}
	});
}

const env = createEnvProxy();

console.log('🔍 SvelteKit-style environment access:');
console.log('OPENAI_API_KEY exists:', !!env.OPENAI_API_KEY);
if (env.OPENAI_API_KEY) {
	console.log('OPENAI_API_KEY preview:', env.OPENAI_API_KEY.substring(0, 20) + '...');
	console.log('OPENAI_API_KEY length:', env.OPENAI_API_KEY.length);
}

// Test OpenAI API call
async function testOpenAI() {
	try {
		console.log('🧪 Testing OpenAI API call...');

		const response = await fetch('https://api.openai.com/v1/images/generations', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				prompt: 'A modern office workspace',
				model: 'dall-e-3',
				size: '1024x1024',
				quality: 'standard',
				n: 1,
			}),
		});

		if (response.ok) {
			const data = await response.json();
			console.log('✅ OpenAI API call successful!');
			console.log('📊 Response data:', {
				created: data.created,
				imageCount: data.data?.length || 0,
				imageUrl: data.data?.[0]?.url?.substring(0, 50) + '...' || 'No URL'
			});
		} else {
			const error = await response.text();
			console.log('❌ OpenAI API call failed:', response.status);
			console.log('Error details:', error);
		}

	} catch (error) {
		console.error('❌ Test failed:', error.message);
	}
}

testOpenAI();