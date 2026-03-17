<script lang="ts">
	import { Button as FlowbiteButton } from 'flowbite-svelte';
	import { cn } from '$lib/utils/index';
	import type { HTMLButtonAttributes, HTMLAnchorAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	type Variant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
	type Size = 'default' | 'sm' | 'lg' | 'icon';
	type FlowbiteColor =
		| 'primary'
		| 'secondary'
		| 'light'
		| 'dark'
		| 'alternative'
		| 'gray'
		| 'red'
		| 'orange'
		| 'amber'
		| 'yellow'
		| 'lime'
		| 'green'
		| 'emerald'
		| 'teal'
		| 'cyan'
		| 'sky'
		| 'blue'
		| 'indigo'
		| 'violet'
		| 'purple'
		| 'fuchsia'
		| 'pink'
		| 'rose';

	// Public props: extend core button/anchor attributes and expose Flowbite options
	type CommonProps = {
		variant?: Variant;
		size?: Size;
		class?: string;
		color?: FlowbiteColor; // overrides variant mapping
		pill?: boolean;
		outline?: boolean;
		shadow?: boolean;
		loading?: boolean;
		children?: Snippet;
		onclick?: (e: MouseEvent) => void;
		title?: string;
	};

	type AnchorExtras = Pick<HTMLAnchorAttributes, 'href' | 'rel' | 'target' | 'download'>;
	type ButtonExtras = Pick<HTMLButtonAttributes, 'type' | 'name' | 'value' | 'disabled' | 'form'>;

	type Props = CommonProps & AnchorExtras & ButtonExtras;

	let {
		variant = 'default',
		size = 'default',
		class: className,
		color,
		pill = false,
		outline,
		shadow = false,
		loading = false,
		onclick,
		title,
		href,
		rel,
		target,
		download,
		type = 'button',
		name,
		value,
		disabled,
		form,
		children
	}: Props = $props();

	// Map our variants to Flowbite colors and styles, with color override
	function resolveColor(): FlowbiteColor {
		if (color) return color;
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
				return 'primary';
			default:
				return 'primary';
		}
	}

	function resolveSize(s: Size): 'sm' | 'md' | 'lg' {
		switch (s) {
			case 'sm':
				return 'sm';
			case 'lg':
				return 'lg';
			case 'icon':
				return 'sm';
			default:
				return 'md';
		}
	}

	const resolvedColor = resolveColor();
	const resolvedOutline = outline ?? variant === 'outline';
	const resolvedSize = resolveSize(size);

	// Extra classes for our variants
	const additionalClasses = cn(
		size === 'icon' && 'w-10 h-10 p-2',
		variant === 'ghost' && 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800',
		variant === 'link' && 'underline-offset-4 hover:underline p-0 h-auto font-normal',
		className
	);
</script>

<FlowbiteButton
	color={resolvedColor}
	{pill}
	outline={resolvedOutline}
	{shadow}
	size={resolvedSize}
	class={additionalClasses}
	{loading}
	{onclick}
	title={title ?? undefined}
	href={href ?? undefined}
	rel={rel ?? undefined}
	target={target ?? undefined}
	download={download ?? undefined}
	{type}
	name={name ?? undefined}
	value={value ?? undefined}
	disabled={disabled ?? undefined}
	form={form ?? undefined}
>
	{@render children?.()}
</FlowbiteButton>
