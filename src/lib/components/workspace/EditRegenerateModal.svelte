<script lang="ts">
	import { Modal, Button as FBButton, Textarea, Label, Spinner, Toggle } from 'flowbite-svelte';
	import { PaletteOutline, EditOutline, LightbulbOutline } from 'flowbite-svelte-icons';
	import { Button, ImageWithLoader } from '$lib/components/ui';
	import { PromptBuilder } from '$lib/stores/config-store.svelte';
	import type { PromptFields } from '$lib/types';

	let {
		open = $bindable(false),
		currentImage = null,
		currentPrompt = '',
		formData,
		onClose,
		onEdit,
		onRegenerate,
		isEditLoading = false,
		isRegenerateLoading = false,
		remainingEdits = 20,
		hasReachedLimit = false
	}: {
		open: boolean;
		currentImage: string | null;
		currentPrompt: string;
		formData: PromptFields;
		onClose: () => void;
		onEdit: (editPrompt: string) => void;
		onRegenerate: (newPrompt: string) => void;
		isEditLoading?: boolean;
		isRegenerateLoading?: boolean;
		remainingEdits?: number;
		hasReachedLimit?: boolean;
	} = $props();

	// New state variables for enhanced editing
	let addInstructions = $state('');
	let subtractInstructions = $state('');
	let modifyInstructions = $state('');
	let regenerateRequest = $state('');
	let isEditMode = $state(true); // true = edit, false = regenerate

	// Reset state when modal opens
	$effect(() => {
		if (open) {
			addInstructions = '';
			subtractInstructions = '';
			modifyInstructions = '';
			regenerateRequest = '';
			isEditMode = true; // Start with edit mode by default
		}
	});

	// Derive validation for edit form
	const hasEditInstructions = $derived(
		addInstructions.trim() || subtractInstructions.trim() || modifyInstructions.trim()
	);

	// Derive validation for regenerate form
	const hasRegeneratePrompt = $derived(regenerateRequest.trim());

	function handleEdit() {
		if (hasEditInstructions) {
			const editPrompt = PromptBuilder.buildForEdit(
				currentPrompt,
				addInstructions,
				subtractInstructions,
				modifyInstructions
			);
			onEdit(editPrompt);
			onClose();
		}
	}

	function handleRegenerate() {
		const newPrompt = PromptBuilder.buildForRegeneration(currentPrompt, regenerateRequest);
		onRegenerate(newPrompt);
		onClose();
	}
</script>

<Modal
	bind:open
	title="Edit or Regenerate Workspace"
	size="lg"
	class="max-w-3xl"
	autoclose={false}
	dismissable={!isEditLoading && !isRegenerateLoading}
	onclose={onClose}
