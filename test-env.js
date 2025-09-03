// Test environment variable loading
import fs from 'fs';
import path from 'path';

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

const envVars = loadEnv();
console.log('🔍 Environment variables loaded:');
console.log('OPENAI_API_KEY exists:', !!envVars.OPENAI_API_KEY);
if (envVars.OPENAI_API_KEY) {
	console.log('OPENAI_API_KEY preview:', envVars.OPENAI_API_KEY.substring(0, 20) + '...');
	console.log('OPENAI_API_KEY length:', envVars.OPENAI_API_KEY.length);
}