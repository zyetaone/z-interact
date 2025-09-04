<script lang="ts">
	import { Button as FlowbiteButton } from 'flowbite-svelte';
	import { cn } from '$lib/utils';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Props = HTMLButtonAttributes & {
		variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
		size?: 'default' | 'sm' | 'lg' | 'icon';
		class?: string;
	};

	let {
		variant = 'default',
		size = 'default',
		class: className,
		children,
		...restProps
	}: Props = $props();

	// Map our variants to Flowbite colors and styles
	const getFlowbiteColor = (variant: string) => {
		switch (variant) {
			case 'destructive':
				return 'red';
			case 'outline':
				return 'light';
			case 'secondary':
				return 'alternative';
			case 'ghost':
				return 'light';
			case 'link':
				return 'primary'; // Use primary for link variant
			default:
				return 'primary';
		}
	};

	const getFlowbiteSize = (size: string) => {
		switch (size) {
			case 'sm':
				return 'sm';
			case 'lg':
				return 'lg';
			case 'icon':
				return 'sm';
			default:
				return 'md';
		}
	};

	const isOutline = variant === 'outline';
	const isPill = false;
	const flowbiteColor = getFlowbiteColor(variant) as any;
	const flowbiteSize = getFlowbiteSize(size);

	// Additional classes for special variants
	const additionalClasses = cn(
		size === 'icon' && 'w-10 h-10 p-2',
		variant === 'ghost' && 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800',
		variant === 'link' && 'underline-offset-4 hover:underline p-0 h-auto font-normal',
		className
	);
</script>

<!-- @ts-ignore -->
<FlowbiteButton
	color={flowbiteColor}
	outline={isOutline}
	pill={isPill}
	size={flowbiteSize}
	class={additionalClasses}
	{...restProps as any}
>
	{@render children?.()}
</FlowbiteButton>
