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

	function isActivePrefix(prefix: string) {
		return currentPath.startsWith(prefix);
	}
</script>

<nav class="flex justify-center mb-8">
	<div class="bg-white rounded-lg shadow-sm border p-1 flex flex-wrap">
		<!-- Main Application Routes -->
		<Button
			variant={isActive('/') ? 'default' : 'ghost'}
			class="rounded-md"
			onclick={() => goto('/')}
		>
			📱 QR Codes
		</Button>
		<Button
			variant={isActive('/gallery') ? 'default' : 'ghost'}
			class="rounded-md ml-1"
			onclick={() => goto('/gallery')}
		>
			🖼️ Gallery
		</Button>




		<!-- Game Routes -->
		<Button
			variant={isActivePrefix('/sverdle') ? 'default' : 'ghost'}
			class="rounded-md ml-1"
			onclick={() => goto('/sverdle')}
		>
			🎯 Sverdle
		</Button>

		<!-- Info Routes -->
		<Button
			variant={isActive('/about') ? 'default' : 'ghost'}
			class="rounded-md ml-1"
			onclick={() => goto('/about')}
		>
			ℹ️ About
		</Button>
	</div>
</nav>