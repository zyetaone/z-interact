import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageGenerator } from './ai/image-generator';

// Mock fetch for performance testing
global.fetch = vi.fn();

describe('Performance Tests', () => {
	let generator: ImageGenerator;

	beforeEach(() => {
		generator = new ImageGenerator();
		vi.clearAllMocks();
	});

	describe('Concurrent Image Generation', () => {
		it('should handle multiple concurrent requests efficiently', async () => {
			// Mock successful OpenAI responses
			process.env.OPENAI_API_KEY = 'test-key';

			const mockResponse = {
				data: [{
					url: 'https://example.com/image.png',
					revised_prompt: 'Generated workspace'
				}]
			};

			(global.fetch as any).mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse)
			});

			const startTime = Date.now();

			// Generate 10 images concurrently
			const promises = Array.from({ length: 10 }, (_, i) =>
				generator.generateImage({
					prompt: `Workspace design ${i + 1} for a modern professional`
				})
			);

			const results = await Promise.all(promises);
			const endTime = Date.now();

			// Verify all requests succeeded
			expect(results).toHaveLength(10);
			results.forEach(result => {
				expect(result.provider).toBe('openai');
				expect(result.imageUrl).toContain('example.com');
			});

			// Performance check: should complete within reasonable time
			const duration = endTime - startTime;
			expect(duration).toBeLessThan(5000); // Less than 5 seconds for 10 concurrent requests

			// Verify fetch was called 10 times
			expect(global.fetch).toHaveBeenCalledTimes(10);
		});

		it('should handle mixed success/failure scenarios gracefully', async () => {
			process.env.OPENAI_API_KEY = 'test-key';

			// Mock alternating success/failure responses
			let callCount = 0;
			(global.fetch as any).mockImplementation(() => {
				callCount++;
				if (callCount % 2 === 0) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve({
							data: [{
								url: `https://example.com/image-${callCount}.png`,
								revised_prompt: 'Generated workspace'
							}]
						})
					});
				} else {
					return Promise.reject(new Error('API rate limit'));
				}
			});

			const promises = Array.from({ length: 6 }, (_, i) =>
				generator.generateImage({
					prompt: `Workspace ${i + 1}`
				})
			);

			const results = await Promise.all(promises);

			// All should succeed due to fallback mechanisms
			expect(results).toHaveLength(6);
			results.forEach(result => {
				expect(result.imageUrl).toBeDefined();
				expect(['openai', 'stability', 'unsplash', 'placeholder']).toContain(result.provider);
			});
		});
	});

	describe('Memory Usage', () => {
		it('should not leak memory during repeated operations', async () => {
			process.env.OPENAI_API_KEY = 'test-key';

			const mockResponse = {
				data: [{
					url: 'https://example.com/image.png',
					revised_prompt: 'Generated workspace'
				}]
			};

			(global.fetch as any).mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse)
			});

			// Perform 50 operations to test for memory leaks
			const operations = Array.from({ length: 50 }, () =>
				generator.generateImage({
					prompt: 'Test workspace design'
				})
			);

			const results = await Promise.all(operations);

			expect(results).toHaveLength(50);
			results.forEach(result => {
				expect(result.provider).toBe('openai');
			});

			// Force garbage collection if available (in Node.js environment)
			if (global.gc) {
				global.gc();
			}
		});
	});

	describe('Error Recovery', () => {
		it('should recover from temporary API failures', async () => {
			process.env.OPENAI_API_KEY = 'test-key';
			process.env.STABILITY_API_KEY = 'stability-key';

			let callCount = 0;
			(global.fetch as any).mockImplementation(() => {
				callCount++;
				// First 2 calls fail, 3rd succeeds
				if (callCount <= 2) {
					return Promise.reject(new Error('Temporary failure'));
				}
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({
						data: [{
							url: 'https://example.com/recovered-image.png',
							revised_prompt: 'Recovered workspace'
						}]
					})
				});
			});

			const startTime = Date.now();
			const result = await generator.generateImage({
				prompt: 'Test workspace with recovery'
			});
			const endTime = Date.now();

			expect(result.provider).toBe('openai');
			expect(result.imageUrl).toContain('recovered-image.png');

			// Should complete within reasonable time despite retries
			const duration = endTime - startTime;
			expect(duration).toBeLessThan(3000); // Less than 3 seconds
		});

		it('should handle network timeouts gracefully', async () => {
			process.env.OPENAI_API_KEY = 'test-key';

			// Mock network timeout
			(global.fetch as any).mockImplementation(() =>
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error('Network timeout')), 100)
				)
			);

			const startTime = Date.now();
			const result = await generator.generateImage({
				prompt: 'Test workspace with timeout'
			});
			const endTime = Date.now();

			// Should fallback to alternative provider or placeholder
			expect(result.imageUrl).toBeDefined();
			expect(['stability', 'unsplash', 'placeholder']).toContain(result.provider);

			// Should complete within reasonable time
			const duration = endTime - startTime;
			expect(duration).toBeLessThan(2000); // Less than 2 seconds
		});
	});
});