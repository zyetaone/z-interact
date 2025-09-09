import { createSubscriber } from 'svelte/reactivity';
import { getAllWorkspaces } from '$lib/stores/workspace-store.svelte';
import { listImagesSince } from '../../routes/gallery/gallery.remote';
import { logger } from '$lib/utils/logger';
import type { WorkspaceData } from '$lib/types';

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
			logger.info('Starting smart polling', { component: 'SmartGalleryFeed' });

			let firstRun = true;
			const poll = async () => {
				// Check if all tables are ready (stop condition)
				if (this.areAllTablesReady()) {
					logger.info('All tables ready, stopping polling', { component: 'SmartGalleryFeed' });
					this.#isActive = false;
					this.onComplete?.();
					return;
				}

				try {
					// Incremental refresh
					const since = firstRun ? 0 : this.#lastUpdate;
					const images = await listImagesSince({ since, admin: true, limit: 100 });
					const changeCount = images.length;

					logger.debug('Refreshed images', { component: 'SmartGalleryFeed', count: changeCount });
					this.#lastUpdate = Date.now();
					firstRun = false;
					update();
					this.onUpdate?.(changeCount);

					// Reset backoff on successful update
					this.#backoffMultiplier = 1;
				} catch (error) {
					logger.warn('Poll error', { component: 'SmartGalleryFeed' }, error as any);
					// Increase backoff on error
					this.updateBackoff();
				}

				// Schedule next poll if still active
				if (this.#isActive && !this.areAllTablesReady()) {
					const nextInterval = this.basePollInterval * this.#backoffMultiplier;
					logger.debug('Next poll scheduled', {
						component: 'SmartGalleryFeed',
						nextInterval,
						backoff: this.#backoffMultiplier
					});
					this.#pollInterval = setTimeout(poll, nextInterval);
				}
			};

			// Start initial poll
			poll();

			// Return cleanup function
			return () => {
				logger.info('Stopping smart polling', { component: 'SmartGalleryFeed' });
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
		const filledCount = this.getFilledTableCount();

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
		logger.info('Manual refresh triggered', { component: 'SmartGalleryFeed' });
		this.#lastUpdate = Date.now();

		try {
			const images = await listImagesSince({ since: 0, admin: true, limit: 100 });
			const changeCount = images.length;
			this.onUpdate?.(changeCount);
			// Reset backoff on manual refresh
			this.#backoffMultiplier = 1;
		} catch (error) {
			logger.warn('Manual refresh error', { component: 'SmartGalleryFeed' }, error as any);
		}
	}

	// Change base polling interval
	setInterval(ms: number) {
		this.basePollInterval = ms;
		logger.debug('Base interval changed', { component: 'SmartGalleryFeed', ms });
	}

	// Stop polling manually
	stop() {
		logger.info('Manual stop requested', { component: 'SmartGalleryFeed' });
		this.#isActive = false;
		if (this.#pollInterval) {
			clearTimeout(this.#pollInterval);
			this.#pollInterval = null;
		}
	}

	// Resume polling if stopped
	resume() {
		if (!this.#isActive && !this.areAllTablesReady()) {
			logger.info('Resuming polling', { component: 'SmartGalleryFeed' });
			this.#isActive = true;
			this.#subscribe();
		}
	}

	// Helper methods using workspace system
	private areAllTablesReady(): boolean {
		return getAllWorkspaces().filter((w: WorkspaceData) => w.isLocked).length >= 10;
	}

	private getFilledTableCount(): number {
		return getAllWorkspaces().filter((w: WorkspaceData) => w.gallery?.currentUrl).length;
	}
}
