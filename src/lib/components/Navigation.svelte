<script lang="ts">
	import { Button } from '$lib/components/ui';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let currentPath = $derived($page.url.pathname);

	function isActive(path: string) {
		return currentPath === path;
	}
</script>

<nav class="flex justify-center mb-8">
	<div class="bg-white rounded-lg shadow-sm border p-1">
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
	</div>
</nav>