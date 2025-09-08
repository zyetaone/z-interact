<script lang="ts">
	import { downloadImage, openFullscreen } from '$lib/utils/image-utils';
	import { DownloadOutline, ExpandOutline } from 'flowbite-svelte-icons';
	import { confetti } from '@neoconfetti/svelte';
	import ImageWithLoader from '$lib/components/ui/image-with-loader.svelte';

	let props = $props<{
		generatedImage: string | null;
	}>();

	const { generatedImage } = props;
	let showConfetti = $state(false);

	// Show confetti reactively on component mount
	$effect(() => {
		showConfetti = true;
		// Stop confetti after 5 seconds
		const timeout = setTimeout(() => {
			showConfetti = false;
		}, 5000);

		// Cleanup timeout
		return () => clearTimeout(timeout);
	});
</script>

<div
	class="relative flex h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-6 dark:from-gray-900 dark:to-gray-800"
>
	<!-- Confetti Animation -->
	{#if showConfetti}
		<div class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
			<div
				use:confetti={{
					x: [-5, 5],
					y: [0, 0.1],
					delay: [0, 50],
					duration: 3000,
					amount: 200,
					fallDistance: '100vh'
				} as any}
			></div>
		</div>
	{/if}

	<div class="fade-in flex h-full w-full max-w-6xl flex-col items-center justify-center">
		<!-- Success Animation -->
		<div
			class="zoom-in mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30"
		>
			<div class="animate-bounce text-3xl">✅</div>
		</div>

		<!-- Thank You Message -->
		<div class="slide-up mb-6 text-center">
			<h1 class="mb-3 text-3xl font-bold text-green-600 md:text-4xl dark:text-green-400">
				Thank You!
			</h1>
			<p class="mb-2 text-lg font-medium text-slate-700 md:text-xl dark:text-gray-300">
				Your workspace vision has been captured
			</p>
			<p class="mx-auto max-w-2xl text-base text-slate-600 dark:text-gray-400">
				Your creative input will be displayed on the main presentation screen for everyone to see.
			</p>
		</div>

		<!-- Generated Image Display -->
		{#if generatedImage}
			<div class="slide-up mb-6 flex w-full max-w-2xl items-center justify-center px-4">
				<div
					class="group relative aspect-square w-full overflow-hidden rounded-xl shadow-2xl ring-1 ring-slate-200 dark:ring-gray-700"
				>
					<!-- Show generated image with loader -->
					<ImageWithLoader
						src={generatedImage}
						alt="Your submitted workspace design"
						class="h-full w-full object-contain"
					/>

					<!-- Action buttons overlay - visible on hover -->
					<div
						class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
					>
						<div class="flex gap-2">
							<!-- Download button -->
							<button
								class="rounded-full bg-white/90 p-2 text-slate-700 shadow-lg transition-all duration-200 hover:scale-110 hover:bg-white"
								onclick={() => downloadImage(generatedImage, 'workspace-design.jpg')}
								title="Download image"
							>
								<DownloadOutline class="h-5 w-5" />
							</button>

							<!-- Fullscreen button -->
							<button
								class="rounded-full bg-white/90 p-2 text-slate-700 shadow-lg transition-all duration-200 hover:scale-110 hover:bg-white"
								onclick={() => openFullscreen(generatedImage, 'Your submitted workspace design')}
								title="View fullscreen"
							>
								<ExpandOutline class="h-5 w-5" />
							</button>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Appreciation Note -->
		<div class="slide-up text-center">
			<p class="text-lg text-slate-600 italic dark:text-gray-400">
				We appreciate your creativity and participation! 🎨
			</p>
		</div>
	</div>
</div>
