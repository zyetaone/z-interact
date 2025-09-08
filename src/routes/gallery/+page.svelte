<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { globalConfig } from '$lib/config.svelte';
	import { imageStore, lockImage as lockImageStore } from '$lib/stores/image-store.svelte';
	import { SmartGalleryFeed } from '$lib/realtime/smart-feed.svelte';
	import QRCodeGenerator from '$lib/components/ui/qr-code-generator.svelte';
	import { QRModal } from '$lib/components/ui';
	import { browser } from '$app/environment';
	import { formatDate, getTableDisplayName } from '$lib/utils/image-utils';
	import ImageWithLoader from '$lib/components/ui/image-with-loader.svelte';
	import { getContext, onMount, onDestroy } from 'svelte';

	// Streaming mode flag (can be toggled for testing)
	let useStreaming = $state(true);

	// Get app context to register refresh function
	const appContext = getContext('app-context') as {
		setGalleryRefresh?: (fn: (() => void) | null) => void;
	};

	// Initialize the central image store (client-only)
	$effect(() => {
		if (browser) {
			imageStore.initialize();
		}
	});

	// Set up streaming or polling based on mode (client-only)
	$effect(() => {
		// Only start streaming/polling on client side
		if (!browser) return;

		if (useStreaming) {
			// Try streaming first
			console.log('[Gallery] Starting streaming mode...');
			let cancelled = false;

			(async () => {
				try {
					// Start streaming
					await imageStore.subscribeToStream();
				} catch (error) {
					console.error('[Gallery] Streaming failed:', error);
					if (!cancelled) {
						// Fall back to polling
						console.log('[Gallery] Falling back to polling mode...');
						useStreaming = false;
					}
				}
			})();

			// Cleanup on unmount or mode change
			return () => {
				cancelled = true;
				imageStore.stopStream();
			};
		} else {
			// Use polling as fallback
			console.log('[Gallery] Using polling mode...');
			feed.resume();

			return () => {
				feed.stop();
			};
		}
	});

	// Create smart gallery feed for fallback polling
	const feed = new SmartGalleryFeed(5000); // Start with 5 second polling

	// Set up feed callbacks
	feed.onUpdate = (changeCount) => {
		console.log(`[Gallery] Polling: Received ${changeCount} updates`);
	};

	feed.onComplete = () => {
		console.log('[Gallery] Polling: All tables complete! Stopped.');
	};

	// Manual refresh function (works with both modes)
	async function refreshGallery() {
		console.log('[Gallery] Manual refresh triggered');
		if (useStreaming && imageStore.streamActive) {
			// Restart stream
			await imageStore.subscribeToStream();
		} else {
			// Use polling refresh
			await imageStore.refresh();
			await feed.refresh();
		}
	}

	// Derived state from central store
	const tables = $derived(globalConfig.tables);
	const allTablesReady = $derived(imageStore.areAllTablesReady());
	const filledCount = $derived(imageStore.getFilledTableCount());

	// Lock image using central store with optimistic update
	async function handleLockImage(tableId: string, image: any) {
		try {
			// Use central store for optimistic update
			await lockImageStore({
				tableId,
				personaId: image.personaId,
				imageUrl: image.imageUrl || image.displayUrl,
				prompt: image.prompt
			});

			// Trigger immediate refresh
			await feed.refresh();
		} catch (error) {
			console.error('Failed to lock image:', error);
		}
	}

	function handleImageClick(imageId: string) {
		goto(`${base}/gallery/${imageId}`);
	}

	function getTableURL(tableId: string): string {
		if (!browser) return '';
		const baseUrl = window.location.origin;
		return `${baseUrl}/table/${tableId}`;
	}

	let showQRModal = $state(false);
	let selectedTableId = $state<string>('');
	let selectedTableURL = $state<string>('');

	function openQRModal(tableId: string) {
		selectedTableId = tableId;
		selectedTableURL = getTableURL(tableId);
		showQRModal = true;
	}

	// Register refresh function with navigation
	onMount(() => {
		if (appContext?.setGalleryRefresh) {
			appContext.setGalleryRefresh(refreshGallery);
		}
	});

	// Clean up on unmount
	onDestroy(() => {
		if (appContext?.setGalleryRefresh) {
			appContext.setGalleryRefresh(null);
		}
	});
