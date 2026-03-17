<script lang="ts">
	import { DarkMode } from 'flowbite-svelte';
	import { themeStore } from '$lib/stores/theme.svelte';

	// Sync with our custom theme store when DarkMode component changes
	function handleToggle() {
		// The DarkMode component handles the DOM changes, we just sync our store
		const isDark = document.documentElement.classList.contains('dark');
		const newTheme = isDark ? 'dark' : 'light';

		// Update our store to match
		if (newTheme !== themeStore.current) {
			themeStore.setTheme(newTheme);
		}
	}
</script>

<!-- Use Flowbite's DarkMode component with custom styling -->
<DarkMode
	class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
	size="sm"
	ariaLabel="Toggle dark mode"
>
	{#snippet lightIcon()}
		<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
			/>
		</svg>
	{/snippet}
	{#snippet darkIcon()}
		<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
			/>
		</svg>
	{/snippet}
</DarkMode>
