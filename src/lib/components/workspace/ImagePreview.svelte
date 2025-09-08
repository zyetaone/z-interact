<script lang="ts">
	import { Button, ImageWithLoader } from '$lib/components/ui';
	import { Alert, Button as FBButton } from 'flowbite-svelte';
	import { PromptBuilder } from '$lib/utils/prompt-builder';
	import type { PromptFields, Persona, Table } from '$lib/types';
	import { downloadImage, openFullscreen, getTableDisplayName } from '$lib/utils/image-utils';
	import { DownloadOutline, ExpandOutline } from 'flowbite-svelte-icons';

	let props = $props<{
		persona: Persona;
		formData: PromptFields;
		generatedImage: string | null;
		isGenerating: boolean;
		progressValue: number;
		isFormValid: boolean;
		showPromptPreview: boolean;
		onShowPromptPreviewChange: (show: boolean) => void;
		onGenerateImage: () => void;
		onLockInImage: () => void;
		genProgress?: number;
		onCancel?: () => void;
		tableId?: string;
	}>();

	const persona = $derived(props.persona);
	const formData = $derived(props.formData);
	const generatedImage = $derived(props.generatedImage);
	const isGenerating = $derived(props.isGenerating);
	const progressValue = $derived(props.progressValue);
	const isFormValid = $derived(props.isFormValid);
	const showPromptPreview = $derived(props.showPromptPreview);

	const onShowPromptPreviewChange = (show: boolean) => props.onShowPromptPreviewChange(show);
	const onGenerateImage = () => props.onGenerateImage();
	const onLockInImage = () => props.onLockInImage();
	const onCancel = () => props.onCancel?.();
</script>

<div class="flex flex-col p-6 lg:flex-1">
	<!-- Header -->
	<div class="mb-6 flex-shrink-0">
		<h2 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Generated Workspace</h2>
		<p class="text-gray-600 dark:text-gray-400">
			Your AI-generated image will appear here once you complete the form.
		</p>
	</div>

	<!-- Image Display -->
	<div
		class="mb-6 flex aspect-video items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-white lg:aspect-auto lg:flex-1 dark:border-gray-600 dark:bg-gray-900"
	>
		{#if isGenerating}
			<div class="flex flex-col items-center gap-4 p-8 text-gray-500 dark:text-gray-400">
				<!-- Powered by ZyetaI -->
				<div class="flex flex-col items-center gap-2">
					<span class="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
						Powered by
					</span>
					<h3 class="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-3xl font-bold text-transparent">
						ZyetaI
					</h3>
				</div>
				
				{#if typeof props.genProgress === 'number'}
					<p class="text-lg font-semibold text-gray-700 dark:text-gray-300">{props.genProgress}%</p>
					<!-- Custom progress bar for better reactivity -->
					<div
						class="relative h-3 w-64 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
					>
						<div
							class="h-full rounded-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-300 ease-out"
							style="width: {props.genProgress}%"
						></div>
					</div>
				{/if}
				<div class="text-center">
					<p class="text-lg font-medium">Creating your workspace...</p>
					<p class="text-sm">This may take a few moments</p>
				</div>
			</div>
		{:else if generatedImage}
			<!-- Using ImageWithLoader with svelte:boundary for error handling -->
			{#key generatedImage}
				<svelte:boundary>
					<ImageWithLoader
						src={generatedImage}
						alt="Generated workspace"
						class="h-full w-full rounded-lg object-cover"
					/>
				</svelte:boundary>
			{/key}
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
			
			<!-- Image Action Buttons (Download & Fullscreen) -->
			<div class="flex justify-center gap-3 mb-3">
				<button
					onclick={() => downloadImage(generatedImage, `${getTableDisplayName(props.tableId)}-workspace.jpg`)}
					class="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
					title="Download Image"
				>
					<DownloadOutline class="h-4 w-4" />
					Download
				</button>
				<button
					onclick={() => openFullscreen(generatedImage, persona.title)}
					class="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
					title="View Fullscreen"
				>
					<ExpandOutline class="h-4 w-4" />
					Fullscreen
				</button>
			</div>
			
			<div class="grid gap-3 sm:grid-cols-2">
				<Button onclick={onGenerateImage} variant="outline" disabled={isGenerating} class="w-full">
					↻ Regenerate
				</Button>
				<Button
					onclick={onLockInImage}
					variant="default"
					disabled={isGenerating}
					class="w-full bg-green-600 hover:bg-green-700"
				>
					🔒 Lock In & Submit
				</Button>
			</div>
		{:else}
			<Button
				onclick={onGenerateImage}
				disabled={isGenerating || !isFormValid}
				size="lg"
				class="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
			>
				{#if isGenerating}
					⚡ Generating{typeof props.genProgress === 'number' ? ` ${props.genProgress}%` : '...'}
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
					onclick={() => onShowPromptPreviewChange(!showPromptPreview)}
					class="flex w-full items-center justify-between p-3 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
				>
					<span>🔍 Preview AI Prompt</span>
					<svg
						class="h-4 w-4 transform transition-transform {showPromptPreview ? 'rotate-180' : ''}"
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
										persona,
										formData,
										true
									)}</pre>
							</div>

							<p class="text-xs text-gray-500 dark:text-gray-400">
								This prompt includes your persona details and all form inputs (with placeholders for
								empty fields) that will guide the AI generation.
							</p>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
