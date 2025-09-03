// SSE Manager for real-time updates
export interface SSEClient {
	controller: ReadableStreamDefaultController;
	lastActivity: number;
}

export class SSEManager {
	private clients = new Map<string, SSEClient>();

	// Clean up inactive connections every 30 seconds
	private cleanupInterval = setInterval(() => {
		const now = Date.now();
		const timeout = 5 * 60 * 1000; // 5 minutes

		for (const [clientId, client] of this.clients.entries()) {
			if (now - client.lastActivity > timeout) {
				try {
					client.controller.close();
				} catch (error) {
					console.log(`Closed inactive SSE connection: ${clientId}`);
				}
				this.clients.delete(clientId);
			}
		}
	}, 30000);

	addClient(clientId: string, client: SSEClient) {
		this.clients.set(clientId, client);
	}

	removeClient(clientId: string) {
		this.clients.delete(clientId);
	}

	broadcastMessage(type: string, data: any) {
		const message = `data: ${JSON.stringify({ type, data, timestamp: Date.now() })}\n\n`;

		for (const [clientId, client] of this.clients.entries()) {
			try {
				client.controller.enqueue(new TextEncoder().encode(message));
				client.lastActivity = Date.now();
			} catch (error) {
				console.error(`Failed to send message to client ${clientId}:`, error);
				this.clients.delete(clientId);
			}
		}

		console.log(`📡 Broadcasted ${type} to ${this.clients.size} clients`);
	}

	getClientCount(): number {
		return this.clients.size;
	}

	destroy() {
		clearInterval(this.cleanupInterval);
		for (const [clientId, client] of this.clients.entries()) {
			try {
				client.controller.close();
			} catch (error) {
				// Ignore errors during cleanup
			}
		}
		this.clients.clear();
	}
}

// Global SSE manager instance
export const sseManager = new SSEManager();