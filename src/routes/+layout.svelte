<script lang="ts">
	import '../app.css';
	import Navigation from '$lib/components/Navigation.svelte';
	import Toast from '$lib/components/ui/toast.svelte';
	import { page } from '$app/stores';
	import { setContext } from 'svelte';
	import { type Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	function isPresentation() {
		return $page.url.pathname.includes('/presentation') || $page.url.pathname.includes('/table/');
	}

	function shouldShowNav() {
		return $page.url.pathname === '/admin' || $page.url.pathname.startsWith('/gallery');
	}

	// Set up context for shared state management
	// This provides a clean way to share state without global variables
	setContext('app-context', {
		isPresentation: () => isPresentation(),
		currentPath: () => $page.url.pathname
	});
</script>

<div class="app">
	{#if shouldShowNav()}
		<Navigation />
	{/if}

	<main class={isPresentation() ? 'presentation-main' : 'main-content'}>
		{@render children()}
	</main>

	{#if !isPresentation()}
		<footer>
			<p>Powered BY ZyetaDX (c) 2025</p>
		</footer>
	{/if}
</div>

<Toast />

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		width: 100%;
		max-width: 64rem;
		margin: 0 auto;
		box-sizing: border-box;
	}

	main.presentation-main {
		padding: 0;
		max-width: none;
		margin: 0;
	}

	main.main-content {
		max-width: none;
		margin: 0;
		padding: 0;
	}

	footer {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 8px;
		background: white;
		border-top: 1px solid #e5e7eb;
		color: #64748b;
		font-size: 0.75rem;
		margin-top: auto;
	}

	@media (min-width: 480px) {
		footer {
			padding: 12px 0;
		}
	}
</style>
