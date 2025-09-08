/**
 * Utility functions for image operations in the gallery
 */

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
		'fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4';
	overlay.innerHTML = `
		<div class="relative max-w-full max-h-full">
			<img
				src="${imageUrl}"
				alt="${alt || 'Workspace image'}"
				class="max-w-full max-h-full object-contain"
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

/**
 * Formats a timestamp into a readable date string
 * @param timestamp - The timestamp to format (ISO string, Date object, or number)
 * @returns Formatted date string
 */
export function formatDate(timestamp: number | Date | string): string {
	let date: Date;
	if (typeof timestamp === 'string') {
		date = new Date(timestamp);
	} else if (typeof timestamp === 'number') {
		date = new Date(timestamp);
	} else {
		date = timestamp;
	}

	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

/**
 * Gets the table display name from table ID
 * @param tableId - The table ID
 * @returns Display name for the table
 */
export function getTableDisplayName(tableId: string | null): string {
	if (!tableId) return 'Unknown';
	return `Table ${tableId}`;
}
