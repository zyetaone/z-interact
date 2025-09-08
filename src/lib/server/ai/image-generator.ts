import { fal } from '@fal-ai/client';
import { env } from '../env';
import { logger, devLog } from '$lib/utils/logger';
import type {
	Platform,
	FalLogEntry,
	ImageGenerationOptions,
	ImageGenerationResult
} from '$lib/types';

/**
 * Image Generator using Fal.ai nano-banana model
 * Optimized for architectural/workspace visualizations
 * Cost: ~$0.0025 per image
 */
export class ImageGenerator {
	private isConfigured: boolean = false;
	private apiKey: string | undefined;

	constructor(platform?: Platform) {
		// Try multiple methods to get API key (Cloudflare Workers secrets can be tricky)
		// IMPORTANT: The key in Cloudflare has a trailing space "FAL_API_KEY "
		this.apiKey =
			(typeof platform?.env?.FAL_API_KEY === 'string' ? platform.env.FAL_API_KEY : undefined) || // Method 1: Direct from env
			(typeof platform?.env?.['FAL_API_KEY'] === 'string'
				? platform.env['FAL_API_KEY']
				: undefined) || // Method 2: Bracket notation
			(typeof platform?.env?.['FAL_API_KEY '] === 'string'
				? platform.env['FAL_API_KEY ']
				: undefined) || // Method 3: WITH TRAILING SPACE (Cloudflare bug)
			env.FAL_API_KEY || // Method 4: From env.ts
			(typeof process !== 'undefined' ? process.env?.FAL_API_KEY : undefined); // Method 5: Process env

		if (this.apiKey) {
			fal.config({
				credentials: this.apiKey
			});
			this.isConfigured = true;
			devLog('Fal.ai configured with nano-banana model', { component: 'ImageGenerator' });
		} else {
			logger.warn('FAL_API_KEY not configured', {
				component: 'ImageGenerator',
				availableKeys: platform?.env ? Object.keys(platform.env) : 'No platform env'
			});
		}
	}

	/**
	 * Configure with platform-specific environment
	 */
	configureWithPlatform(platform: Platform) {
		const platformKey =
			typeof platform?.env?.FAL_API_KEY === 'string' ? platform.env.FAL_API_KEY : undefined;
		if (platformKey && platformKey !== this.apiKey) {
			this.apiKey = platformKey;
			fal.config({
				credentials: platformKey
			});
			this.isConfigured = true;
			devLog('Fal.ai reconfigured with platform API key', { component: 'ImageGenerator' });
		}
	}

	/**
	 * Generate an architectural workspace image
	 */
	async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
		if (!this.isConfigured) {
			logger.warn('Fal.ai API key not configured, using placeholder images', {
				component: 'ImageGenerator',
				prompt: options.prompt?.substring(0, 50)
			});
			return this.generatePlaceholder(options.prompt);
		}

		const endTimer = logger.startOperation('image_generation', {
			component: 'ImageGenerator',
			prompt: options.prompt?.substring(0, 50),
			personaId: options.personaId
		});

		try {
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
						devLog('Fal.ai progress update', {
							component: 'ImageGenerator',
							logs: update.logs?.map((log: FalLogEntry) => log.message)
						});
					}
				}
			});

			// Get the image URL from the result - Fal.ai returns result.data.images array
			const imageUrl =
				result.data?.images?.[0]?.url ||
				(result as { images?: { url: string }[] }).images?.[0]?.url;
			if (!imageUrl) {
				logger.error('No image URL in Fal.ai response', {
					component: 'ImageGenerator',
					response: JSON.stringify(result, null, 2)
				});
				throw new Error('No image URL in response');
			}

			endTimer();

			return {
				imageUrl,
				provider: 'fal.ai/nano-banana',
				prompt: options.prompt,
				metadata: {
					model: 'nano-banana',
					requestId: result.requestId,
					enhancedPrompt,
					cost: 0.0025
				}
			};
		} catch (error: unknown) {
			const errorObj = error as {
				message?: string;
				status?: number;
				body?: unknown;
				stack?: string;
			};

			logger.error(
				'Image generation failed',
				{
					component: 'ImageGenerator',
					error: errorObj?.message,
					status: errorObj?.status,
					prompt: options.prompt?.substring(0, 50)
				},
				error instanceof Error ? error : new Error(String(error))
			);

			// If API key is invalid or network error, throw to let the endpoint handle it
			if (
				errorObj?.message?.includes('API key') ||
				errorObj?.message?.includes('401') ||
				errorObj?.message?.includes('403')
			) {
				throw new Error(`Fal.ai authentication failed: ${errorObj.message}`);
			}

			// For other errors, return a placeholder as fallback
			logger.warn('Falling back to placeholder image due to generation error', {
				component: 'ImageGenerator',
				originalError: errorObj?.message
			});
			return this.generatePlaceholder(options.prompt);
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
export function createImageGenerator(platform?: Platform): ImageGenerator {
	const generator = new ImageGenerator(platform);
	return generator;
}
