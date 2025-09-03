<script lang="ts">
	import { onMount } from 'svelte';
	import QRCode from 'qrcode';
	import { personas, type Persona } from '$lib/personas';
	import { workspaceStore } from '$lib/stores/workspace.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { Button, QRCodeGenerator, QRModal } from '$lib/components/ui';
	import { copyToClipboard } from '$lib/utils';
	import { goto } from '$app/navigation';


	let baseUrl = $state('');
	let qrCodes = $state<Record<string, string>>({});
	let isLoading = $state(true);
	let showQRCodes = $state(true);
	let qrModalOpen = $state(false);
	let selectedPersona = $state<Persona | null>(null);

	// Generate QR code for a persona
	async function generateQRCode(persona: Persona): Promise<string> {
		if (!baseUrl) return '';

		const url = `${baseUrl}/table/${persona.id}`;

		try {
			return await QRCode.toDataURL(url, {
				width: 256,
				margin: 2,
				color: {
					dark: '#1e293b',
					light: '#ffffff'
				}
			});
		} catch (error) {
			console.error('QR Code generation failed:', error);
			return '';
		}
	}

	// Generate all QR codes
	async function generateAllQRCodes() {
		const codes: Record<string, string> = {};

		for (const persona of personas) {
			codes[persona.id] = await generateQRCode(persona);
		}

		qrCodes = codes;
		isLoading = false;
	}

	// Auto-refresh every 3 seconds
	let refreshInterval: NodeJS.Timeout;

	$effect(() => {
		if (typeof window !== 'undefined') {
			baseUrl = window.location.origin;
			generateAllQRCodes();

			// Initialize store
			workspaceStore.initialize();

			// Set up auto-refresh for presenter view
			refreshInterval = setInterval(() => {
				workspaceStore.refreshImages();
			}, 3000);

			return () => {
				if (refreshInterval) clearInterval(refreshInterval);
			};
		}
	});

	onMount(() => {
		isLoading = false;
	});

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

	function openQRModal(persona: Persona) {
		selectedPersona = persona;
		qrModalOpen = true;
	}

	async function copyPersonaUrl(persona: Persona) {
		const url = `${baseUrl}/table/${persona.id}`;
		const success = await copyToClipboard(url);
		if (success) {
			toastStore.success(`Copied ${persona.title} link to clipboard`);
		} else {
			toastStore.error('Failed to copy link');
		}
	}

	function toggleQRCodes() {
		showQRCodes = !showQRCodes;
	}
</script>

<svelte:head>
	<title>Z-Interact - QR Codes</title>
	<meta name="description" content="Interactive workspace design collaboration" />
</svelte:head>

<main class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
	<div class="container mx-auto max-w-6xl">
		<!-- Header -->
		<header class="text-center mb-8">
			<h1 class="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-2">
				Z-Interact
			</h1>
			<p class="text-slate-600 text-lg">
				AI-Powered Workspace Design Collaboration
			</p>
		</header>



		<!-- QR Code Section -->
		<section class="mb-8">
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-3xl font-semibold text-slate-800">
					Join Your Table
				</h2>
				<Button variant="outline" onclick={toggleQRCodes}>
					{showQRCodes ? 'Hide' : 'Show'} QR Codes
				</Button>
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
				{#each personas as persona}
					<div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all p-6 text-center">
						<h3 class="text-2xl font-bold mb-2 text-slate-900">{persona.title}</h3>
						<p class="text-slate-600 mb-4">{persona.description}</p>

						{#if showQRCodes}
							{#if isLoading}
								<div class="w-48 h-48 mx-auto bg-slate-200 rounded-lg animate-pulse mb-4"></div>
							{:else}
								<div class="mb-4 flex justify-center">
									<QRCodeGenerator url={`${baseUrl}/table/${persona.id}`} size={160} />
								</div>
							{/if}
						{/if}

						<div class="space-y-2">
							<Button
								variant="outline"
								size="sm"
								class="w-full"
								onclick={() => openQRModal(persona)}
							>
								📱 View Large QR
							</Button>
							<Button
								variant="outline"
								size="sm"
								class="w-full"
								onclick={() => copyPersonaUrl(persona)}
							>
								📋 Copy Link
							</Button>
						</div>

						{#if showQRCodes}
							<p class="text-xs text-slate-500 mt-2">
								Scan QR code or click buttons above
							</p>
						{/if}
					</div>
				{/each}
			</div>
		</section>

		<!-- Quick Stats -->
		<section class="bg-white rounded-xl shadow-lg p-6">
			<h3 class="text-xl font-semibold mb-4 text-slate-900">Session Stats</h3>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div class="text-center">
					<div class="text-2xl font-bold text-blue-600">{personas.length}</div>
					<div class="text-sm text-slate-600">Available Personas</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-green-600">{workspaceStore.images.length}</div>
					<div class="text-sm text-slate-600">Completed Designs</div>
				</div>
				<div class="text-center">
					<Button
						variant="outline"
						size="sm"
						onclick={() => goto('/gallery')}
						class="mt-2"
					>
						View Gallery →
					</Button>
				</div>
			</div>
		</section>
	</div>
</main>

<!-- QR Modal -->
{#if selectedPersona}
	<QRModal
		bind:open={qrModalOpen}
		url={`${baseUrl}/table/${selectedPersona.id}`}
		title={`${selectedPersona.title} - Join Table`}
		description={selectedPersona.description}
	/>
{/if}