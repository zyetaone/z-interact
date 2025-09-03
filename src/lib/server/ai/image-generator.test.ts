import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageGenerator } from './image-generator';

// Mock fetch globally
global.fetch = vi.fn();

describe('ImageGenerator', () => {
	let generator: ImageGenerator;

	beforeEach(() => {
		generator = new ImageGenerator();
		vi.clearAllMocks();
	});

	describe('generateImage', () => {
		it('should use OpenAI as primary provider when API key is available', async () => {
			// Mock environment variable
			process.env.OPENAI_API_KEY = 'test-key';

			const mockResponse = {
				data: [{
					url: 'https://example.com/image.png',
					revised_prompt: 'A beautiful workspace'
				}]
			};

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse)
			});

			const result = await generator.generateImage({
				prompt: 'A modern office workspace'
			});

			expect(result.provider).toBe('openai');
			expect(result.imageUrl).toBe('https://example.com/image.png');
			expect(result.metadata?.revisedPrompt).toBe('A beautiful workspace');
		});

		it('should fallback to Stability AI when OpenAI fails', async () => {
			process.env.OPENAI_API_KEY = 'test-key';
			process.env.STABILITY_API_KEY = 'stability-key';

			// Mock OpenAI failure
			(global.fetch as any).mockRejectedValueOnce(new Error('OpenAI failed'));

			// Mock Stability success
			const mockResponse = {
				artifacts: [{
					base64: 'base64imagedata'
				}]
			};

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse)
			});

			const result = await generator.generateImage({
				prompt: 'A modern office workspace'
			});

			expect(result.provider).toBe('stability');
			expect(result.imageUrl).toContain('data:image/png;base64,');
		});

		it('should fallback to Unsplash when all AI providers fail', async () => {
			process.env.OPENAI_API_KEY = 'test-key';

			// Mock all AI providers failing
			(global.fetch as any).mockRejectedValue(new Error('API failed'));

			const result = await generator.generateImage({
				prompt: 'A modern office workspace'
			});

			expect(result.provider).toBe('unsplash');
			expect(result.imageUrl).toContain('source.unsplash.com');
		});

		it('should use placeholder when everything fails', async () => {
			// Mock all providers failing
			(global.fetch as any).mockRejectedValue(new Error('All failed'));

			const result = await generator.generateImage({
				prompt: 'A modern office workspace'
			});

			expect(result.provider).toBe('placeholder');
			expect(result.imageUrl).toContain('picsum.photos');
		});
	});

	describe('extractSearchTerms', () => {
		it('should extract relevant workspace keywords', () => {
			const generator = new ImageGenerator() as any;

			const result = generator.extractSearchTerms('A modern office workspace with natural light and ergonomic furniture');
			expect(result).toContain('office');
			expect(result).toContain('workspace');
			expect(result).toContain('modern');
		});

		it('should provide default terms when no matches found', () => {
			const generator = new ImageGenerator() as any;

			const result = generator.extractSearchTerms('Some random text without keywords');
			expect(result).toEqual(['office', 'workspace', 'modern']);
		});
	});
});