<script lang="ts">
	import BaseQRModal from './base-qr-modal.svelte';

	let { open = $bindable(false), tableNumber, url } = $props();
</script>

<BaseQRModal
	bind:open
	title="Table {tableNumber}"
	{url}
	enableDefaultPrint={true}
	printTitle="Table {tableNumber}"
/>
