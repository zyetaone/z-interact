<script lang="ts">
	import type { PromptFields, Persona } from '$lib/types';
	import { Label, Textarea, Helper, Tooltip } from 'flowbite-svelte';
	import { validatePrompt, getPromptErrors } from '$lib/validation/prompt';
	import { handleError } from '$lib/utils/error-handler';
	import { debounce } from '$lib/utils';

	let props = $props<{
		persona: Persona;
		formData: PromptFields;
		errors: Partial<PromptFields>;
		onFormDataChange: (field: keyof PromptFields, value: string) => void;
		onErrorsChange: (errors: Partial<PromptFields>) => void;
	}>();

	const { persona, formData, errors, onFormDataChange, onErrorsChange } = props;

	const debouncedFieldChange = debounce((field: keyof PromptFields, value: string) => {
		onFormDataChange(field, value);

		// Clear error for this field if it exists and value is not empty
		if (errors[field] && value.trim()) {
			const newErrors = { ...errors };
			delete newErrors[field];
			onErrorsChange(newErrors);
		}
	}, 300);

	function handleFieldChange(field: keyof PromptFields, value: string) {
		debouncedFieldChange(field, value);
	}

	// Validation happens through the parent component's $derived state
	// No need for $effect here as validation is triggered by formData changes
	// which are already handled through onFormDataChange callbacks
</script>

<form
	onsubmit={(e) => {
		e.preventDefault();
		// Validation will be handled by parent component
	}}
	class="flex flex-1 flex-col lg:min-h-0"
>
	<div class="flex-1 space-y-4">
		{#each persona.promptStructure as { label, field, fieldSuggestions } (field)}
			{@const typedField = field as keyof PromptFields}
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<Label
						for={typedField}
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
						<span id="{typedField}-tooltip" class="cursor-help text-blue-500 hover:text-blue-600">
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</span>
					</Label>
					{#if formData[typedField] && formData[typedField].length >= 3}
						<span
							class="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
						>
							✓ Complete
						</span>
					{:else if formData[typedField] && formData[typedField].length > 0}
						<span
							class="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
						>
							{3 - formData[typedField].length} more
						</span>
					{/if}
				</div>
				<Textarea
					id={typedField}
					value={formData[typedField]}
					oninput={(e) => handleFieldChange(typedField, (e.target as HTMLTextAreaElement).value)}
					placeholder={fieldSuggestions.placeholder}
					rows={3}
					color={errors[typedField] ? 'red' : 'base'}
					class="w-full resize-none border-gray-300 bg-gray-50 text-base focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:focus:border-blue-400 dark:focus:ring-blue-400 {formData[
						typedField
					] && formData[typedField].length >= 3
						? 'border-green-300 bg-green-50 dark:border-green-600 dark:bg-green-900/20'
						: ''}"
				/>
				{#if errors[typedField]}
					<Helper class="text-red-600 dark:text-red-400">
						{errors[typedField]}
					</Helper>
				{:else}
					<Helper class="text-gray-500 dark:text-gray-400">
						{fieldSuggestions.suggestions}
					</Helper>
				{/if}
			</div>
		{/each}
	</div>
</form>
