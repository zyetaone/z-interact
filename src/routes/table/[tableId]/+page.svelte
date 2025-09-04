<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { PromptFields, Persona, Table } from '$lib/config.svelte';
	import { workspaceStore } from '$lib/stores/workspace.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { Button } from '$lib/components/ui';
	import { globalConfig } from '$lib/config.svelte';
	import {
		Card,
		Textarea,
		Label,
		Helper,
		Alert,
		Spinner,
		Badge,
		Breadcrumb,
		BreadcrumbItem,
		Tooltip,
		Modal
	} from 'flowbite-svelte';
	import { HomeOutline, ChevronRightOutline } from 'flowbite-svelte-icons';

	let { data }: { data: { table: Table; persona: Persona } } = $props();

	const { table, persona } = data;

	// Form state
	let formData = $state<PromptFields>({
		environment: '',
		features: '',
		colorPalette: '',
		mood: '',
		designedToFeel: '',
		additionalFeatures: ''
	});

	let generatedImage = $state<string | null>(null);
	let isLocked = $state(false);
	let errors = $state<Partial<PromptFields>>({});
	let showPromptPreview = $state(false);
	let showInfoModal = $state(false);

	// Form completion progress
	const formProgress = $derived(() => {
		const filledFields = Object.values(formData).filter((value) => value.length >= 10).length;
		const totalFields = Object.keys(formData).length;
		return Math.round((filledFields / totalFields) * 100);
	});

	const progressValue = $derived(formProgress());

	// Initialize store and check if this specific table has a locked image
	$effect(() => {
		if (persona && table) {
			workspaceStore.initialize().then(() => {
				// First try to find an image specifically for this table
				let existingImage = workspaceStore.getLockedImageByTable(table.id);

				// If no table-specific image, check if there's any image for this persona
				// (this handles legacy data where tableId might not be set correctly)
				if (!existingImage) {
					const personaImage = workspaceStore.getLockedImage(persona.id);
					if (personaImage && (!personaImage.tableId || personaImage.tableId === table.id)) {
						existingImage = personaImage;
					}
				}

				if (existingImage) {
					isLocked = true;
					generatedImage = existingImage.imageUrl;
				}
			});
		}
	});

	function validateForm(): boolean {
		const newErrors: Partial<PromptFields> = {};

		for (const [key, value] of Object.entries(formData)) {
			if (!value || value.length < 10) {
				newErrors[key as keyof PromptFields] =
					'Please provide a more detailed description (at least 10 characters).';
			}
		}

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	// Build prompt dynamically from config structure
	function buildPromptFromConfig(includeSystemPrompt = true): string {
		if (!persona) return '';

		const promptParts = [];

		// 1. Master System Prompt
		if (includeSystemPrompt) {
			promptParts.push(globalConfig.masterSystemPrompt);
		}

		// 2. Persona Description (instead of preamble)
		promptParts.push(persona.description);

		// 3. Form field inputs
		for (const { label, field } of persona.promptStructure) {
			const value = formData[field];
			if (value) {
				promptParts.push(`${label.replace(/\?$/, '')}: ${value}`);
			}
		}

		// Removed postamble - not needed per user requirements

		return promptParts.join('\n\n');
	}

	async function generateImage() {
		if (!validateForm() || !persona) return;

		const finalPrompt = buildPromptFromConfig(true);

		try {
			const result = await workspaceStore.generateImage(persona.id, finalPrompt, table.id);
			generatedImage = result.imageUrl;
			toastStore.success('Image generated successfully!');
		} catch (error) {
			toastStore.error('Failed to generate image. Please try again.');
		}
	}

	async function lockInImage() {
		if (!generatedImage || !persona) return;

		const finalPrompt = buildPromptFromConfig(false); // Exclude system prompt for storage

		try {
			await workspaceStore.lockImage({
				tableId: table.id,
				personaId: persona.id,
				imageUrl: generatedImage,
				prompt: finalPrompt,
				lockedAt: new Date().toISOString()
			});

			isLocked = true;
			toastStore.success('Image locked in successfully! View it on the presenter dashboard.');
		} catch (error) {
			toastStore.error('Failed to lock image. Please try again.');
		}
	}

	const isGenerating = $derived(persona ? workspaceStore.isPersonaGenerating(persona.id) : false);
</script>

<svelte:head>
	<title>{persona?.title || 'Table'} - AI Workspace Generator</title>
	<meta name="description" content="Create your ideal workspace using AI" />
</svelte:head>

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
			<Button onclick={() => goto('/')} variant="outline">← Back to QR Codes</Button>
		</Card>
	</div>
{:else if isLocked}
	<!-- Thank You State -->
	<div
		class="flex h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-6 dark:from-gray-900 dark:to-gray-800"
	>
		<div class="fade-in flex h-full w-full max-w-6xl flex-col items-center justify-center">
			<!-- Success Animation -->
			<div
				class="zoom-in mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30"
			>
				<div class="animate-bounce text-4xl">✅</div>
			</div>

			<!-- Thank You Message -->
			<div class="slide-up mb-8 text-center">
				<h1 class="mb-4 text-4xl font-bold text-green-600 md:text-5xl dark:text-green-400">
					Thank You!
				</h1>
				<p class="mb-2 text-xl font-medium text-slate-700 md:text-2xl dark:text-gray-300">
					Your workspace vision has been captured
				</p>
				<p class="mx-auto max-w-2xl text-lg text-slate-600 dark:text-gray-400">
					Your creative input will be displayed on the main presentation screen for everyone to see.
				</p>
			</div>

			<!-- Generated Image Display -->
			{#if generatedImage}
				<div class="slide-up mb-6 flex w-full max-w-4xl flex-1 items-center justify-center">
					<div
						class="max-h-full overflow-hidden rounded-xl shadow-2xl ring-1 ring-slate-200 dark:ring-gray-700"
					>
						<img
							src={generatedImage}
							alt="Your submitted workspace design"
							class="h-auto w-full object-contain"
							style="max-height: 50vh; max-width: 100%;"
						/>
					</div>
				</div>
			{/if}

			<!-- Appreciation Note -->
			<div class="slide-up text-center">
				<p class="text-lg text-slate-600 italic dark:text-gray-400">
					We appreciate your creativity and participation! 🎨
				</p>
			</div>
		</div>
	</div>
{:else}
	<!-- Main Workspace Generator -->
	<div class="h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
		<!-- Sleek Top Bar -->
		<div class="flex h-14 items-center justify-between border-b border-gray-200 bg-white/95 px-6 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/95">
			<div class="flex items-center gap-3">
				<Badge color="blue" class="text-xs">{table.displayName}</Badge>
				<Badge color="purple" class="text-xs">{persona.title}</Badge>
				<button
					onclick={() => (showInfoModal = true)}
					class="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
					title="View persona description"
					aria-label="View persona description"
				>
					<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
					</svg>
				</button>
			</div>
			
			<!-- Integrated Progress -->
			<div class="flex items-center gap-3 text-sm">
				<span class="text-gray-600 dark:text-gray-400">{progressValue}%</span>
				<div class="h-2 w-24 rounded-full bg-gray-200 dark:bg-gray-700">
					<div
						class="h-2 rounded-full transition-all duration-300 {progressValue === 100 ? 'bg-green-500' : 'bg-blue-500'}"
						style="width: {progressValue}%;"
					></div>
				</div>
			</div>
		</div>

		<!-- Main Container with Two Panels -->
		<div class="flex h-[calc(100vh-3.5rem)] flex-col overflow-auto lg:flex-row lg:overflow-hidden">
			<!-- Left Panel: Form Questions -->
			<div class="flex w-full flex-col bg-white dark:bg-gray-900 lg:w-1/2 lg:overflow-y-auto">
				<div class="flex flex-1 flex-col p-6">
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
					<form
						onsubmit={(e) => {
							e.preventDefault();
							generateImage();
						}}
						class="flex min-h-0 flex-1 flex-col"
					>
						<div class="flex-1 space-y-4">
							{#each persona.promptStructure as { label, field, fieldSuggestions }}
								<div class="space-y-2">
									<div class="flex items-center justify-between">
										<Label
											for={field}
											class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"
										>
											{label}
											<Tooltip triggeredBy="#{field}-tooltip" class="w-80 text-sm">
												<div class="space-y-2">
													<p class="font-medium">Suggestions:</p>
													<p class="text-slate-600 dark:text-slate-300">
														{fieldSuggestions.suggestions}
													</p>
												</div>
											</Tooltip>
											<span
												id="{field}-tooltip"
												class="cursor-help text-blue-500 hover:text-blue-600"
											>
												<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
												</svg>
											</span>
										</Label>
										{#if formData[field] && formData[field].length >= 10}
											<span class="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
												✓ Complete
											</span>
										{:else if formData[field] && formData[field].length > 0}
											<span class="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
												{10 - formData[field].length} more
											</span>
										{/if}
									</div>
									<Textarea
										id={field}
										bind:value={formData[field]}
										placeholder={fieldSuggestions.placeholder}
										rows={3}
										color={errors[field] ? 'red' : 'base'}
										class="w-full resize-none border-gray-300 bg-gray-50 text-base focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:focus:border-blue-400 dark:focus:ring-blue-400 {formData[field] && formData[field].length >= 10 ? 'border-green-300 bg-green-50 dark:border-green-600 dark:bg-green-900/20' : ''}"
									/>
									{#if errors[field]}
										<Helper class="text-red-600 dark:text-red-400">
											{errors[field]}
										</Helper>
									{:else}
										<Helper class="text-gray-500 dark:text-gray-400">
											<span class="font-medium">{formData[field].length}/10</span> characters minimum
										</Helper>
									{/if}
								</div>
							{/each}
						</div>
					</form>
				</div>
			</div>

			<!-- Right Panel: Image Preview & Controls -->
			<div class="flex w-full flex-col border-t bg-gray-50 dark:border-gray-700 dark:bg-gray-800 lg:w-1/2 lg:overflow-y-auto lg:border-l lg:border-t-0 {generatedImage || progressValue > 50 ? '' : 'hidden lg:flex'}">
				<div class="flex flex-1 flex-col p-6">
					<!-- Header -->
					<div class="mb-6 flex-shrink-0">
						<h2 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
							Generated Workspace
						</h2>
						<p class="text-gray-600 dark:text-gray-400">
							Your AI-generated image will appear here once you complete the form.
						</p>
					</div>

					<!-- Image Display -->
					<div class="mb-6 flex flex-1 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900">
						{#if isGenerating}
							<div class="flex flex-col items-center gap-4 p-8 text-gray-500 dark:text-gray-400">
								<Spinner size="10" />
								<div class="text-center">
									<p class="text-lg font-medium">Creating your workspace...</p>
									<p class="text-sm">This may take a few moments</p>
								</div>
							</div>
						{:else if generatedImage}
							<img
								src={generatedImage}
								alt="Generated workspace"
								class="h-full w-full rounded-lg object-cover"
							/>
						{:else}
							<div class="flex flex-col items-center p-8 text-center text-gray-500 dark:text-gray-400">
								<div class="mb-4 text-6xl">🏢</div>
								<p class="text-lg font-medium">Ready to generate!</p>
								<p class="text-sm">Complete the form and click "Generate Image".</p>
							</div>
						{/if}
					</div>

					<!-- Action Buttons -->
					<div class="flex-shrink-0 space-y-4">
						{#if generatedImage && !isGenerating}
							<Alert color="green" class="border-0">
								<span class="font-medium">Image generated successfully!</span>
								Review your workspace and lock it in when ready.
							</Alert>
							<div class="grid gap-3 sm:grid-cols-2">
								<Button onclick={generateImage} variant="outline" disabled={isGenerating} class="w-full">
									↻ Regenerate
								</Button>
								<Button
									onclick={lockInImage}
									variant="default"
									disabled={isGenerating}
									class="w-full bg-green-600 hover:bg-green-700"
								>
									🔒 Lock In & Submit
								</Button>
							</div>
						{:else}
							<Button
								onclick={generateImage}
								disabled={isGenerating || progressValue < 100}
								size="lg"
								class="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
							>
								{#if isGenerating}
									<Spinner class="me-2" size="4" />
									Generating Your Vision...
								{:else}
									✨ Generate Workspace Image
								{/if}
							</Button>
						{/if}

						<!-- Prompt Preview Section -->
						{#if progressValue > 50}
							<div class="rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900">
								<button
									type="button"
									onclick={() => (showPromptPreview = !showPromptPreview)}
									class="flex w-full items-center justify-between p-3 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
								>
									<span>🔍 Preview AI Prompt</span>
									<svg
										class="h-4 w-4 transform transition-transform {showPromptPreview ? 'rotate-180' : ''}"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
									</svg>
								</button>
								{#if showPromptPreview}
									<div class="border-t border-gray-200 p-3 dark:border-gray-600">
										<pre class="max-h-32 overflow-y-auto rounded bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">{buildPromptFromConfig(true)}</pre>
										<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
											This prompt will be sent to the AI to generate your workspace image.
										</p>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				</div>
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
				<Button onclick={() => (showInfoModal = false)}>
					Got it
				</Button>
			{/snippet}
		</Modal>
	</div>
{/if}
