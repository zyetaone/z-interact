<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { browser } from '$app/environment';

	import { getWorkspace, syncWorkspaces } from '$lib/stores/workspace-store.svelte';
	import { downloadImage, openFullscreen } from '$lib/utils/image-utils';
	import { Badge } from 'flowbite-svelte';
	import { DownloadOutline, ExpandOutline, WandMagicSparklesOutline } from 'flowbite-svelte-icons';
	import { ImageWithLoader, GlassCard } from '$lib/components/ui';
	import { Spinner } from 'flowbite-svelte';
	import { getPersonaById } from '$lib/stores/config-store.svelte';
	import { logger } from '$lib/utils/logger';

	// Get tableId from page params reactively
	const tableId = $derived(page.params.tableId || '');

	// Loading state
	let isLoading = $state(true);

	// Get workspace from config
	const workspace = $derived(getWorkspace(tableId));

	// Sync with database using Svelte 5 effect
	$effect(() => {
		if (browser && tableId) {
			(async () => {
				try {
					await syncWorkspaces({
						tableId,
						limit: 50
					});
				} catch (error) {
					logger.error(
						'Gallery detail sync failed',
						{ component: 'GalleryDetail', tableId },
						error as any
					);
				} finally {
					isLoading = false;
				}
			})();
		}
	});

	// Derived image data
	const imageUrl = $derived(workspace?.gallery?.currentUrl || '');
	const prompt = $derived(workspace?.gallery?.prompt || '');
	const isLocked = $derived(workspace?.isLocked || false);
	const hasImage = $derived(!!imageUrl);

	// Get full persona info
	const persona = $derived(workspace?.personaId ? getPersonaById(workspace.personaId) : null);
	const personaTitle = $derived(persona?.title || 'Workspace');

	// Format generation name (baby-boomer → Baby Boomer, gen-x → Gen X, etc.)
	const generationName = $derived.by(() => {
		if (!persona?.id) return '';
		const id = persona.id;
		if (id === 'baby-boomer') return 'Baby Boomer';
		if (id === 'gen-x') return 'Gen X';
		if (id === 'millennial') return 'Millennial';
		if (id === 'gen-z') return 'Gen Z';
		if (id === 'gen-alpha') return 'Gen Alpha';
		return id;
	});

	// Extract age from persona description (e.g., "68-year-old CXO..." → "68")
	const personaAge = $derived.by(() => {
		if (!persona?.description) return '';
		const match = persona.description.match(/(\d+)-year-old/);
		return match ? match[1] : '';
	});

	function goBack() {
		goto(`${base}/gallery`);
	}

	function handleDownload() {
		if (imageUrl) {
			downloadImage(imageUrl, `workspace-${tableId}.png`);
		}
	}

	function handleFullscreen() {
		if (imageUrl) {
			openFullscreen(imageUrl);
		}
	}

	// Format prompt into structured sections with better separation of user vs system content
	function parseDesignPrompt(text: string) {
		const result = {
			systemPrompt: {
				intro: '',
				persona: '',
				instructions: ''
			},
			userInputs: {
				environment: '',
				features: '',
				colors: '',
				atmosphere: '',
				additional: ''
			},
			renderSpecs: [] as string[],
			editHistory: [] as { type: string; prompt: string }[]
		};

		if (!text) return result;

		// Parse system vs user content
		// System prompt parts (from PromptBuilder)
		const workspaceMatch = text.match(/Design a workspace for a ([^.]+)\./i);
		if (workspaceMatch) {
			result.systemPrompt.intro = workspaceMatch[0];
		}

		// Extract persona details (system generated)
		const personaMatch = text.match(/Persona details:\s*([^.]+(?:\.[^.]+)*?)\./i);
		if (personaMatch) {
			result.systemPrompt.persona = personaMatch[1].trim();
		}

		// Extract user inputs - try multiple formats for backwards compatibility
		const extractField = (labels: string[]) => {
			for (const label of labels) {
				const regex = new RegExp(`${label}:\\s*([^.]+)\\.`, 'i');
				const match = text.match(regex);
				if (match) return match[1].trim();
			}
			return '';
		};

		result.userInputs.environment = extractField(['Environmental character', 'Environment']);
		result.userInputs.features = extractField(['Essential workspace elements', 'Key features']);
		result.userInputs.colors = extractField(['Material and color palette', 'Color palette']);
		result.userInputs.atmosphere = extractField([
			'Spatial atmosphere and emotional tone',
			'Atmosphere'
		]);
		result.userInputs.additional = extractField([
			'Distinctive features',
			'Special elements',
			'Additional features'
		]);

		// Extract system generation instructions
		const instructionMatch = text.match(/Design this workspace to reflect[^.]+\./i);
		if (instructionMatch) {
			result.systemPrompt.instructions = instructionMatch[0];
		}

		// Extract render specifications (system)
		const renderMatch = text.match(/Professional office workspace[^.]+\./i);
		if (renderMatch) {
			result.renderSpecs.push(renderMatch[0]);
		}

		// Additional render specs
		const hyperMatch = text.match(/Hyperrealistic[^.]+\./gi);
		if (hyperMatch) {
			result.renderSpecs.push(...hyperMatch);
		}

		// Check for edit/regeneration prompts (would be appended with <hr> separators)
		const hrSplit = text.split('<hr>');
		if (hrSplit.length > 1) {
			for (let i = 1; i < hrSplit.length; i++) {
				const editText = hrSplit[i].trim();
				if (editText.includes('Edit:') || editText.includes('Regenerate:')) {
					result.editHistory.push({
						type: editText.includes('Edit:') ? 'edit' : 'regenerate',
						prompt: editText.replace(/^(Edit:|Regenerate:)\s*/i, '').trim()
					});
				}
			}
		}

		return result;
	}
