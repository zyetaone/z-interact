import type { LockedImage } from '$lib/types';
import type { Image } from '$lib/server/db/schema';
import { listImages, subscribeToGalleryUpdates } from '../../routes/gallery/gallery.remote';
import { lockImage as lockImageRF } from '../../routes/table/ai.remote';

// No deserialization needed - numbers are POJO-friendly

type StreamEvent =
	| { type: 'sync'; data: Image[]; timestamp: number }
	| { type: 'update'; data: Image[]; timestamp: number }
	| {
			type: 'complete';
			data: Record<string, { ready: boolean; hasImage: boolean }>;
			timestamp: number;
	  }
	| { type: 'end'; reason: string; timestamp: number };

class ImageStore {
	// Simple reactive state
	images = $state<Image[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);

	// Streaming state
	private streamController?: AbortController;
	private isStreaming = $state(false);
	private lastSync = $state(0);

	// Stream status for UI
	get streamActive() {
		return this.isStreaming;
	}

	// Simple initialization
	async initialize() {
		if (this.images.length > 0) return;

		this.loading = true;
		this.error = null;

		try {
			this.images = await listImages({});
			this.lastSync = Date.now();
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Failed to load images';
		} finally {
			this.loading = false;
		}
	}

	// Subscribe to streaming updates (client-only)
	async subscribeToStream() {
		// Ensure we're on the client
		if (typeof window === 'undefined') {
			console.warn('[ImageStore] Cannot start streaming on server side');
			return;
		}

		// Abort any existing stream
		this.stopStream();

		this.streamController = new AbortController();
		this.isStreaming = true;
		this.error = null;

		try {
			// Start the streaming query - await to get the async generator
			const stream = await subscribeToGalleryUpdates({
				since: this.lastSync || Date.now()
			});

			// Consume the stream
			for await (const event of stream) {
				// Check if aborted
				if (this.streamController.signal.aborted) break;

				this.handleStreamEvent(event as StreamEvent);
			}
		} catch (error) {
			console.error('Stream error:', error);
			this.error = error instanceof Error ? error.message : 'Stream failed';

			// Fall back to polling
			console.log('Falling back to polling...');
			// The SmartGalleryFeed will handle polling
		} finally {
			this.isStreaming = false;
		}
	}

	// Handle stream events
	handleStreamEvent(event: StreamEvent) {
		switch (event.type) {
			case 'sync':
				// Full sync - replace all images
				this.images = event.data as any[];
				this.lastSync = event.timestamp;
				console.log('[ImageStore] Synced', event.data.length, 'images');
				break;

			case 'update':
				// Incremental update - merge changes
				this.mergeUpdates(event.data as any[]);
				this.lastSync = event.timestamp;
				console.log('[ImageStore] Updated with', event.data.length, 'changes');
				break;

			case 'complete':
				// All tables complete
				console.log('[ImageStore] All tables complete!', event.data);
				break;

			case 'end':
				// Stream ended
				console.log('[ImageStore] Stream ended:', event.reason);
				if (event.reason === 'timeout') {
					// Restart stream after a brief pause
					setTimeout(() => {
						if (this.streamController && !this.streamController.signal.aborted) {
							this.subscribeToStream();
						}
					}, 1000);
				}
				break;
		}
	}

	// Merge updates into existing images
	private mergeUpdates(updates: any[]) {
		const imageMap = new Map(this.images.map((img) => [img.id, img]));

		// Update or add images
		for (const update of updates) {
			imageMap.set(update.id, update);
		}

		// Convert back to array and sort by date
		this.images = Array.from(imageMap.values()).sort((a, b) => {
			const dateA = b.createdAt || 0;
			const dateB = a.createdAt || 0;
			return dateA - dateB;
		});
	}

	// Stop streaming
	stopStream() {
		this.streamController?.abort();
		this.streamController = undefined;
		this.isStreaming = false;
	}

	// Simple refresh
	async refresh() {
		this.loading = true;
		this.error = null;

		try {
			this.images = await listImages({});
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Failed to refresh';
		} finally {
			this.loading = false;
		}
	}

	// Lock an image
	async lockImage(image: LockedImage) {
		try {
			await lockImageRF({
				personaId: image.personaId,
				imageUrl: image.imageUrl,
				prompt: image.prompt || '',
				tableId: image.tableId
			});

			// Refresh to get updated data
			await this.refresh();
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Failed to lock image';
			throw error;
		}
	}

	// Get locked image by table ID
	getLockedImageByTable(tableId: string): LockedImage | undefined {
		return this.images.find(
			(img) => img.tableId === tableId && (img.status === 'locked' || img.status === 'saved')
		) as LockedImage;
	}

	// Get images for a specific table
	getImagesForTable(tableId: string): Image[] {
		return this.images.filter((img) => img.tableId === tableId);
	}

	// Check if a table has any images
	tableHasImage(tableId: string): boolean {
		return this.images.some((img) => img.tableId === tableId);
	}

	// Check if a table is ready (has locked image)
	tableIsReady(tableId: string): boolean {
		return this.images.some(
			(img) => img.tableId === tableId && (img.status === 'locked' || img.status === 'saved')
		);
	}

	// Get count of tables with images
	getFilledTableCount(): number {
		const tablesWithImages = new Set(this.images.map((img) => img.tableId).filter(Boolean));
		return tablesWithImages.size;
	}

	// Check if all tables are ready
	areAllTablesReady(): boolean {
		const tablesWithLockedImages = new Set(
			this.images
				.filter((img) => img.status === 'locked' || img.status === 'saved')
				.map((img) => img.tableId)
				.filter(Boolean)
		);
		return tablesWithLockedImages.size >= 10; // Assuming 10 tables
	}
}

// Create singleton instance
export const imageStore = new ImageStore();

// Export functions for backward compatibility
export const initialize = () => imageStore.initialize();
export const lockImage = (image: LockedImage) => imageStore.lockImage(image);
export const getLockedImageByTable = (tableId: string) => imageStore.getLockedImageByTable(tableId);
export const refreshImages = () => imageStore.refresh();
export const getImagesForTable = (tableId: string) => imageStore.getImagesForTable(tableId);
export const tableHasImage = (tableId: string) => imageStore.tableHasImage(tableId);
export const tableIsReady = (tableId: string) => imageStore.tableIsReady(tableId);
export const areAllTablesReady = () => imageStore.areAllTablesReady();
