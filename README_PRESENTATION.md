# Interactive Slide Presentation System

A modern, real-time presentation system built with SvelteKit, Bits UI, and Tailwind CSS. Features QR code-based participant joining and interactive elements.

## 🚀 Features

- **Slide-based presentations** with clean, modern UI
- **QR code generation** for each slide (participants scan to join)
- **Real-time participant interaction** (planned)
- **Presenter dashboard** for slide management
- **Keyboard navigation** (arrow keys, spacebar, Home/End)
- **Responsive design** works on all devices
- **Built with modern web technologies**

## 📱 How to Use

### For Presenters

1. **Start the presentation**: Open `http://localhost:5176/` in your browser
2. **Navigate slides**: Use arrow keys, spacebar, or on-screen buttons
3. **Share with participants**: Each slide shows a QR code they can scan
4. **Manage slides**: Click "📊 Dashboard" to edit slides and view notes
5. **Keyboard shortcuts**:
   - `←/→` or `↑/↓`: Navigate slides
   - `Space`: Next slide
   - `Home`: First slide
   - `End`: Last slide
   - `Ctrl/Cmd + D`: Toggle dashboard

### For Participants

1. **Join the presentation**: Scan the QR code on any slide
2. **Enter your name**: Fill in the join form
3. **Follow along**: Slides update automatically as the presenter advances
4. **Interact**: Some slides have interactive elements for feedback

## 🛠️ Technical Stack

- **Framework**: SvelteKit 2.x
- **UI Components**: Bits UI
- **Styling**: Tailwind CSS 4.x
- **QR Codes**: qrcode library
- **Language**: TypeScript

## 🚀 Getting Started

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Start development server**:

   ```bash
   npm run dev
   ```

3. **Open in browser**:
   - Presenter view: `http://localhost:5176/`
   - Participant view: `http://localhost:5176/participant?slide=0`

## 📁 Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── Presentation.svelte    # Main presentation component
│   │   ├── PresenterDashboard.svelte # Dashboard for slide management
│   │   └── Slide.svelte          # Individual slide component
│   └── utils.ts                  # Utility functions
├── routes/
│   ├── +page.svelte             # Main presenter view
│   ├── +page.ts                 # Handle URL parameters
│   └── participant/
│       └── +page.svelte         # Participant view
```

## 🎨 Customization

### Adding New Slides

Edit the `slides` array in `src/routes/+page.svelte`:

```javascript
let slides = $state([
	{
		title: 'Your Slide Title',
		content: '<p>Your slide content in HTML</p>',
		notes: 'Presenter notes for this slide'
	}
]);
```

### Styling

The system uses Tailwind CSS classes. Customize colors and styles by modifying the class names in the components.

### Interactive Elements

Add interactive features by modifying the slide content or adding conditional rendering based on the `interactive` property.

## 🔄 Real-time Features (Planned)

- **WebSocket connections** for instant slide synchronization
- **Live participant count** display
- **Real-time feedback** collection and display
- **Presenter controls** for participant interactions

## 📊 Analytics (Planned)

- **Participant engagement** tracking
- **Slide view duration** analytics
- **Interaction metrics** and reporting
- **Export capabilities** for presentation data

## 🤝 Contributing

This is a simplified version focused on core presentation functionality. Future enhancements could include:

- Real-time synchronization
- Advanced slide editing
- Theme customization
- Export to PDF/PPT
- Integration with external services

## 📄 License

This project is part of the z-interact application suite.
