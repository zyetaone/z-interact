<script lang="ts">
	import { globalConfig, RENDERING_SPECS, updateEventInfo } from '$lib/config.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { AllQRModal, Button, ThemeToggle, PersonaModal, QRModal } from '$lib/components/ui';
	import QRCodeGenerator from '$lib/components/ui/qr-code-generator.svelte';

	import type { Image } from '$lib/server/db/schema';
	import {
		listImages,
		deleteImage as deleteImageRF,
		clearImages as clearImagesRF
	} from '../gallery/gallery.remote';

	let activeTab = $state('settings');
	let images = $state<Image[]>([]);
	let loading = $state(false);
	let showAllQRModal = $state(false);
	let showPersonaModal = $state(false);
	let selectedPersona = $state<any>(null);
	let baseUrl = $state('');
	let showSingleQRModal = $state(false);
	let selectedTableId = $state<string>('');
	let selectedTableURL = $state<string>('');

	// Use reactive global config directly
	const editableTables = globalConfig.tables;

	$effect(() => {
		if (typeof window !== 'undefined') {
			baseUrl = window.location.origin;
		}
	});

	async function loadImages() {
		loading = true;
		try {
			// Use remote function with admin flag true
			images = await listImages({ admin: true });
		} catch (error) {
			// Error already handled by remote function
			toastStore.error('Failed to load images');
		} finally {
			loading = false;
		}
	}

	async function deleteImage(imageId: string) {
		if (!confirm('Are you sure you want to delete this image? This cannot be undone.')) {
			return;
		}

		try {
			await deleteImageRF({ imageId });
			toastStore.success('Image deleted successfully');
			await loadImages(); // Refresh the list
		} catch (error) {
			// Error already handled by remote function
			toastStore.error('Failed to delete image');
		}
	}

	async function clearAllImages() {
		if (!confirm('Are you sure you want to clear all images? This cannot be undone.')) {
			return;
		}

		try {
			const result = await clearImagesRF(undefined);
			toastStore.success(`Cleared ${result.deletedFromDb} images from database`);
			await loadImages(); // Refresh the list
		} catch (error) {
			// Error already handled by remote function
			toastStore.error('Failed to clear images');
		}
	}

	function openAllQRModal() {
		showAllQRModal = true;
	}

	function openSingleQRModal(tableId: string) {
		selectedTableId = tableId;
		selectedTableURL = `${baseUrl}/table/${tableId}`;
		showSingleQRModal = true;
	}

	// Load images reactively on component mount
	$effect(() => {
		loadImages();
	});
</script>

<svelte:head>
	<title>Z-Interact - Admin</title>
	<meta name="description" content="Simple admin panel for image and QR code management" />
</svelte:head>

