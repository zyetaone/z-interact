<script lang="ts">
	import { onMount } from 'svelte';
	import { galleryImages, isGalleryLoading, galleryError, galleryActions, galleryStats, hasImages } from '$lib/stores/gallery.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { Button } from '$lib/components/ui';
	import { goto } from '$app/navigation';
	import { sseClient } from '$lib/services/sse-client';


	// Convert stores to reactive state using Svelte 5
	let images = $state([]);
	let isLoading = $state(true);
	let error = $state(null);
	let stats = $state({});



	// Initialize reactive state from stores
	$effect(() => {
		// Subscribe to store changes
		const unsubImages = galleryImages.subscribe(current => images = current);
		const unsubLoading = isGalleryLoading.subscribe(current => isLoading = current);
		const unsubError = galleryError.subscribe(current => error = current);
		const unsubStats = galleryStats.subscribe(current => stats = current);

		return () => {
			unsubImages();
			unsubLoading();
			unsubError();
			unsubStats();
		};
	});

	// Initialize gallery on mount
	onMount(async () => {
		// Initialize gallery store
		await galleryActions.initialize();

		// Set up SSE for real-time updates
		sseClient.connect();

		// Listen for new images
		sseClient.on('image_locked', (event) => {
			console.log('🆕 New image locked:', event.data);
			// Convert to gallery format and add
			const newImage = {
				id: event.data.id,
				personaId: event.data.personaId,
				personaTitle: event.data.personaTitle,
				imageUrl: event.data.imageUrl,
				prompt: event.data.prompt,
				provider: event.data.provider,
				createdAt: event.data.createdAt,
				isLoading: false,
				error: null
			};
			galleryActions.addImage(newImage);
			toastStore.success(`New image submitted for ${event.data.personaTitle}!`);
		});

		// Listen for connection status
		sseClient.on('connected', (event) => {
			console.log('🔗 Connected to real-time updates');
		});

		return () => {
			sseClient.disconnect();
		};
	});

	onMount(() => {
		// Gallery initialization is handled by the store
	});

	async function clearAllImages() {
		if (confirm('Are you sure you want to clear all locked images? This cannot be undone.')) {
			try {
				const response = await fetch('/api/images', { method: 'DELETE' });
				if (response.ok) {
					galleryActions.clearImages();
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

	// Handle image loading errors
	function handleImageError(imageId: string) {
		galleryActions.setImageError(imageId, 'Image expired or unavailable');
		console.log(`❌ Image failed to load: ${imageId}`);
	}

	// Check if image URL is expired (for OpenAI URLs)
	function isImageExpired(imageUrl: string): boolean {
		if (!imageUrl.includes('oaidalleapiprodscus.blob.core.windows.net')) {
			return false; // Not an OpenAI URL
		}

		try {
			const url = new URL(imageUrl);
			const se = url.searchParams.get('se'); // expiry time
			if (se) {
				const expiryTime = new Date(se);
				const now = new Date();
				return now > expiryTime;
			}
		} catch (error) {
			console.error('Error parsing image URL:', error);
		}

		return false;
	}

	// Navigate to individual image page
	function viewImage(image: any) {
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
		</header>



		<!-- Stats Section -->
		<section class="mb-8">
			<div class="bg-white rounded-xl shadow-lg p-6">
				<h3 class="text-xl font-semibold mb-4 text-slate-900">Gallery Stats</h3>
				<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div class="text-center">
						<div class="text-2xl font-bold text-blue-600">{stats.totalImages || 0}</div>
						<div class="text-sm text-slate-600">Total Designs</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-green-600">{stats.totalPersonas || 0}</div>
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
					<Button onclick={() => galleryActions.initialize()} variant="outline">
						Try Again
					</Button>
				</div>
			</div>
		{:else if images.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each images as image (image.id)}
					<div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer" onclick={() => viewImage(image)}>
						<div class="aspect-video bg-slate-100 relative">
							{#if isImageExpired(image.imageUrl)}
								<!-- Expired image placeholder -->
								<div class="absolute inset-0 flex items-center justify-center bg-slate-200 text-slate-500">
									<div class="text-center">
										<div class="text-4xl mb-2">⏰</div>
										<div class="text-sm">Image expired</div>
										<div class="text-xs mt-1 opacity-75">Generated {new Date(image.createdAt).toLocaleDateString()}</div>
									</div>
								</div>
							{:else if image.error}
								<!-- Error state -->
								<div class="absolute inset-0 flex items-center justify-center bg-red-50 text-red-600">
									<div class="text-center">
										<div class="text-4xl mb-2">❌</div>
										<div class="text-sm">{image.error}</div>
									</div>
								</div>
							{:else}
								<!-- Normal image -->
								<img
									src={image.imageUrl}
									alt="Workspace for {image.personaTitle}"
									class="w-full h-full object-cover"
									onerror={() => handleImageError(image.id)}
									loading="lazy"
								/>
							{/if}
							<div class="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
								{image.provider}
							</div>
							{#if image.isLoading}
								<div class="absolute inset-0 flex items-center justify-center bg-black/50">
									<div class="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></div>
								</div>
							{/if}
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
					<h3 class="text-xl font-semibold mb-4 text-slate-900">Designs by Persona</h3>
					<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
						{#each Object.entries(stats.imagesByProvider || {}) as [provider, count]}
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