<script lang="ts">
	import '../app.css';
	import Navigation from '$lib/components/Navigation.svelte';
	import Toast from '$lib/components/ui/toast.svelte';
	import { page } from '$app/stores';
	import { type Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
	
	function isPresentation() {
		return $page.url.pathname.includes('/presentation') || $page.url.pathname.includes('/table/');
	}
</script>

<div class="app">
	{#if !isPresentation()}
		<Navigation />
	{/if}

	<main class={isPresentation() ? 'presentation-main' : 'main-content'}>
		{@render children()}
	</main>

	{#if !isPresentation()}
		<footer>
			<p>
				visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to learn about SvelteKit
			</p>
		</footer>
	{/if}
</div>

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
		padding: 12px;
	}

	footer a {
		font-weight: bold;
	}

	@media (min-width: 480px) {
		footer {
			padding: 12px 0;
		}
	}
</style>

<Toast />
