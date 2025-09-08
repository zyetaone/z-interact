<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';

	// Redirect to gallery reactively
	$effect(() => {
		goto(`${base}/gallery`, { replaceState: true });
	});
</script>

<svelte:head>
	<title>Z-Interact - Gallery</title>
	<meta name="description" content="Interactive workspace design gallery" />
</svelte:head>

<main class="flex min-h-screen items-center justify-center bg-black">
	<div class="text-center text-white">
		<div class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-white"></div>
		<p class="text-lg">Loading gallery...</p>
	</div>
</main>