>
	<div class="p-4">
		<!-- Mode Toggle Switch -->
		<div class="mb-4 flex items-center justify-center gap-4">
			<div class="flex items-center gap-3">
				<span
					class="text-sm font-medium {!isEditMode
						? 'text-gray-900 dark:text-white'
						: 'text-gray-500 dark:text-gray-400'}"
				>
					<PaletteOutline class="mr-2 inline h-4 w-4" />
					Regenerate New
				</span>
				<Toggle
					bind:checked={isEditMode}
					disabled={isEditLoading || isRegenerateLoading || hasReachedLimit}
					size="default"
				/>
				<span
					class="text-sm font-medium {isEditMode
						? 'text-gray-900 dark:text-white'
						: 'text-gray-500 dark:text-gray-400'}"
				>
					<EditOutline class="mr-2 inline h-4 w-4" />
					Edit Current
				</span>
			</div>
		</div>

		<!-- Usage Limit Display -->
		<div class="mb-6 text-center">
			{#if hasReachedLimit}
				<div class="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
					<p class="text-sm font-medium text-red-800 dark:text-red-300">
						⚠️ Usage Limit Reached (20/20)
					</p>
					<p class="mt-1 text-xs text-red-600 dark:text-red-400">
						You have reached the maximum number of edit/regenerate operations for fair use.
					</p>
				</div>
			{:else}
				<div class="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
					<p class="text-sm font-medium text-blue-800 dark:text-blue-300">
						🎯 Fair Use: {remainingEdits} operations remaining
					</p>
					<p class="mt-1 text-xs text-blue-600 dark:text-blue-400">
						Each edit or regenerate counts toward your usage limit.
					</p>
				</div>
			{/if}
		</div>

		<!-- Content based on mode -->
		{#if isEditMode}
			<!-- Edit Mode with Add/Subtract/Modify -->
			<div class="space-y-6">
				{#if currentImage}
					<!-- Current Image Preview -->
					<div
						class="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
					>
						<h4 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
							Current Workspace
						</h4>
						<div class="aspect-video w-full overflow-hidden rounded-lg">
							<ImageWithLoader
								src={currentImage}
								alt="Current workspace"
								class="h-full w-full object-cover"
							/>
						</div>
					</div>

					<!-- Enhanced Edit Interface -->
					<div class="grid gap-4">
						<!-- Add Section -->
						<div
							class="rounded-lg border border-green-200 bg-green-50/50 p-4 dark:border-green-800 dark:bg-green-900/10"
						>
							<Label
								class="mb-2 flex items-center justify-between text-green-800 dark:text-green-300"
							>
								<div class="flex items-center gap-2">
									<span class="text-lg">➕</span> Add to Workspace
								</div>
								<span class="text-xs font-normal text-gray-500 dark:text-gray-400">
									{addInstructions.length}/500
								</span>
							</Label>
							<Textarea
								bind:value={addInstructions}
								placeholder="What elements would you like to add?&#10;• Standing desk with dual monitors&#10;• Indoor plants and greenery&#10;• Collaborative seating area&#10;• Natural lighting features"
								maxlength={500}
								rows={3}
								class="w-full border-green-200 focus:border-green-400 dark:border-green-700 dark:focus:border-green-500"
							/>
						</div>

						<!-- Subtract Section -->
						<div
							class="rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-800 dark:bg-red-900/10"
						>
							<Label class="mb-2 flex items-center justify-between text-red-800 dark:text-red-300">
								<div class="flex items-center gap-2">
									<span class="text-lg">➖</span> Remove from Workspace
								</div>
								<span class="text-xs font-normal text-gray-500 dark:text-gray-400">
									{subtractInstructions.length}/500
								</span>
							</Label>
							<Textarea
								bind:value={subtractInstructions}
								placeholder="What elements would you like to remove?&#10;• Remove the desk&#10;• Take out the bookshelves&#10;• Remove artificial lighting&#10;• Clear the wall decorations"
								maxlength={500}
								rows={3}
								class="w-full border-red-200 focus:border-red-400 dark:border-red-700 dark:focus:border-red-500"
							/>
						</div>

						<!-- Modify Section -->
						<div
							class="rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-900/10"
						>
							<Label
								class="mb-2 flex items-center justify-between text-blue-800 dark:text-blue-300"
							>
								<div class="flex items-center gap-2">
									<span class="text-lg">✏️</span> Modify Existing Elements
								</div>
								<span class="text-xs font-normal text-gray-500 dark:text-gray-400">
									{modifyInstructions.length}/500
								</span>
							</Label>
							<Textarea
								bind:value={modifyInstructions}
								placeholder="What would you like to change?&#10;• Change chair color to blue&#10;• Make windows larger&#10;• Replace wood flooring with carpet&#10;• Adjust lighting to be warmer"
								maxlength={500}
								rows={3}
								class="w-full border-blue-200 focus:border-blue-400 dark:border-blue-700 dark:focus:border-blue-500"
							/>
						</div>
					</div>

					<!-- Apply Button -->
					<div class="flex justify-end">
						<Button
							onclick={handleEdit}
							disabled={!hasEditInstructions || isEditLoading || hasReachedLimit}
							class="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
						>
							{#if isEditLoading}
								<Spinner class="mr-2" size="4" />
								Applying Changes...
							{:else}
								<EditOutline class="mr-2 h-4 w-4" />
								Apply Changes
							{/if}
						</Button>
					</div>
				{/if}
			</div>
		{:else}
			<!-- Regenerate Mode -->
			<div class="space-y-4">
				<!-- Explanation -->
				<div class="rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
					<div class="flex items-start gap-3">
						<PaletteOutline class="mt-1 h-5 w-5 text-purple-600 dark:text-purple-400" />
						<div>
							<h4 class="font-medium text-purple-900 dark:text-purple-100">
								Generate Fresh Alternative
							</h4>
							<p class="mt-1 text-sm text-purple-700 dark:text-purple-300">
								A new workspace will be created using your original preferences. Leave blank for AI
								to surprise you, or specify what you'd like different.
							</p>
						</div>
					</div>
				</div>

				<!-- Optional Request -->
				<div>
					<Label class="mb-2 flex justify-between text-base font-medium">
						<span>Optional: Specific changes for new version</span>
						<span class="text-xs font-normal text-gray-500 dark:text-gray-400">
							{regenerateRequest.length}/500
						</span>
					</Label>
					<Textarea
						bind:value={regenerateRequest}
						placeholder="Leave blank for AI to create a fresh perspective, or specify:&#10;• More minimalist approach&#10;• Warmer color palette&#10;• Focus on biophilic design&#10;• Industrial style instead&#10;• Open collaborative layout&#10;• Cozy intimate setting"
						maxlength={500}
						rows={4}
						class="w-full"
					/>
					<div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
						<div class="flex items-start gap-2">
							<LightbulbOutline class="mt-0.5 h-3 w-3 flex-shrink-0" />
							<span>
								<strong>Tip:</strong> The AI will maintain your core requirements while exploring the
								direction you specify.
							</span>
						</div>
					</div>
				</div>

				<!-- Generate Button -->
				<div class="flex justify-end">
					<Button
						onclick={handleRegenerate}
						disabled={!hasRegeneratePrompt || isRegenerateLoading || hasReachedLimit}
						class="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
					>
						{#if isRegenerateLoading}
							<Spinner class="mr-2" size="4" />
							Generating...
						{:else}
							<PaletteOutline class="mr-2 h-4 w-4" />
							{#if regenerateRequest.trim()}
								Generate with Changes
							{:else}
								Show Me Another Option
							{/if}
						{/if}
					</Button>
				</div>
			</div>
		{/if}
	</div>

	{#snippet footer()}
		<div class="flex w-full justify-end">
			<Button variant="outline" onclick={onClose} disabled={isEditLoading || isRegenerateLoading}>
				Cancel
			</Button>
		</div>
	{/snippet}
</Modal>
