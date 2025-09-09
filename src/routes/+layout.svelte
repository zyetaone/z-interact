<script lang="ts">
	import '../app.css';
	import Navigation from '$lib/components/Navigation.svelte';
	import Toast from '$lib/components/ui/toast.svelte';
	import { page } from '$app/state';
	import { setContext } from 'svelte';
	import { type Snippet } from 'svelte';
	import { browser } from '$app/environment';

	let props = $props<{ children: Snippet }>();

	const { children } = props;

	// Gallery refresh callback will be set by the gallery page
	let galleryRefresh = $state<(() => void) | null>(null);
	let galleryRefreshing = $state(false);

	function isPresentation() {
		return page.url.pathname.includes('/presentation') || page.url.pathname.includes('/table/');
	}

	function shouldShowNav() {
		return page.url.pathname === '/admin' || page.url.pathname.startsWith('/gallery');
	}

	// Set up context for shared state management
	// This provides a clean way to share state without global variables
	setContext('app-context', {
		isPresentation: () => isPresentation(),
		currentPath: () => page.url.pathname,
		setGalleryRefresh: (fn: (() => void) | null) => {
			galleryRefresh = fn;
		},
		setGalleryRefreshing: (refreshing: boolean) => {
			galleryRefreshing = refreshing;
		},
		isGalleryRefreshing: () => galleryRefreshing
	});

	// No global error listeners needed with svelte:boundary
</script>

<div class="app">
	{#if shouldShowNav()}
		<Navigation />
	{/if}

	<main class="main-content">
		{@render children()}
	</main>
</div>

<Toast />

<style>
	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.main-content {
		flex: 1;
	}
</style>