</script>

<svelte:head>
	<title>{hasImage ? `Table ${tableId} - Gallery` : 'Image Not Found'}</title>
</svelte:head>

<main
	class="min-h-screen overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800"
>
	<!-- Floating Back Button -->
	<button
		onclick={goBack}
		class="glass-morphism smooth-transition fixed top-24 left-6 z-50 flex h-12 w-12 items-center justify-center rounded-full hover:scale-110 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
		aria-label="Back to Gallery"
		title="Back to Gallery"
	>
		<svg
			class="h-5 w-5 text-gray-700 dark:text-gray-200"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
		</svg>
	</button>

	{#if isLoading}
		<!-- Loading State (centered below fixed nav) -->
		<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center pt-16">
			<div
				class="glass-morphism rounded-xl border border-blue-200/50 px-6 py-5 text-center shadow-sm backdrop-blur-md dark:border-blue-800/40"
			>
				<Spinner color="blue" size="10" />
				<p class="mt-2 text-sm text-gray-700 dark:text-gray-300">Loading ZYETAi workspace…</p>
			</div>
		</div>
	{:else if !workspace}
		<!-- Not Found -->
		<div class="flex min-h-screen items-center justify-center p-6">
			<div
				class="fade-in rounded-2xl bg-white/80 p-12 text-center backdrop-blur-sm dark:bg-gray-800/80"
			>
				<p class="text-lg text-gray-600 dark:text-gray-400">Workspace not found</p>
			</div>
		</div>
	{:else if !hasImage}
		<!-- No Image -->
		<div class="flex min-h-screen items-center justify-center p-6">
			<div
				class="fade-in rounded-2xl bg-white/80 p-12 text-center backdrop-blur-sm dark:bg-gray-800/80"
			>
				<p class="text-lg text-gray-600 dark:text-gray-400">
					No image available for Table {tableId}
				</p>
			</div>
		</div>
	{:else}
		<!-- Hero Image Section -->
		<div class="relative">
			<div class="relative min-h-[80vh] overflow-hidden">
				<!-- Background blur effect -->
				<div
					class="absolute inset-0 scale-110 opacity-50 blur-2xl"
					style="background-image: url('{imageUrl}'); background-size: cover; background-position: center;"
				></div>

				<!-- Main Image Card (larger) -->
				<div class="relative z-10 flex h-full items-center justify-center p-4">
					<GlassCard class="aspect-square max-h-[90vh] max-w-[90vh] overflow-hidden rounded-2xl">
						<ImageWithLoader
							src={imageUrl}
							alt={prompt}
							class="h-full w-full object-cover"
							message="Rendering concept…"
						/>
					</GlassCard>
				</div>

				<!-- Overlay with Title and Actions -->
				<div
					class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
				>
					<div class="pointer-events-auto absolute right-0 bottom-0 left-0 p-8">
						<div class="slide-up mx-auto max-w-6xl">
							<div class="flex items-end justify-between">
								<div>
									<div class="z-20 mb-4 flex flex-wrap items-center gap-3">
										<Badge color="blue" class="z-20 px-4 py-2 text-base font-semibold">
											Table {tableId}
										</Badge>
										<Badge color="indigo" class="z-20 px-4 py-2 text-base font-semibold">
											{personaTitle}
										</Badge>
										{#if generationName}
											<Badge color="purple" class="z-20 px-4 py-2 text-base font-semibold">
												{generationName}
											</Badge>
										{/if}
										{#if personaAge}
											<Badge color="green" class="z-20 px-4 py-2 text-base font-semibold">
												{personaAge} years old
											</Badge>
										{/if}
									</div>
								</div>

								<!-- Action Buttons -->
								<div class="z-20 flex gap-3">
									<button
										onclick={handleDownload}
										class="glass-morphism smooth-transition z-20 flex h-12 w-12 items-center justify-center rounded-full text-white hover:scale-110"
										title="Download"
									>
										<DownloadOutline class="h-5 w-5" />
									</button>
									<button
										onclick={handleFullscreen}
										class="glass-morphism smooth-transition z-20 flex h-12 w-12 items-center justify-center rounded-full text-white hover:scale-110"
										title="Fullscreen"
									>
										<ExpandOutline class="h-5 w-5" />
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Content Section -->
			<div class="bg-white dark:bg-gray-900">
				<div class="mx-auto max-w-4xl p-8">
					<!-- Prompt Section (formatted) -->
					{#if prompt}
						{@const dp = parseDesignPrompt(prompt)}
						<section class="slide-up">
							{#if dp.userInputs.environment || dp.userInputs.features || dp.userInputs.atmosphere || dp.userInputs.colors || dp.userInputs.additional}
								<div
									class="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 dark:border-blue-800 dark:from-blue-900/20 dark:to-indigo-900/20"
								>
									<h3
										class="mb-4 flex items-center gap-2 text-lg font-semibold text-blue-900 dark:text-blue-100"
									>
										<WandMagicSparklesOutline class="h-5 w-5" />
										Your Workspace Vision
									</h3>
									<div class="space-y-3">
										{#if dp.userInputs.environment}
											<div class="flex flex-col gap-2 sm:flex-row sm:items-start">
												<span class="min-w-[120px] font-medium text-blue-800 dark:text-blue-300"
													>Environment:</span
												>
												<span class="flex-1 text-gray-800 dark:text-gray-200"
													>{dp.userInputs.environment}</span
												>
											</div>
										{/if}

										{#if dp.userInputs.features}
											<div class="flex flex-col gap-2 sm:flex-row sm:items-start">
												<span class="min-w-[120px] font-medium text-blue-800 dark:text-blue-300"
													>Key Features:</span
												>
												<span class="flex-1 text-gray-800 dark:text-gray-200"
													>{dp.userInputs.features}</span
												>
											</div>
										{/if}

										{#if dp.userInputs.colors}
											<div class="flex flex-col gap-2 sm:flex-row sm:items-start">
												<span class="min-w-[120px] font-medium text-blue-800 dark:text-blue-300"
													>Color Palette:</span
												>
												<span class="flex-1 text-gray-800 dark:text-gray-200"
													>{dp.userInputs.colors}</span
												>
											</div>
										{/if}

										{#if dp.userInputs.atmosphere}
											<div class="flex flex-col gap-2 sm:flex-row sm:items-start">
												<span class="min-w-[120px] font-medium text-blue-800 dark:text-blue-300"
													>Atmosphere:</span
												>
												<span class="flex-1 text-gray-800 dark:text-gray-200"
													>{dp.userInputs.atmosphere}</span
												>
											</div>
										{/if}

										{#if dp.userInputs.additional}
											<div class="flex flex-col gap-2 sm:flex-row sm:items-start">
												<span class="min-w-[120px] font-medium text-blue-800 dark:text-blue-300"
													>Additional:</span
												>
												<span class="flex-1 text-gray-800 dark:text-gray-200"
													>{dp.userInputs.additional}</span
												>
											</div>
										{/if}
									</div>
								</div>
							{/if}

							{#if dp.editHistory.length > 0}
								{#each dp.editHistory.slice(0, 20) as edit, i}
									<hr class="my-4 border-gray-200 dark:border-gray-700" />
									<p class="text-sm text-gray-700 dark:text-gray-300">#{i + 1}. {edit.prompt}</p>
								{/each}
								{#if dp.editHistory.length > 20}
									<hr class="my-4 border-gray-200 dark:border-gray-700" />
									<p class="text-xs text-gray-500 dark:text-gray-400">
										Showing 20 of {dp.editHistory.length} prompts
									</p>
								{/if}
							{/if}
						</section>
					{/if}

					<!-- Details Grid -->
					<!-- Details Grid removed per request -->
				</div>
			</div>
		</div>
	{/if}
</main>

<style>
	/* Smooth transitions */
	.smooth-transition {
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}
</style>
