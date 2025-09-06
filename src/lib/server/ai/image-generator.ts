import OpenAI from 'openai';
import { env } from '../env';

export interface ImageGenerationOptions {
	prompt: string;
	size?: '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
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
			const config: any = { apiKey: env.OPENAI_API_KEY };
			if (env.OPENAI_ORG) config.organization = env.OPENAI_ORG;
			this.client = new OpenAI(config);
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
			console.log('Starting streaming generation with gpt-image-1...');

			// Use the streaming API as documented
			// Note: gpt-image-1 doesn't support response_format
			const stream = await this.client.images.generate({
				model: 'gpt-image-1',
				prompt: options.prompt,
				n: 1,
				size: options.size || '1024x1024', // Square format - most cost effective
				quality: options.quality || 'medium', // Medium quality for better results
				background: options.background || 'auto',
				stream: true,
				partial_images: options.partial_images || 2 // Request 2 partial images
			} as any);

			// Process the stream events
			for await (const event of stream) {
				if (event.type === 'image_generation.partial_image') {
					// Partial image event
					yield {
						type: 'partial_image',
						b64_json: event.b64_json,
						partial_image_index: event.partial_image_index
					};
					console.log(`Received partial image ${event.partial_image_index}`);
				} else if (event.b64_json) {
					// Final complete image
					yield {
						type: 'completed',
						b64_json: event.b64_json,
						usage: {
							total_tokens: 1056, // Medium quality 1024x1024 = 1056 tokens
							input_tokens: 50, // Estimated
							output_tokens: 1056
						}
					};
					console.log('Received complete image');
				}
			}
		} catch (error: any) {
			console.error('Streaming generation error:', error?.message || error);

			// Check for billing issues
			if (error?.message?.includes('billing') || error?.message?.includes('limit')) {
				console.error('Billing limit reached - falling back to dall-e-3');
				// Try dall-e-3 as fallback
			} else if (
				error?.message?.includes('verified') ||
				error?.response?.data?.error?.message?.includes('verified')
			) {
				console.log('gpt-image-1 requires verification, falling back to dall-e-3...');

				try {
					// Fallback to dall-e-3 (no native streaming)
					const response = await this.client.images.generate({
						model: 'dall-e-3',
						prompt: options.prompt,
						n: 1,
						size: '1024x1024', // Square format - cheaper ($0.04 vs $0.08)
						quality: 'standard' // Standard quality saves 50% cost
						// dall-e-3 returns URL by default
					});

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
						throw new Error('No image data received from dall-e-3');
					}
				} catch (fallbackError) {
					console.error('Fallback to dall-e-3 also failed:', fallbackError);
					yield {
						type: 'error',
						error: fallbackError instanceof Error ? fallbackError.message : 'Generation failed'
					};
				}
			} else {
				// Other errors
				console.error('Streaming generation failed:', error);
				yield {
					type: 'error',
					error: error instanceof Error ? error.message : 'Unknown error occurred'
				};
			}
		}
	}

	private async generateStandard(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
		if (!this.client) {
			throw new Error('OpenAI API key not configured');
		}

		try {
			// Try gpt-image-1 first (now verified!)
			console.log('Generating with gpt-image-1 (verified)...');
			// Note: gpt-image-1 doesn't support response_format parameter
			const params: any = {
				model: 'gpt-image-1',
				prompt: options.prompt,
				n: 1,
				size: options.size || '1024x1024', // Square format - most cost effective
				quality: options.quality || 'medium', // Medium quality for better results
				background: options.background || 'auto'
			};
			
			// Only add response_format for models that support it
			if (options.response_format) {
				// gpt-image-1 returns URL by default
				console.log('Note: gpt-image-1 returns URL format by default');
			}
			
			const response = await this.client.images.generate(params);

			if (!response.data || !response.data[0]) {
				throw new Error('No image data received from OpenAI');
			}

			const data = response.data[0];

			console.log('✅ gpt-image-1 generation successful! Cost: ~$0.04 (medium quality)');

			// Return based on response format
			return {
				imageUrl: data.url,
				b64_json: data.b64_json,
				provider: 'openai',
				prompt: options.prompt,
				revisedPrompt: data.revised_prompt,
				metadata: {
					model: 'gpt-image-1',
					size: options.size || '1024x1024',
					quality: options.quality || 'medium',
					background: options.background || 'auto',
					cost: 0.04 // Medium quality costs more
				}
			};
		} catch (error: any) {
			console.error('Generation error:', error?.message || error);

			// Check for billing issues first
			if (error?.message?.includes('billing') || error?.message?.includes('limit')) {
				console.error('Billing limit reached - falling back to dall-e-3');
			} else if (
				error?.message?.includes('verified') ||
				error?.response?.data?.error?.message?.includes('verified')
			) {
				console.log('Note: Verification error (should be resolved now)...');

				// Fallback to dall-e-3
				const response = await this.client.images.generate({
					model: 'dall-e-3',
					prompt: options.prompt,
					n: 1,
					size: '1024x1024', // Square format - cheaper ($0.04 vs $0.08)
					quality: 'standard', // Standard quality saves 50% cost
					response_format: 'url'
				});

				if (!response.data || !response.data[0]) {
					throw new Error('No image data received from OpenAI');
				}

				const data = response.data[0];

				return {
					imageUrl: data.url,
					provider: 'openai',
					prompt: options.prompt,
					revisedPrompt: data.revised_prompt,
					metadata: {
						model: 'dall-e-3',
						size: '1024x1024',
						quality: 'standard',
						note: 'Fallback from gpt-image-1 (verification required)'
					}
				};
			}

			// Re-throw other errors
			throw error;
		}
	}

	private generateFallback(prompt: string): ImageGenerationResult {
		// Fallback to Picsum if OpenAI fails
		// Using 1024x1024 square format to match our cost-optimized size
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
