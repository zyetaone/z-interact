import { env } from '../env';

export interface ImageGenerationOptions {
	prompt: string;
	size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
	quality?: 'standard' | 'hd';
	style?: 'vivid' | 'natural';
}

export interface ImageGenerationResult {
	imageUrl: string;
	provider: string;
	prompt: string;
	metadata?: Record<string, any>;
}

export class ImageGenerator {
	async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
		const { prompt } = options;

		try {
			return await this.generateWithOpenAI(options);
		} catch (error) {
			// Fallback to placeholder if OpenAI fails
			return this.generateFallback(prompt);
		}
	}

	private async generateWithOpenAI(
		options: ImageGenerationOptions
	): Promise<ImageGenerationResult> {
		if (!env.OPENAI_API_KEY) {
			throw new Error('OpenAI API key not configured');
		}

		const response = await fetch('https://api.openai.com/v1/images/generations', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.OPENAI_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				prompt: options.prompt,
				model: 'dall-e-3',
				size: options.size || '1024x1024',
				quality: options.quality || 'standard',
				style: options.style || 'vivid',
				n: 1
			})
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`OpenAI API error: ${response.status} - ${error}`);
		}

		const data = await response.json();
		const imageUrl = data.data[0].url;

		return {
			imageUrl,
			provider: 'openai',
			prompt: options.prompt,
			metadata: {
				model: 'gpt-image-1',
				size: options.size,
				revisedPrompt: data.data[0].revised_prompt
			}
		};
	}

	private generateFallback(prompt: string): ImageGenerationResult {
		// Fallback to Picsum if OpenAI fails
		const imageUrl = `https://picsum.photos/1024/1024?random=${Date.now()}`;

		return {
			imageUrl,
			provider: 'placeholder',
			prompt,
			metadata: {
				fallback: true,
				reason: 'OpenAI generation failed'
			}
		};
	}
}

export const imageGenerator = new ImageGenerator();
