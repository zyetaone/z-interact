import { command, getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { logger } from '$lib/utils/logger';

// Validation schemas
const UploadFromUrlSchema = v.object({
	imageUrl: v.string(),
	filename: v.string()
});

const UploadFromBase64Schema = v.object({
	base64Data: v.string(),
	filename: v.string()
});

const UploadFromBufferSchema = v.object({
	buffer: v.unknown(), // Will be Uint8Array
	filename: v.string(),
	contentType: v.optional(v.string())
});

const DeleteImageSchema = v.object({
	filename: v.string()
});

// Helper to generate unique filenames
// generateFilename removed; filenames are provided by callers

// Helper to extract R2 object key from a public URL
function extractR2KeyFromUrl(publicBase: string, url: string): string | null {
	if (!publicBase || !url) return null;
	const base = publicBase.endsWith('/') ? publicBase.slice(0, -1) : publicBase;
	if (!url.startsWith(base)) return null;
	let key = url.slice(base.length);
	if (key.startsWith('/')) key = key.slice(1);
	return key || null;
}

// Upload image from URL (e.g., from Fal.ai)
export const uploadFromUrl = command(
	UploadFromUrlSchema,
	async (data: { imageUrl: string; filename: string }) => {
		const event = getRequestEvent();
		const platform = event?.platform || (globalThis as any).platform;

		if (!platform?.env?.R2_IMAGES) {
			error(503, 'R2_IMAGES bucket not configured');
		}

		if (!platform?.env?.R2_PUBLIC_URL) {
			error(503, 'R2_PUBLIC_URL not configured');
		}

		try {
			logger.debug('Downloading image from URL', {
				component: 'R2Remote',
				operation: 'upload_from_url',
				url: data.imageUrl.substring(0, 50),
				filename: data.filename
			});

			// Basic SSRF hardening: allowlist known hosts (fal.ai/fal.run) and enforce image content-type
			let host: string | null = null;
			try {
				const u = new URL(data.imageUrl);
				host = u.hostname;
			} catch {}
			const allowedHosts = ['fal.ai', 'fal.run'];
			if (!host || !allowedHosts.some((h) => host === h || host.endsWith(`.${h}`))) {
				error(400, 'URL host not allowed for server-side upload');
			}

			// Download the image from the source URL with timeout
			const ac = new AbortController();
			const timeout = setTimeout(() => ac.abort(), 10000);
			const response = await fetch(data.imageUrl, { signal: ac.signal });
			clearTimeout(timeout);
			if (!response.ok) {
				error(500, `Failed to download image: ${response.status} ${response.statusText}`);
			}

			const contentType = response.headers.get('content-type') || 'image/png';
			if (!contentType.toLowerCase().startsWith('image/')) {
				error(415, 'Unsupported media type');
			}
			const imageBuffer = await response.arrayBuffer();

			// Upload to R2 bucket
			const r2Object = await (platform.env.R2_IMAGES as any).put(data.filename, imageBuffer, {
				httpMetadata: {
					contentType,
					cacheControl: 'public, max-age=31536000' // Cache for 1 year
				},
				customMetadata: {
					uploadedAt: new Date().toISOString(),
					originalUrl: data.imageUrl
				}
			});

			if (!r2Object) {
				error(500, 'Failed to upload to R2 bucket');
			}

			// Construct the public URL
			const publicUrl = `${platform.env.R2_PUBLIC_URL}/${data.filename}`;

			logger.info('Image uploaded successfully', {
				component: 'R2Remote',
				operation: 'upload_from_url',
				publicUrl: publicUrl.substring(0, 50)
			});

			return {
				success: true,
				url: publicUrl,
				key: data.filename
			};
		} catch (err) {
			logger.error(
				'R2 upload from URL failed',
				{
					component: 'R2Remote',
					operation: 'upload_from_url'
				},
				err instanceof Error ? err : new Error(String(err))
			);

			const message = err instanceof Error ? err.message : 'Unknown error';
			error(500, `Upload failed: ${message}`);
		}
	}
);

// Upload image from base64 data
export const uploadFromBase64 = command(
	UploadFromBase64Schema,
	async (data: { base64Data: string; filename: string }) => {
		const event = getRequestEvent();
		const platform = event?.platform || (globalThis as any).platform;

		if (!platform?.env?.R2_IMAGES) {
			error(503, 'R2_IMAGES bucket not configured');
		}

		if (!platform?.env?.R2_PUBLIC_URL) {
			error(503, 'R2_PUBLIC_URL not configured');
		}

		try {
			logger.debug('Converting base64 to buffer', {
				component: 'R2Remote',
				operation: 'upload_from_base64',
				filename: data.filename,
				dataSize: data.base64Data.length
			});

			// Convert base64 to buffer
			const imageBuffer = Uint8Array.from(atob(data.base64Data), (c) => c.charCodeAt(0));

			// Infer content type from filename
			const lower = data.filename.toLowerCase();
			const inferred =
				lower.endsWith('.jpg') || lower.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';

			// Upload to R2 bucket
			const r2Object = await (platform.env.R2_IMAGES as any).put(data.filename, imageBuffer, {
				httpMetadata: {
					contentType: inferred,
					cacheControl: 'public, max-age=31536000' // Cache for 1 year
				},
				customMetadata: {
					uploadedAt: new Date().toISOString(),
					source: 'base64'
				}
			});

			if (!r2Object) {
				error(500, 'Failed to upload to R2 bucket');
			}

			// Construct the public URL
			const publicUrl = `${platform.env.R2_PUBLIC_URL}/${data.filename}`;

			logger.info('Base64 image uploaded successfully', {
				component: 'R2Remote',
				operation: 'upload_from_base64',
				publicUrl: publicUrl.substring(0, 50)
			});

			return {
				success: true,
				url: publicUrl,
				key: data.filename
			};
		} catch (err) {
			logger.error(
				'R2 upload from base64 failed',
				{
					component: 'R2Remote',
					operation: 'upload_from_base64'
				},
				err instanceof Error ? err : new Error(String(err))
			);

			const message = err instanceof Error ? err.message : 'Unknown error';
			error(500, `Upload failed: ${message}`);
		}
	}
);

// Upload image from buffer
export const uploadFromBuffer = command(
	UploadFromBufferSchema,
	async (data: { buffer: unknown; filename: string; contentType?: string }) => {
		const event = getRequestEvent();
		const platform = event?.platform || (globalThis as any).platform;

		if (!platform?.env?.R2_IMAGES) {
			error(503, 'R2_IMAGES bucket not configured');
		}

		if (!platform?.env?.R2_PUBLIC_URL) {
			error(503, 'R2_PUBLIC_URL not configured');
		}

		// Validate buffer type
		let buffer: Uint8Array;
		if (data.buffer instanceof Uint8Array) {
			buffer = data.buffer;
		} else if (data.buffer instanceof ArrayBuffer) {
			buffer = new Uint8Array(data.buffer);
		} else if (Array.isArray(data.buffer)) {
			buffer = new Uint8Array(data.buffer);
		} else {
			error(400, 'Invalid buffer type');
		}

		try {
			logger.debug('Uploading image buffer to R2', {
				component: 'R2Remote',
				operation: 'upload_from_buffer',
				filename: data.filename,
				size: buffer.length
			});

			const contentType = data.contentType || 'image/png';

			// Upload to R2 bucket
			const r2Object = await (platform.env.R2_IMAGES as any).put(data.filename, buffer, {
				httpMetadata: {
					contentType,
					cacheControl: 'public, max-age=31536000'
				},
				customMetadata: {
					uploadedAt: new Date().toISOString(),
					source: 'buffer'
				}
			});

			if (!r2Object) {
				error(500, 'Failed to upload to R2 bucket');
			}

			// Construct the public URL
			const publicUrl = `${platform.env.R2_PUBLIC_URL}/${data.filename}`;

			logger.info('Buffer image uploaded successfully', {
				component: 'R2Remote',
				operation: 'upload_from_buffer',
				publicUrl: publicUrl.substring(0, 50)
			});

			return {
				success: true,
				url: publicUrl,
				key: data.filename
			};
		} catch (err) {
			logger.error(
				'R2 upload from buffer failed',
				{
					component: 'R2Remote',
					operation: 'upload_from_buffer'
				},
				err instanceof Error ? err : new Error(String(err))
			);

			const message = err instanceof Error ? err.message : 'Unknown error';
			error(500, `Upload failed: ${message}`);
		}
	}
);

// Delete image from R2
export const deleteFromR2 = command(DeleteImageSchema, async (data: { filename: string }) => {
	const event = getRequestEvent();
	const platform = event?.platform || (globalThis as any).platform;

	if (!platform?.env?.R2_IMAGES) {
		error(503, 'R2_IMAGES bucket not configured');
	}

	try {
		await (platform.env.R2_IMAGES as any).delete(data.filename);

		logger.info('Image deleted from R2', {
			component: 'R2Remote',
			operation: 'delete_image',
			filename: data.filename
		});

		return {
			success: true,
			filename: data.filename
		};
	} catch (err) {
		logger.error(
			'Failed to delete from R2',
			{
				component: 'R2Remote',
				operation: 'delete_image',
				filename: data.filename
			},
			err instanceof Error ? err : new Error(String(err))
		);

		const message = err instanceof Error ? err.message : 'Unknown error';
		error(500, `Delete failed: ${message}`);
	}
});

// Export utility function for generating filenames
// Do not export helpers from a .remote.ts file; keep internal only
