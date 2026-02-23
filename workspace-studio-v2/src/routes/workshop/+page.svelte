<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { Loading } from '$lib/components/ui';

	$effect(() => {
		goto(`${base}/gallery`, { replaceState: true });
	});
</script>

<svelte:head>
	<title>Workshop — ZyetaDX Studio</title>
</svelte:head>

<Loading variant="fullpage" message="Loading Workshop…" />
