import { json } from '@sveltejs/kit';
import { OPENAI_API_KEY } from '$lib/server/env';

export async function GET() {
	return json({
		env: {
			OPENAI_API_KEY: OPENAI_API_KEY ? '***' + OPENAI_API_KEY.slice(-4) : null,
			hasOpenAI: !!OPENAI_API_KEY,
			openAILength: OPENAI_API_KEY?.length || 0
		},
		processEnv: {
			OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '***' + process.env.OPENAI_API_KEY.slice(-4) : null,
			hasOpenAI: !!process.env.OPENAI_API_KEY,
			openAILength: process.env.OPENAI_API_KEY?.length || 0
		}
	});
}