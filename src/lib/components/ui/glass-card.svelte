<script lang="ts">
	interface Props {
		class?: string;
		borderTone?: 'blue' | 'white' | 'red';
		children?: import('svelte').Snippet;
		overlay?: import('svelte').Snippet;
	}

	let { class: className = '', borderTone = 'blue', children, overlay }: Props = $props();

	const borderClass =
		borderTone === 'red'
			? 'border-red-300/60 dark:border-red-600/50'
			: borderTone === 'white'
				? 'border-white/30 dark:border-white/20'
				: 'border-blue-200/30 dark:border-blue-800/30';
</script>

<div class={`glass-morphism rounded-xl border ${borderClass} shadow-sm ${className}`}>
	{@render children?.()}
	{@render overlay?.()}
</div>
