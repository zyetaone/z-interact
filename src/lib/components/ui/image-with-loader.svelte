<script lang="ts">
	import { Spinner } from 'flowbite-svelte';

	interface Props {
		src: string;
		alt: string;
		class?: string;
		loading?: 'lazy' | 'eager';
	}

	let { src, alt, class: className = '', loading = 'lazy' }: Props = $props();

	let imageLoading = $state(true);
	let imageError = $state(false);

	function handleLoad() {
		imageLoading = false;
		imageError = false;
	}

	function handleError() {
		imageLoading = false;
		imageError = true;
	}
</script>

<!-- Container for both skeleton and image -->
<div class="relative h-full w-full">
	{#if imageLoading || imageError}
		<!-- Skeleton loader or error state -->
		<div
			class="{imageError ? '' : 'animate-pulse'} absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800"
		>
			{#if imageError}
				<!-- Error state -->
				<div class="flex flex-col items-center gap-2 p-4 text-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-12 w-12 text-gray-400 dark:text-gray-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
						/>
					</svg>
					<span class="text-xs text-gray-500 dark:text-gray-400">Image unavailable</span>
				</div>
			{:else}
				<!-- Loading spinner -->
				<Spinner color="gray" size="10" />
			{/if}
		</div>
	{/if}

	<!-- Actual image (always rendered but hidden while loading) -->
	<img
		{src}
		{alt}
		{loading}
		class="{className} {imageLoading || imageError ? 'invisible' : 'visible'}"
		onload={handleLoad}
		onerror={handleError}
	/>
</div>
