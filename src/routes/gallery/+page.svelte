<script lang="ts">
	import { onMount } from 'svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { Button } from '$lib/components/ui';
	import { goto } from '$app/navigation';
	import { sseClient } from '$lib/services/sse-client';

	interface GalleryImage {
		id: string;
		personaId: string;
		personaTitle: string;
		imageUrl: string;
		imageData?: string;
		imageMimeType?: string;
		prompt: string;
		provider: string;
		createdAt: string;
		error?: string | null;
	}

	// Simple reactive state
	let images = $state<GalleryImage[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let sseConnected = $state(false);
	let lastUpdate = $state(0);
	
	// Computed stats
	let stats = $derived({
		totalImages: images.length,
		totalPersonas: new Set(images.map(img => img.personaId)).size,
		imagesByProvider: images.reduce((acc, img) => {
			acc[img.provider] = (acc[img.provider] || 0) + 1;
			return acc;
		}, {} as Record<string, number>)
	});

	// Load initial images
	async function loadImages() {
		isLoading = true;
		error = null;
		
		try {
			const response = await fetch('/api/images');
			if (!response.ok) throw new Error('Failed to load images');
			
			const data = await response.json();
			images = data.map((img: any) => ({
				...img,
				error: null
			}));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load gallery';
		} finally {
			isLoading = false;
		}
	}

	// Polling fallback for when SSE fails
	let pollingInterval = $state<number | null>(null);
	
	async function startPolling() {
		if (pollingInterval) return; // Already polling
		
		pollingInterval = setInterval(async () => {
			try {
				const response = await fetch('/api/images');
				if (response.ok) {
					const freshImages = await response.json();
					// Only update if we have new images
					if (freshImages.length !== images.length) {
						const newImages = freshImages.filter((img: any) => 
							!images.some(existing => existing.id === img.id)
						);
						
						if (newImages.length > 0) {
							images = freshImages.map((img: any) => ({ ...img, error: null }));
							lastUpdate = Date.now();
							newImages.forEach((img: any) => {
								toastStore.success(`New image submitted for ${img.personaTitle}!`);
							});
						}
					}
				}
			} catch (error) {
				console.error('Polling error:', error);
			}
		}, 5000); // Poll every 5 seconds
	}
	
	function stopPolling() {
		if (pollingInterval) {
			clearInterval(pollingInterval);
			pollingInterval = null;
		}
	}

	// Initialize on mount
	onMount(async () => {
		await loadImages();

		// Try SSE first, fallback to polling on error
		try {
			sseClient.connect();
			
			// Listen for SSE connection state
			sseClient.on('connected', () => {
				sseConnected = true;
				stopPolling(); // Stop polling if SSE works
			});

			sseClient.on('image_locked', (event) => {
				console.log('🆕 New image locked:', event.data);
				const newImage = {
					...event.data,
					error: null
				};
				
				// Add or update image
				const existingIndex = images.findIndex(img => img.id === newImage.id);
				if (existingIndex >= 0) {
					images[existingIndex] = newImage;
				} else {
					images = [newImage, ...images];
				}
				
				lastUpdate = Date.now();
				toastStore.success(`New image submitted for ${event.data.personaTitle}!`);
			});

			// Start polling as fallback if SSE fails after 10 seconds
			setTimeout(() => {
				if (!sseConnected) {
					console.log('SSE failed, falling back to polling');
					startPolling();
				}
			}, 10000);

		} catch (error) {
			console.error('SSE initialization failed, using polling:', error);
			startPolling();
		}

		return () => {
			sseClient.disconnect();
			stopPolling();
		};
	});

	async function clearAllImages() {
		if (confirm('Are you sure you want to clear all locked images? This cannot be undone.')) {
			try {
				const response = await fetch('/api/images', { method: 'DELETE' });
				if (response.ok) {
					images = [];
					toastStore.success('All images cleared successfully');
				} else {
					toastStore.error('Failed to clear images');
				}
			} catch (error) {
				console.error('Error clearing images:', error);
				toastStore.error('Failed to clear images');
			}
		}
	}

	function handleImageError(imageId: string) {
		const index = images.findIndex(img => img.id === imageId);
		if (index >= 0) {
			images[index] = { ...images[index], error: 'Image expired or unavailable' };
		}
	}

	function getImageUrl(image: GalleryImage): string {
		if (image.imageData && image.imageMimeType) {
			return `/api/images/${image.id}`;
		}
		if (image.imageUrl && !isImageExpired(image.imageUrl)) {
			return image.imageUrl;
		}
		return `/api/images/${image.id}`;
	}

	function isImageExpired(imageUrl: string): boolean {
		if (!imageUrl || !imageUrl.includes('oaidalleapiprodscus.blob.core.windows.net')) {
			return false;
		}
		try {
			const url = new URL(imageUrl);
			const se = url.searchParams.get('se');
			if (se) {
				const expiryTime = new Date(se);
				return new Date() > expiryTime;
			}
		} catch (error) {
			console.error('Error parsing image URL:', error);
		}
		return false;
	}

	function viewImage(image: GalleryImage) {
		goto(`/gallery/${image.id}`);
	}
</script>

<svelte:head>
	<title>Z-Interact - Gallery</title>
	<meta name="description" content="Live gallery of AI-generated workspace designs" />
</svelte:head>

<main class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
	<div class="container mx-auto max-w-7xl">
		<!-- Header -->
		<header class="text-center mb-8">
			<h1 class="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-2">
				Live Gallery
			</h1>
			<p class="text-slate-600 text-lg">
				Real-time showcase of AI-generated workspace designs
			</p>
			<!-- Connection Status -->
			<div class="mt-3 flex justify-center">
				{#if sseConnected}
					<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
						<span class="w-2 h-2 bg-green-400 rounded-full mr-1.5 animate-pulse"></span>
						Live Updates
					</span>
				{:else if pollingInterval}
					<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
						<span class="w-2 h-2 bg-blue-400 rounded-full mr-1.5"></span>
						Polling Mode
					</span>
				{:else}
					<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
						<span class="w-2 h-2 bg-gray-400 rounded-full mr-1.5"></span>
						Connecting...
					</span>
				{/if}
			</div>
		</header>

		<!-- Stats Section -->
		<section class="mb-8">
			<div class="bg-white rounded-xl shadow-lg p-6">
				<h3 class="text-xl font-semibold mb-4 text-slate-900">Gallery Stats</h3>
				<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div class="text-center">
						<div class="text-2xl font-bold text-blue-600">{stats.totalImages}</div>
						<div class="text-sm text-slate-600">Total Designs</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-green-600">{stats.totalPersonas}</div>
						<div class="text-sm text-slate-600">Active Personas</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-purple-600">
							{images.length > 0 ?
								Math.round((Date.now() - Math.min(...images.map(img => new Date(img.createdAt).getTime()))) / 1000 / 60) : 0
							}
						</div>
						<div class="text-sm text-slate-600">Minutes Active</div>
					</div>
					<div class="text-center">
						<Button
							variant="outline"
							size="sm"
							onclick={clearAllImages}
							disabled={images.length === 0}
							class="mt-2"
						>
							Clear All
						</Button>
					</div>
				</div>
			</div>
		</section>

		<!-- Gallery Grid -->
		{#if isLoading}
			<div class="flex justify-center items-center py-16">
				<div class="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
				<span class="ml-3 text-slate-600">Loading gallery...</span>
			</div>
		{:else if error}
			<div class="text-center py-16">
				<div class="max-w-sm mx-auto">
					<div class="text-6xl mb-4">❌</div>
					<h3 class="text-xl font-medium text-red-600 mb-2">
						Error Loading Gallery
					</h3>
					<p class="text-slate-500 mb-4">{error}</p>
					<Button onclick={loadImages} variant="outline">
						Try Again
					</Button>
				</div>
			</div>
		{:else if images.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each images as image (image.id)}
					<div
						class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
						onclick={() => viewImage(image)}
						onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); viewImage(image); } }}
						role="button"
						tabindex="0"
						aria-label={`View ${image.personaTitle} workspace design`}
					>
						<div class="aspect-video bg-slate-100 relative">
							{#if image.error}
								<div class="absolute inset-0 flex items-center justify-center bg-red-50 text-red-600">
									<div class="text-center">
										<div class="text-4xl mb-2">❌</div>
										<div class="text-sm">{image.error}</div>
									</div>
								</div>
							{:else}
								<img
									src={getImageUrl(image)}
									alt="Workspace for {image.personaTitle}"
									class="w-full h-full object-cover"
									onerror={() => handleImageError(image.id)}
									loading="lazy"
								/>
							{/if}
							<div class="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
								{image.provider}
							</div>

						</div>
						<div class="p-4">
							<h3 class="font-semibold text-lg text-slate-900 mb-1">{image.personaTitle}</h3>
							<p class="text-sm text-slate-600 mb-2 line-clamp-2">{image.prompt}</p>
							<div class="flex justify-between items-center text-xs text-slate-500">
								<span>{new Date(image.createdAt).toLocaleTimeString()}</span>
								<span>{new Date(image.createdAt).toLocaleDateString()}</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-center py-16">
				<div class="max-w-sm mx-auto">
					<div class="text-6xl mb-4">🏢</div>
					<h3 class="text-xl font-medium text-slate-600 mb-2">
						Waiting for submissions...
					</h3>
					<p class="text-slate-500 mb-6">
						AI-generated workspace images will appear here in real-time as participants complete their designs.
					</p>
					<Button onclick={() => goto('/')} variant="outline">
						← Back to QR Codes
					</Button>
				</div>
			</div>
		{/if}

		<!-- Persona Breakdown -->
		{#if images.length > 0}
			<section class="mt-12">
				<div class="bg-white rounded-xl shadow-lg p-6">
					<h3 class="text-xl font-semibold mb-4 text-slate-900">Designs by Provider</h3>
					<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
						{#each Object.entries(stats.imagesByProvider) as [provider, count]}
							<div class="text-center p-4 bg-slate-50 rounded-lg">
								<div class="text-2xl font-bold text-slate-900">{count}</div>
								<div class="text-sm text-slate-600">{provider}</div>
							</div>
						{/each}
					</div>
				</div>
			</section>
		{/if}
	</div>
</main>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		line-clamp: 2;
	}
</style>