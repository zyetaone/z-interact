<script lang="ts">
	import { Button } from '$lib/components/ui';
	import { onMount } from 'svelte';

	// Get slide parameter from URL
	let urlParams = new URLSearchParams(window.location.search);
	let currentSlide = $state(parseInt(urlParams.get('slide') || '0'));

	// Sample slides data (should match presenter's slides)
	let slides = $state([
		{
			title: 'Welcome to Interactive Presentations',
			content: '<p class="text-xl">You\'ve successfully joined the presentation!</p>',
			interactive: false
		},
		{
			title: 'Features',
			content: `<ul class="text-left space-y-3">
				<li>📱 Real-time participant interaction</li>
				<li>📊 Live analytics and feedback</li>
				<li>🎯 QR code-based joining</li>
				<li>⚡ Built with modern web technologies</li>
			</ul>`,
			interactive: true
		},
		{
			title: 'How It Works',
			content: `<div class="space-y-4">
				<p>1. Presenters show slides with QR codes</p>
				<p>2. Participants scan to join instantly</p>
				<p>3. Real-time interaction begins</p>
			</div>`,
			interactive: false
		},
		{
			title: 'Thank You!',
			content: '<p class="text-2xl">Questions & Next Steps</p>',
			interactive: false
		}
	]);

	let participantName = $state('');
	let hasJoined = $state(false);
	let feedback = $state('');

	// Join the presentation
	function joinPresentation() {
		if (participantName.trim()) {
			hasJoined = true;
			// Here you could send participant data to server
		}
	}

	// Submit feedback
	function submitFeedback() {
		if (feedback.trim()) {
			// Here you could send feedback to server
			alert('Thank you for your feedback!');
			feedback = '';
		}
	}

	// Simulate real-time slide updates (in real app, this would come from server)
	function checkForSlideUpdates() {
		// This would be replaced with actual real-time updates
		const newSlide = parseInt(urlParams.get('slide') || '0');
		if (newSlide !== currentSlide) {
			currentSlide = newSlide;
		}
	}

	onMount(() => {
		// Check for slide updates every 2 seconds
		const interval = setInterval(checkForSlideUpdates, 2000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Participant View - Interactive Presentation</title>
	<meta name="description" content="Join the interactive presentation" />
</svelte:head>

<div class="min-h-screen bg-gray-900 text-white">
	{#if !hasJoined}
		<!-- Join Screen -->
		<div class="flex h-screen items-center justify-center p-8">
			<div class="w-full max-w-md rounded-lg bg-gray-800 p-8 text-center">
				<h1 class="mb-6 text-2xl font-bold">Join the Presentation</h1>
				<p class="mb-6 text-gray-300">
					Enter your name to participate in this interactive presentation.
				</p>

				<form onsubmit={joinPresentation} class="space-y-4">
					<input
						bind:value={participantName}
						placeholder="Your name"
						required
						class="w-full rounded border border-gray-600 bg-gray-700 px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
					/>

					<Button
						type="submit"
						disabled={!participantName.trim()}
						class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
					>
						Join Presentation
					</Button>
				</form>
			</div>
		</div>
	{:else}
		<!-- Participant View -->
		<div class="flex h-screen flex-col">
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-gray-700 p-4">
				<div class="text-sm text-gray-400">
					Welcome, {participantName} • Slide {currentSlide + 1} of {slides.length}
				</div>
				<div class="text-xs text-gray-500">Participant View</div>
			</div>

			<!-- Slide Content -->
			<div class="flex flex-1 items-center justify-center p-8">
				<div class="max-w-4xl text-center">
					{#if slides[currentSlide]}
						<h1 class="mb-8 text-4xl leading-tight font-bold">
							{slides[currentSlide].title}
						</h1>
						<div class="text-lg leading-relaxed">
							{@html slides[currentSlide].content}
						</div>

						<!-- Interactive Elements -->
						{#if slides[currentSlide].interactive}
							<div class="mt-8 rounded-lg bg-gray-800 p-6">
								<h3 class="mb-4 text-lg font-semibold">Share Your Thoughts</h3>
								<textarea
									bind:value={feedback}
									placeholder="What's your feedback on this slide?"
									rows="3"
									class="w-full rounded border border-gray-600 bg-gray-700 px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
								></textarea>
								<Button
									onclick={submitFeedback}
									disabled={!feedback.trim()}
									class="mt-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
								>
									Submit Feedback
								</Button>
							</div>
						{/if}
					{/if}
				</div>
			</div>

			<!-- Footer -->
			<div class="border-t border-gray-700 p-4 text-center text-xs text-gray-500">
				You're viewing this presentation in participant mode. The presenter controls when slides
				advance.
			</div>
		</div>
	{/if}
</div>
