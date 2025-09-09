<script lang="ts">
	import { globalConfig } from '$lib/stores/config-store.svelte';
	import {
		getAllWorkspaces,
		getWorkspace,
		getProgressBadges,
		getOverallProgress,
		syncWorkspaces
	} from '$lib/stores/workspace-store.svelte';
	import { QRModal, ImageWithLoader, GlassCard } from '$lib/components/ui';
	import QRCodeGenerator from '$lib/components/ui/qr-code-generator.svelte';
	import { browser } from '$app/environment';
	import { getContext, onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { logger } from '$lib/utils/logger';

	// Get app context to register refresh function
	const appContext = getContext('app-context') as {
		setGalleryRefresh?: (fn: (() => void) | null) => void;
		setGalleryRefreshing?: (refreshing: boolean) => void;
	};

	// Direct derived values - using getter functions for Svelte 5 compatibility
	const tables = $derived(globalConfig.tables);
	const workspaces = $derived(getAllWorkspaces());
	const badges = $derived(getProgressBadges());
	const progress = $derived(getOverallProgress());

	// Manual refresh function
	async function refreshGallery() {
		syncGallery();
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

	function handleImageClick(tableId: string) {
		goto(`${base}/gallery/${tableId}`);
	}

	async function syncGallery() {
		appContext?.setGalleryRefreshing?.(true);
		await syncWorkspaces({
			limit: 100,
			reset: true,
			onSuccess: async (images) => {
				logger.info('Gallery synced with database', {
					component: 'GalleryPage',
					count: images.length
				});
			},
			onFinally: () => appContext?.setGalleryRefreshing?.(false)
		});
	}

	// Register refresh function with navigation and sync with database
	onMount(async () => {
		if (appContext?.setGalleryRefresh) {
			appContext.setGalleryRefresh(refreshGallery);
		}

		// Initial sync
		if (browser) await syncGallery();
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
	<!-- Progress bar near the nav -->
	<div class="mx-auto max-w-7xl px-4 lg:px-6">
		<div class="pt-1 md:pt-2">
			<div
				class="flex items-center justify-between text-[11px] text-gray-600 md:text-xs dark:text-gray-400"
			>
				<span class="font-semibold">{progress}% Complete</span>
			</div>
			<div class="mt-1 h-1 w-full rounded-full bg-gray-200 md:h-2 dark:bg-gray-700">
				<div
					class="h-full rounded-full bg-blue-600 transition-all duration-300"
					style="width: {progress}%"
				></div>
			</div>
		</div>
	</div>

	<!-- Gallery Grid (centered on desktop) -->
	<div
		class="mx-auto max-w-7xl px-4 py-4 md:flex md:min-h-[calc(100vh-10rem)] md:flex-col md:justify-center md:py-2 lg:px-6"
	>
		<!-- Snippet: render a single gallery card (filled or QR) -->
		{#snippet galleryCard(table: any, workspace: any, badge: any)}
			{#if workspace?.gallery?.currentUrl}
				<!-- Filled: Image Card -->
				<button
					class="w-full text-left"
					onclick={() => handleImageClick(table.id)}
					onkeydown={(e: KeyboardEvent) =>
						(e.key === 'Enter' || e.key === ' ') && handleImageClick(table.id)}
					aria-label={`View image for ${table.displayName}`}
				>
					<GlassCard
						class="group relative aspect-square cursor-pointer overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl"
					>
						<ImageWithLoader
							src={workspace.gallery.currentUrl}
							alt={workspace.gallery.prompt || `AI generated image for ${table.displayName}`}
							class="h-full w-full object-cover"
							loading="lazy"
							message="Rendering concept…"
						/>
						<div
							class="absolute top-2 left-2 rounded-md bg-slate-900/80 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm"
						>
							{table.displayName}
						</div>
						{#if workspace.isLocked}
							<div
								class="absolute right-2 bottom-2 rounded-full bg-green-500/90 p-1.5 text-white shadow-md backdrop-blur-sm"
							>
								<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
						{/if}
					</GlassCard>
				</button>
			{:else}
				<!-- Empty: QR Code Card -->
				<GlassCard
					class="group relative aspect-square overflow-hidden p-3 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
				>
					<button
						class="absolute inset-0"
						onclick={() => openQRModal(table.id)}
						aria-label={`Show QR code for ${table.displayName}`}
					>
						<QRCodeGenerator url={getTableURL(table.id)} size={500} class="qr-fill-container" />

						{#if badge?.progress > 0}
							<div
								class="absolute top-2 right-2 rounded-full bg-blue-600/90 px-2 py-0.5 text-xs font-semibold text-white shadow-md backdrop-blur-sm"
							>
								{badge.progress}%
							</div>
						{/if}

						{#if badge?.isActive}
							<div class="absolute top-2 left-2">
								<span class="relative flex h-3 w-3">
									<span
										class="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"
									></span>
									<span class="relative inline-flex h-3 w-3 rounded-full bg-blue-500"></span>
								</span>
							</div>
						{/if}

						<div
							class="absolute inset-0 flex items-center justify-center bg-blue-600/10 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100"
						>
							<div
								class="rounded-lg bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 shadow-md dark:bg-gray-900/80 dark:text-slate-200"
							>
								{badge?.progress > 0 ? 'In Progress' : 'Scan QR Code'}
							</div>
						</div>
					</button>
				</GlassCard>
			{/if}
		{/snippet}

		<!-- Gallery grid using config state -->
		<div
			class="grid grid-cols-2 gap-1 sm:grid-cols-3 sm:gap-x-2 sm:gap-y-2 lg:grid-cols-4 lg:gap-x-3 lg:gap-y-3 xl:grid-cols-5 xl:gap-x-3 xl:gap-y-3 2xl:grid-cols-5"
		>
			{#each tables as table (table.id)}
				{@render galleryCard(table, getWorkspace(table.id), badges[table.id])}
			{/each}
		</div>
	</div>
</main>

<!-- QR Code Modal -->
<QRModal bind:open={showQRModal} tableNumber={parseInt(selectedTableId)} url={selectedTableURL} />

<style>
	/* Make QR code fill container */
	:global(.qr-fill-container) {
		width: 100% !important;
		height: 100% !important;
		display: flex !important;
		align-items: center !important;
		justify-content: center !important;
	}

	:global(.qr-fill-container img) {
		width: 100% !important;
		height: 100% !important;
		max-width: 100% !important;
		max-height: 100% !important;
		object-fit: contain !important;
	}
</style>
