import { createSubscriber } from 'svelte/reactivity';
import { imageStore } from '$lib/stores/image-store.svelte';

/**
 * Smart gallery feed with exponential backoff and completion detection
 * Automatically stops polling when all tables are filled
 */
export class SmartGalleryFeed {
	#pollInterval: ReturnType<typeof setInterval> | null = null;
	#subscribe;
	#lastUpdate = $state(Date.now());
	#isActive = $state(false);

	// Base polling interval in milliseconds
	basePollInterval = 5000; // 5 seconds default

	// Current backoff multiplier
	#backoffMultiplier = $state(1);

	// Callback for when updates are detected
	onUpdate?: (changeCount: number) => void;

	// Callback for when all tables are complete
	onComplete?: () => void;

	constructor(basePollInterval = 5000) {
		this.basePollInterval = basePollInterval;

		this.#subscribe = createSubscriber((update) => {
			// Start polling when subscribed
			this.#isActive = true;
			console.log('[SmartGalleryFeed] Starting smart polling');

			const poll = async () => {
				// Check if all tables are ready (stop condition)
				if (imageStore.areAllTablesReady()) {
					console.log('[SmartGalleryFeed] All tables ready, stopping polling');
					this.#isActive = false;
					this.onComplete?.();
					return;
				}

				try {
					// Simple refresh
					await imageStore.refresh();
					const changeCount = imageStore.images.length;

					console.log(`[SmartGalleryFeed] Refreshed ${changeCount} images`);
					this.#lastUpdate = Date.now();
					update();
					this.onUpdate?.(changeCount);

					// Reset backoff on successful update
					this.#backoffMultiplier = 1;
				} catch (error) {
					console.error('[SmartGalleryFeed] Poll error:', error);
					// Increase backoff on error
					this.updateBackoff();
				}

				// Schedule next poll if still active
				if (this.#isActive && !imageStore.areAllTablesReady()) {
					const nextInterval = this.basePollInterval * this.#backoffMultiplier;
					console.log(
						`[SmartGalleryFeed] Next poll in ${nextInterval}ms (backoff: ${this.#backoffMultiplier}x)`
					);
					this.#pollInterval = setTimeout(poll, nextInterval);
				}
			};

			// Start initial poll
			poll();

			// Return cleanup function
			return () => {
				console.log('[SmartGalleryFeed] Stopping smart polling');
				this.#isActive = false;
				if (this.#pollInterval) {
					clearTimeout(this.#pollInterval);
					this.#pollInterval = null;
				}
			};
		});
	}

	// Update backoff multiplier based on table completion
	private updateBackoff() {
		const filledCount = imageStore.getFilledTableCount();

		// Exponential backoff based on filled tables
		// More filled tables = longer delays
		if (filledCount >= 8) {
			this.#backoffMultiplier = Math.min(this.#backoffMultiplier * 2, 16); // Max 80s delay
		} else if (filledCount >= 5) {
			this.#backoffMultiplier = Math.min(this.#backoffMultiplier * 1.5, 8); // Max 40s delay
		} else if (filledCount >= 3) {
			this.#backoffMultiplier = Math.min(this.#backoffMultiplier * 1.2, 4); // Max 20s delay
		} else {
			// Few tables filled, maintain aggressive polling
			this.#backoffMultiplier = Math.min(this.#backoffMultiplier * 1.1, 2); // Max 10s delay
		}
	}

	// Read this in an effect to activate polling
	get active() {
		this.#subscribe();
		return this.#isActive;
	}

	// Get the last update timestamp
	get lastUpdate() {
		this.#subscribe();
		return this.#lastUpdate;
	}

	// Get current backoff multiplier
	get backoffMultiplier() {
		return this.#backoffMultiplier;
	}

	// Force an immediate refresh
	async refresh() {
		console.log('[SmartGalleryFeed] Manual refresh triggered');
		this.#lastUpdate = Date.now();

		try {
			await imageStore.refresh();
			const changeCount = imageStore.images.length;
			this.onUpdate?.(changeCount);
			// Reset backoff on manual refresh
			this.#backoffMultiplier = 1;
		} catch (error) {
			console.error('[SmartGalleryFeed] Manual refresh error:', error);
		}
	}

	// Change base polling interval
	setInterval(ms: number) {
		this.basePollInterval = ms;
		console.log(`[SmartGalleryFeed] Base interval changed to ${ms}ms`);
	}

	// Stop polling manually
	stop() {
		console.log('[SmartGalleryFeed] Manual stop requested');
		this.#isActive = false;
		if (this.#pollInterval) {
			clearTimeout(this.#pollInterval);
			this.#pollInterval = null;
		}
	}

	// Resume polling if stopped
	resume() {
		if (!this.#isActive && !imageStore.areAllTablesReady()) {
			console.log('[SmartGalleryFeed] Resuming polling');
			this.#isActive = true;
			this.#subscribe();
		}
	}
}
