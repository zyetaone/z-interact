<script lang="ts">
	import { Button } from '$lib/components/ui';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { getContext } from 'svelte';
	import { globalConfig } from '$lib/stores/config-store.svelte';
	import { ArrowsRepeatOutline, CameraPhotoOutline, CogOutline } from 'flowbite-svelte-icons';

	// Props
	let { onRefresh = null }: { onRefresh?: (() => void) | null } = $props();

	// Get app context for shared state
	const appContext = getContext('app-context') as
		| { currentPath: () => string; isGalleryRefreshing?: () => boolean }
		| undefined;

	// Use context if available, fallback to direct page state
	let currentPath = $derived(appContext ? appContext.currentPath() : page.url.pathname);

	function isActive(path: string) {
		return currentPath === path;
	}

	function getPageTitle(): string {
		const eventName = globalConfig.eventInfo.name;
		if (currentPath === '/admin') return `${eventName} | Admin`;
		if (currentPath === '/gallery') return `${eventName} | Gallery`;
		if (currentPath.startsWith('/gallery/')) return `${eventName} | Gallery`;
		return eventName;
	}

	// Hide navigation on table pages for better focus
	function shouldShowNavigation(): boolean {
		return !currentPath.startsWith('/table/');
	}

	// Refresh animation derived from app context (set by gallery)
	const isRefreshing = $derived(
		appContext?.isGalleryRefreshing ? appContext.isGalleryRefreshing() : false
	);

	function handleRefreshClick() {
		if (!onRefresh) return;
		onRefresh();
	}
</script>

{#if shouldShowNavigation()}
	<nav class="fixed top-0 right-0 left-0 z-50 bg-transparent">
		<div class="mx-auto mt-2 max-w-7xl px-4">
			<div
				class="glass-morphism flex items-center justify-between rounded-xl border border-blue-200/50 px-4 py-2 shadow-sm backdrop-blur-md dark:border-blue-800/40"
			>
				<!-- Left: Zyeta Logo and Title -->
				<div class="flex items-center">
					<button
						onclick={() => goto(`${base}/gallery`)}
						class="flex cursor-pointer items-center gap-2 text-lg font-bold text-gray-800 transition-colors hover:text-gray-600 dark:text-white dark:hover:text-gray-300"
					>
						<!-- Zyeta Logo from favicon.svg -->
						<img src="/favicon.ico" alt="Zyeta Logo" class="h-8 w-8 invert-0 filter dark:invert" />
						<span class="text-sm font-semibold">{globalConfig.eventInfo.name}</span>
					</button>
				</div>

				<!-- Right: Navigation -->
				<div class="flex items-center gap-1">
					{#if onRefresh && (currentPath === '/gallery' || currentPath === '/' || currentPath.startsWith('/gallery/'))}
						<!-- Refresh button for gallery page -->
						<Button
							variant="ghost"
							size="sm"
							class="rounded-md p-2 text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white {isRefreshing
								? 'ring-2 ring-blue-400/40 dark:ring-blue-700/40'
								: ''}"
							onclick={handleRefreshClick}
							title={isRefreshing ? 'Refreshing…' : 'Refresh Gallery'}
						>
							<ArrowsRepeatOutline class="h-5 w-5 {isRefreshing ? 'animate-spin' : ''}" />
						</Button>
					{/if}
					{#if currentPath === '/admin'}
						<!-- Show Gallery Icon when on Admin page -->
						<Button
							variant="ghost"
							size="sm"
							class="rounded-md p-2 text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white"
							onclick={() => goto(`${base}/gallery`)}
							title="Go to Gallery"
						>
							<CameraPhotoOutline class="h-5 w-5" />
						</Button>
					{:else}
						<!-- Show Admin Icon when on Gallery page -->
						<Button
							variant="ghost"
							size="sm"
							class="rounded-md p-2 text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white"
							onclick={() => goto(`${base}/admin`)}
							title="Go to Admin"
						>
							<CogOutline class="h-5 w-5" />
						</Button>
					{/if}
				</div>
			</div>
		</div>
	</nav>
{/if}
