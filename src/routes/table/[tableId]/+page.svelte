<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import type { PromptFields, Persona, Table } from '$lib/types';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { Button, Loading } from '$lib/components/ui';
	import { Card, Badge, Modal, Textarea, Label, Helper, Spinner } from 'flowbite-svelte';
	import {
		LockOutline,
		CheckCircleOutline,
		SearchOutline,
		EditOutline,
		CameraPhotoOutline,
		FileLinesOutline
	} from 'flowbite-svelte-icons';
	import { globalConfig, PromptBuilder } from '$lib/stores/config-store.svelte';
	import {
		getWorkspace,
		updateWorkspaceForm,
		setWorkspaceGallery,
		lockWorkspace,
		applyWorkspaceEdit,
		applyWorkspaceRegenerate,
		revertWorkspaceGallery,
		undoWorkspaceEdit,
		canUndoWorkspaceEdit,
		hasReachedUsageLimit,
		getRemainingEdits,
		syncWorkspaces
	} from '$lib/stores/workspace-store.svelte';
	import { createGenerationTask, createEditTask } from '$lib/tasks/generation.svelte';
	import ImagePreview from '$lib/components/workspace/ImagePreview.svelte';
	import ThankYouScreen from '$lib/components/workspace/ThankYouScreen.svelte';
	import EditRegenerateModal from '$lib/components/workspace/EditRegenerateModal.svelte';
	import { editImage, lockImage } from '../ai.remote';
	import { logger } from '$lib/utils/logger';

	let props = $props<{ data: { table: Table; persona: Persona } }>();

	const { table, persona } = props.data;

	// UI state
	let isLoading = $state(true);
	let showPromptPreview = $state(false);
	let currentTask = $state<
		ReturnType<typeof createGenerationTask> | ReturnType<typeof createEditTask> | null
	>(null);
	let showInfoModal = $state(false);
	let showEditModal = $state(false);
	let imageCleanup: (() => void) | null = null;

	// Track which fields have been touched by the user
	let touchedFields = $state<Set<keyof PromptFields>>(new Set());

	// Get workspace for this table - single source of truth
	const workspace = $derived(getWorkspace(table.id));

	// Form data derived directly from global workspace (single source)
	const formData = $derived<PromptFields>(
		workspace?.form?.fields ?? {
			environment: '',
			features: '',
			colorPalette: '',
			atmosphere: '',
			additionalFeatures: ''
		}
	);

	// Derive image and lock state from workspace
	const generatedImage = $derived(workspace?.gallery?.currentUrl || null);
	const originalImage = $derived(workspace?.gallery?.originalUrl || null);
	const isEdited = $derived(workspace?.gallery?.isEdited || false);
	const isLocked = $derived(workspace?.isLocked || false);

	// Form completion progress and validation derived from global workspace
	const progressValue = $derived(workspace?.form?.progress ?? 0);
	const errors = $derived(workspace?.form?.errors ?? ({} as Partial<PromptFields>));
	const isFormValid = $derived(progressValue === 100 && Object.keys(errors).length === 0);

	// Derive generation state from current task
	const isGenerating = $derived(!!currentTask && currentTask.isActive);

	// Derive generation progress from task
	const genPercent = $derived(currentTask ? currentTask.progress : 0);

	// Derive undo availability
	const canUndo = $derived(canUndoWorkspaceEdit(table.id));

	// Derive usage limit state
	const hasReachedLimit = $derived(hasReachedUsageLimit(table.id));
	const remainingEdits = $derived(getRemainingEdits(table.id));

	// Sync with database on mount to check for locked images
	onMount(async () => {
		if (browser && table) {
			try {
				// Sync this table's images from database (admin to avoid time window limit)
				await syncWorkspaces({
					tableId: table.id,
					limit: 50,
					reset: true
				});

				// Store current table ID in localStorage for gallery privacy
				localStorage.setItem('currentTableId', table.id);
			} catch (error) {
				logger.error(
					'Failed to sync with database',
					{ component: 'TablePage', tableId: table.id },
					error as any
				);
			} finally {
				isLoading = false;
			}
		}
	});

	// Generate image handler (supports optional regeneration prompt)
	async function handleGenerateImage(newPrompt?: string) {
		if (!persona || !isFormValid) return;

		// Check usage limit if this is a regeneration (when newPrompt is provided)
		if (newPrompt && hasReachedLimit) {
			toastStore.error(
				'You have reached the maximum limit of 20 edit/regenerate operations for fair use.'
			);
			return;
		}

		// Build prompt using current form data (ensure serializable persona data)
		const serializablePersona = {
			id: persona.id,
			title: persona.title,
			description: persona.description
		};
		const basePrompt = PromptBuilder.buildForGeneration(serializablePersona, formData);
		const finalPrompt = newPrompt || basePrompt;

		// Create generation task with required parameters (ensure serializable data)
		currentTask = createGenerationTask(String(persona.id), String(finalPrompt), String(table.id));

		try {
			// Generate actual image
			const { imageUrl } = await currentTask.result;

			// Use image URL directly (was wrapped by trivial handleOptimisticImage)
			const optimistic = imageUrl;

			// Show image URL immediately via workspace
			if (newPrompt) {
				// This is a regeneration - use the regenerate function to properly track usage
				let regenText = 'Another option';
				const m = newPrompt.match(/Alternative version:\s*(.+)$/);
				if (m && m[1]) regenText = m[1].trim();
				const previousPrompt = (workspace?.gallery?.prompt || basePrompt).slice(0, 900);
				const storedPrompt = `${previousPrompt} <hr> Regenerate: ${regenText}`.slice(0, 1000);
				applyWorkspaceRegenerate(table.id, imageUrl, storedPrompt);
			} else {
				// Initial generation - use the basic gallery setter
				setWorkspaceGallery(table.id, imageUrl, finalPrompt, 'fal.ai', false);
			}

			// No cleanup needed since optimistic is now just the imageUrl string
			toastStore.success('Workspace generated successfully!');
		} catch (error) {
			logger.error(
				'Generation failed',
				{ component: 'TablePage', tableId: table.id },
				error as any
			);
			// currentTask already handles its own error state
			toastStore.error('Failed to generate workspace. Please try again.');

			// Clean up on error
			if (imageCleanup) {
				imageCleanup();
				imageCleanup = null;
			}
		} finally {
			// Clear task deterministically on completion
			currentTask = null;
		}
	}

	// Lock image handler
	async function lockInImage() {
		if (!generatedImage || !persona) return;

		const finalPrompt = PromptBuilder.buildForGeneration(persona, formData);

		try {
			// First, save to database
			await lockImage({
				personaId: persona.id,
				imageUrl: generatedImage,
				prompt: finalPrompt,
				tableId: table.id
			});

			// Then update workspace state
			lockWorkspace(table.id);

			toastStore.success('Image locked in successfully! View it on the presenter dashboard.');

			// Clean up blob URL if exists
			if (imageCleanup) {
				imageCleanup();
				imageCleanup = null;
			}
		} catch (error) {
			logger.error(
				'Failed to lock image',
				{ component: 'TablePage', tableId: table.id },
				error as any
			);
			toastStore.error('Failed to lock image. Please try again.');
		}
	}

	// Edit handlers
	async function handleEdit(editPrompt: string) {
		if (!generatedImage || !persona) return;

		// Check usage limit
		if (hasReachedLimit) {
			toastStore.error(
				'You have reached the maximum limit of 20 edit/regenerate operations for fair use.'
			);
			return;
		}

		// Create edit task with progress tracking (ensure serializable data)
		currentTask = createEditTask(
			String(generatedImage),
			String(editPrompt),
			String(persona.id),
			String(table.id)
		);

		try {
			// Get result from edit task
			const { imageUrl } = await currentTask.result;

			if (imageUrl) {
				applyWorkspaceEdit(table.id, editPrompt, imageUrl);
				toastStore.success('Image edited successfully!');
			}
		} catch (error) {
			logger.error('Edit failed', { component: 'TablePage', tableId: table.id }, error as any);
			toastStore.error('Failed to edit image. Please try again.');
		} finally {
			// Clear task when done
			currentTask = null;
		}
	}

	async function handleRevert() {
		if (revertWorkspaceGallery(table.id)) {
			toastStore.success('Reverted to original image');
		}
		showEditModal = false;
	}

	async function handleUndo() {
		if (undoWorkspaceEdit(table.id)) {
			toastStore.success('Undid last edit');
		} else {
			toastStore.error('No edits to undo');
		}
	}

	// Event handlers for form updates
	function handleFormDataChange(field: keyof PromptFields, value: string) {
		// Mark field as touched when user types in it
		touchedFields.add(field);

		// Update global workspace form with a partial for minimal churn
		if (table && workspace) {
			updateWorkspaceForm(table.id, { [field]: value } as Partial<PromptFields>);
		}
	}

	function togglePromptPreview() {
		showPromptPreview = !showPromptPreview;
	}

	// Cleanup on unmount
	$effect(() => {
		return () => {
			if (imageCleanup) {
				imageCleanup();
			}
		};
	});
