<script lang="ts">
	type Props = {
		variant?: 'inline' | 'fullpage';
		message?: string;
	};

	const { variant = 'inline', message = 'Loading...' }: Props = $props();
</script>

{#if variant === 'fullpage'}
	<div class="flex min-h-screen items-center justify-center">
		<div class="flex flex-col items-center gap-4">
			<div
				class="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"
			></div>
			<p class="text-gray-500">{message}</p>
		</div>
	</div>
{:else}
	<div class="flex items-center gap-2">
		<div
			class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"
		></div>
		<span class="text-sm text-gray-500">{message}</span>
	</div>
{/if}
