<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui';


	let imageId = $derived($page.params.imageId);
	let image = $state(null);
	let isLoading = $state(true);
	let error = $state(null);

	// Fetch image data
	async function fetchImage() {
		try {
			const response = await fetch('/api/images');
			if (!response.ok) {
				throw new Error('Failed to fetch images');
			}
			const images = await response.json();
			const foundImage = images.find((img: any) => img.id === imageId);

			if (!foundImage) {
				throw new Error('Image not found');
			}

			image = foundImage;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load image';
		} finally {
			isLoading = false;
		}
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

	// Handle image error
	function handleImageError() {
		if (image) {
			image.error = 'Failed to load image';
		}
	}

	$effect(() => {
		if (imageId) {
			fetchImage();
		}
	});

	function goBack() {
		goto('/gallery');
	}
</script>

<svelte:head>
	<title>{image ? `${image.personaTitle} - Z-Interact Gallery` : 'Image - Z-Interact Gallery'}</title>
	<meta name="description" content={image ? `View ${image.personaTitle} workspace design generated with AI` : 'View AI-generated workspace design'} />
</svelte:head>

<main class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">


	<div class="w-full p-4 md:p-8">
		<!-- Back Button -->
		<div class="mb-6">
			<Button variant="outline" onclick={goBack} class="flex items-center gap-2">
				← Back to Gallery
			</Button>
		</div>

		{#if isLoading}
			<!-- Loading State -->
			<div class="flex items-center justify-center min-h-[60vh]">
				<div class="text-center">
					<div class="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
					<p class="text-slate-600">Loading image...</p>
				</div>
			</div>
		{:else if error}
			<!-- Error State -->
			<div class="flex items-center justify-center min-h-[60vh]">
				<div class="text-center">
					<div class="text-6xl mb-4">❌</div>
					<h2 class="text-2xl font-semibold text-slate-900 mb-2">Error Loading Image</h2>
					<p class="text-slate-600 mb-4">{error}</p>
					<Button onclick={goBack}>Back to Gallery</Button>
				</div>
			</div>
		{:else if image}
			<!-- Image Header -->
			<div class="w-full bg-white border-b">
				<div class="max-w-6xl mx-auto px-6 py-4">
					<h1 class="text-3xl font-bold text-slate-900 mb-2">{image.personaTitle}</h1>
					<div class="flex items-center gap-4 text-sm text-slate-600">
						<span>Generated {new Date(image.createdAt).toLocaleString()}</span>
						<span class="bg-slate-100 px-3 py-1 rounded-full">{image.provider}</span>
					</div>
				</div>
			</div>

			<!-- Image Content - TRUE Full Width -->
			<div class="w-full">
				{#if isImageExpired(image.imageUrl)}
					<!-- Expired image placeholder -->
					<div class="w-full flex items-center justify-center bg-slate-200 text-slate-500" style="height: 80vh;">
						<div class="text-center">
							<div class="text-9xl mb-6">⏰</div>
							<div class="text-3xl mb-3">Image expired</div>
							<div class="text-xl opacity-75">Generated {new Date(image.createdAt).toLocaleDateString()}</div>
						</div>
					</div>
				{:else if image.error}
					<!-- Error state -->
					<div class="w-full flex items-center justify-center bg-red-50 text-red-600" style="height: 80vh;">
						<div class="text-center">
							<div class="text-9xl mb-6">❌</div>
							<div class="text-3xl mb-3">{image.error}</div>
						</div>
					</div>
				{:else}
					<!-- Normal image - TRUE Full Viewport Width -->
					<div class="w-screen relative left-1/2 right-1/2 -mx-[50vw]">
						<img
							src={image.imageUrl}
							alt="Workspace for {image.personaTitle}"
							class="w-full h-auto max-h-[90vh] object-contain"
							onerror={handleImageError}
						/>
					</div>
				{/if}
			</div>

			<!-- Image Content - TRUE Full Width -->
				<div class="p-0">
					{#if isImageExpired(image.imageUrl)}
						<!-- Expired image placeholder -->
						<div class="flex items-center justify-center bg-slate-200 text-slate-500 rounded-none" style="height: 80vh;">
							<div class="text-center">
								<div class="text-9xl mb-6">⏰</div>
								<div class="text-3xl mb-3">Image expired</div>
								<div class="text-xl opacity-75">Generated {new Date(image.createdAt).toLocaleDateString()}</div>
							</div>
						</div>
					{:else if image.error}
						<!-- Error state -->
						<div class="flex items-center justify-center bg-red-50 text-red-600 rounded-none" style="height: 80vh;">
							<div class="text-center">
								<div class="text-9xl mb-6">❌</div>
								<div class="text-3xl mb-3">{image.error}</div>
							</div>
						</div>
					{:else}
						<!-- Normal image - Full width -->
						<div class="w-full">
							<img
								src={image.imageUrl}
								alt="Workspace for {image.personaTitle}"
								class="w-full h-auto max-h-[90vh] object-contain"
								onerror={handleImageError}
							/>
						</div>
					{/if}
				</div>

			<!-- Image Details - Full Width -->
			<div class="w-full bg-slate-50 border-t">
				<div class="max-w-6xl mx-auto px-8 py-6">
					<h2 class="text-2xl font-semibold text-slate-900 mb-6">Generation Details</h2>
					<div class="space-y-6">
						<div>
							<label class="text-base font-medium text-slate-700 block mb-3">AI Prompt:</label>
							<div class="bg-white p-6 rounded-lg border text-slate-600 leading-relaxed text-lg shadow-sm">
								{image.prompt}
							</div>
						</div>
						<div class="grid md:grid-cols-3 gap-6">
							<div>
								<label class="text-base font-medium text-slate-700 block mb-3">Persona:</label>
								<div class="bg-white p-4 rounded-lg border text-slate-600 text-lg shadow-sm">
									{image.personaTitle}
								</div>
							</div>
							<div>
								<label class="text-base font-medium text-slate-700 block mb-3">AI Provider:</label>
								<div class="bg-white p-4 rounded-lg border text-slate-600 text-lg shadow-sm">
									{image.provider}
								</div>
							</div>
							<div>
								<label class="text-base font-medium text-slate-700 block mb-3">Generated:</label>
								<div class="bg-white p-4 rounded-lg border text-slate-600 text-lg shadow-sm">
									{new Date(image.createdAt).toLocaleString()}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</main>