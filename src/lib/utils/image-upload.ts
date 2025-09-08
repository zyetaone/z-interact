/**
 * Client-side utility for optimistic image handling
 * Shows images immediately via blob URLs while uploading in background
 */

import { logger } from './logger';

export interface OptimisticImageResult {
	tempUrl: string; // Blob URL for immediate display
	finalUrlPromise: Promise<string>; // Promise that resolves to final CDN URL
	cleanup: () => void; // Function to revoke blob URL
}

/**
 * Convert a URL to blob for immediate display
 */
async function urlToBlob(url: string): Promise<Blob> {
	try {
		// Add no-cors mode to bypass CORS issues with external images
		const response = await fetch(url, {
			mode: 'cors',
			credentials: 'omit'
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch image: ${response.status}`);
		}

		const blob = await response.blob();

		// Validate blob is actually an image
		if (!blob.type.startsWith('image/')) {
			throw new Error(`Invalid content type: ${blob.type}`);
		}

		return blob;
	} catch (error) {
		// If CORS fails, try with no-cors (will return opaque response)
		// This at least allows us to upload the image even if we can't display it
		logger.warn('CORS failed, trying no-cors mode', {
			component: 'image-upload',
			url: url.substring(0, 50),
			error: error instanceof Error ? error.message : String(error)
		});

		// For no-cors, we can't read the response but we can still try to display
		// the original URL directly
		throw error;
	}
}

/**
 * Upload blob to server and get permanent URL
 * Converts blob to base64 and uses remote function
 */
async function uploadBlob(
	blob: Blob,
	metadata: {
		personaId: string;
		tableId?: string;
		prompt: string;
	}
): Promise<string> {
	// Convert blob to base64 for remote function
	const reader = new FileReader();
	const base64Promise = new Promise<string>((resolve, reject) => {
		reader.onloadend = () => {
			const base64 = reader.result as string;
			// Remove data URL prefix
			const base64Data = base64.split(',')[1];
			resolve(base64Data);
		};
		reader.onerror = reject;
	});
	reader.readAsDataURL(blob);

	const base64 = await base64Promise;

	// Dynamic import to avoid circular dependencies
	const { uploadBlob: uploadRemote } = await import('../../routes/gallery/gallery.remote');

	const result = await uploadRemote({
		base64,
		mimeType: blob.type || 'image/png',
		personaId: metadata.personaId,
		tableId: metadata.tableId,
		prompt: metadata.prompt
	});

	if (!result || !result.success) {
		throw new Error('Upload failed: Blob upload error');
	}

	return result.url;
}

/**
 * Handle AI-generated image with optimistic UI
 * Shows the temporary Fal.ai URL immediately
 * The image will be uploaded to R2 only when locked
 */
export async function handleOptimisticImage(
	imageUrl: string,
	metadata: {
		personaId: string;
		tableId?: string;
		prompt: string;
	}
): Promise<OptimisticImageResult> {
	// Use the Fal.ai URL directly - it will be uploaded to R2 when locked
	// No need for blob conversion or background upload
	const finalUrlPromise = Promise.resolve(imageUrl);

	return {
		tempUrl: imageUrl,
		finalUrlPromise,
		cleanup: () => {
			// No cleanup needed for Fal.ai URLs
		}
	};
}

/**
 * Upload an image URL to server (server will download and save)
 * Uses remote function to bypass CORS
 */
async function uploadImageUrl(
	imageUrl: string,
	metadata: {
		personaId: string;
		tableId?: string;
		prompt: string;
	}
): Promise<string> {
	// Dynamic import to avoid circular dependencies
	const { uploadImageUrl: uploadRemote } = await import('../../routes/gallery/gallery.remote');

	const result = await uploadRemote({
		imageUrl,
		personaId: metadata.personaId,
		tableId: metadata.tableId,
		prompt: metadata.prompt
	});

	if (!result || !result.success) {
		throw new Error('Upload failed: Server-side download error');
	}

	return result.url;
}

/**
 * Handle base64 image with optimistic UI
 * Converts base64 to blob for efficient handling
 */
export async function handleOptimisticBase64(
	base64: string,
	mimeType: string = 'image/png',
	metadata: {
		personaId: string;
		tableId?: string;
		prompt: string;
	}
): Promise<OptimisticImageResult> {
	try {
		// Remove data URL prefix if present
		const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');

		// Convert base64 to binary
		const binaryString = atob(base64Data);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}

		// Create blob
		const blob = new Blob([bytes], { type: mimeType });

		// Create temporary blob URL for immediate display
		const tempUrl = URL.createObjectURL(blob);

		// Start upload in background
		const finalUrlPromise = uploadBlob(blob, metadata).catch((error) => {
			logger.error('Background upload failed', {
				component: 'image-upload',
				error: error instanceof Error ? error.message : String(error)
			});
			// Return data URL as fallback
			return `data:${mimeType};base64,${base64Data}`;
		});

		return {
			tempUrl,
			finalUrlPromise,
			cleanup: () => URL.revokeObjectURL(tempUrl)
		};
	} catch (error) {
		logger.error('Failed to handle base64 image', {
			component: 'image-upload',
			error: error instanceof Error ? error.message : String(error)
		});

		// Fallback: use data URL directly
		const dataUrl = base64.startsWith('data:') ? base64 : `data:${mimeType};base64,${base64}`;
		return {
			tempUrl: dataUrl,
			finalUrlPromise: Promise.resolve(dataUrl),
			cleanup: () => {}
		};
	}
}
