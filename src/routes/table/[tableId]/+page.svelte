<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { browser } from '$app/environment';
	import type { PromptFields, Persona, Table } from '$lib/types';
	import { initialize, lockImage } from '$lib/stores/image-store.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { imageStore } from '$lib/stores/image-store.svelte';
	import { Button } from '$lib/components/ui';
	import { Card, Spinner, Badge, Modal } from 'flowbite-svelte';
	import { PromptBuilder } from '$lib/utils/prompt-builder';
	import { getPromptProgress, validatePrompt } from '$lib/validation/prompt';
	import { createGenerationTask } from '$lib/tasks/generation.svelte';
	import { handleOptimisticImage } from '$lib/utils/image-upload';
	import WorkspaceForm from '$lib/components/workspace/WorkspaceForm.svelte';
	import ImagePreview from '$lib/components/workspace/ImagePreview.svelte';
	import ThankYouScreen from '$lib/components/workspace/ThankYouScreen.svelte';
	import { globalConfig } from '$lib/config.svelte';

	let props = $props<{ data: { table: Table; persona: Persona } }>();

	const { table, persona } = props.data;

	// Form state
	let formData = $state<PromptFields>({
		environment: '',
		features: '',
		colorPalette: '',
		atmosphere: '',
		additionalFeatures: ''
	});

	// Initialize as loading state to prevent flash
	let isLoading = $state(true);
	let generatedImage = $state<string | null>(null);
	let isLocked = $state(false);
	let errors = $state<Partial<PromptFields>>({});
	let showPromptPreview = $state(false);
	let currentTask = $state<ReturnType<typeof createGenerationTask> | null>(null);
	let showInfoModal = $state(false);
	let imageCleanup: (() => void) | null = null;

	// Form completion progress
	const progressValue = $derived(getPromptProgress(persona, formData));

	// Form validation state
	const isFormValid = $derived(validatePrompt(persona, formData));

	// Derive generation state from current task
	const isGenerating = $derived(!!currentTask && currentTask.isActive);

	// Derive generation progress from task
	const genPercent = $derived(currentTask ? currentTask.progress : 0);

	// Initialize store on mount - use $effect only for side effects
	$effect(() => {
		if (persona && table) {
			// Store current table ID in localStorage for gallery privacy
			if (browser) {
				localStorage.setItem('currentTableId', table.id);
			}

			initialize().then(() => {
				// Mark loading as complete
				isLoading = false;
			});
		}
	});

	// Generate image handler
	async function handleGenerateImage() {
		if (!persona) return;

		// Clean up previous blob URL if exists
		if (imageCleanup) {
			imageCleanup();
			imageCleanup = null;
		}

		const finalPrompt = PromptBuilder.buildForGeneration(persona, formData);

		// Create generation task
		const task = createGenerationTask(persona.id, finalPrompt, table.id);
		currentTask = task;

		try {
			const result = await task.result;

			// Use optimistic UI: show immediately, upload in background
			const optimistic = await handleOptimisticImage(result.imageUrl, {
				personaId: persona.id,
				tableId: table.id,
				prompt: finalPrompt
			});

			// Show temp URL immediately
			generatedImage = optimistic.tempUrl;
			imageCleanup = optimistic.cleanup;
			toastStore.success('Image generated successfully!');

			// Update to final URL when upload completes (in background)
			optimistic.finalUrlPromise.then((finalUrl) => {
				if (generatedImage === optimistic.tempUrl) {
					// Only update if still showing the temp URL
					generatedImage = finalUrl;
				}
			});
		} catch (error) {
			if (error instanceof Error && error.message !== 'Generation cancelled') {
				toastStore.error('Failed to generate image. Please try again.');
			}
		} finally {
			currentTask = null;
		}
	}

	// Lock image handler
	async function lockInImage() {
		if (!generatedImage || !persona) return;

		const finalPrompt = PromptBuilder.buildForGeneration(persona, formData);

		try {
			// Image is already uploaded, just mark as locked
			// The generatedImage URL is either the final URL or will be swapped to it
			await lockImage({
				tableId: table.id,
				personaId: persona.id,
				imageUrl: generatedImage,
				prompt: finalPrompt,
				lockedAt: new Date().toISOString()
			});

			isLocked = true;
			toastStore.success('Image locked in successfully! View it on the presenter dashboard.');

			// Clean up blob URL if exists
			if (imageCleanup) {
				imageCleanup();
				imageCleanup = null;
			}
		} catch (error) {
			toastStore.error('Failed to lock image. Please try again.');
		}
	}

	// Event handlers for child components
	function handleFormDataChange(field: keyof PromptFields, value: string) {
		formData[field] = value;
	}

	function handleErrorsChange(newErrors: Partial<PromptFields>) {
		errors = newErrors;
	}

	function handleShowPromptPreviewChange(show: boolean) {
		showPromptPreview = show;
	}

	function cancelGenerate() {
		if (currentTask) {
			currentTask.cancel();
			currentTask = null;
		}
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

<svelte:head>
	<title>{persona?.title || 'Table'} - AI Workspace Generator</title>
	<meta name="description" content="Create your ideal workspace using AI" />
</svelte:head>

<svelte:boundary
	onerror={(error) => {
		console.error('Table form error:', error);
		toastStore.error('An unexpected error occurred. Please refresh the page.');
	}}
>
	{#if !persona}
		<div
			class="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800"
		>
			<Card class="w-full max-w-md text-center">
				<div class="mb-4 text-6xl">❌</div>
				<h1 class="mb-2 text-2xl font-bold text-red-600 dark:text-red-400">Persona Not Found</h1>
				<p class="mb-4 text-slate-600 dark:text-gray-400">
					The persona you're looking for doesn't exist.
				</p>
				<Button onclick={() => goto(`${base}/`)} variant="outline">← Back to QR Codes</Button>
			</Card>
		</div>
	{:else if isLoading}
		<!-- Loading State -->
		<div
			class="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800"
		>
			<div class="text-center">
				<Spinner size="10" class="mb-4" />
				<p class="text-lg text-gray-600 dark:text-gray-400">Loading...</p>
			</div>
		</div>
	{:else if isLocked}
		<!-- Thank You State -->
		<ThankYouScreen {generatedImage} />
	{:else}
		<!-- Main Workspace Generator -->
		<div
			class="h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800"
		>
			<!-- Sleek Top Bar -->
			<div
				class="flex h-14 items-center justify-between border-b border-gray-200 bg-white/95 px-6 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/95"
			>
				<div class="flex items-center gap-3">
					<span class="text-xs text-gray-500 dark:text-gray-400">{globalConfig.eventInfo.name}</span>
					<span class="text-gray-300 dark:text-gray-600">|</span>
					<Badge color="blue" class="text-xs">{table.displayName}</Badge>
					<Badge color="purple" class="text-xs">{persona.title}</Badge>
					<button
						onclick={() => (showInfoModal = true)}
						class="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
						title="View persona description"
						aria-label="View persona description"
					>
						<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
								clip-rule="evenodd"
							></path>
						</svg>
					</button>
				</div>

				<!-- Integrated Progress -->
				<div class="flex items-center gap-3 text-sm">
					<span class="text-gray-600 dark:text-gray-400">{progressValue}%</span>
					<div class="h-2 w-24 rounded-full bg-gray-200 dark:bg-gray-700">
						<div
							class="h-2 rounded-full transition-all duration-300 {progressValue === 100
								? 'bg-green-500'
								: 'bg-blue-500'}"
							style="width: {progressValue}%;"
						></div>
					</div>
				</div>
			</div>

			<!-- Main Container with Two Panels -->
			<div
				class="flex min-h-[calc(100vh-3.5rem)] flex-col overflow-y-auto lg:h-[calc(100vh-3.5rem)] lg:flex-row lg:overflow-hidden"
			>
				<!-- Left Panel: Form Questions -->
				<div class="flex w-full flex-col bg-white lg:w-1/2 lg:overflow-y-auto dark:bg-gray-900">
					<div class="flex flex-col p-6 lg:flex-1">
						<!-- Form Header -->
						<div class="mb-6 flex-shrink-0">
							<h1 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
								Describe Your Workspace
							</h1>
							<p class="text-gray-600 dark:text-gray-400">
								Work together with your table to create a detailed description.
							</p>
						</div>

						<!-- Form Fields -->
						<WorkspaceForm
							{persona}
							{formData}
							{errors}
							onFormDataChange={handleFormDataChange}
							onErrorsChange={handleErrorsChange}
						/>
					</div>
				</div>

				<!-- Right Panel: Image Preview & Controls -->
				<div
					class="flex w-full flex-col border-t bg-gray-50 lg:w-1/2 lg:overflow-y-auto lg:border-t-0 lg:border-l dark:border-gray-700 dark:bg-gray-800 {generatedImage ||
					progressValue > 50
						? ''
						: 'hidden lg:flex'}"
				>
					<ImagePreview
						{persona}
						{formData}
						{generatedImage}
						{isGenerating}
						{progressValue}
						genProgress={genPercent}
						{isFormValid}
						{showPromptPreview}
						tableId={table.id}
						onShowPromptPreviewChange={handleShowPromptPreviewChange}
						onGenerateImage={handleGenerateImage}
						onLockInImage={lockInImage}
						onCancel={cancelGenerate}
					/>
				</div>
			</div>

			<!-- Information Modal -->
			<Modal bind:open={showInfoModal} title="Persona Context" size="md">
				<div class="space-y-4">
					<div>
						<h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
							{persona.title}
						</h3>
						<p class="text-gray-600 dark:text-gray-400">
							{persona.description}
						</p>
					</div>
					<div class="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
						<p class="text-sm text-blue-800 dark:text-blue-300">
							<strong>Your Challenge:</strong> Design a workspace that addresses the needs and preferences
							of this persona.
						</p>
					</div>
				</div>
				{#snippet footer()}
					<Button onclick={() => (showInfoModal = false)}>Got it</Button>
				{/snippet}
			</Modal>
		</div>
	{/if}

	{#snippet failed(error, reset)}
		<div
			class="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800"
		>
			<Card class="w-full max-w-md text-center">
				<div class="mb-4 text-6xl">⚠️</div>
				<h1 class="mb-2 text-2xl font-bold text-red-600 dark:text-red-400">Something went wrong</h1>
				<p class="mb-4 text-slate-600 dark:text-gray-400">
					An error occurred while loading this page.
				</p>
				<Button onclick={reset}>Try again</Button>
			</Card>
		</div>
	{/snippet}

	{#snippet pending()}
		<div
			class="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800"
		>
			<div class="text-center">
				<Spinner size="12" />
				<p class="mt-4 text-gray-600 dark:text-gray-400">Loading form...</p>
			</div>
		</div>
	{/snippet}
</svelte:boundary>
