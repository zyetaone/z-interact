<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { personas, type Persona, type PromptFields } from '$lib/personas';
	import { workspaceStore } from '$lib/stores/workspace.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { Button } from '$lib/components/ui';

	const personaId = $page.params.personaId;
	const persona = personas.find(p => p.id === personaId);

	// Redirect if persona not found
	if (!persona) {
		goto('/');
	}

	// Form state
	let formData = $state<PromptFields>({
		identity: '',
		values: '',
		aspirations: '',
		aesthetic: '',
		features: '',
		vibe: ''
	});

	let generatedImage = $state<string | null>(null);
	let isLocked = $state(false);
	let errors = $state<Partial<PromptFields>>({});

	// Initialize store and check if this persona already has a locked image
	$effect(() => {
		if (persona) {
			workspaceStore.initialize().then(() => {
				const existingImage = workspaceStore.getLockedImage(persona.id);
				if (existingImage) {
					isLocked = true;
					generatedImage = existingImage.imageUrl;
				}
			});
		}
	});

	function validateForm(): boolean {
		const newErrors: Partial<PromptFields> = {};
		
		for (const [key, value] of Object.entries(formData)) {
			if (!value || value.length < 10) {
				newErrors[key as keyof PromptFields] = 'Please provide a more detailed description (at least 10 characters).';
			}
		}
		
		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	async function generateImage() {
		if (!validateForm() || !persona) return;

		const promptParts = [
			persona.promptPreamble,
			`A workspace designed for ${formData.identity}.`,
			`Their values are ${formData.values}.`,
			`Their aspirations are ${formData.aspirations}.`,
			`The environment looks like ${formData.aesthetic}.`,
			`It features ${formData.features}.`,
			`Designed to feel ${formData.vibe}.`,
			persona.promptPostamble,
		];
		const finalPrompt = promptParts.join('\n');

		try {
			const imageUrl = await workspaceStore.generateImage(persona.id, finalPrompt);
			generatedImage = imageUrl;
			toastStore.success('Image generated successfully!');
		} catch (error) {
			console.error('Image generation failed:', error);
			toastStore.error('Failed to generate image. Please try again.');
		}
	}

	async function lockInImage() {
		if (!generatedImage || !persona) return;

		const promptParts = [
			persona.promptPreamble,
			`A workspace designed for ${formData.identity}.`,
			`Their values are ${formData.values}.`,
			`Their aspirations are ${formData.aspirations}.`,
			`The environment looks like ${formData.aesthetic}.`,
			`It features ${formData.features}.`,
			`Designed to feel ${formData.vibe}.`,
			persona.promptPostamble,
		];

		try {
			await workspaceStore.lockImage({
				personaId: persona.id,
				personaTitle: persona.title,
				imageUrl: generatedImage,
				prompt: promptParts.join('\n'),
				lockedAt: new Date().toISOString()
			});

			isLocked = true;
			toastStore.success('Image locked in successfully! View it on the presenter dashboard.');
		} catch (error) {
			console.error('Failed to lock image:', error);
			toastStore.error('Failed to lock image. Please try again.');
		}
	}

	const isGenerating = $derived(persona ? workspaceStore.isPersonaGenerating(persona.id) : false);
</script>

<svelte:head>
	<title>{persona?.title || 'Table'} - AI Workspace Generator</title>
</svelte:head>

{#if !persona}
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center">
			<h1 class="text-2xl font-bold text-red-600 mb-2">Persona Not Found</h1>
			<p class="text-slate-600 mb-4">The persona you're looking for doesn't exist.</p>
			<Button onclick={() => goto('/')} variant="outline">
				← Back to QR Codes
			</Button>
		</div>
	</div>
{:else if isLocked}
	<!-- Locked/Success State -->
	<div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
		<div class="max-w-2xl w-full bg-white rounded-xl shadow-2xl p-8 text-center">
			<div class="text-6xl mb-4">✅</div>
			<h1 class="text-3xl font-bold text-green-600 mb-2">Submission Complete!</h1>
			<p class="text-slate-600 mb-6">
				Your workspace image has been submitted. You can view it on the main presenter screen.
			</p>
			
			{#if generatedImage}
				<div class="rounded-lg overflow-hidden shadow-lg mb-6">
					<img
						src={generatedImage}
						alt="Locked-in workspace"
						class="w-full h-64 object-cover"
					/>
				</div>
			{/if}
			
			<div class="flex gap-2 justify-center">
				<Button onclick={() => goto('/')} variant="outline">
					← Back to QR Codes
				</Button>
				<Button onclick={() => goto('/gallery')} variant="default">
					View Gallery →
				</Button>
			</div>
		</div>
	</div>
{:else}
	<!-- Main Workspace Generator -->
	<main class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
		<div class="container mx-auto max-w-6xl">
			<!-- Header -->
			<header class="text-center mb-10">
				<h1 class="text-3xl font-bold text-slate-900">{persona.title}</h1>
				<p class="text-slate-600 mt-1 text-lg">{persona.description}</p>
			</header>

			<div class="grid lg:grid-cols-2 gap-8 items-start">
				<!-- Form Section -->
				<div class="bg-white rounded-xl shadow-lg p-6">
					<h2 class="text-xl font-bold mb-2 text-slate-900">Describe Your Workspace</h2>
					<p class="text-slate-600 mb-6">Collaborate with your table to fill in the details below.</p>
					
					<form onsubmit={(e) => { e.preventDefault(); generateImage(); }} class="space-y-6">
						{#each persona.promptStructure as { label, field }}
							<div>
								<label for={field} class="block text-sm font-medium text-slate-700 mb-2">
									{label}
								</label>
								<textarea
									id={field}
									bind:value={formData[field]}
									placeholder="e.g., minimalist and functional, with a focus on natural light..."
									rows="2"
									class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
									class:border-red-300={errors[field]}
								></textarea>
								{#if errors[field]}
									<p class="mt-1 text-sm text-red-600">{errors[field]}</p>
								{/if}
							</div>
						{/each}
						
						<Button 
							type="submit" 
							disabled={isGenerating}
							variant="default"
							class="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50"
						>
							{#if isGenerating}
								<div class="flex items-center justify-center">
									<div class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
									Generating...
								</div>
							{:else}
								✨ Generate Image
							{/if}
						</Button>
					</form>
				</div>
				
				<!-- Preview Section -->
				<div class="lg:sticky top-8">
					<div class="bg-white rounded-xl shadow-lg p-6">
						<h2 class="text-xl font-bold mb-2 text-slate-900">Generated Workspace</h2>
						<p class="text-slate-600 mb-4">Your AI-generated image will appear here.</p>
						
						<div class="aspect-video bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300">
							{#if isGenerating}
								<div class="flex flex-col items-center gap-2 text-slate-500">
									<div class="animate-spin h-8 w-8 border-2 border-slate-400 border-t-transparent rounded-full"></div>
									<span>Generating your vision...</span>
								</div>
							{:else if generatedImage}
								<img
									src={generatedImage}
									alt="Generated workspace"
									class="w-full h-full object-cover rounded-lg"
								/>
							{:else}
								<div class="text-center text-slate-500 p-4">
									<div class="text-4xl mb-2">🏢</div>
									<p>Fill out the form and click "Generate Image" to start.</p>
								</div>
							{/if}
						</div>
						
						{#if generatedImage && !isGenerating}
							<div class="flex flex-col sm:flex-row gap-2 mt-4">
								<Button 
									onclick={generateImage} 
									variant="outline"
									class="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50"
									disabled={isGenerating}
								>
									✨ Regenerate
								</Button>
								<Button 
									onclick={lockInImage}
									class="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold"
									disabled={isGenerating}
								>
									🔒 Lock In
								</Button>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</main>
{/if}