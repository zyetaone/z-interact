<script lang="ts">
	import { goto } from '$app/navigation';
	import { config } from '$lib/config';
	import { Button } from '$lib/components/ui';
	import type { PageData } from './$types';

	export let data: PageData;

	const images = $state(data.images || []);

	const groupedByPersona = $derived(
		Object.values(config.personas).map(persona => ({
			...persona,
			images: images.filter(img => img.personaId === persona.id)
		}))
	);

	function getTableDisplayName(tableId: string | null): string {
		if (!tableId) return 'Unknown';
		const table = config.tables.find(t => t.id === tableId);
		return table?.displayName || 'Unknown Table';
	}
</script>

<svelte:head>
	<title>Z-Interact - Live Gallery</title>
	<meta name="description" content="Live gallery of AI-generated workspace designs" />
</svelte:head>

<main class="min-h-screen bg-gradient-to-br from-slate-100 to-gray-200 p-4 md:p-8">
	<div class="container mx-auto max-w-screen-2xl">
		<!-- Header -->
		<header class="text-center mb-10">
			<h1 class="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-2">
				Live Gallery
			</h1>
			<p class="text-slate-600 text-lg">
				Real-time showcase of AI-generated workspace designs, grouped by persona.
			</p>
		</header>

		{#if images.length === 0}
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
						← Back to Admin Controls
					</Button>
				</div>
			</div>
		{:else}
			<div class="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
				{#each groupedByPersona as personaGroup}
					{#if personaGroup.images.length > 0}
						<section class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6">
							<h2 class="text-2xl font-bold text-slate-800 mb-4 border-b pb-2">{personaGroup.title}</h2>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
								{#each personaGroup.images as image (image.id)}
									<div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow">
										<div class="aspect-video bg-slate-100 relative">
											<img
												src={image.imageUrl}
												alt={image.prompt}
												class="w-full h-full object-cover"
												loading="lazy"
											/>
											<div class="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs font-bold">
												{getTableDisplayName(image.tableId)}
											</div>
										</div>
										<div class="p-4">
											<p class="text-xs text-slate-500 mb-2">{new Date(image.createdAt).toLocaleString()}</p>
											<p class="text-sm text-slate-700 line-clamp-3">{image.prompt}</p>
										</div>
									</div>
								{/each}
							</div>
						</section>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</main>

<style>
	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
