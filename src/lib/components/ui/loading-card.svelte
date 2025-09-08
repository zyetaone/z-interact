<script lang="ts">
	import LoadingSkeleton from './loading-skeleton.svelte';

	let props = $props<{
		count?: number;
		class?: string;
	}>();

	const { count = 1, class: className = '' } = props;
</script>

<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 {className}">
	{#each Array(count) as _, i}
		<div class="aspect-square overflow-hidden rounded-xl bg-white shadow-md dark:bg-gray-800">
			<!-- Image skeleton -->
			<LoadingSkeleton class="h-3/4 w-full" />

			<!-- Content skeleton -->
			<div class="space-y-2 p-3">
				<LoadingSkeleton class="h-4 w-3/4 rounded" />
				<LoadingSkeleton class="h-3 w-1/2 rounded" />
			</div>
		</div>
	{/each}
</div>
