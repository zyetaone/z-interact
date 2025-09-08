import { browser } from '$app/environment';

type Theme = 'light' | 'dark' | 'system';

class ThemeStore {
	private theme = $state<Theme>('system');

	constructor() {
		// Initialize theme from localStorage or default to system
		if (browser) {
			const stored = localStorage.getItem('theme') as Theme;
			this.theme = stored || 'system';
			this.applyTheme();

			// Listen for system theme changes
			const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
			mediaQuery.addEventListener('change', () => {
				if (this.theme === 'system') {
					this.applyTheme();
				}
			});
		}
	}

	get current() {
		return this.theme;
	}

	get isDark() {
		if (!browser) return false;

		if (this.theme === 'dark') return true;
		if (this.theme === 'light') return false;

		// System preference
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	}

	setTheme(newTheme: Theme) {
		this.theme = newTheme;

		if (browser) {
			if (newTheme === 'system') {
				localStorage.removeItem('theme');
			} else {
				localStorage.setItem('theme', newTheme);
			}
			this.applyTheme();
		}
	}

	toggleTheme() {
		const currentEffective = this.isDark ? 'dark' : 'light';
		this.setTheme(currentEffective === 'dark' ? 'light' : 'dark');
	}

	private applyTheme() {
		if (!browser) return;

		const shouldBeDark = this.isDark;
		document.documentElement.classList.toggle('dark', shouldBeDark);
	}
}

// Factory function for creating new store instances
export function createThemeStore() {
	return new ThemeStore();
}

// Singleton instance for backward compatibility
export const themeStore = new ThemeStore();
