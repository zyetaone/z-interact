<script lang="ts">
	import { toastStore } from '$lib/stores/toast.svelte';
	import { Toast } from 'flowbite-svelte';
	import { fly } from 'svelte/transition';
	import { CheckCircleSolid, ExclamationCircleSolid, InfoCircleSolid } from 'flowbite-svelte-icons';

	const toasts = $derived(toastStore.all);

	const getColor = (type: string) => {
		switch (type) {
			case 'success':
				return 'green';
			case 'error':
				return 'red';
			case 'info':
				return 'blue';
			case 'warning':
				return 'yellow';
			default:
				return 'blue';
		}
	};

	const getIcon = (type: string) => {
		switch (type) {
			case 'success':
				return CheckCircleSolid;
			case 'error':
			case 'warning':
				return ExclamationCircleSolid;
			case 'info':
			default:
				return InfoCircleSolid;
		}
	};
</script>

<div class="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
	{#each toasts as toast (toast.id)}
		<div transition:fly={{ y: 50, duration: 300 }}>
			<Toast
				color={getColor(toast.type)}
				dismissable
				onclose={() => toastStore.remove(toast.id)}
				class="shadow-lg"
			>
				{#snippet icon()}
					{@const IconComponent = getIcon(toast.type)}
					<IconComponent class="h-5 w-5" />
				{/snippet}
				{toast.message}
			</Toast>
		</div>
	{/each}
</div>
