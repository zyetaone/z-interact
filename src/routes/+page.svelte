<script lang="ts">
	import { Loading } from '$lib/components/ui';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';

	// Immediately redirect root to the gallery route
	$effect(() => {
		goto(`${base}/gallery`, { replaceState: true });
	});
</script>

<svelte:head>
	<title>Z-Interact - Gallery</title>
	<meta name="description" content="Interactive workspace design gallery" />
</svelte:head>

<Loading variant="fullpage" message="Loading ZYETAi workspace…" />
