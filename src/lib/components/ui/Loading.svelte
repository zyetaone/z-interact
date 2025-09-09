<script lang="ts">
	import { Spinner } from 'flowbite-svelte';

	let {
		size = 'md',
		color = 'blue',
		class: className = '',
		variant,
		message,
		useGradientSpinner = false,
		loadingText,
		showCredit = false
	}: {
		size?: 'sm' | 'md' | 'lg' | '4' | '5' | '6' | '8' | '10' | '12' | '16';
		color?:
			| 'primary'
			| 'secondary'
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
		class?: string;
		variant?: 'fullpage' | 'inline' | 'gradient';
		message?: string;
		useGradientSpinner?: boolean;
		loadingText?: string;
		showCredit?: boolean;
	} = $props();

	const displayMessage = message || loadingText || '';
	const isFullpage = variant === 'fullpage';
	const isGradient = variant === 'gradient' || useGradientSpinner;

	// Convert size for gradient spinner
	const gradientSize =
		size === 'sm' || size === '4' || size === '5'
			? 'sm'
			: size === 'lg' || size === '12' || size === '16'
				? 'lg'
				: 'md';

	const gradientSizePx: Record<'sm' | 'md' | 'lg', number> = { sm: 20, md: 36, lg: 48 };
	const px = gradientSizePx[gradientSize];

	// Convert size for Flowbite Spinner (only numeric sizes)
	const spinnerSize = ['4', '5', '6', '8', '10', '12', '16'].includes(size as string)
		? (size as '4' | '5' | '6' | '8' | '10' | '12' | '16')
		: '8';
</script>

{#if isFullpage}
	<div
		class="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800"
	>
		<div class="text-center">
			{#if isGradient}
				<div
					class="gradient-spinner"
					style={`width:${px}px;height:${px}px;`}
					aria-hidden="true"
				></div>
			{:else}
				<Spinner color="blue" size="10" />
			{/if}
			{#if displayMessage}
				<p class="mt-4 text-sm text-slate-700 dark:text-gray-300">{displayMessage}</p>
			{/if}
			{#if showCredit}
				<div
					class="mt-2 text-[10px] tracking-wide text-slate-600 uppercase opacity-80 dark:text-slate-300"
				>
					Powered by Zyeta DX
				</div>
			{/if}
		</div>
	</div>
{:else if isGradient}
	<div class="flex flex-col items-center gap-2 {className}">
		<div class="gradient-spinner" style={`width:${px}px;height:${px}px;`} aria-hidden="true"></div>
		{#if displayMessage}
			<p class="text-sm text-slate-700 dark:text-gray-300">{displayMessage}</p>
		{/if}
		{#if showCredit}
			<div
				class="text-[10px] tracking-wide text-slate-600 uppercase opacity-80 dark:text-slate-300"
			>
				Powered by Zyeta DX
			</div>
		{/if}
		<span class="sr-only">Loading</span>
	</div>
{:else}
	<div class="flex items-center justify-center {className}">
		<Spinner {color} size={spinnerSize} />
		{#if displayMessage}
			<span class="ml-2 text-sm text-slate-700 dark:text-gray-300">{displayMessage}</span>
		{/if}
	</div>
{/if}

<style>
	@keyframes gradientSpin {
		to {
			transform: rotate(360deg);
		}
	}

	.gradient-spinner {
		border-radius: 9999px;
		background: conic-gradient(#60a5fa, #8b5cf6, #60a5fa);
		-webkit-mask: radial-gradient(farthest-side, transparent 60%, #000 61%);
		mask: radial-gradient(farthest-side, transparent 60%, #000 61%);
		animation: gradientSpin 0.9s linear infinite;
		box-shadow: 0 0 12px rgba(99, 102, 241, 0.25);
	}
</style>
