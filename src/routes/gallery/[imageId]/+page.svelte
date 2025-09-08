<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { getImageById } from '../gallery.remote';
	import ImageWithLoader from '$lib/components/ui/image-with-loader.svelte';
	import type { GalleryImage } from '$lib/types';
	import { formatDate, downloadImage, openFullscreen, getTableDisplayName } from '$lib/utils/image-utils';
	import { DownloadOutline, ExpandOutline } from 'flowbite-svelte-icons';

	// Use $state for reactive values
	let image = $state<GalleryImage | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	// Get imageId from page params reactively
	const imageId = $derived(page.params.imageId || '');

	// Fetch image data
	async function fetchImage() {
		try {
			// Use API route to get specific image
			if (!imageId) {
				throw new Error('Invalid image ID');
			}
			const foundImage = await getImageById({ imageId });

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

	// Get the best available image URL (stored > original)
	function getImageUrl(image: GalleryImage): string {
		// Prefer stored URL
		if (image.imageUrl && !isImageExpired(image.imageUrl)) {
			return image.imageUrl;
		}

		// No other fallback once API routes are removed
		return '';
	}

	// Check if image URL is expired (for temporary URLs)
	function isImageExpired(imageUrl: string): boolean {
		if (!imageUrl || !imageUrl.includes('oaidalleapiprodscus.blob.core.windows.net')) {
			return false; // Not a temporary URL or no URL
		}

		try {
			const url = new URL(imageUrl);
			const se = url.searchParams.get('se'); // expiry time
			if (se) {
				const expiryTime = new Date(se);
				const now = new Date();
				return now > expiryTime;
			}
		} catch (error) {}

		return false;
	}

	// Handle image error
	function handleImageError() {
		if (image) {
			// Create a new object to maintain immutability
			image = { ...image, error: 'Failed to load image' };
		}
	}

	// Fetch image reactively when imageId changes
	$effect(() => {
		if (imageId) {
			fetchImage();
		}
	});

	function goBack() {
		goto(`${base}/gallery`);
	}

	// Format prompt into structured sections
	function formatPrompt(prompt: string) {
		const sections: { type: string; title?: string; content: string; items?: string[] }[] = [];

		// Split prompt into lines
		const lines = prompt.split('\n').filter((line) => line.trim());

		let currentSection = '';
		let requirementsItems: string[] = [];
		let inRequirements = false;

		for (const line of lines) {
			// Scene setting (starts with "Interior design visualization" or "Architectural visualization")
			if (
				line.startsWith('Interior design visualization') ||
				line.startsWith('Architectural visualization:')
			) {
				sections.push({
					type: 'scene',
					content: line
				});
			}
			// Persona line (starts with "Designed specifically for:")
			else if (line.startsWith('Designed specifically for:')) {
				sections.push({
					type: 'persona',
					content: line
				});
			}
			// Core design requirements header
			else if (line.includes('Core design requirements:')) {
				inRequirements = true;
				requirementsItems = [];
			}
			// Render specifications
			else if (line.startsWith('Render specifications:')) {
				// Save any pending requirements
				if (inRequirements && requirementsItems.length > 0) {
					sections.push({
						type: 'requirements',
						title: 'Core design requirements:',
						content: 'Core design requirements:',
						items: requirementsItems
					});
					inRequirements = false;
				}
				sections.push({
					type: 'render',
					content: line
				});
			}
			// Requirements items
			else if (inRequirements) {
				// Clean up the line (remove leading dash if present)
				const cleanLine = line.replace(/^[-•]\s*/, '').trim();
				if (cleanLine) {
					requirementsItems.push(cleanLine);
				}
			}
			// Other content (fallback)
			else {
				sections.push({
					type: 'other',
					content: line
				});
			}
		}

		// Add any remaining requirements
		if (inRequirements && requirementsItems.length > 0) {
			sections.push({
				type: 'requirements',
				title: 'Core design requirements:',
				content: 'Core design requirements:',
				items: requirementsItems
			});
		}

		return sections;
	}
</script>

<svelte:head>
	<title
		>{image ? `${image.personaTitle} - Z-Interact Gallery` : 'Image - Z-Interact Gallery'}</title
	>
	<meta
		name="description"
		content={image
			? `View ${image.personaTitle} workspace design generated with AI`
			: 'View AI-generated workspace design'}
	/>
</svelte:head>

<main
	class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800"
>
	<!-- Floating Back Button -->
	<button
		onclick={goBack}
		class="glass-morphism smooth-transition fixed top-20 left-6 z-50 flex h-12 w-12 items-center justify-center rounded-full hover:scale-110 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
		aria-label="Back to Gallery"
		title="Back to Gallery"
	>
		<svg
			class="h-6 w-6 text-gray-700 dark:text-gray-200"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
		</svg>
	</button>

	<!-- Floating Action Buttons (Download & Fullscreen) -->
	{#if image && !image.error}
		<div class="fixed top-20 right-6 z-50 flex gap-3">
			<!-- Download Button -->
			<button
				onclick={() => image && downloadImage(getImageUrl(image), `${getTableDisplayName(image.tableId)}-workspace.jpg`)}
				class="glass-morphism smooth-transition flex h-12 w-12 items-center justify-center rounded-full hover:scale-110 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
				aria-label="Download Image"
				title="Download Image"
			>
				<DownloadOutline class="h-5 w-5 text-gray-700 dark:text-gray-200" />
			</button>

			<!-- Fullscreen Button -->
			<button
				onclick={() => image && openFullscreen(getImageUrl(image), image.prompt)}
				class="glass-morphism smooth-transition flex h-12 w-12 items-center justify-center rounded-full hover:scale-110 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
				aria-label="View Fullscreen"
				title="View Fullscreen"
			>
				<ExpandOutline class="h-5 w-5 text-gray-700 dark:text-gray-200" />
			</button>
		</div>
	{/if}

	{#if isLoading}
		<!-- Loading State -->
		<div class="flex min-h-screen items-center justify-center p-6">
			<div class="fade-in text-center">
				<div
					class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
				></div>
				<p class="text-lg text-slate-600 dark:text-gray-300">Loading workspace image...</p>
			</div>
		</div>
	{:else if error}
		<!-- Error State -->
		<div class="flex min-h-screen items-center justify-center p-6">
			<div class="fade-in text-center">
				<div class="mb-6 text-6xl">❌</div>
				<h2 class="mb-4 text-2xl font-semibold text-slate-900 dark:text-white">
					Failed to Load Image
				</h2>
				<p class="mb-6 text-lg text-slate-600 dark:text-gray-300">{error}</p>
				<button
					onclick={goBack}
					class="smooth-transition rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
				>
					Back to Gallery
				</button>
			</div>
		</div>
	{:else if image}
		<!-- Main Image Display -->
		<div class="relative">
			{#if image.error}
				<!-- Image Error State -->
				<div class="flex min-h-screen items-center justify-center p-6">
					<div class="fade-in text-center">
						<div class="mb-6 text-6xl">❌</div>
						<h2 class="mb-4 text-xl font-semibold text-red-600 dark:text-red-400">
							Image Failed to Load
						</h2>
						<p class="text-slate-600 dark:text-gray-300">{image.error}</p>
					</div>
				</div>
			{:else}
				<!-- Hero Image Section with Blurred Background -->
				<div class="relative h-screen overflow-hidden bg-black">
					<!-- Blurred background image -->
					<div class="absolute inset-0">
						<ImageWithLoader
							src={getImageUrl(image)}
							alt="Background"
							class="h-full w-full object-cover blur-2xl scale-110 opacity-60"
						/>
						<!-- Dark overlay for better contrast -->
						<div class="absolute inset-0 bg-black/40"></div>
					</div>

					<!-- Centered square image -->
					<div class="relative z-10 flex h-full items-center justify-center p-6">
						<div class="h-[85vh] aspect-square max-w-[85vh]">
							<ImageWithLoader
								src={getImageUrl(image)}
								alt="AI-generated workspace for {image.personaTitle}"
								class="h-full w-full object-contain rounded-xl shadow-2xl"
							/>
						</div>
					</div>

					<!-- Title overlay at bottom -->
					<div class="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-4">
						<div class="slide-up mx-auto max-w-4xl">
							<h1 class="mb-2 text-4xl font-bold text-white md:text-5xl">
								{image.personaTitle}
							</h1>
							<div class="flex flex-wrap items-center gap-4 text-white/90">
								<div class="flex items-center gap-2">
									<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									<span class="text-lg">Generated {formatDate(image.createdAt)}</span>
								</div>
								<div
									class="rounded-full bg-white/20 px-4 py-2 text-lg font-medium backdrop-blur-sm"
								>
									{getTableDisplayName(image.tableId)}
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Content Section -->
				<div class="min-h-screen bg-white dark:bg-gray-900">
					<div class="mx-auto max-w-4xl p-8">
						<!-- AI Prompt Section -->
						<section class="slide-up mb-12">
							<h2
								class="mb-6 flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-white"
							>
								💭 AI Prompt
							</h2>
							<div
								class="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-gray-700 dark:bg-gray-800"
							>
								{#each formatPrompt(image.prompt) as section}
									<div class="mb-4 last:mb-0">
										{#if section.type === 'scene'}
											<p
												class="mb-3 text-base leading-relaxed text-slate-500 italic dark:text-gray-400"
											>
												{section.content}
											</p>
										{:else if section.type === 'persona'}
											<p
												class="mb-3 text-lg leading-relaxed font-medium text-slate-800 dark:text-gray-200"
											>
												{section.content}
											</p>
										{:else if section.type === 'requirements'}
											<div class="mb-3">
												<p class="mb-2 text-base font-semibold text-slate-700 dark:text-gray-300">
													{section.title}
												</p>
												{#each section.items || [] as item}
													<p
														class="mb-1 pl-4 text-base leading-relaxed text-slate-900 dark:text-white"
													>
														• {item}
													</p>
												{/each}
											</div>
										{:else if section.type === 'render'}
											<p
												class="mt-4 border-t border-slate-200 pt-4 text-sm leading-relaxed text-slate-400 italic dark:border-gray-700 dark:text-gray-500"
											>
												{section.content}
											</p>
										{/if}
									</div>
								{/each}
							</div>
						</section>

						<!-- Generation Details -->
						<section class="slide-up mb-12">
							<h2
								class="mb-6 flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-white"
							>
								⚙️ Generation Details
							</h2>
							<div class="grid gap-6 md:grid-cols-2">
								<div
									class="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-gray-700 dark:bg-gray-800"
								>
									<h3
										class="mb-3 flex items-center gap-2 text-xl font-semibold text-slate-800 dark:text-gray-200"
									>
										👤 Persona
									</h3>
									<p class="text-lg text-slate-600 dark:text-gray-300">{image.personaTitle}</p>
								</div>
								<div
									class="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-gray-700 dark:bg-gray-800"
								>
									<h3
										class="mb-3 flex items-center gap-2 text-xl font-semibold text-slate-800 dark:text-gray-200"
									>
										🕒 Created
									</h3>
									<p class="text-lg text-slate-600 dark:text-gray-300">
										{new Date(image.createdAt).toLocaleString('en-US', {
											year: 'numeric',
											month: 'long',
											day: 'numeric',
											hour: '2-digit',
											minute: '2-digit'
										})}
									</p>
								</div>
							</div>
						</section>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</main>
