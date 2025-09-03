<script lang="ts">
	import { Dialog } from 'bits-ui';
	import QRCodeGenerator from './qr-code-generator.svelte';
	import Button from './button.svelte';
	import { copyToClipboard } from '$lib/utils';

	interface QRModalProps {
		open?: boolean;
		url: string;
		title: string;
		description?: string;
	}

	let { open = $bindable(false), url, title, description }: QRModalProps = $props();

	async function handleCopy() {
		const success = await copyToClipboard(url);
		if (success) {
			// Could add toast notification here if needed
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-md">
		<div class="p-6">
			<Dialog.Title class="text-center text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</Dialog.Title>
			{#if description}
				<Dialog.Description class="text-center text-gray-600 dark:text-gray-400 mb-4">{description}</Dialog.Description>
			{/if}

		<div class="flex flex-col items-center space-y-4">
			<!-- QR Code Display -->
			<div class="rounded-lg bg-white p-4 shadow-lg">
				<QRCodeGenerator {url} size={280} />
			</div>

			<!-- URL Display -->
			<div class="w-full rounded bg-slate-100 p-3 dark:bg-slate-700">
				<code class="text-sm text-slate-800 dark:text-slate-200 break-all">
					{url}
				</code>
			</div>

			<!-- Action Buttons -->
			<div class="flex w-full gap-2">
				<Button
					variant="outline"
					class="flex-1"
					onclick={handleCopy}
				>
					📋 Copy Link
				</Button>
				<Button
					variant="outline"
					class="flex-1"
					onclick={() => open = false}
				>
					Close
				</Button>
			</div>
		</div>
	</div>
	</Dialog.Content>
</Dialog.Root>