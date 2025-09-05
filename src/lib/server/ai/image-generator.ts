import OpenAI from 'openai';
import { env } from '../env';

export interface ImageGenerationOptions {
	prompt: string;
	size?: '1536x1024' | '1024x1536' | 'auto';
	quality?: 'high' | 'medium' | 'low' | 'auto';
	background?: 'transparent' | 'opaque' | 'auto';
	partial_images?: number;
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
			// gpt-image-1 supports native streaming
			const response = await this.client.images.generate({
				model: 'gpt-image-1',
				prompt: options.prompt,
				n: 1,
				size: options.size || '1536x1024', // Landscape format for workspaces
				quality: options.quality || 'high',
				background: options.background || 'auto',
				partial_images: options.partial_images || 0,
				stream: true
			} as any);

			// Simulate streaming with a single completed event
			if (response.data && response.data[0]) {
				yield {
					type: 'completed',
					b64_json: response.data[0].b64_json || '',
					usage: {
						total_tokens: 100,
						input_tokens: 50,
						output_tokens: 50
					}
				};
			} else {
				throw new Error('No image data received');
			}
		} catch (error) {
			console.error('Streaming generation failed:', error);
			yield {
				type: 'error',
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	private async generateStandard(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
		if (!this.client) {
			throw new Error('OpenAI API key not configured');
		}

		const response = await this.client.images.generate({
			model: 'gpt-image-1',
			prompt: options.prompt,
			n: 1,
			size: options.size || '1536x1024', // Landscape format for workspaces
			quality: options.quality || 'high',
			background: options.background || 'auto'
		} as any);

		if (!response.data || !response.data[0]) {
			throw new Error('No image data received from OpenAI');
		}

		const data = response.data[0];

		// gpt-image-1 always returns b64_json
		return {
			b64_json: data.b64_json,
			provider: 'openai',
			prompt: options.prompt,
			metadata: {
				model: 'gpt-image-1',
				size: options.size || '1536x1024',
				quality: options.quality || 'high',
				background: options.background || 'auto'
			}
		};
	}

	private generateFallback(prompt: string): ImageGenerationResult {
		// Fallback to Picsum if OpenAI fails
		// Using 1536x1024 to match our default landscape size
		const imageUrl = `https://picsum.photos/1536/1024?random=${Date.now()}`;

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
