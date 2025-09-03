<script lang="ts">
	import { cn } from '$lib/utils';

	let {
		title = '',
		content = '',
		notes = '',
		showNotes = false,
		class: className = '',
		children
	} = $props();
</script>

<div class={cn('slide flex flex-col items-center justify-center space-y-8 text-center', className)}>
	{#if title}
		<h1 class="mb-8 text-4xl font-bold text-white md:text-6xl">
			{title}
		</h1>
	{/if}

	{#if content}
		<div class="max-w-3xl text-xl leading-relaxed text-white/90 md:text-2xl">
			{@html content}
		</div>
	{/if}

	{@render children?.()}

	{#if showNotes && notes}
		<div class="mt-8 rounded border-l-4 border-yellow-500 bg-yellow-100 p-4 text-gray-800">
			<h4 class="mb-2 font-semibold">Presenter Notes:</h4>
			<div class="text-sm whitespace-pre-wrap">{notes}</div>
		</div>
	{/if}
</div>