<main class="min-h-screen bg-gray-50 p-4 dark:bg-gray-900">
	<div class="mx-auto max-w-6xl">
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
			<p class="mt-2 text-gray-600 dark:text-gray-400">Manage images and QR codes</p>
		</div>

		<!-- Tabs -->
		<div class="mb-6">
			<div class="border-b border-gray-200 dark:border-gray-700">
				<nav class="-mb-px flex space-x-8">
					<button
						onclick={() => (activeTab = 'settings')}
						class="border-b-2 px-1 py-2 text-sm font-medium {activeTab === 'settings'
							? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
							: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300'}"
					>
						Quick Settings
					</button>
					<button
						onclick={() => (activeTab = 'images')}
						class="border-b-2 px-1 py-2 text-sm font-medium {activeTab === 'images'
							? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
							: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300'}"
					>
						Images
					</button>
					<button
						onclick={() => (activeTab = 'qr-codes')}
						class="border-b-2 px-1 py-2 text-sm font-medium {activeTab === 'qr-codes'
							? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
							: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300'}"
					>
						QR Codes
					</button>
					<button
						onclick={() => (activeTab = 'configuration')}
						class="border-b-2 px-1 py-2 text-sm font-medium {activeTab === 'configuration'
							? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
							: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300'}"
					>
						Configuration
					</button>
				</nav>
			</div>
		</div>

		<!-- Tab Content -->
		<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
			{#if activeTab === 'settings'}
				<!-- Quick Settings Tab -->
				<div class="space-y-6">
					<h2 class="text-xl font-semibold text-gray-900 dark:text-white">Quick Settings</h2>
					
					<!-- Theme Settings -->
					<div class="rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900">
						<h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-white">Appearance</h3>
						<div class="flex items-center gap-4">
							<span class="text-gray-700 dark:text-gray-300">Theme:</span>
							<ThemeToggle />
						</div>
					</div>

					<!-- Event Settings -->
					<div class="rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900">
						<h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-white">Event Information</h3>
						<div class="space-y-4">
							<div>
								<label for="event-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Event Name
								</label>
								<input
									id="event-name"
									type="text"
									value={globalConfig.eventInfo.name}
									oninput={(e) => updateEventInfo(e.currentTarget.value)}
									class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
									placeholder="Enter event name"
								/>
							</div>
							<div>
								<label for="event-status" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Status
								</label>
								<select
									id="event-status"
									value={globalConfig.eventInfo.status}
									onchange={(e) => updateEventInfo(undefined, e.currentTarget.value as 'active' | 'inactive' | 'upcoming')}
									class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500"
								>
									<option value="active">Active</option>
									<option value="inactive">Inactive</option>
									<option value="upcoming">Upcoming</option>
								</select>
							</div>
							<div class="pt-2 border-t border-gray-200 dark:border-gray-600">
								<div class="flex items-center gap-2">
									<span class="text-xs text-gray-500 dark:text-gray-400">Current Status:</span>
									<span class="rounded px-2 py-1 text-xs font-medium {globalConfig.eventInfo.status === 'active' 
										? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
										: globalConfig.eventInfo.status === 'upcoming' 
										? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
										: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}">
										{globalConfig.eventInfo.status.charAt(0).toUpperCase() + globalConfig.eventInfo.status.slice(1)}
									</span>
								</div>
							</div>
						</div>
					</div>

					<!-- System Info -->
					<div class="rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900">
						<h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-white">System Information</h3>
						<div class="space-y-2 text-sm">
							<div class="flex items-center gap-2">
								<span class="font-medium text-gray-700 dark:text-gray-300">Total Tables:</span>
								<span class="text-gray-600 dark:text-gray-400">{globalConfig.tables.length}</span>
							</div>
							<div class="flex items-center gap-2">
								<span class="font-medium text-gray-700 dark:text-gray-300">Personas:</span>
								<span class="text-gray-600 dark:text-gray-400">{Object.keys(globalConfig.personas).length}</span>
							</div>
							<div class="flex items-center gap-2">
								<span class="font-medium text-gray-700 dark:text-gray-300">Images Generated:</span>
								<span class="text-gray-600 dark:text-gray-400">{images.length}</span>
							</div>
						</div>
					</div>
				</div>
			{:else if activeTab === 'images'}
				<!-- Images Tab -->
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<h2 class="text-xl font-semibold text-gray-900 dark:text-white">Image Management</h2>
						<div class="flex gap-2">
							<Button onclick={loadImages} variant="outline" size="sm">🔄 Refresh</Button>
							<Button onclick={clearAllImages} variant="destructive" size="sm">🗑️ Clear All</Button>
						</div>
					</div>

					{#if loading}
						<div class="flex items-center justify-center py-8">
							<div class="text-gray-500 dark:text-gray-400">Loading images...</div>
						</div>
					{:else if images.length === 0}
						<div class="py-8 text-center text-gray-500 dark:text-gray-400">No images found</div>
					{:else}
						<div class="space-y-2">
							{#each images as image (image.id)}
								<div
									class="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700"
								>
									<div class="flex-1">
										<div class="font-medium text-gray-900 dark:text-white">
											{image.personaTitle || image.personaId}
										</div>
										<div class="text-sm text-gray-500 dark:text-gray-400">
											Table: {image.tableId || 'N/A'} • Created: {new Date(
												image.createdAt
											).toLocaleString()}
										</div>
										<div class="mt-1 max-w-md truncate text-xs text-gray-400 dark:text-gray-500">
											{image.prompt}
										</div>
									</div>
									<Button onclick={() => deleteImage(image.id)} variant="destructive" size="sm">
										Delete
									</Button>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{:else if activeTab === 'qr-codes'}
				<!-- QR Codes Tab -->
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<h2 class="text-xl font-semibold text-gray-900 dark:text-white">All Table QR Codes</h2>
						<Button onclick={() => window.print()} class="bg-blue-600 text-white hover:bg-blue-700">
							🖨️ Print All
						</Button>
					</div>

					<!-- QR Codes Grid -->
					<div class="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
						{#each globalConfig.tables as table (table.id)}
							<button
								onclick={() => openSingleQRModal(table.id)}
								class="flex flex-col items-center space-y-2 rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-lg hover:scale-105 cursor-pointer dark:border-gray-700 dark:bg-gray-800"
							>
								<div class="text-lg font-bold text-gray-900 dark:text-white">
									{table.displayName}
								</div>
								<div class="w-full aspect-square pointer-events-none">
									<QRCodeGenerator 
										url={`${baseUrl}/table/${table.id}`} 
										size={200} 
										class="w-full h-full"
									/>
								</div>
								<div class="text-xs text-gray-500 dark:text-gray-400">
									{globalConfig.personas[table.personaId]?.title || 'Unassigned'}
								</div>
							</button>
						{/each}
					</div>
				</div>
			{:else if activeTab === 'configuration'}
				<!-- Configuration Tab -->
				<div class="space-y-6">
					<!-- System Prompts Section -->
					<div>
						<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
							System Prompts
						</h2>
						<div class="space-y-4">
							<div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
								<h3 class="mb-2 font-medium text-gray-900 dark:text-white">Scene Setting</h3>
								<p class="text-sm text-gray-600 whitespace-pre-wrap dark:text-gray-400">
									{globalConfig.masterSystemPrompt}
								</p>
							</div>
							<div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
								<h3 class="mb-2 font-medium text-gray-900 dark:text-white">Rendering Specifications</h3>
								<p class="text-sm text-gray-600 whitespace-pre-wrap dark:text-gray-400">
									{RENDERING_SPECS}
								</p>
							</div>
						</div>
					</div>

					<div>
						<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
							Persona Configuration
						</h2>
						<div class="grid gap-4 md:grid-cols-2">
							{#each Object.values(globalConfig.personas) as persona (persona.id)}
								<div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
									<div class="mb-2 flex items-start justify-between">
										<div class="flex-1">
											<h3 class="font-medium text-gray-900 dark:text-white">{persona.title}</h3>
											<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
												{persona.description.substring(0, 100)}...
											</p>
										</div>
										<Button
											onclick={() => {
												selectedPersona = persona;
												showPersonaModal = true;
											}}
											size="sm"
											variant="outline"
										>
											Edit
										</Button>
									</div>
									<div class="text-xs text-gray-500 dark:text-gray-400">
										ID: <code class="rounded bg-gray-100 px-1 dark:bg-gray-700">{persona.id}</code>
									</div>
								</div>
							{/each}
						</div>
					</div>

					<div>
						<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
							Table Assignments
						</h2>
						<div class="overflow-x-auto">
							<table class="w-full text-left text-sm">
								<thead
									class="bg-gray-50 text-xs text-gray-700 uppercase dark:bg-gray-700 dark:text-gray-400"
								>
									<tr>
										<th class="px-4 py-3">Table</th>
										<th class="px-4 py-3">Assigned Persona</th>
									</tr>
								</thead>
								<tbody>
									{#each globalConfig.tables as table (table.id)}
										<tr class="border-b dark:border-gray-700">
											<td class="px-4 py-3 font-medium text-gray-900 dark:text-white">
												{table.displayName}
											</td>
											<td class="px-4 py-3">
												<select
													bind:value={table.personaId}
													class="rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
												>
													{#each Object.values(globalConfig.personas) as persona (persona.id)}
														<option value={persona.id}>{persona.title}</option>
													{/each}
												</select>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
						<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
							Changes to table assignments are applied immediately.
						</p>
					</div>
				</div>
			{/if}
		</div>
	</div>
</main>

<!-- All QR Codes Modal -->
<AllQRModal
	bind:open={showAllQRModal}
	tables={editableTables}
	personas={globalConfig.personas}
	{baseUrl}
/>

<!-- Persona Edit Modal -->
<PersonaModal bind:open={showPersonaModal} persona={selectedPersona} />

<!-- Single QR Code Modal -->
<QRModal bind:open={showSingleQRModal} tableNumber={parseInt(selectedTableId)} url={selectedTableURL} />