</script>

<!-- Reusable form field snippet -->
{#snippet formFieldInput(
	field: keyof PromptFields,
	fieldConfig: { label: string; fieldSuggestions: { placeholder: string; suggestions: string } },
	currentValue: string,
	minLength: number,
	isComplete: boolean,
	currentLength: number,
	error: string | undefined,
	handleChange: (e: Event) => void,
	touchedFields: Set<keyof PromptFields>
)}
	<div class="space-y-3 sm:space-y-2">
		<div class="flex items-center justify-between">
			<Label for={field} class="text-sm font-semibold text-gray-900 sm:text-base dark:text-white">
				{fieldConfig.label}
			</Label>

			<div class="flex items-center gap-2">
				{#if isComplete}
					<span
						class="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 sm:px-3 sm:py-1.5 sm:text-sm dark:bg-green-900/30 dark:text-green-400"
					>
						<CheckCircleOutline class="mr-1 inline h-3 w-3 sm:h-4 sm:w-4" />
						Complete
					</span>
				{:else if currentLength > 0}
					<span
						class="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 sm:px-3 sm:py-1.5 sm:text-sm dark:bg-amber-900/30 dark:text-amber-400"
					>
						{minLength - currentLength} more
					</span>
				{/if}

				<!-- Character count -->
				<span class="text-xs text-gray-500 dark:text-gray-400">
					{currentLength}/2000
				</span>
			</div>
		</div>
		<!-- Mobile-optimized textarea with better sizing -->
		<Textarea
			id={field}
			value={currentValue}
			oninput={handleChange}
			placeholder={fieldConfig.fieldSuggestions.placeholder}
			maxlength={2000}
			rows={3}
			class="min-h-[80px] w-full resize-none rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
		/>

		<!-- Mobile-friendly suggestions -->
		<p
			class="mt-3 text-sm leading-relaxed text-gray-500 italic sm:mt-2 sm:text-xs dark:text-gray-400"
		>
			{fieldConfig.fieldSuggestions.suggestions}
		</p>

		{#if error && touchedFields.has(field)}
			<Helper color="red" class="text-sm sm:text-xs">{error}</Helper>
		{/if}
	</div>
{/snippet}

<svelte:head>
	<title>{persona?.title || 'Table'} - AI Workspace Generator</title>
	<meta name="description" content="Create your ideal workspace using AI" />
</svelte:head>

<!-- Persona Info Modal -->
<Modal bind:open={showInfoModal} size="lg" title={persona?.title} outsideclose>
	<div class="space-y-6">
		<!-- Full Description -->
		<div>
			<h4 class="mb-2 font-medium text-gray-900 dark:text-gray-100">About This Persona</h4>
			<p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
				{persona?.description}
			</p>
		</div>

		<!-- Key Details -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
				<h5 class="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">Generation Focus</h5>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					This persona will influence how the AI designs your workspace, considering their unique
					needs, preferences, and generational characteristics.
				</p>
			</div>
			<div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
				<h5 class="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">Your Role</h5>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					Complete the form below to describe your ideal workspace. The AI will create a design that
					matches both your requirements and this persona's characteristics.
				</p>
			</div>
		</div>
	</div>
</Modal>

<!-- Edit/Regenerate Modal -->
{#if showEditModal && generatedImage}
	<EditRegenerateModal
		bind:open={showEditModal}
		currentImage={generatedImage}
		currentPrompt={workspace?.gallery?.prompt ||
			PromptBuilder.buildForGeneration(persona, formData)}
		{formData}
		onClose={() => (showEditModal = false)}
		onEdit={handleEdit}
		onRegenerate={handleGenerateImage}
		isEditLoading={isGenerating}
		isRegenerateLoading={isGenerating}
		{remainingEdits}
		{hasReachedLimit}
	/>
{/if}

{#if !persona || !table}
	<!-- Error State -->
	<div
		class="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-red-900"
	>
		<Card size="lg" class="max-w-md">
			<h2 class="mb-4 text-2xl font-bold text-red-600 dark:text-red-400">Configuration Error</h2>
			<p class="mb-6 text-gray-600 dark:text-gray-400">
				Unable to load table configuration. Please check your table ID and try again.
			</p>
		</Card>
	</div>
{:else if isLoading}
	<!-- Loading State -->
	<div
		class="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800"
	>
		<div
			class="glass-morphism rounded-xl border border-blue-200/50 px-6 py-5 text-center shadow-sm backdrop-blur-md dark:border-blue-800/40"
		>
			<Spinner color="blue" size="12" />
			<p class="mt-2 text-sm text-gray-700 dark:text-gray-300">Loading ZYETAi workspace…</p>
		</div>
	</div>
{:else if isLocked}
	<!-- Thank You State - Shows when image is locked -->
	<ThankYouScreen {generatedImage} tableId={table.id} />
{:else}
	<!-- Main Workspace Generator -->
	<div
		class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800"
	>
		<!-- Mobile-optimized Top Bar -->
		<div
			class="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/95 px-4 backdrop-blur-sm sm:h-14 sm:px-6 dark:border-gray-700 dark:bg-gray-900/95"
		>
			<div class="flex items-center gap-3 sm:gap-2">
				<Badge color="blue" class="text-sm font-medium sm:text-xs">{table.displayName}</Badge>
				<Badge color="indigo" class="text-sm font-medium sm:text-xs">{persona.title}</Badge>
				<!-- Mobile-friendly touch target -->
				<button
					onclick={() => (showInfoModal = true)}
					class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 sm:min-h-0 sm:min-w-0 sm:p-1 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
					title="View detailed persona information"
					aria-label="View detailed persona information"
				>
					<svg class="h-5 w-5 sm:h-4 sm:w-4" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
			</div>

			<!-- Mobile-enhanced Progress Bar -->
			<div class="flex items-center gap-3 text-base sm:gap-2 sm:text-sm">
				<span class="font-medium text-gray-600 sm:hidden dark:text-gray-400">{progressValue}%</span>
				<span class="hidden text-gray-600 sm:inline dark:text-gray-400">{progressValue}%</span>
				<div class="h-3 w-24 rounded-full bg-gray-200 sm:h-2 sm:w-20 lg:w-24 dark:bg-gray-700">
					<div
						class="h-3 rounded-full transition-all duration-300 sm:h-2 {progressValue === 100
							? 'bg-green-500'
							: 'bg-blue-500'}"
						style="width: {progressValue}%"
					></div>
				</div>
			</div>
		</div>

		<!-- Mobile-First Responsive Layout -->
		<div
			class="flex min-h-[calc(100vh-4rem)] flex-col sm:min-h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-3.5rem)] lg:flex-row"
		>
			<!-- Form Panel: Mobile-first stacked layout -->
			<div class="flex w-full flex-col bg-white lg:w-1/2 lg:overflow-y-auto dark:bg-gray-900">
				<div class="flex flex-col px-4 py-6 sm:px-6 sm:py-6 lg:flex-1">
					<!-- Form Header - Mobile-optimized typography -->
					<div class="mb-6 flex-shrink-0 sm:mb-8">
						<h1
							class="mb-3 text-xl leading-tight font-bold text-gray-900 sm:mb-2 sm:text-2xl lg:text-2xl dark:text-white"
						>
							Describe Your Workspace
						</h1>
						<p
							class="text-sm leading-relaxed text-gray-600 sm:text-base lg:text-base dark:text-gray-400"
						>
							Work together with your table to create a detailed description.
						</p>
					</div>

					<!-- Form Fields -->
					<form
						onsubmit={(e) => {
							e.preventDefault();
							handleGenerateImage();
						}}
						class="flex flex-1 flex-col lg:min-h-0"
					>
						<div class="flex-1 space-y-6 sm:space-y-5 lg:space-y-4">
							{#each persona.promptStructure as fieldConfig (fieldConfig.field)}
								{@const typedField = fieldConfig.field as keyof PromptFields}
								{@const minLength = PromptBuilder.getFieldMinLength(typedField)}
								{@const currentLength = formData[typedField]?.length || 0}
								{@const isComplete = currentLength >= minLength}

								{@render formFieldInput(
									typedField,
									fieldConfig,
									formData[typedField],
									minLength,
									isComplete,
									currentLength,
									errors[typedField],
									(e) =>
										handleFormDataChange(
											typedField,
											(e.currentTarget as HTMLTextAreaElement).value
										),
									touchedFields
								)}
							{/each}
						</div>

						<!-- Mobile-optimized Action Buttons -->
						<div
							class="mt-8 flex flex-col gap-4 border-t pt-6 sm:mt-6 sm:gap-3 sm:pt-4 dark:border-gray-700"
						></div>
					</form>
				</div>
			</div>

			<!-- Preview Panel: Mobile-friendly stacked layout -->
			<div class="flex w-full flex-col bg-gray-50 lg:w-1/2 lg:overflow-y-auto dark:bg-gray-800">
				<!-- Preview Content with better mobile spacing -->
				<div class="relative flex-1 px-4 py-6 sm:px-6 sm:py-6">
					<!-- Preview Header - Mobile-optimized typography -->
					<div class="mb-6 flex-shrink-0 sm:mb-8">
						<h1
							class="mb-3 text-xl leading-tight font-bold text-gray-900 sm:mb-2 sm:text-2xl lg:text-2xl dark:text-white"
						>
							Generated Workspace
						</h1>
						<p
							class="text-sm leading-relaxed text-gray-600 sm:text-base lg:text-base dark:text-gray-400"
						>
							Your AI-generated workspace visualization will appear here.
						</p>
					</div>

					<!-- Preview AI Prompt Section (moved above generate button) -->
					{#if progressValue > 50}
						<div
							class="mb-6 rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900"
						>
							<button
								type="button"
								onclick={togglePromptPreview}
								class="flex w-full items-center justify-between p-3 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
							>
								<SearchOutline class="mr-2 h-4 w-4" />
								<span>Preview AI Prompt</span>
								<svg
									class="h-4 w-4 transform transition-transform {showPromptPreview
										? 'rotate-180'
										: ''}"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 9l-7 7-7-7"
									/>
								</svg>
							</button>
							{#if showPromptPreview}
								<div class="border-t border-gray-200 p-4 dark:border-gray-600">
									<div class="space-y-3">
										<!-- Persona Info -->
										{#if persona}
											<div class="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
												<h4 class="text-sm font-semibold text-blue-800 dark:text-blue-300">
													{persona.title}
												</h4>
												<p class="mt-1 text-xs text-blue-600 dark:text-blue-400">
													{persona.description}
												</p>
											</div>
										{/if}

										<!-- Full Prompt Preview -->
										<div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
											<pre
												class="max-h-40 overflow-y-auto text-xs whitespace-pre-wrap text-gray-700 dark:text-gray-300">{PromptBuilder.buildForDisplay(
													{
														id: persona.id,
														title: persona.title,
														description: persona.description
													},
													formData
												)}</pre>
										</div>

										<p class="text-sm text-gray-500 sm:text-xs dark:text-gray-400">
											This prompt includes your persona details and all form inputs that will guide
											the AI generation.
										</p>
									</div>
								</div>
							{/if}
						</div>
					{/if}

					<ImagePreview
						image={generatedImage}
						{originalImage}
						{isEdited}
						isGenerating={isGenerating || false}
						progress={genPercent}
						{persona}
						{formData}
						{isFormValid}
						onGenerateImage={handleGenerateImage}
						onLockInImage={lockInImage}
						onEditRegenerate={() => (showEditModal = true)}
						onUndo={handleUndo}
						{isLocked}
						tableId={table.id}
						{canUndo}
					/>

					<!-- Usage Limit Display -->
					{#if generatedImage && !isLocked && !isGenerating}
						<div class="mt-4 flex justify-center">
							{#if hasReachedLimit}
								<div class="rounded-lg bg-red-50 px-4 py-2 dark:bg-red-900/20">
									<p class="text-xs font-medium text-red-800 dark:text-red-300">
										⚠️ Edit/Regenerate limit reached (20/20)
									</p>
								</div>
							{:else if remainingEdits <= 5}
								<div class="rounded-lg bg-yellow-50 px-4 py-2 dark:bg-yellow-900/20">
									<p class="text-xs font-medium text-yellow-800 dark:text-yellow-300">
										🎯 {remainingEdits} operations remaining
									</p>
								</div>
							{:else}
								<div class="rounded-lg bg-blue-50 px-4 py-2 dark:bg-blue-900/20">
									<p class="text-xs font-medium text-blue-800 dark:text-blue-300">
										🎯 {remainingEdits} operations remaining
									</p>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
