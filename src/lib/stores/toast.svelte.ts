type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
	id: string;
	message: string;
	type: ToastType;
	duration?: number;
}

class ToastStore {
	private toasts = $state<Toast[]>([]);

	get all() {
		return this.toasts;
	}

	show(message: string, type: ToastType = 'info', duration = 3000) {
		const id = Math.random().toString(36).substring(2, 11);
		const toast: Toast = { id, message, type, duration };

		this.toasts = [...this.toasts, toast];

		if (duration > 0) {
			setTimeout(() => {
				this.remove(id);
			}, duration);
		}

		return id;
	}

	success(message: string, duration?: number) {
		return this.show(message, 'success', duration);
	}

	error(message: string, duration?: number) {
		return this.show(message, 'error', duration);
	}

	info(message: string, duration?: number) {
		return this.show(message, 'info', duration);
	}

	warning(message: string, duration?: number) {
		return this.show(message, 'warning', duration);
	}

	remove(id: string) {
		this.toasts = this.toasts.filter((t) => t.id !== id);
	}

	clear() {
		this.toasts = [];
	}
}

// Singleton instance
export const toastStore = new ToastStore();
