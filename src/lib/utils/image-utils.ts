/**
 * Utility functions for image operations in the gallery
 */

/**
 * Validate if a URL is a valid image URL format
 * Supports HTTP(S), data URLs, and blob URLs
 */
export function isValidImageUrl(url: string): boolean {
	if (!url || typeof url !== 'string' || url.trim() === '') {
		return false;
	}

	const trimmedUrl = url.trim();
	return (
		trimmedUrl.startsWith('http://') ||
		trimmedUrl.startsWith('https://') ||
		trimmedUrl.startsWith('data:') ||
		trimmedUrl.startsWith('blob:')
	);
}

/**
 * Downloads an image from a URL
 * @param imageUrl - The URL of the image to download
 * @param filename - Optional filename for the download
 */
export function downloadImage(imageUrl: string, filename?: string): void {
	if (!imageUrl) return;

	// Create a temporary anchor element
	const link = document.createElement('a');
	link.href = imageUrl;
	link.download = filename || `workspace-image-${Date.now()}.jpg`;
	link.target = '_blank';

	// Append to body, click, and remove
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

/**
 * Opens an image in fullscreen mode
 * @param imageUrl - The URL of the image to display in fullscreen
 * @param alt - Alt text for the image
 */
export function openFullscreen(imageUrl: string, alt?: string): void {
	if (!imageUrl) return;

	// Create a fullscreen overlay
	const overlay = document.createElement('div');
	overlay.className =
		'fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4 overflow-y-auto';
	overlay.innerHTML = `
		<div class="relative max-w-full">
			<img
				src="${imageUrl}"
				alt="${alt || 'Workspace image'}"
				class="max-w-full max-h-screen object-contain"
			/>
			<button
				class="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
				onclick="this.parentElement.parentElement.remove()"
			>
				<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
				</svg>
			</button>
		</div>
	`;

	// Add click outside to close
	overlay.addEventListener('click', (e) => {
		if (e.target === overlay) {
			overlay.remove();
		}
	});

	// Add escape key listener
	const handleEscape = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			overlay.remove();
			document.removeEventListener('keydown', handleEscape);
		}
	};
	document.addEventListener('keydown', handleEscape);

	document.body.appendChild(overlay);
}
