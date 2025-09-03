// SSE Manager for real-time updates (Cloudflare Workers compatible)
export interface SSEClient {
	controller: ReadableStreamDefaultController;
	lastActivity: number;
}

export class SSEManager {
	private clients = new Map<string, SSEClient>();

	// Note: No setInterval cleanup for Cloudflare Workers compatibility
	// Workers are stateless and don't support long-running timers

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
		// Clean up all active connections
		for (const [clientId, client] of this.clients.entries()) {
			try {
				client.controller.close();
			} catch (error) {
				// Ignore errors during cleanup
			}
		}
		this.clients.clear();
	}

	// Manual cleanup method for inactive clients (called when needed)
	cleanupInactiveClients() {
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
	}
}

// Global SSE manager instance
export const sseManager = new SSEManager();