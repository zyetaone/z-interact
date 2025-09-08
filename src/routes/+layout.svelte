<script lang="ts">
	import '../app.css';
	import Navigation from '$lib/components/Navigation.svelte';
	import Toast from '$lib/components/ui/toast.svelte';
	import { page } from '$app/state';
	import { setContext } from 'svelte';
	import { type Snippet } from 'svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { setupGlobalErrorListeners } from '$lib/utils/error-handler';
	import { browser } from '$app/environment';
	import { globalConfig } from '$lib/config.svelte';

	let props = $props<{ children: Snippet }>();

	const { children } = props;

	// Gallery refresh callback will be set by the gallery page
	let galleryRefresh = $state<(() => void) | null>(null);

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
		}
	});

	// Set up global error listeners reactively
	$effect(() => {
		if (browser) {
			setupGlobalErrorListeners();
		}
	});
</script>

<div class="app">
	{#if shouldShowNav()}
		<Navigation onRefresh={galleryRefresh} />
	{/if}

	<main class={isPresentation() ? 'presentation-main' : 'main-content'}>
		<svelte:boundary
			onerror={(error, reset) => {
				// Error logging handled by global error handler
				toastStore.error('An unexpected error occurred');
			}}
		>
			{@render children()}

			{#snippet failed(error, reset)}
				<div class="error-container">
					<div class="error-content">
						<svg class="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
							/>
						</svg>
						<h3 class="error-title">Something went wrong</h3>
						<p class="error-message">
							{(error as any)?.message || 'An unexpected error occurred'}
						</p>
						<button onclick={reset} class="error-reset-btn"> Try Again </button>
					</div>
				</div>
			{/snippet}
		</svelte:boundary>
	</main>

	{#if !isPresentation()}
		<footer>
			<p>Powered by {globalConfig.eventInfo.name}</p>
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

	.error-container {
		display: flex;
		min-height: 200px;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.error-content {
		text-align: center;
		padding: 1.5rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 0.5rem;
		max-width: 400px;
	}

	:global(.dark) .error-content {
		background: #7f1d1d;
		border-color: #991b1b;
	}

	.error-icon {
		width: 3rem;
		height: 3rem;
		margin: 0 auto 1rem;
		color: #dc2626;
	}

	.error-title {
		margin-bottom: 0.5rem;
		font-size: 1.125rem;
		font-weight: 600;
		color: #991b1b;
	}

	:global(.dark) .error-title {
		color: #fca5a5;
	}

	.error-message {
		margin-bottom: 1rem;
		font-size: 0.875rem;
		color: #dc2626;
	}

	:global(.dark) .error-message {
		color: #f87171;
	}

	.error-reset-btn {
		padding: 0.5rem 1rem;
		background: #dc2626;
		color: white;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.error-reset-btn:hover {
		background: #b91c1c;
	}

	.error-reset-btn:focus {
		outline: 2px solid #dc2626;
		outline-offset: 2px;
	}
</style>
