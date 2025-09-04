<script lang="ts">
	import type { Persona } from '$lib/config.svelte';
	import { updatePersonaTitle, updatePersonaDescription } from '$lib/config.svelte';
	import { Modal, Button, Input, Textarea, Label } from 'flowbite-svelte';
	import { toastStore } from '$lib/stores/toast.svelte';

	interface Props {
		open: boolean;
		persona: Persona | null;
	}

	let { open = $bindable(), persona }: Props = $props();

	let isEditing = $state(false);
	let editTitle = $state('');
	let editDescription = $state('');

	// Update local editing values when persona changes
	$effect(() => {
		if (persona) {
			editTitle = persona.title;
			editDescription = persona.description;
		}
	});

	function startEditing() {
		if (persona) {
			editTitle = persona.title;
			editDescription = persona.description;
			isEditing = true;
		}
	}

	function cancelEditing() {
		isEditing = false;
		if (persona) {
			editTitle = persona.title;
			editDescription = persona.description;
		}
	}

	function saveChanges() {
		if (persona && editTitle.trim() && editDescription.trim()) {
			updatePersonaTitle(persona.id, editTitle.trim());
			updatePersonaDescription(persona.id, editDescription.trim());
			isEditing = false;
			toastStore.success('Persona updated successfully', 3000);
		} else {
			toastStore.error('Title and description cannot be empty', 3000);
		}
	}
</script>

{#if persona}
	<Modal
		bind:open
		title={isEditing ? `Edit ${persona.title}` : persona.title}
		size="xl"
		outsideclose
	>
		<div class="space-y-6">
			{#if isEditing}
				<!-- Edit Form -->
				<div class="space-y-4">
					<div>
						<Label for="edit-title" class="mb-2">Title</Label>
						<Input id="edit-title" bind:value={editTitle} placeholder="Enter persona title" />
					</div>
					<div>
						<Label for="edit-description" class="mb-2">Description</Label>
						<Textarea
							id="edit-description"
							bind:value={editDescription}
							placeholder="Enter persona description"
							rows={4}
							class="w-full"
						/>
					</div>
				</div>
			{:else}
				<!-- View Mode -->
				<div>
					<h3 class="mb-2 text-lg font-semibold text-gray-800 dark:text-white">Description</h3>
					<p class="text-gray-600 dark:text-gray-300">{persona.description}</p>
				</div>

				<!-- Prompt Structure -->
				<div>
					<h3 class="mb-3 text-lg font-semibold text-gray-800 dark:text-white">Form Structure</h3>
					<div class="space-y-2">
						{#each persona.promptStructure as item}
							<div class="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
								<span class="min-w-0 flex-1 font-medium text-gray-800 dark:text-white">
									{item.label}
								</span>
								<span class="font-mono text-sm text-gray-500 dark:text-gray-400">
									{item.field}
								</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		{#snippet footer()}
			<div class="flex w-full justify-between">
				<div>
					{#if !isEditing}
						<Button color="primary" onclick={startEditing}>Edit Persona</Button>
					{/if}
				</div>
				<div class="flex gap-2">
					{#if isEditing}
						<Button color="alternative" onclick={cancelEditing}>Cancel</Button>
						<Button color="primary" onclick={saveChanges}>Save Changes</Button>
					{:else}
						<Button onclick={() => (open = false)}>Close</Button>
					{/if}
				</div>
			</div>
		{/snippet}
	</Modal>
{/if}
