<script lang="ts">
	import { config } from '$lib/config';
	import { workspaceStore } from '$lib/stores/workspace.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { Button, QRCodeGenerator } from '$lib/components/ui';
	import { copyToClipboard } from '$lib/utils';
	import { goto } from '$app/navigation';

	let baseUrl = $state('');
	let selectedTableNumber = $state(1);
	let maxTables = config.tables.length;

	$effect(() => {
		if (typeof window !== 'undefined') {
			baseUrl = window.location.origin;
			workspaceStore.initialize();
		}
	});

	const selectedUrl = $derived(`${baseUrl}/table/${selectedTableNumber}`);

	function incrementTable() {
		if (selectedTableNumber < maxTables) {
			selectedTableNumber++;
		}
	}

	function decrementTable() {
		if (selectedTableNumber > 1) {
			selectedTableNumber--;
		}
	}

	async function copyUrl() {
		const success = await copyToClipboard(selectedUrl);
		if (success) {
			toastStore.success(`Copied ${selectedUrl} to clipboard`);
		} else {
			toastStore.error('Failed to copy link');
		}
	}

	async function clearAllImages() {
		if (confirm('Are you sure you want to clear all locked images? This cannot be undone.')) {
			try {
				const response = await fetch('/api/images', { method: 'DELETE' });
				if (response.ok) {
					await workspaceStore.refreshImages();
					toastStore.success('All images cleared successfully');
				} else {
					toastStore.error('Failed to clear images');
				}
			} catch (error) {
				console.error('Error clearing images:', error);
				toastStore.error('Failed to clear images');
			}
		}
	}
</script>

<svelte:head>
	<title>Z-Interact - Admin Controls</title>
	<meta name="description" content="Interactive workspace design collaboration" />
</svelte:head>

<main class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
	<div class="container mx-auto max-w-2xl">
		<!-- Header -->
		<header class="text-center mb-8">
			<h1 class="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-2">
				Z-Interact Admin
			</h1>
			<p class="text-slate-600 text-lg">
				Presenter & Admin Controls
			</p>
		</header>

		<!-- QR Code Generator Section -->
		<section class="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-8">
			<h2 class="text-2xl md:text-3xl font-semibold text-slate-800 mb-6 text-center">
				Table QR Code Generator
			</h2>

			<div class="flex items-center justify-center gap-4 mb-6">
				<Button onclick={decrementTable} disabled={selectedTableNumber <= 1} variant="outline" size="icon">
					-
				</Button>
				<span class="text-4xl font-bold text-slate-800 w-24 text-center">{selectedTableNumber}</span>
				<Button onclick={incrementTable} disabled={selectedTableNumber >= maxTables} variant="outline" size="icon">
					+
				</Button>
			</div>

			<div class="flex justify-center mb-6">
				<QRCodeGenerator url={selectedUrl} size={256} />
			</div>

			<div class="text-center">
				<p class="text-slate-600 mb-2">URL for Table {selectedTableNumber}:</p>
				<div class="bg-slate-100 rounded-lg p-3 flex items-center justify-between">
					<code class="text-sm text-slate-800 break-all">{selectedUrl}</code>
					<Button onclick={copyUrl} variant="ghost" size="sm">Copy</Button>
				</div>
			</div>
		</section>

		<!-- Session Management -->
		<section class="bg-white rounded-xl shadow-lg p-6 md:p-8">
			<h2 class="text-2xl md:text-3xl font-semibold text-slate-800 mb-6 text-center">
				Session Management
			</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Button onclick={() => goto('/gallery')} variant="default" class="w-full">
					🖼️ View Live Gallery
				</Button>
				<Button onclick={() => goto('/admin/storage')} variant="outline" class="w-full">
					📊 Storage Dashboard
				</Button>
				<Button onclick={clearAllImages} variant="destructive" class="w-full">
					🗑️ Clear All Images
				</Button>
			</div>
		</section>
	</div>
</main>
