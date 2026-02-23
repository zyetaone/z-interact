<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { base } from '$app/paths';

	let { children } = $props();

	const isTableRoute = $derived(page.url.pathname.startsWith('/table/'));
	const isGalleryRoute = $derived(page.url.pathname.startsWith('/gallery/'));
	const isWorldRoute = $derived(page.url.pathname.startsWith('/world'));
	const isEditorRoute = $derived(page.url.pathname.startsWith('/editor'));
	const isHomeRoute = $derived(page.url.pathname === '/' || page.url.pathname === base + '/');
	const showNav = $derived(!isTableRoute && !isWorldRoute && !isEditorRoute && !isHomeRoute);

	// Extract tableId from gallery route for breadcrumb
	const galleryTableId = $derived(isGalleryRoute ? page.url.pathname.split('/').pop() : null);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if showNav}
	<nav class="glass fixed top-0 right-0 left-0 z-40 px-4 py-2.5">
		<div class="mx-auto flex max-w-7xl items-center justify-between">
			<div class="flex items-center gap-3">
				<a href="{base}/" class="flex items-center gap-2 text-white">
					<div class="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20">
						<svg
							class="h-3.5 w-3.5 text-purple-300"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
							/>
						</svg>
					</div>
					<span class="text-xs font-semibold">Workspace Studio</span>
				</a>

				<!-- Breadcrumbs -->
				{#if isGalleryRoute && galleryTableId}
					<div class="flex items-center gap-1.5 text-xs text-slate-500">
						<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5l7 7-7 7"
							/>
						</svg>
						<span class="text-slate-300">Table {galleryTableId}</span>
					</div>
				{/if}
			</div>
			<div class="flex items-center gap-3">
				<a
					href="{base}/"
					class="smooth-transition rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200 {!isGalleryRoute
						? 'bg-white/10 text-white'
						: 'text-slate-400 hover:text-white'}"
				>
					Dashboard
				</a>
				<a
					href="{base}/gallery"
					class="smooth-transition rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200 {isGalleryRoute
						? 'bg-white/10 text-white'
						: 'text-slate-400 hover:text-white'}"
				>
					Gallery
				</a>
				<a
					href="{base}/world"
					class="smooth-transition rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200 text-slate-400 hover:text-white"
				>
					World
				</a>
			</div>
		</div>
	</nav>
{/if}

<main class={showNav ? 'pt-14' : ''}>
	{@render children()}
</main>
