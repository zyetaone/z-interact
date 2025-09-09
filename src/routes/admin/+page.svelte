<script lang="ts">
	import { globalConfig, RENDERING_SPECS, updateEventInfo } from '$lib/stores/config-store.svelte';
	import {
		getWorkspace,
		getOverallProgress,
		clearAllLocks,
		resetAllWorkspaces
	} from '$lib/stores/workspace-store.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import {
		QRModal,
		Button,
		ThemeToggle,
		PersonaModal,
		ImageWithLoader,
		GlassCard
	} from '$lib/components/ui';
	import { Spinner } from 'flowbite-svelte';
	import {
		LockOpenOutline,
		LockOutline,
		MobilePhoneOutline,
		ArrowsRepeatOutline,
		CogOutline,
		ClipboardListOutline,
		EditOutline,
		ExclamationCircleOutline,
		CheckCircleOutline,
		TrashBinOutline,
		CameraPhotoOutline,
		PrinterOutline,
		EyeOutline,
		DownloadOutline
	} from 'flowbite-svelte-icons';
	import QRCodeGenerator from '$lib/components/ui/qr-code-generator.svelte';
	import { downloadImage, openFullscreen } from '$lib/utils/image-utils';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

	import type { Image } from '$lib/server/db/schema';
	import {
		listImages,
		deleteImage as deleteImageRF,
		clearImages as clearImagesRF
	} from '../gallery/gallery.remote';

	// State
	let activeTab = $state<'settings' | 'tables' | 'images' | 'prompts'>('settings');
	let images = $state<Image[]>([]);
	let loading = $state(false);
	let showAllQRModal = $state(false);
	let showPersonaModal = $state(false);
	let selectedPersona = $state<any>(null);
	let baseUrl = $state('');
	let showSingleQRModal = $state(false);
	let selectedTableId = $state<string>('');
	let selectedTableURL = $state<string>('');

	// Derived values
	const overallProgress = $derived(getOverallProgress());
	const completedTables = $derived(
		globalConfig.tables.filter((t) => {
			const workspace = getWorkspace(t.id);
			return workspace?.isLocked;
		}).length
	);

	// Initialize base URL
	$effect(() => {
		if (browser) {
			baseUrl = window.location.origin;
		}
	});

	// Image management functions
	async function loadImages() {
		loading = true;
		try {
			images = await listImages({ admin: true });
		} catch (error) {
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
			// Optimistically remove from UI immediately for better UX
			images = images.filter((img) => img.id !== imageId);

			// Delete from backend (R2 + database)
			await deleteImageRF({ imageId });
			toastStore.success('Image deleted successfully');

			// Optionally reload to ensure sync (can be removed if optimistic update is sufficient)
			// await loadImages();
		} catch (error) {
			toastStore.error('Failed to delete image');
			// Reload on error to restore correct state
			await loadImages();
		}
	}

	async function clearAllImages() {
		if (
			!confirm(
				'WARNING: This will permanently delete ALL images from both the database and cloud storage (R2). This action cannot be undone!\n\nAre you absolutely sure?'
			)
		) {
			return;
		}

		try {
			const result = await clearImagesRF(undefined);
			toastStore.success(
				`Cleared ${result.data.deletedFromDb} images from database${result.data.deletedFromR2 ? ` and ${result.data.deletedFromR2} from storage` : ''}`
			);
			// Also clear local state
			clearAllLocks();
			resetAllWorkspaces();
			await loadImages();
		} catch (error) {
			toastStore.error('Failed to clear images');
		}
	}

	// QR Modal handlers
	function openSingleQRModal(tableId: string) {
		selectedTableId = tableId;
		selectedTableURL = `${baseUrl}/table/${tableId}`;
		showSingleQRModal = true;
	}

	// Helper functions
	function getTableProgress(tableId: string): number {
		const workspace = getWorkspace(tableId);
		if (!workspace) return 0;
		if (workspace.isLocked) return 100;
		return workspace.form.progress || 0;
	}

	function getTableStatus(tableId: string): 'empty' | 'in-progress' | 'completed' {
		const workspace = getWorkspace(tableId);
		if (!workspace) return 'empty';
		if (workspace.isLocked) return 'completed';
		if (workspace.form.progress > 0) return 'in-progress';
		return 'empty';
	}

	function viewImage(image: Image) {
		if (image.imageUrl) {
			openFullscreen(image.imageUrl);
		}
	}

	function downloadImageFile(image: Image) {
		if (image.imageUrl) {
			downloadImage(image.imageUrl, `${image.personaId}-${image.tableId || 'unknown'}.png`);
		}
	}

	function navigateToTable(tableId: string) {
		goto(`/table/${tableId}`);
	}

	function toggleLock(tableId: string) {
		const workspace = getWorkspace(tableId);
		if (workspace) {
			workspace.isLocked = !workspace.isLocked;
			toastStore.success(
				workspace.isLocked
					? `Table ${tableId} locked successfully`
					: `Table ${tableId} unlocked successfully`
			);
		}
	}

	// Load images on mount
	$effect(() => {
		loadImages();
	});

	// Tab configuration for cleaner rendering
	const tabs = [
		{ id: 'settings', label: 'Quick Settings', icon: CogOutline },
		{ id: 'tables', label: 'Table Configuration', icon: ClipboardListOutline },
		{ id: 'images', label: 'Image Management', icon: CameraPhotoOutline },
		{ id: 'prompts', label: 'Prompt Management', icon: EditOutline }
	] as const;
