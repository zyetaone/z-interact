<script lang="ts">
	import { Spinner } from 'flowbite-svelte';

	interface Props {
		src: string;
		alt: string;
		class?: string;
		loading?: 'lazy' | 'eager';
		message?: string;
	}

	let { src, alt, class: className = '', loading = 'lazy', message }: Props = $props();

	let imgEl: HTMLImageElement | null = null;

	let imageLoading = $state(true);
	let imageError = $state(false);
	let showSpinner = $state(false);
	let spinnerTimer: ReturnType<typeof setTimeout> | null = null;

	function handleLoad() {
		imageLoading = false;
		imageError = false;
		showSpinner = false;
		if (spinnerTimer) {
			clearTimeout(spinnerTimer);
			spinnerTimer = null;
		}
	}

	function handleError() {
		imageLoading = false;
		imageError = true;
		showSpinner = false;
		if (spinnerTimer) {
			clearTimeout(spinnerTimer);
			spinnerTimer = null;
		}
	}

	// Reset/loading behavior when src changes or when image is already cached
	$effect(() => {
		// When src changes, reset loading state
		imageLoading = true;
		imageError = false;
		showSpinner = false;
		if (spinnerTimer) {
			clearTimeout(spinnerTimer);
			spinnerTimer = null;
		}
		// Delay spinner to avoid flicker on fast/cached loads
		spinnerTimer = setTimeout(() => {
			if (imageLoading && !imageError) {
				showSpinner = true;
			}
		}, 150);
	});

	$effect(() => {
		if (imgEl && imgEl.complete) {
			// Image may be served from cache; ensure visibility is updated
			imageLoading = false;
			imageError = imgEl.naturalWidth === 0;
			showSpinner = false;
			if (spinnerTimer) {
				clearTimeout(spinnerTimer);
				spinnerTimer = null;
			}
		}
	});

	// Cleanup on unmount
	$effect(() => {
		return () => {
			if (spinnerTimer) {
				clearTimeout(spinnerTimer);
				spinnerTimer = null;
			}
		};
	});
</script>

<!-- Container for both skeleton and image -->
<div class="relative h-full w-full">
	{#if imageLoading || imageError}
		<!-- Skeleton loader or error state -->
		<div
			class="glass-morphism absolute inset-0 flex items-center justify-center rounded-xl shadow-sm {imageError
				? 'border border-red-300/60 dark:border-red-600/50'
				: 'border border-blue-200/30 dark:border-blue-800/30'}"
		>
			{#if imageError}
				<!-- Error state: icon only, no alt text -->
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-10 w-10 text-red-400 dark:text-red-500"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					aria-hidden="true"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
			{:else}
				<!-- Loading state: flowbite spinner + optional message (delayed) -->
				{#if showSpinner}
					<div class="text-center">
						<Spinner color="blue" size="8" />
						{#if message}
							<div class="mt-1 text-[11px] text-slate-700 dark:text-slate-300">{message}</div>
						{/if}
					</div>
				{/if}
			{/if}
		</div>
	{/if}

	<!-- Actual image (always rendered but hidden while loading) -->
	<img
		{src}
		{alt}
		{loading}
		class="{className} {imageLoading || imageError ? 'invisible' : 'visible'}"
		bind:this={imgEl}
		onload={handleLoad}
		onerror={handleError}
	/>
</div>

<!-- spinner styles provided by Flowbite Spinner component -->
