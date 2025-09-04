<script lang="ts">
	import { Button } from '$lib/components/ui';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { getContext } from 'svelte';

	// Get app context for shared state
	const appContext = getContext('app-context') as { currentPath: () => string } | undefined;

	// Use context if available, fallback to direct page store
	let currentPath = $derived(appContext ? appContext.currentPath() : $page.url.pathname);

	function isActive(path: string) {
		return currentPath === path;
	}

	function getPageTitle(): string {
		if (currentPath === '/admin') return 'Z-Interact - Admin';
		if (currentPath === '/gallery' || currentPath.startsWith('/gallery/'))
			return 'Z-Interact - Gallery';
		return 'Z-Interact';
	}

	// Hide navigation on table pages for better focus
	function shouldShowNavigation(): boolean {
		return !currentPath.startsWith('/table/');
	}
</script>

{#if shouldShowNavigation()}
	<nav
		class="fixed top-0 right-0 left-0 z-50 border-b-2 border-blue-300 bg-white shadow-lg dark:border-blue-600 dark:bg-gray-900"
	>
		<div class="flex items-center justify-between px-6 py-3">
			<!-- Left: Dynamic Page Title -->
			<div class="flex items-center">
				<button
					onclick={() => goto('/gallery')}
					class="cursor-pointer text-lg font-bold text-gray-800 transition-colors hover:text-gray-600 dark:text-white dark:hover:text-gray-300"
				>
					{getPageTitle()}
				</button>
			</div>

			<!-- Right: Navigation -->
			<div class="flex items-center">
				{#if currentPath === '/admin'}
					<!-- Show Gallery Icon when on Admin page -->
					<Button
						variant="ghost"
						size="sm"
						class="rounded-md p-2 text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white"
						onclick={() => goto('/gallery')}
						title="Go to Gallery"
					>
						<svg
							class="h-5 w-5 text-gray-700 dark:text-gray-200"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
					</Button>
				{:else}
					<!-- Show Gear Icon when on Gallery page -->
					<Button
						variant="ghost"
						size="sm"
						class="rounded-md p-2 text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white"
						onclick={() => goto('/admin')}
						title="Go to Admin"
					>
						<svg
							class="h-5 w-5 text-gray-700 dark:text-gray-200"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
					</Button>
				{/if}
			</div>
		</div>
	</nav>
{/if}
