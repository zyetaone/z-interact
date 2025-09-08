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
			toastStore.success('Persona updated successfully');
		} else {
			toastStore.error('Title and description cannot be empty');
		}
	}

	function handleClose() {
		cancelEditing();
		open = false;
	}
</script>

<Modal bind:open title={persona?.title || 'Persona Details'} size="md">
	{#if persona}
		<div class="space-y-4">
			{#if isEditing}
				<!-- Edit Mode -->
				<div class="space-y-4">
					<div>
						<Label for="title" class="mb-2">Title</Label>
						<Input
							id="title"
							bind:value={editTitle}
							placeholder="Enter persona title"
							class="w-full"
						/>
					</div>
					<div>
						<Label for="description" class="mb-2">Description</Label>
						<Textarea
							id="description"
							bind:value={editDescription}
							rows={6}
							placeholder="Enter persona description"
							class="w-full"
						/>
					</div>
				</div>
			{:else}
				<!-- View Mode -->
				<div class="space-y-3">
					<div>
						<h3 class="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">Title</h3>
						<p class="text-gray-900 dark:text-white">{persona.title}</p>
					</div>
					<div>
						<h3 class="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">Description</h3>
						<p class="text-gray-700 dark:text-gray-300">{persona.description}</p>
					</div>
					<div>
						<h3 class="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">Persona ID</h3>
						<code class="rounded bg-gray-100 px-2 py-1 text-sm dark:bg-gray-800">{persona.id}</code>
					</div>
				</div>
			{/if}
		</div>

		{#snippet footer()}
			<div class="flex justify-between">
				{#if isEditing}
					<Button onclick={cancelEditing} color="alternative">Cancel</Button>
					<Button onclick={saveChanges}>Save Changes</Button>
				{:else}
					<Button onclick={handleClose} color="alternative">Close</Button>
					<Button onclick={startEditing}>Edit</Button>
				{/if}
			</div>
		{/snippet}
	{/if}
</Modal>
