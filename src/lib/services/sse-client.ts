export interface SSEEvent {
	type: string;
	data: any;
	timestamp: number;
}

export class SSEClient {
	private eventSource: EventSource | null = null;
	private listeners = new Map<string, ((event: SSEEvent) => void)[]>();
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectDelay = 1000;

	connect() {
		if (this.eventSource) {
			this.disconnect();
		}

		try {
			this.eventSource = new EventSource('/api/sse');

			this.eventSource.onopen = () => {
				console.log('🔗 SSE connection established');
				this.reconnectAttempts = 0;
			};

			this.eventSource.onmessage = (event) => {
				try {
					const sseEvent: SSEEvent = JSON.parse(event.data);
					this.emit(sseEvent.type, sseEvent);
				} catch (error) {
					console.error('Failed to parse SSE message:', error);
				}
			};

			this.eventSource.onerror = (error) => {
				console.error('SSE connection error:', error);
				this.handleReconnect();
			};

		} catch (error) {
			console.error('Failed to create SSE connection:', error);
			this.handleReconnect();
		}
	}

	disconnect() {
		if (this.eventSource) {
			this.eventSource.close();
			this.eventSource = null;
			console.log('🔌 SSE connection closed');
		}
	}

	on(eventType: string, callback: (event: SSEEvent) => void) {
		if (!this.listeners.has(eventType)) {
			this.listeners.set(eventType, []);
		}
		this.listeners.get(eventType)!.push(callback);
	}

	off(eventType: string, callback?: (event: SSEEvent) => void) {
		if (!this.listeners.has(eventType)) return;

		if (callback) {
			const callbacks = this.listeners.get(eventType)!;
			const index = callbacks.indexOf(callback);
			if (index > -1) {
				callbacks.splice(index, 1);
			}
		} else {
			this.listeners.delete(eventType);
		}
	}

	private emit(eventType: string, event: SSEEvent) {
		const callbacks = this.listeners.get(eventType);
		if (callbacks) {
			callbacks.forEach(callback => {
				try {
					callback(event);
				} catch (error) {
					console.error('SSE callback error:', error);
				}
			});
		}
	}

	private handleReconnect() {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			console.error('Max SSE reconnection attempts reached');
			return;
		}

		this.reconnectAttempts++;
		const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

		console.log(`🔄 Attempting SSE reconnection in ${delay}ms (attempt ${this.reconnectAttempts})`);

		setTimeout(() => {
			this.connect();
		}, delay);
	}
}

// Global SSE client instance
export const sseClient = new SSEClient();