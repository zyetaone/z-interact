# Slide-Based Presentation System

This project has been set up with Bits UI and Tailwind CSS for creating slide-based presentations.

## What's Been Set Up

### Dependencies Installed

- **Bits UI**: A component library for Svelte with accessible, customizable components
- **Tailwind CSS**: Already configured with v4 and plugins (@tailwindcss/forms, @tailwindcss/typography)
- **clsx & tailwind-merge**: Utilities for conditional styling

### Components Created

- `src/lib/components/Presentation.svelte`: Main presentation container with navigation
- `src/lib/components/Slide.svelte`: Reusable slide component
- `src/lib/utils.ts`: Utility function for combining CSS classes

### Key Features

- **Responsive Design**: Works on desktop and mobile
- **Keyboard Navigation**: Previous/Next buttons
- **Slide Counter**: Shows current slide position
- **Customizable Content**: Easy to add new slides with HTML content
- **Dark Theme**: Presentation-optimized dark background

## Usage

### Adding New Slides

Edit `src/routes/+page.svelte` and modify the `slideData` array:

```typescript
const slideData = [
	{
		title: 'Your Slide Title',
		content: '<p>Your slide content here</p>'
	}
	// Add more slides...
];
```

### Customizing Styles

The presentation uses Tailwind CSS classes. You can customize:

- Background colors in `Presentation.svelte`
- Text styles in `Slide.svelte`
- Button styles using Bits UI variants

### Navigation

- Use Previous/Next buttons at the bottom
- Buttons are disabled at the beginning/end of the presentation

## File Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── Presentation.svelte    # Main presentation component
│   │   └── Slide.svelte          # Individual slide component
│   └── utils.ts                  # Utility functions
├── routes/
│   ├── +layout.svelte            # Layout with conditional header/footer
│   └── +page.svelte              # Main presentation page
└── app.css                       # Global styles with Tailwind
```

## Development

Run the development server:

```bash
npm run dev
```

The presentation will be available at `http://localhost:5173/` (or next available port).

## Next Steps

- Add more slide types (images, code blocks, etc.)
- Implement keyboard navigation (arrow keys)
- Add slide transitions/animations
- Create a slide editor interface
- Add export functionality (PDF, etc.)

## Bits UI Components

Bits UI provides many additional components you can use:

- Accordions
- Dialogs
- Dropdowns
- Tabs
- And more...

Check the [Bits UI documentation](https://bits-ui.com) for full component list.
