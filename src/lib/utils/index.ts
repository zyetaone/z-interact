import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toastStore } from '$lib/stores/toast.svelte';

// Error handling utilities
export * from './error-handler';

// Other utilities
export * from './image-utils';
export * from './prompt-builder';
export * from './qr-print';

/**
 * Combines class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Copies text to clipboard with error handling and toast notifications
 */
export async function copyToClipboard(
	text: string,
	successMessage = 'Copied to clipboard!'
): Promise<void> {
	try {
		await navigator.clipboard.writeText(text);
		toastStore.success(successMessage);
	} catch {
		toastStore.error('Failed to copy to clipboard');
	}
}

/**
 * Debounce utility function to limit the rate of function execution
 */
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout> | null = null;

	return (...args: Parameters<T>) => {
		if (timeout) {
			clearTimeout(timeout);
		}

		timeout = setTimeout(() => {
			func(...args);
		}, wait);
	};
}
