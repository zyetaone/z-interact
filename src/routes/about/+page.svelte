<svelte:head>
	<title>About Z-Interact</title>
	<meta name="description" content="About Z-Interact - AI-powered collaborative presentation platform" />
</svelte:head>

<div class="max-w-4xl mx-auto p-6">
	<div class="text-center mb-8">
		<h1 class="text-4xl font-bold text-gray-900 mb-4">🎨 Z-Interact</h1>
		<p class="text-xl text-gray-600">AI-Powered Collaborative Presentation Platform</p>
	</div>

	<div class="grid md:grid-cols-2 gap-8 mb-8">
		<div class="bg-white rounded-lg shadow-md p-6">
			<h2 class="text-2xl font-semibold text-gray-800 mb-4">🚀 What is Z-Interact?</h2>
			<p class="text-gray-600 mb-4">
				Z-Interact is a modern web application that combines AI-powered image generation with real-time collaborative features.
				Perfect for presentations, workshops, and interactive sessions where participants can contribute creative content.
			</p>
			<p class="text-gray-600">
				Built with cutting-edge technologies including OpenAI's DALL-E 3, Server-Sent Events for real-time updates,
				and a robust SQLite database with Drizzle ORM.
			</p>
		</div>

		<div class="bg-white rounded-lg shadow-md p-6">
			<h2 class="text-2xl font-semibold text-gray-800 mb-4">✨ Key Features</h2>
			<ul class="space-y-2 text-gray-600">
				<li class="flex items-center">
					<span class="text-green-500 mr-2">✓</span>
					AI-powered image generation with OpenAI DALL-E 3
				</li>
				<li class="flex items-center">
					<span class="text-green-500 mr-2">✓</span>
					Real-time collaborative gallery
				</li>
				<li class="flex items-center">
					<span class="text-green-500 mr-2">✓</span>
					QR code sharing system
				</li>
				<li class="flex items-center">
					<span class="text-green-500 mr-2">✓</span>
					Secure authentication with Argon2 hashing
				</li>
				<li class="flex items-center">
					<span class="text-green-500 mr-2">✓</span>
					Responsive design for all devices
				</li>
			</ul>
		</div>
	</div>

	<div class="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-8">
		<h2 class="text-2xl font-semibold text-gray-800 mb-4">🛠️ Technology Stack</h2>
		<div class="grid md:grid-cols-3 gap-4">
			<div class="text-center">
				<h3 class="font-semibold text-gray-700 mb-2">Frontend</h3>
				<ul class="text-sm text-gray-600 space-y-1">
					<li>• Svelte 5 (modern runes)</li>
					<li>• SvelteKit</li>
					<li>• Tailwind CSS</li>
					<li>• TypeScript</li>
				</ul>
			</div>
			<div class="text-center">
				<h3 class="font-semibold text-gray-700 mb-2">Backend</h3>
				<ul class="text-sm text-gray-600 space-y-1">
					<li>• SQLite + Drizzle ORM</li>
					<li>• Server-Sent Events</li>
					<li>• OpenAI API</li>
					<li>• Argon2 password hashing</li>
				</ul>
			</div>
			<div class="text-center">
				<h3 class="font-semibold text-gray-700 mb-2">DevOps</h3>
				<ul class="text-sm text-gray-600 space-y-1">
					<li>• Vitest testing</li>
					<li>• ESLint + Prettier</li>
					<li>• Docker support</li>
					<li>• Production deployment ready</li>
				</ul>
			</div>
		</div>
	</div>

	<div class="text-center">
		<h2 class="text-2xl font-semibold text-gray-800 mb-4">🎯 How It Works</h2>
		<div class="grid md:grid-cols-3 gap-6">
			<div class="bg-white rounded-lg shadow-md p-4">
				<div class="text-3xl mb-2">📱</div>
				<h3 class="font-semibold text-gray-700 mb-2">1. Share QR Code</h3>
				<p class="text-sm text-gray-600">Presenters share a QR code that participants can scan to join the session</p>
			</div>
			<div class="bg-white rounded-lg shadow-md p-4">
				<div class="text-3xl mb-2">🎨</div>
				<h3 class="font-semibold text-gray-700 mb-2">2. Generate Images</h3>
				<p class="text-sm text-gray-600">Participants use AI to create images based on prompts and themes</p>
			</div>
			<div class="bg-white rounded-lg shadow-md p-4">
				<div class="text-3xl mb-2">📺</div>
				<h3 class="font-semibold text-gray-700 mb-2">3. Live Gallery</h3>
				<p class="text-sm text-gray-600">All generated images appear in real-time in the shared gallery</p>
			</div>
		</div>
	</div>

	<div class="text-center mt-8">
		<p class="text-gray-600">
			Built with ❤️ using modern web technologies
		</p>
	</div>
</div>
