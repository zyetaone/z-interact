<script lang="ts">
	import {
		globalConfig,
		updatePersonaTitle,
		updatePersonaDescription,
		type Persona,
		type Table
	} from '$lib/config.svelte';
	import { workspaceStore } from '$lib/stores/workspace.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { AllQRModal, Button, QRModal, PersonaModal, ThemeToggle } from '$lib/components/ui';
	import { copyToClipboard } from '$lib/utils';
	import { goto } from '$app/navigation';

	let baseUrl = $state('');
	let selectedTableNumber = $state(1);
	let showQRModal = $state(false);
	let showAllQRModal = $state(false);
	let showPersonaModal = $state(false);
	let selectedPersona = $state<Persona | null>(null);

	// Use reactive global config directly - no need for local copies
	const editablePersonas = globalConfig.personas;
	const editableTables = globalConfig.tables;

	const maxTables = $derived(editableTables.length);

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
				toastStore.error('Failed to clear images');
			}
		}
	}

	function openQRModal() {
		showQRModal = true;
	}

	function openAllQRModal() {
		showAllQRModal = true;
	}

	function openPersonaModal(persona: Persona) {
		selectedPersona = persona;
		showPersonaModal = true;
	}

	function handlePersonaTitleUpdate(personaId: string, newTitle: string) {
		updatePersonaTitle(personaId, newTitle);
	}

	function handlePersonaDescriptionUpdate(personaId: string, newDescription: string) {
		updatePersonaDescription(personaId, newDescription);
	}

	function updateTablePersona(tableIndex: number, personaId: string) {
		// Update the table's persona assignment directly
		if (editableTables[tableIndex]) {
			editableTables[tableIndex].personaId = personaId;
			if (editablePersonas[personaId]) {
				toastStore.success(
					`Table ${editableTables[tableIndex].displayName} assigned to ${editablePersonas[personaId].title}`
				);
			}
		}
	}

	async function deleteTableImage(tableId: string) {
		if (
			!confirm(
				`Are you sure you want to delete the image for Table ${tableId}? This action cannot be undone.`
			)
		) {
			return;
		}

		try {
			const response = await fetch(`/api/tables/${tableId}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				toastStore.success(`Image for Table ${tableId} deleted successfully`);
				window.location.reload();
			} else {
				const error = await response.json();
				toastStore.error(error.error || 'Failed to delete image');
			}
		} catch (error) {
			console.error('Error deleting image:', error);
			toastStore.error('Failed to delete image. Please try again.');
		}
	}
</script>

<svelte:head>
	<title>Z-Interact - Admin</title>
	<meta name="description" content="Interactive workspace design admin controls" />
</svelte:head>

<main
	class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 pt-20 md:p-8 md:pt-20 dark:from-gray-900 dark:to-gray-800"
>
	<div class="container mx-auto max-w-6xl">
		<!-- Actions Section - Moved to Top -->
		<section class="mb-8 rounded-xl bg-white p-6 shadow-lg md:p-8 dark:bg-gray-800">
			<h2
				class="mb-6 text-center text-2xl font-semibold text-slate-800 md:text-3xl dark:text-white"
			>
				Quick Actions
			</h2>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
				<Button
					onclick={() => goto('/gallery')}
					variant="outline"
					class="w-full border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
				>
					🖼️ View Live Gallery
				</Button>
				<Button onclick={clearAllImages} variant="destructive" class="w-full">
					🗑️ Clear All Images
				</Button>
				<Button onclick={openQRModal} class="w-full bg-black text-white hover:bg-gray-800">
					🎯 Generate QR Code
				</Button>
				<Button onclick={openAllQRModal} variant="outline" class="w-full">
					📱 Show All QR Codes
				</Button>
			</div>

			<!-- QR Code Generator Controls -->
			<div class="mt-6 flex items-center justify-center gap-4">
				<Button
					onclick={decrementTable}
					disabled={selectedTableNumber <= 1}
					variant="outline"
					size="icon"
					aria-label="Previous table"
				>
					-
				</Button>
				<span class="w-24 text-center text-2xl font-bold text-slate-800 dark:text-white"
					>Table {selectedTableNumber}</span
				>
				<Button
					onclick={incrementTable}
					disabled={selectedTableNumber >= maxTables}
					variant="outline"
					size="icon"
					aria-label="Next table"
				>
					+
				</Button>
			</div>
		</section>

		<!-- Admin Settings Section -->
		<section class="mb-8 rounded-xl bg-white p-6 shadow-lg md:p-8 dark:bg-gray-800">
			<h2
				class="mb-6 text-center text-2xl font-semibold text-slate-800 md:text-3xl dark:text-white"
			>
				Admin Settings
			</h2>

			<div
				class="mb-6 flex items-center justify-center gap-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-700"
			>
				<div class="flex items-center gap-3">
					<span class="text-sm font-medium text-gray-700 dark:text-gray-300">Theme:</span>
					<ThemeToggle />
				</div>
			</div>
		</section>

		<!-- Editable Configuration Section -->
		<section class="mb-8 rounded-xl bg-white p-6 shadow-lg md:p-8 dark:bg-gray-800">
			<h2
				class="mb-6 text-center text-2xl font-semibold text-slate-800 md:text-3xl dark:text-white"
			>
				Live Configuration <span class="text-sm font-normal text-amber-600 dark:text-amber-400"
					>(Editable)</span
				>
			</h2>

			<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
				<!-- Editable Personas -->
				<div>
					<h3
						class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-700 dark:text-gray-200"
					>
						👥 Personas
						<span class="text-sm font-normal text-gray-500">(Click for details)</span>
					</h3>
					<div class="space-y-4">
						{#each Object.values(editablePersonas) as persona}
							<div
								class="rounded-lg border border-transparent bg-slate-50 p-4 transition-colors hover:border-blue-300 dark:bg-gray-700 dark:hover:border-blue-600"
							>
								<div class="flex items-start gap-3">
									<button
										onclick={() => openPersonaModal(persona)}
										class="flex-1 rounded p-2 text-left transition-colors hover:bg-slate-100 dark:hover:bg-gray-600"
										title="Click to view full details"
										aria-label="Edit persona {persona.title}"
									>
										<input
											type="text"
											value={persona.title}
											oninput={(e) =>
												handlePersonaTitleUpdate(persona.id, (e.target as HTMLInputElement).value)}
											class="w-full border-b border-dashed border-gray-400 bg-transparent font-medium text-slate-800 focus:border-blue-500 focus:outline-none dark:border-gray-500 dark:text-white dark:focus:border-blue-400"
											placeholder="Persona Title"
										/>
										<textarea
											value={persona.description}
											oninput={(e) =>
												handlePersonaDescriptionUpdate(
													persona.id,
													(e.target as HTMLTextAreaElement).value
												)}
											class="mt-2 w-full resize-none border-b border-dashed border-gray-400 bg-transparent text-sm text-slate-600 focus:border-blue-500 focus:outline-none dark:border-gray-500 dark:text-gray-300 dark:focus:border-blue-400"
											placeholder="Persona Description"
											rows="2"
										></textarea>
									</button>
									<Button
										onclick={() => openPersonaModal(persona)}
										variant="ghost"
										size="sm"
										class="mt-2"
										title="View full persona details"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
									</Button>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Editable Tables -->
				<div>
					<h3 class="mb-4 text-lg font-semibold text-slate-700 dark:text-gray-200">
						🏷️ Table Assignments
					</h3>
					<div class="space-y-3">
						{#each editableTables as table, index}
							<div
								class="flex items-center gap-3 rounded-lg border border-transparent bg-slate-50 p-3 transition-colors hover:border-blue-300 dark:bg-gray-700 dark:hover:border-blue-600"
							>
								<span class="flex-1 font-medium text-slate-800 dark:text-white"
									>{table.displayName}</span
								>
								<select
									value={table.personaId}
									onchange={(e) => updateTablePersona(index, (e.target as HTMLSelectElement).value)}
									class="rounded border border-gray-300 bg-white px-3 py-1 text-sm text-slate-700 focus:border-blue-500 focus:outline-none dark:border-gray-500 dark:bg-gray-600 dark:text-gray-200 dark:focus:border-blue-400"
								>
									{#each Object.values(editablePersonas) as persona}
										<option value={persona.id}>{persona.title}</option>
									{/each}
								</select>
								<button
									class="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
									onclick={() => deleteTableImage(table.id)}
									title="Delete image for {table.displayName}"
									aria-label="Delete image for {table.displayName}"
								>
									🗑️ Clear
								</button>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Configuration Status -->
			<div
				class="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20"
			>
				<p class="text-sm text-blue-800 dark:text-blue-300">
					💡 <strong>Live Configuration:</strong> Edit persona titles and descriptions in real-time.
					Changes apply immediately and affect new form submissions. Changes are not persisted and will
					reset on page refresh.
				</p>
			</div>
		</section>
	</div>
</main>

<!-- QR Modal -->
<QRModal bind:open={showQRModal} tableNumber={selectedTableNumber} url={selectedUrl} />

<!-- All QR Codes Modal -->
<AllQRModal
	bind:open={showAllQRModal}
	tables={editableTables}
	personas={editablePersonas}
	{baseUrl}
/>

<!-- Persona Modal -->
<PersonaModal bind:open={showPersonaModal} persona={selectedPersona} />