</script>

<svelte:head>
	<title>Admin Panel - {globalConfig.eventInfo.name}</title>
	<meta name="description" content="Admin panel for managing event configuration and content" />
</svelte:head>

<main
	class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 dark:from-gray-900 dark:to-gray-800"
>
	<div class="mx-auto max-w-7xl">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-center justify-end">
				<!-- Overall Progress -->
				<div class="rounded-lg bg-white px-4 py-2 shadow-sm dark:bg-gray-800">
					<div class="flex items-center gap-3">
						<div class="text-sm text-gray-600 dark:text-gray-400">Progress</div>
						<div class="flex items-center gap-2">
							<div class="h-2 w-24 rounded-full bg-gray-200 dark:bg-gray-700">
								<div
									class="h-2 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
									style="width: {overallProgress}%"
								></div>
							</div>
							<span class="text-sm font-medium text-gray-900 dark:text-white">
								{overallProgress}%
							</span>
						</div>
					</div>
				</div>
				<ThemeToggle />
			</div>
		</div>
	</div>

	<!-- Tabs -->
	<div class="mb-6">
		<div class="border-b border-gray-200 dark:border-gray-700">
			<nav class="-mb-px flex space-x-8">
				{#each tabs as tab}
					{@const Icon = tab.icon}
					<button
						onclick={() => (activeTab = tab.id)}
						class="group inline-flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors {activeTab ===
						tab.id
							? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
							: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}"
					>
						<Icon class="h-5 w-5" />
						{tab.label}
					</button>
				{/each}
			</nav>
		</div>
	</div>

	<!-- Tab Content -->
	<div class="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
		{#if activeTab === 'settings'}
			<!-- Quick Settings Tab -->
			<div class="space-y-6">
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white">Quick Settings</h2>

				<div class="grid gap-6 lg:grid-cols-2">
					<!-- Event Settings -->
					<div
						class="rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900"
					>
						<h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-white">
							Event Configuration
						</h3>
						<div class="space-y-4">
							<div>
								<label
									for="event-name"
									class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
								>
									Event Name
								</label>
								<input
									id="event-name"
									type="text"
									value={globalConfig.eventInfo.name}
									oninput={(e) => updateEventInfo(e.currentTarget.value)}
									class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
								/>
							</div>
							<div>
								<label
									for="event-status"
									class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
								>
									Event Status
								</label>
								<select
									id="event-status"
									value={globalConfig.eventInfo.status}
									onchange={(e) =>
										updateEventInfo(
											undefined,
											e.currentTarget.value as 'active' | 'inactive' | 'upcoming'
										)}
									class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
								>
									<option value="upcoming">Upcoming</option>
									<option value="active">Active</option>
									<option value="inactive">Event Done</option>
								</select>
							</div>
							<div
								class="flex items-center gap-2 border-t border-gray-200 pt-4 dark:border-gray-600"
							>
								<span class="text-xs text-gray-500 dark:text-gray-400">Status:</span>
								<span
									class="rounded-full px-3 py-1 text-xs font-medium {globalConfig.eventInfo
										.status === 'active'
										? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
										: globalConfig.eventInfo.status === 'upcoming'
											? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
											: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}"
								>
									{globalConfig.eventInfo.status === 'inactive'
										? 'Event Done'
										: globalConfig.eventInfo.status}
								</span>
							</div>
						</div>
					</div>

					<!-- Statistics -->
					<div
						class="rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900"
					>
						<h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-white">Event Statistics</h3>
						<div class="space-y-3">
							<div class="flex justify-between">
								<span class="text-sm text-gray-600 dark:text-gray-400">Total Tables</span>
								<span class="font-medium text-gray-900 dark:text-white">
									{globalConfig.tables.length}
								</span>
							</div>
							<div class="flex justify-between">
								<span class="text-sm text-gray-600 dark:text-gray-400">Completed</span>
								<span class="font-medium text-green-600 dark:text-green-400">
									{completedTables}
								</span>
							</div>
							<div class="flex justify-between">
								<span class="text-sm text-gray-600 dark:text-gray-400">In Progress</span>
								<span class="font-medium text-blue-600 dark:text-blue-400">
									{globalConfig.tables.filter((t) => {
										const status = getTableStatus(t.id);
										return status === 'in-progress';
									}).length}
								</span>
							</div>
							<div class="flex justify-between">
								<span class="text-sm text-gray-600 dark:text-gray-400">Images Generated</span>
								<span class="font-medium text-gray-900 dark:text-white">{images.length}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-sm text-gray-600 dark:text-gray-400">Personas</span>
								<span class="font-medium text-gray-900 dark:text-white">
									{Object.keys(globalConfig.personas).length}
								</span>
							</div>
						</div>
					</div>

					<!-- Theme Settings -->
					<div
						class="rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900"
					>
						<h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-white">Appearance</h3>
						<div class="flex items-center justify-between">
							<span class="text-sm text-gray-600 dark:text-gray-400">Theme Mode</span>
							<ThemeToggle />
						</div>
					</div>

					<!-- Quick Actions -->
					<div
						class="rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900"
					>
						<h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-white">Quick Actions</h3>
						<div class="space-y-2">
							<Button onclick={() => (showAllQRModal = true)} variant="outline" class="w-full">
								<MobilePhoneOutline class="mr-2 h-4 w-4" />
								View All QR Codes
							</Button>
							<Button
								onclick={() => window.open('/gallery', '_blank')}
								variant="outline"
								class="w-full"
							>
								<CameraPhotoOutline class="mr-2 h-4 w-4" />
								Open Gallery
							</Button>
						</div>
					</div>
				</div>
			</div>
		{:else if activeTab === 'tables'}
			<!-- Tables Tab (Combined QR + Assignments) -->
			<div class="space-y-6">
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-semibold text-gray-900 dark:text-white">Table Management</h2>
					<div class="flex gap-2">
						<Button onclick={() => (showAllQRModal = true)} variant="outline">
							<MobilePhoneOutline class="mr-2 h-4 w-4" />
							View All QR
						</Button>
						<Button onclick={() => window.print()} variant="outline">
							<PrinterOutline class="mr-2 h-4 w-4" />
							Print QR Codes
						</Button>
					</div>
				</div>

				<!-- Table Assignments Grid -->
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each globalConfig.tables as table (table.id)}
						{@const workspace = getWorkspace(table.id)}
						{@const progress = getTableProgress(table.id)}
						{@const status = getTableStatus(table.id)}
						<div
							class="group relative overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
						>
							<!-- Status Badge -->
							<div class="absolute top-2 right-2 z-10">
								{#if status === 'completed'}
									<span class="rounded-full bg-green-500 px-2 py-1 text-xs font-medium text-white">
										<CheckCircleOutline class="mr-1 inline h-3 w-3" />
										Complete
									</span>
								{:else if status === 'in-progress'}
									<span class="rounded-full bg-blue-500 px-2 py-1 text-xs font-medium text-white">
										{progress}%
									</span>
								{/if}
							</div>

							<!-- QR Code Section -->
							<button
								onclick={() => openSingleQRModal(table.id)}
								class="block w-full cursor-pointer p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
							>
								<div class="mb-3 text-center">
									<h3 class="text-lg font-bold text-gray-900 dark:text-white">
										{table.displayName}
									</h3>
								</div>
								<div class="mx-auto aspect-square w-full max-w-[150px]">
									<QRCodeGenerator
										url={`${baseUrl}/table/${table.id}`}
										size={150}
										class="h-full w-full"
									/>
								</div>
							</button>

							<!-- Assignment Section -->
							<div class="border-t border-gray-200 p-4 dark:border-gray-700">
								<label
									for="persona-{table.id}"
									class="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300"
								>
									Assigned Persona
								</label>
								<select
									id="persona-{table.id}"
									bind:value={table.personaId}
									class="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
								>
									{#each Object.values(globalConfig.personas) as persona (persona.id)}
										<option value={persona.id}>{persona.title}</option>
									{/each}
								</select>

								<!-- Quick Actions -->
								<div class="mt-3 flex gap-2">
									<Button
										onclick={() => navigateToTable(table.id)}
										size="sm"
										variant="outline"
										class="flex-1 text-xs"
									>
										Open
									</Button>
									{#if workspace?.gallery?.currentUrl}
										<Button
											onclick={() =>
												workspace.gallery &&
												viewImage({ imageUrl: workspace.gallery.currentUrl } as Image)}
											size="sm"
											variant="outline"
											class="flex-1 text-xs"
										>
											View
										</Button>
									{/if}
									<Button
										onclick={() => toggleLock(table.id)}
										size="sm"
										variant={workspace?.isLocked ? 'default' : 'outline'}
										class="flex items-center gap-1 text-xs"
									>
										{#if workspace?.isLocked}
											<LockOutline class="h-3 w-3" />
											Locked
										{:else}
											<LockOpenOutline class="h-3 w-3" />
											Unlock
										{/if}
									</Button>
								</div>
							</div>

							<!-- Progress Bar -->
							{#if progress > 0 && progress < 100}
								<div class="absolute bottom-0 left-0 h-1 w-full bg-gray-200 dark:bg-gray-700">
									<div
										class="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
										style="width: {progress}%"
									></div>
								</div>
							{/if}
						</div>
					{/each}
				</div>

				<p class="text-sm text-gray-500 dark:text-gray-400">
					* Table assignments are saved automatically when changed
				</p>
			</div>
		{:else if activeTab === 'images'}
			<!-- Enhanced Images Tab -->
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-semibold text-gray-900 dark:text-white">
						Image Management
						<span class="ml-2 text-sm text-gray-500">({images.length} total)</span>
					</h2>
					<div class="flex gap-2">
						<Button onclick={loadImages} variant="outline" size="sm">
							<ArrowsRepeatOutline class="mr-2 h-4 w-4" />
							Refresh
						</Button>
						{#if images.length > 0}
							<Button onclick={clearAllImages} variant="destructive" size="sm">
								<TrashBinOutline class="mr-2 h-4 w-4" />
								Clear All (R2 + DB)
							</Button>
						{/if}
					</div>
				</div>

				{#if loading}
					<div class="flex items-center justify-center py-12">
						<div
							class="glass-morphism rounded-xl border border-blue-200/50 px-6 py-5 text-center shadow-sm backdrop-blur-md dark:border-blue-800/40"
						>
							<Spinner color="blue" size="8" />
							<p class="mt-2 text-sm text-gray-700 dark:text-gray-300">Loading images…</p>
						</div>
					</div>
				{:else if images.length === 0}
					<div
						class="rounded-lg border-2 border-dashed border-gray-300 py-12 text-center dark:border-gray-700"
					>
						<div class="mb-4 text-6xl"><CameraPhotoOutline class="h-16 w-16" /></div>
						<p class="text-gray-500 dark:text-gray-400">No images generated yet</p>
						<p class="mt-2 text-sm text-gray-400 dark:text-gray-500">
							Images will appear here once participants start creating them
						</p>
					</div>
				{:else}
					<!-- Image Grid with Thumbnails -->
					<div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
						{#each images as image (image.id)}
							<GlassCard class="group relative overflow-hidden">
								<!-- Thumbnail -->
								<div class="aspect-square w-full overflow-hidden">
									{#if image.imageUrl}
										<ImageWithLoader
											src={image.imageUrl}
											alt={image.prompt || 'Generated image'}
											class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
											loading="lazy"
										/>
									{:else}
										<div class="flex h-full items-center justify-center text-gray-400">
											<CameraPhotoOutline class="h-8 w-8" />
										</div>
									{/if}
								</div>

								<!-- Info Overlay -->
								<div
									class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
								>
									<div class="absolute right-0 bottom-0 left-0 p-3 text-white">
										<div class="text-xs font-medium">
											{image.personaTitle || image.personaId}
										</div>
										<div class="text-xs opacity-90">
											Table {image.tableId || 'N/A'}
										</div>
										<div class="mt-2 flex gap-1">
											<button
												onclick={() => viewImage(image)}
												class="rounded bg-white/20 p-1 backdrop-blur-sm transition-colors hover:bg-white/30"
												title="View fullscreen"
												aria-label="View fullscreen"
											>
												<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
													<path
														d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z"
													/>
												</svg>
											</button>
											<button
												onclick={() => downloadImageFile(image)}
												class="rounded bg-white/20 p-1 backdrop-blur-sm transition-colors hover:bg-white/30"
												title="Download"
												aria-label="Download image"
											>
												<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
													<path
														fill-rule="evenodd"
														d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
														clip-rule="evenodd"
													/>
												</svg>
											</button>
											<button
												onclick={() => deleteImage(image.id)}
												class="rounded bg-red-500/20 p-1 backdrop-blur-sm transition-colors hover:bg-red-500/30"
												title="Delete"
												aria-label="Delete image"
											>
												<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
													<path
														fill-rule="evenodd"
														d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
														clip-rule="evenodd"
													/>
												</svg>
											</button>
										</div>
									</div>
								</div>

								<!-- Status Badge -->
								{#if image.status === 'locked'}
									<div class="absolute top-2 right-2">
										<span class="rounded bg-green-500/90 px-2 py-1 text-xs font-medium text-white">
											Locked
										</span>
									</div>
								{/if}
							</GlassCard>
						{/each}
					</div>
				{/if}
			</div>
		{:else if activeTab === 'prompts'}
			<!-- Prompt Management Tab (renamed from Configuration) -->
			<div class="space-y-6">
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white">Prompt Management</h2>

				<!-- System Prompts -->
				<div>
					<h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-white">System Prompts</h3>
					<div class="space-y-4">
						<div
							class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
						>
							<h4 class="mb-2 font-medium text-gray-900 dark:text-white">Scene Setting</h4>
							<p class="font-mono text-sm whitespace-pre-wrap text-gray-600 dark:text-gray-400">
								{globalConfig.masterSystemPrompt}
							</p>
						</div>
						<div
							class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
						>
							<h4 class="mb-2 font-medium text-gray-900 dark:text-white">
								Rendering Specifications
							</h4>
							<p class="font-mono text-sm whitespace-pre-wrap text-gray-600 dark:text-gray-400">
								{RENDERING_SPECS}
							</p>
						</div>
					</div>
				</div>

				<!-- Persona Configuration -->
				<div>
					<h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-white">
						Persona Configuration
					</h3>
					<div class="grid gap-4 lg:grid-cols-2">
						{#each Object.values(globalConfig.personas) as persona (persona.id)}
							<div
								class="rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
							>
								<div class="mb-3 flex items-start justify-between">
									<div class="flex-1">
										<h4 class="font-medium text-gray-900 dark:text-white">
											{persona.title}
										</h4>
										<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
											{persona.description.length > 120
												? persona.description.substring(0, 120) + '...'
												: persona.description}
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
								<div class="space-y-1 text-xs">
									<div class="flex items-center gap-2">
										<span class="text-gray-500 dark:text-gray-400">ID:</span>
										<code class="rounded bg-gray-100 px-1 dark:bg-gray-700">
											{persona.id}
										</code>
									</div>
									<div class="flex items-center gap-2">
										<span class="text-gray-500 dark:text-gray-400">Fields:</span>
										<span class="text-gray-700 dark:text-gray-300">
											{persona.promptStructure.length} questions
										</span>
									</div>
									<div class="flex items-center gap-2">
										<span class="text-gray-500 dark:text-gray-400">Used by:</span>
										<span class="text-gray-700 dark:text-gray-300">
											{globalConfig.tables.filter((t) => t.personaId === persona.id).length} tables
										</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Prompt Fields -->
				<div>
					<h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-white">
						Prompt Field Structure
					</h3>
					<div
						class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
					>
						<p class="mb-3 text-sm text-gray-600 dark:text-gray-400">
							All personas use the same prompt structure with these fields:
						</p>
						<ol class="space-y-2 text-sm">
							{#each globalConfig.personas[Object.keys(globalConfig.personas)[0]].promptStructure as field, i}
								<li class="flex items-start gap-2">
									<span class="font-medium text-gray-700 dark:text-gray-300">{i + 1}.</span>
									<div>
										<span class="font-medium text-gray-900 dark:text-white">
											{field.label}
										</span>
										<span class="ml-2 text-xs text-gray-500 dark:text-gray-400">
											(field: {field.field})
										</span>
									</div>
								</li>
							{/each}
						</ol>
					</div>
				</div>
			</div>
		{/if}
	</div>
</main>

<!-- Modals -->
<QRModal
	bind:open={showAllQRModal}
	tables={globalConfig.tables}
	personas={globalConfig.personas}
	{baseUrl}
/>

<PersonaModal bind:open={showPersonaModal} persona={selectedPersona} />

<QRModal
	bind:open={showSingleQRModal}
	tableNumber={parseInt(selectedTableId)}
	url={selectedTableURL}
/>

<style>
	/* Print styles for QR codes */
	@media print {
		main > div > div:not(:nth-child(3)) {
			display: none !important;
		}
	}
</style>
