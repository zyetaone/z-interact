<script lang="ts">
	import { Button, ImageWithLoader } from '$lib/components/ui';
	import type { PromptFields, Persona, Table } from '$lib/types';
	import { downloadImage, openFullscreen } from '$lib/utils/image-utils';
	import {
		DownloadOutline,
		ExpandOutline,
		WandMagicSparklesOutline,
		BuildingOutline,
		FireOutline,
		EditOutline,
		LockOutline,
		ArrowLeftOutline
	} from 'flowbite-svelte-icons';

	let props = $props<{
		image: string | null;
		originalImage?: string | null;
		isEdited?: boolean;
		isGenerating: boolean;
		progress?: number;
		progressStatus?: string;
		progressMessage?: string;
		persona: Persona;
		formData: PromptFields;
		isFormValid?: boolean;
		onGenerateImage?: () => void;
		onLockInImage?: () => void;
		onEditRegenerate?: () => void;
		onUndo?: () => void;
		isLocked?: boolean;
		tableId?: string;
		canUndo?: boolean;
	}>();

	const generatedImage = $derived(props.image);
	const isGenerating = $derived(props.isGenerating);
	const genProgress = $derived(props.progress);
	const genStatus = $derived(props.progressStatus);
	const genMessage = $derived(props.progressMessage);
	const persona = $derived(props.persona);
	const formData = $derived(props.formData);

	// Derive form validation state (allow parent to provide canonical validity)
	const isFormValid = $derived(
		typeof props.isFormValid === 'boolean'
			? props.isFormValid
			: !!(formData && Object.values(formData).every((v) => typeof v === 'string' && v.length >= 3))
	);
</script>

<!-- Reusable snippets -->
{#snippet poweredByZyetaI(progress: number | undefined, isDark: boolean = false)}
	<div class="flex flex-col items-center gap-2">
		<span
			class="text-xs font-medium tracking-wider uppercase {isDark
				? 'text-gray-300'
				: 'text-gray-400 dark:text-gray-500'}"
		>
			Powered by
		</span>
		<h3
			class="bg-gradient-to-r bg-clip-text text-3xl font-bold text-transparent {isDark
				? 'from-purple-400 to-blue-400'
				: 'from-purple-600 to-blue-600'}"
		>
			Zyeta<span class="animate-dot-bounce inline-block">I</span>
		</h3>
	</div>
{/snippet}

{#snippet progressBar(progress: number | undefined, status: string | undefined, message: string | undefined, isDark: boolean = false)}
	{#if typeof progress === 'number'}
		<div class="flex flex-col items-center gap-2">
			<p class="text-lg font-semibold {isDark ? 'text-white' : 'text-gray-700 dark:text-gray-300'}">
				{progress}%
			</p>
			{#if message}
				<p class="text-xs {isDark ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400'}">
					{message}
				</p>
			{/if}
			<!-- Custom progress bar for better reactivity -->
			<div
				class="relative h-3 w-64 overflow-hidden rounded-full {isDark
					? 'bg-gray-700'
					: 'bg-gray-200 dark:bg-gray-700'}"
			>
				<div
					class="h-full rounded-full transition-all duration-300 ease-out {isDark
						? 'bg-gradient-to-r from-purple-500 to-blue-500'
						: 'bg-gradient-to-r from-purple-600 to-blue-600'}"
					style="width: {progress}%"
				></div>
			</div>
		</div>
	{/if}
{/snippet}

{#snippet imageActions(imageUrl: string, tableId: string | undefined, personaTitle: string)}
	<div class="pointer-events-auto mb-4 flex gap-3">
		<button
			class="glass-morphism smooth-transition flex h-11 w-11 items-center justify-center rounded-full text-white hover:scale-110"
			title="Download"
			aria-label="Download image"
			onclick={() => downloadImage(imageUrl, `table-${tableId || 'unknown'}-workspace.jpg`)}
		>
			<DownloadOutline class="h-5 w-5" />
		</button>
		<button
			class="glass-morphism smooth-transition flex h-11 w-11 items-center justify-center rounded-full text-white hover:scale-110"
			title="View fullscreen"
			aria-label="View fullscreen"
			onclick={() => openFullscreen(imageUrl, personaTitle)}
		>
			<ExpandOutline class="h-5 w-5" />
		</button>
	</div>
{/snippet}

{#snippet loadingContent(
	progress: number | undefined,
	message: string,
	subMessage: string,
	isDark: boolean = false
)}
	<div
		class="flex flex-col items-center gap-4 p-8 {isDark
			? 'text-white'
			: 'text-gray-500 dark:text-gray-400'}"
	>
		{@render poweredByZyetaI(progress, isDark)}
		{@render progressBar(progress, undefined, message, isDark)}
		<div class="text-center">
			<p class="text-sm {isDark ? 'text-gray-300' : ''}">{subMessage}</p>
		</div>
	</div>
{/snippet}

