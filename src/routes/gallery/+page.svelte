<script lang="ts">
	import { goto } from '$app/navigation';
	import { globalConfig } from '$lib/config.svelte';
	import { Button } from '$lib/components/ui';
	import QRCodeGenerator from '$lib/components/ui/qr-code-generator.svelte';
	import { QRModal } from '$lib/components/ui';
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let images = $state(data.images || []);
	let refreshInterval: NodeJS.Timeout | null = null;

	// Set up 30-second auto-refresh for database images
	onMount(() => {
		refreshInterval = setInterval(async () => {
			try {
				const response = await fetch('/api/images');
				if (response.ok) {
					const newImages = await response.json();
					images = newImages;
				}
			} catch (error) {
				console.error('Failed to refresh images:', error);
			}
		}, 30000); // 30 seconds
	});

	onDestroy(() => {
		if (refreshInterval) {
			clearInterval(refreshInterval);
		}
	});

	// Flatten all images for grid layout
	const allImages = $derived(
		images.map((img) => ({
			...img,
			persona: globalConfig.personas[img.personaId] || { title: 'Unknown', id: img.personaId }
		}))
	);

	function getTableDisplayName(tableId: string | null): string {
		if (!tableId) return 'Unknown';
		const table = globalConfig.tables.find((t) => t.id === tableId);
		return table?.displayName || 'Unknown Table';
	}

	function handleImageClick(imageId: string) {
		goto(`/gallery/${imageId}`);
	}

	function getTableURL(tableId: string): string {
		if (!browser) return '';
		const baseUrl = window.location.origin;
		return `${baseUrl}/table/${tableId}`;
	}

	// Modal state for QR display
	let showQRModal = $state(false);
	let selectedTableId = $state<string>('');
	let selectedTableName = $state<string>('');
	let selectedTableURL = $state<string>('');

	function openQRModal(tableId: string) {
		selectedTableId = tableId;
		selectedTableName = getTableDisplayName(tableId);
		selectedTableURL = getTableURL(tableId);
		showQRModal = true;
	}
</script>

<svelte:head>
	<title>Z-Interact Gallery</title>
	<meta name="description" content="Beautiful gallery of AI-generated workspace designs" />
</svelte:head>

<main
	class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pt-16 dark:from-gray-900 dark:to-gray-800"
>
	<!-- Gallery Grid -->
	<div class="px-6 py-8 lg:px-8">
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{#each Array(10) as _, index}
				{@const tableId = String(index + 1)}
				{@const existingImage = allImages.find((img) => img.tableId === tableId)}

				{#if existingImage}
					<!-- Filled slot with image -->
					<button
						class="relative aspect-square cursor-pointer overflow-hidden rounded-xl shadow-md transition-all duration-300 hover:scale-105 hover:shadow-2xl"
						onclick={() => handleImageClick(existingImage.id)}
					>
						<img
							src={existingImage.imageUrl}
							alt={existingImage.prompt}
							class="h-full w-full object-cover"
							loading="lazy"
						/>

						<!-- Persistent table badge -->
						<div
							class="absolute top-2 left-2 rounded-md bg-slate-900/80 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm"
						>
							{getTableDisplayName(tableId)}
						</div>
					</button>
				{:else}
					<!-- Empty slot with full QR code -->
					<button
						class="group relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-white shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
						onclick={() => openQRModal(tableId)}
					>
						<!-- Full-coverage QR code -->
						<div class="absolute inset-0 flex items-center justify-center p-2">
							<div class="qr-container h-full w-full">
								<QRCodeGenerator url={getTableURL(tableId)} size={300} class="qr-responsive" />
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
