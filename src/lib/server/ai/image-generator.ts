import OpenAI from 'openai';
import { env } from '../env';

export interface ImageGenerationOptions {
	prompt: string;
	size?: '1024x1024' | '1792x1024' | '1024x1792';
	quality?: 'standard' | 'hd';
	response_format?: 'url' | 'b64_json';
	stream?: boolean;
}

export interface ImageGenerationResult {
	imageUrl?: string;
	b64_json?: string;
	provider: string;
	prompt: string;
	revisedPrompt?: string;
	metadata?: Record<string, any>;
}

export interface StreamEvent {
	type: 'partial_image' | 'completed' | 'error';
	b64_json?: string;
	partial_image_index?: number;
	usage?: {
		total_tokens: number;
		input_tokens: number;
		output_tokens: number;
	};
	error?: string;
}

export class ImageGenerator {
	private client: OpenAI | null = null;

	constructor() {
		if (env.OPENAI_API_KEY) {
			this.client = new OpenAI({
				apiKey: env.OPENAI_API_KEY
			});
		}
	}

	async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
		try {
			// Use streaming if requested
			if (options.stream) {
				throw new Error('Use generateImageStream() for streaming generation');
			}
			
			return await this.generateStandard(options);
		} catch (error) {
			console.error('Image generation failed:', error);
			// Fallback to placeholder if OpenAI fails
			return this.generateFallback(options.prompt);
		}
	}

	async *generateImageStream(options: ImageGenerationOptions): AsyncGenerator<StreamEvent> {
		if (!this.client) {
			yield {
				type: 'error',
				error: 'OpenAI client not configured'
			};
			return;
		}

		try {
			const stream = await this.client.images.generate({
				model: 'dall-e-3',
				prompt: options.prompt,
				n: 1,
				size: options.size || '1792x1024', // Landscape format for workspaces
				quality: options.quality || 'hd',
				response_format: 'b64_json', // Required for streaming
				stream: true
			} as any); // Type assertion needed as SDK types may not be updated

			for await (const event of stream) {
				if (event.type === 'image_generation.partial_image') {
					yield {
						type: 'partial_image',
						b64_json: event.b64_json,
						partial_image_index: event.partial_image_index
					};
				} else if (event.type === 'image_generation.completed') {
					yield {
						type: 'completed',
						b64_json: event.b64_json,
						usage: event.usage
					};
				}
			}
		} catch (error) {
			console.error('Streaming generation failed:', error);
			yield {
				type: 'error',
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	private async generateStandard(
		options: ImageGenerationOptions
	): Promise<ImageGenerationResult> {
		if (!this.client) {
			throw new Error('OpenAI API key not configured');
		}

		const response = await this.client.images.generate({
			model: 'dall-e-3',
			prompt: options.prompt,
			n: 1,
			size: options.size || '1792x1024', // Landscape format for workspaces
			quality: options.quality || 'hd',
			response_format: options.response_format || 'url'
		});

		const data = response.data[0];

		return {
			imageUrl: data.url,
			b64_json: data.b64_json,
			provider: 'openai',
			prompt: options.prompt,
			revisedPrompt: data.revised_prompt,
			metadata: {
				model: 'dall-e-3',
				size: options.size || '1792x1024',
				quality: options.quality || 'hd'
			}
		};
	}

	private generateFallback(prompt: string): ImageGenerationResult {
		// Fallback to Picsum if OpenAI fails
		// Using 1792x1024 to match our default landscape size
		const imageUrl = `https://picsum.photos/1792/1024?random=${Date.now()}`;

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