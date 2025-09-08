<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		class?: string;
		animate?: boolean;
	}

	let { class: className = '', animate = true, ...restProps }: Props = $props();
</script>

<div
	class="bg-gray-200 dark:bg-gray-700 {animate ? 'animate-pulse' : ''} {className}"
	{...restProps}
></div>

<style>
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.animate-pulse {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
</style>
