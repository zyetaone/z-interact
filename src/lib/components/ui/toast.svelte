<script lang="ts">
	import { toastStore } from '$lib/stores/toast.svelte';
	import { fade, fly } from 'svelte/transition';
	import { cn } from '$lib/utils';

	const toasts = $derived(toastStore.all);

	const typeStyles = {
		success: 'bg-green-50 text-green-800 border-green-200',
		error: 'bg-red-50 text-red-800 border-red-200',
		info: 'bg-blue-50 text-blue-800 border-blue-200',
		warning: 'bg-yellow-50 text-yellow-800 border-yellow-200'
	};

	const icons = {
		success: '✓',
		error: '✕',
		info: 'ℹ',
		warning: '⚠'
	};
</script>

<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
	{#each toasts as toast (toast.id)}
		<div
			transition:fly={{ y: 50, duration: 300 }}
			class={cn(
				'flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg',
				typeStyles[toast.type]
			)}
		>
			<span class="text-xl">{icons[toast.type]}</span>
			<p class="text-sm font-medium">{toast.message}</p>
			<button
				onclick={() => toastStore.remove(toast.id)}
				class="ml-auto text-xl hover:opacity-70"
			>
				×
			</button>
		</div>
	{/each}
</div>