</script>

<svelte:head>
	<title>Zyeta x CORENET 2025 Gallery</title>
	<meta name="description" content="Beautiful gallery of AI-generated workspace designs" />
</svelte:head>

<main
	class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pt-16 dark:from-gray-900 dark:to-gray-800"
>
	<!-- Gallery Grid -->
	<div class="px-6 py-6 lg:px-8">
		<!-- Minimal status indicator -->
		<div
			class="mb-4 flex items-center justify-center gap-3 text-xs text-gray-600 dark:text-gray-400"
		>
			<span class="font-medium">{filledCount}/10</span>
			{#if useStreaming && imageStore.streamActive}
				<span class="relative flex h-2 w-2" title="Live">
					<span
						class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"
					></span>
					<span class="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
				</span>
			{:else if !useStreaming && feed.active}
				<span class="relative flex h-2 w-2" title="Active">
					<span
						class="absolute inline-flex h-full w-full animate-pulse rounded-full bg-blue-400 opacity-75"
					></span>
					<span class="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
				</span>
			{:else}
				<span class="h-2 w-2 rounded-full bg-gray-400" title="Paused"></span>
			{/if}
		</div>

		<!-- Gallery grid using central store -->
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{#each tables as table (table.id)}
				{@const tableImages = imageStore.getImagesForTable(table.id)}
				{@const existingImage = tableImages[0]}

				{#if existingImage}
					<!-- Filled slot with image -->
					<div
						class="group relative aspect-square cursor-pointer overflow-hidden rounded-xl shadow-md transition-all duration-300 hover:scale-105 hover:shadow-2xl"
						onclick={() => handleImageClick(existingImage.id)}
						onkeydown={(e: KeyboardEvent) =>
							(e.key === 'Enter' || e.key === ' ') && handleImageClick(existingImage.id)}
						role="button"
						tabindex="0"
						aria-label="View image details"
					>
						<!-- Simple image display -->
						<ImageWithLoader
							src={existingImage.imageUrl || ''}
							alt={existingImage.prompt}
							class="h-full w-full object-cover"
							loading="lazy"
						/>

						<!-- Table number badge -->
						<div
							class="absolute top-2 left-2 rounded-md bg-slate-900/80 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm"
						>
							{getTableDisplayName(table.id)}
						</div>

						<!-- Generation date badge -->
						<div
							class="absolute bottom-2 left-2 rounded-md bg-slate-900/80 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm"
						>
							{formatDate(existingImage.createdAt)}
						</div>

						<!-- Lock status indicator -->
						{#if imageStore.tableIsReady(table.id)}
							<div class="absolute right-2 bottom-2 rounded bg-green-500/80 px-2 py-1">
								<svg class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
						{/if}
					</div>
				{:else}
					<!-- Empty slot with full QR code -->
					<button
						class="group relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-white shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
						onclick={() => openQRModal(table.id)}
					>
						<!-- Full-coverage QR code -->
						<div class="absolute inset-0 flex items-center justify-center p-2">
							<div class="qr-container h-full w-full">
								<QRCodeGenerator url={getTableURL(table.id)} size={300} class="qr-responsive" />
							</div>
						</div>

						<!-- Subtle hover overlay -->
						<div
							class="absolute inset-0 flex items-center justify-center bg-blue-600/10 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100"
						>
							<div class="rounded-lg bg-white/90 px-3 py-1 text-xs font-medium text-slate-700">
								Click to enlarge
							</div>
						</div>
					</button>
				{/if}
			{/each}
		</div>
	</div>
</main>

<!-- QR Code Modal -->
<QRModal bind:open={showQRModal} tableNumber={parseInt(selectedTableId)} url={selectedTableURL} />

<style>
	.qr-container :global(.qr-code-container) {
		display: block !important;
		width: 100% !important;
		height: 100% !important;
	}

	.qr-container :global(.qr-responsive) {
		width: 100% !important;
		height: 100% !important;
		object-fit: contain !important;
	}

	.qr-container :global(.qr-responsive img) {
		width: 100% !important;
		height: 100% !important;
		object-fit: contain !important;
	}
</style>