<div class="flex flex-col lg:flex-1">
	<!-- Mobile-optimized Image Display -->
	<div
		class="group relative mb-6 flex aspect-square items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-white sm:mb-8 lg:aspect-auto lg:min-h-[500px] lg:flex-1 dark:border-gray-600 dark:bg-gray-900"
	>
		{#if isGenerating}
			{@render loadingContent(
				genProgress,
				genMessage || 'Creating your workspace...',
				'This may take a few moments',
				false
			)}
		{:else if generatedImage}
			<!-- Using ImageWithLoader with svelte:boundary for error handling -->
			{#key generatedImage}
				<svelte:boundary>
					<ImageWithLoader
						src={generatedImage}
						alt="Generated workspace"
						class="h-full w-full rounded-lg object-cover"
						loading="eager"
					/>

					<!-- Loading overlay (appears on top of existing image during regeneration) -->
					{#if isGenerating}
						<div
							class="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60 backdrop-blur-sm"
						>
							{@render loadingContent(
								genProgress,
								genMessage || 'Updating your workspace...',
								'This may take a few moments',
								true
							)}
						</div>
					{:else}
						<!-- Overlay actions on image (visible on hover when not generating) -->
						<div
							class="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
						>
							{@render imageActions(generatedImage, props.tableId, persona.title)}
						</div>
					{/if}
				</svelte:boundary>
			{/key}
		{:else}
			<div class="flex flex-col items-center p-8 text-center text-gray-500 dark:text-gray-400">
				<div class="mb-4 text-6xl"><BuildingOutline class="h-16 w-16" /></div>
				<p class="text-lg font-medium">Ready to generate!</p>
				<p class="text-sm">Complete the form and click "Generate Image".</p>
			</div>
		{/if}
	</div>

	<!-- Mobile-optimized Action Buttons -->
	<div class="flex-shrink-0 space-y-4 sm:space-y-6">
		{#if !generatedImage}
			<Button
				onclick={() => props.onGenerateImage?.()}
				disabled={isGenerating || !isFormValid}
				size="lg"
				class="min-h-[56px] w-full bg-gradient-to-r from-purple-600 to-blue-600 text-base font-medium hover:from-purple-700 hover:to-blue-700 sm:min-h-0 sm:text-sm"
			>
				{#if isGenerating}
					<FireOutline class="mr-3 h-5 w-5 sm:mr-2 sm:h-4 sm:w-4" />
					Generating{genProgress ? ` ${genProgress}%` : '...'}
				{:else}
					<WandMagicSparklesOutline class="mr-3 h-5 w-5 sm:mr-2 sm:h-4 sm:w-4" />
					Generate Workspace Image
				{/if}
			</Button>
		{/if}

		<!-- Edit/Regenerate and Lock & Submit buttons (when image exists) -->
		{#if generatedImage && !isGenerating && !props.isLocked}
			<div class="space-y-3">
				{#if props.canUndo}
					<!-- Simple Undo button -->
					<div class="flex justify-center">
						<Button
							type="button"
							color="alternative"
							size="sm"
							class="min-h-[40px] text-sm font-medium"
							onclick={props.onUndo}
						>
							<ArrowLeftOutline class="mr-2 h-4 w-4" />
							Undo
						</Button>
					</div>
				{/if}

				<div class="flex gap-4 sm:gap-3">
					<Button
						type="button"
						color="alternative"
						size="lg"
						class="min-h-[48px] flex-1 text-base font-medium sm:min-h-0 sm:text-sm"
						onclick={props.onEditRegenerate}
					>
						<EditOutline class="mr-3 h-5 w-5 sm:mr-2 sm:h-4 sm:w-4" />
						Edit/Regenerate
					</Button>
					<Button
						type="button"
						color="green"
						size="lg"
						class="min-h-[48px] flex-1 text-base font-medium sm:min-h-0 sm:text-sm"
						onclick={props.onLockInImage}
					>
						<LockOutline class="mr-3 h-5 w-5 sm:mr-2 sm:h-4 sm:w-4" />
						Lock & Submit
					</Button>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	@keyframes dot-bounce-sequence {
		0%,
		100% {
			transform: translateY(0) scaleY(1) scaleX(1);
		}
		/* I -> squash to dot */
		6% {
			transform: translateY(0) scaleY(0.08) scaleX(1.2);
		}
		/* Dot bounces up high with overshoot */
		14% {
			transform: translateY(-35px) scaleY(0.1) scaleX(1.1);
		}
		/* Dot comes down and stretches to I */
		22% {
			transform: translateY(0) scaleY(1.3) scaleX(0.9);
		}
		/* Settle back to normal I */
		28% {
			transform: translateY(0) scaleY(1) scaleX(1);
		}
		/* Stretch I extra tall (lengthen) */
		36% {
			transform: translateY(-8px) scaleY(1.6) scaleX(0.8);
		}
		/* Compress back down to dot again */
		42% {
			transform: translateY(0) scaleY(0.1) scaleX(1.2);
		}
		/* First bounce of double bounce */
		48% {
			transform: translateY(-20px) scaleY(0.15) scaleX(1.1);
		}
		52% {
			transform: translateY(0) scaleY(0.12) scaleX(1.15);
		}
		/* Second bounce - smaller */
		56% {
			transform: translateY(-12px) scaleY(0.18) scaleX(1.05);
		}
		60% {
			transform: translateY(0) scaleY(0.1) scaleX(1.2);
		}
		/* Expand from dot back to I with bounce */
		68% {
			transform: translateY(-5px) scaleY(1.2) scaleX(0.9);
		}
		74% {
			transform: translateY(0) scaleY(0.9) scaleX(1.05);
		}
		80% {
			transform: translateY(0) scaleY(1.05) scaleX(0.98);
		}
		86% {
			transform: translateY(0) scaleY(0.98) scaleX(1.01);
		}
		/* Final settle */
		92% {
			transform: translateY(0) scaleY(1) scaleX(1);
		}
	}

	:global(.animate-dot-bounce) {
		animation: dot-bounce-sequence 3s ease-in-out infinite;
		transform-origin: bottom;
		display: inline-block;
	}
</style>
