import { fal } from '@fal-ai/client';
import { env } from '../env';

export interface ImageGenerationOptions {
	prompt: string;
	personaId?: string;
	tableId?: string;
}

export interface ImageGenerationResult {
	imageUrl: string;
	provider: string;
	prompt: string;
	metadata?: Record<string, any>;
}

export interface StreamEvent {
	type: 'partial' | 'completed' | 'error';
	imageUrl?: string;
	progress?: number;
	error?: string;
}

/**
 * Image Generator using Fal.ai nano-banana model
 * Optimized for architectural/workspace visualizations
 * Cost: ~$0.0025 per image
 */
export class ImageGenerator {
	private isConfigured: boolean = false;
	private apiKey: string | undefined;

	constructor(platform?: any) {
		// Try multiple methods to get API key (Cloudflare Workers secrets can be tricky)
		// IMPORTANT: The key in Cloudflare has a trailing space "FAL_API_KEY "
		this.apiKey =
			platform?.env?.FAL_API_KEY || // Method 1: Direct from env
			platform?.env?.['FAL_API_KEY'] || // Method 2: Bracket notation
			platform?.env?.['FAL_API_KEY '] || // Method 3: WITH TRAILING SPACE (Cloudflare bug)
			env.FAL_API_KEY || // Method 4: From env.ts
			(typeof process !== 'undefined' ? process.env?.FAL_API_KEY : undefined); // Method 5: Process env

		if (this.apiKey) {
			fal.config({
				credentials: this.apiKey
			});
			this.isConfigured = true;
			console.log('✅ Fal.ai configured with nano-banana model');
		} else {
			console.warn(
				'⚠️ FAL_API_KEY not configured. Platform env keys:',
				platform?.env ? Object.keys(platform.env) : 'No platform env'
			);
		}
	}

	/**
	 * Configure with platform-specific environment
	 */
	configureWithPlatform(platform: any) {
		const platformKey = platform?.env?.FAL_API_KEY;
		if (platformKey && platformKey !== this.apiKey) {
			this.apiKey = platformKey;
			fal.config({
				credentials: platformKey
			});
			this.isConfigured = true;
			console.log('✅ Fal.ai reconfigured with platform API key');
		}
	}

	/**
	 * Generate an architectural workspace image
	 */
	async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
		if (!this.isConfigured) {
			throw new Error('Fal.ai API key not configured');
		}

		try {
			const startTime = Date.now();
			console.log('🎨 Generating with fal-ai/nano-banana...');

			// Build the enhanced prompt for architectural visualization
			const enhancedPrompt = this.enhancePrompt(options.prompt, options.personaId);

			const result = await fal.subscribe('fal-ai/nano-banana', {
				input: {
					prompt: enhancedPrompt,
					num_images: 1,
					output_format: 'jpeg'
				},
				logs: true,
				onQueueUpdate: (update) => {
					if (update.status === 'IN_PROGRESS' && update.logs) {
						update.logs.map((log: any) => log.message).forEach(console.log);
					}
				}
			});

			// Get the image URL from the result - Fal.ai returns result.data.images array
			const imageUrl = result.data?.images?.[0]?.url || (result as any).images?.[0]?.url;
			if (!imageUrl) {
				console.error('Response structure:', JSON.stringify(result, null, 2));
				throw new Error('No image URL in response');
			}

			const generationTime = ((Date.now() - startTime) / 1000).toFixed(2);
			console.log(`✅ Image generated in ${generationTime}s | Cost: ~$0.0025`);

			return {
				imageUrl,
				provider: 'fal.ai/nano-banana',
				prompt: options.prompt,
				metadata: {
					model: 'nano-banana',
					generationTime,
					requestId: result.requestId,
					enhancedPrompt,
					cost: 0.0025
				}
			};
		} catch (error: any) {
			console.error('Image generation failed:', error);
			console.error('Error details:', {
				message: error?.message,
				status: error?.status,
				body: error?.body,
				stack: error?.stack
			});
			
			// If API key is invalid or network error, throw to let the endpoint handle it
			if (error?.message?.includes('API key') || error?.message?.includes('401') || error?.message?.includes('403')) {
				throw new Error(`Fal.ai authentication failed: ${error.message}`);
			}
			
			// For other errors, return a placeholder as fallback
			console.warn('Falling back to placeholder image');
			return this.generatePlaceholder(options.prompt);
		}
	}

	/**
	 * Stream image generation with progress updates
	 */
	async *generateImageStream(options: ImageGenerationOptions): AsyncGenerator<StreamEvent> {
		if (!this.isConfigured) {
			yield { type: 'error', error: 'Fal.ai not configured' };
			return;
		}

		try {
			const enhancedPrompt = this.enhancePrompt(options.prompt, options.personaId);
			let progress = 0;

			// Simulate progress updates since nano-banana doesn't have native streaming
			const progressInterval = setInterval(() => {
				if (progress < 90) {
					progress += 10;
				}
			}, 200);

			const result = await fal.subscribe('fal-ai/nano-banana', {
				input: {
					prompt: enhancedPrompt,
					num_images: 1,
					output_format: 'jpeg'
				},
				logs: true,
				onQueueUpdate: (update) => {
					if (update.status === 'IN_PROGRESS') {
						progress = Math.min(progress + 5, 90);
						console.log(`Progress: ${progress}%`);
					}
				}
			});

			clearInterval(progressInterval);

			const imageUrl = result.data?.images?.[0]?.url || (result as any).images?.[0]?.url;
			if (imageUrl) {
				yield {
					type: 'completed',
					imageUrl,
					progress: 100
				};
			} else {
				yield {
					type: 'error',
					error: 'No image generated'
				};
			}
		} catch (error: any) {
			yield {
				type: 'error',
				error: error?.message || 'Generation failed'
			};
		}
	}

	/**
	 * Enhance the prompt with architectural specifications
	 */
	private enhancePrompt(basePrompt: string, personaId?: string): string {
		// Add architectural visualization prefix if not already present
		if (!basePrompt.toLowerCase().includes('architectural')) {
			basePrompt = `Architectural visualization: ${basePrompt}`;
		}

		// Add rendering specifications
		const specs = [
			'Photorealistic architectural photography style',
			'Wide-angle perspective showing complete workspace',
			'Natural daylight through windows',
			'Clean visual without any text, labels, logos, or watermarks',
			'Focus on architectural details and spatial flow'
		];

		return `${basePrompt}\n\nRender specifications: ${specs.join('. ')}.`;
	}

	/**
	 * Generate a placeholder image as fallback
	 */
	private generatePlaceholder(prompt: string): ImageGenerationResult {
		const imageUrl = `https://picsum.photos/1024/1024?random=${Date.now()}`;

		return {
			imageUrl,
			provider: 'placeholder',
			prompt,
			metadata: {
				fallback: true,
				reason: 'Fal.ai generation failed'
			}
		};
	}

	/**
	 * Check if the generator is configured
	 */
	isAvailable(): boolean {
		return this.isConfigured;
	}
}

// Export singleton instance (will be configured at runtime)
export const imageGenerator = new ImageGenerator();

// Factory function for creating configured instances
export function createImageGenerator(platform?: any): ImageGenerator {
	const generator = new ImageGenerator(platform);
	return generator;
}
