import { dev } from '$app/environment';

export enum LogLevel {
	ERROR = 0,
	WARN = 1,
	INFO = 2,
	DEBUG = 3,
	TRACE = 4
}

export interface LogContext {
	component?: string;
	operation?: string;
	userId?: string;
	requestId?: string;
	duration?: number;
	[key: string]: any;
}

export interface LogEntry {
	level: LogLevel;
	message: string;
	context?: LogContext;
	timestamp: Date;
	error?: Error;
}

class Logger {
	private currentLevel: LogLevel = dev ? LogLevel.DEBUG : LogLevel.INFO;
	private logBuffer: LogEntry[] = [];
	private maxBufferSize = 100;

	/**
	 * Set the current log level
	 */
	setLevel(level: LogLevel): void {
		this.currentLevel = level;
	}

	/**
	 * Get the current log level
	 */
	getLevel(): LogLevel {
		return this.currentLevel;
	}

	/**
	 * Check if a log level should be output
	 */
	shouldLog(level: LogLevel): boolean {
		return level <= this.currentLevel;
	}

	/**
	 * Format log message with context
	 */
	private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
		const levelName = LogLevel[level];
		const timestamp = new Date().toISOString();

		let formatted = `[${timestamp}] ${levelName}: ${message}`;

		if (context) {
			const contextStr = Object.entries(context)
				.filter(([, value]) => value !== undefined && value !== null)
				.map(
					([key, value]) => `${key}=${typeof value === 'object' ? JSON.stringify(value) : value}`
				)
				.join(' ');

			if (contextStr) {
				formatted += ` | ${contextStr}`;
			}
		}

		return formatted;
	}

	/**
	 * Log an entry
	 */
	private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
		if (!this.shouldLog(level)) {
			return;
		}

		const entry: LogEntry = {
			level,
			message,
			context,
			timestamp: new Date(),
			error
		};

		// Add to buffer for potential later retrieval
		this.logBuffer.push(entry);
		if (this.logBuffer.length > this.maxBufferSize) {
			this.logBuffer.shift();
		}

		// Output to console
		const formattedMessage = this.formatMessage(level, message, context);

		switch (level) {
			case LogLevel.ERROR:
				console.error(formattedMessage, error || '');
				break;
			case LogLevel.WARN:
				console.warn(formattedMessage);
				break;
			case LogLevel.INFO:
				console.info(formattedMessage);
				break;
			case LogLevel.DEBUG:
			case LogLevel.TRACE:
				console.debug(formattedMessage);
				break;
		}
	}

	/**
	 * Log an error
	 */
	error(message: string, context?: LogContext, error?: Error): void {
		this.log(LogLevel.ERROR, message, context, error);
	}

	/**
	 * Log a warning
	 */
	warn(message: string, context?: LogContext): void {
		this.log(LogLevel.WARN, message, context);
	}

	/**
	 * Log an info message
	 */
	info(message: string, context?: LogContext): void {
		this.log(LogLevel.INFO, message, context);
	}

	/**
	 * Log a debug message (only in development)
	 */
	debug(message: string, context?: LogContext): void {
		this.log(LogLevel.DEBUG, message, context);
	}

	/**
	 * Log a trace message (only in development)
	 */
	trace(message: string, context?: LogContext): void {
		this.log(LogLevel.TRACE, message, context);
	}

	/**
	 * Log operation start
	 */
	startOperation(operation: string, context?: LogContext): () => void {
		const startTime = Date.now();
		this.debug(`Starting ${operation}`, { ...context, operation });

		return () => {
			const duration = Date.now() - startTime;
			this.debug(`Completed ${operation}`, { ...context, operation, duration });
		};
	}

	/**
	 * Log performance timing
	 */
	time(label: string, context?: LogContext): () => void {
		const startTime = performance.now();
		this.debug(`Timer started: ${label}`, context);

		return () => {
			const duration = performance.now() - startTime;
			this.debug(`Timer ended: ${label}`, { ...context, duration });
		};
	}

	/**
	 * Get recent log entries (useful for debugging)
	 */
	getRecentLogs(count: number = 50): LogEntry[] {
		return this.logBuffer.slice(-count);
	}

	/**
	 * Clear log buffer
	 */
	clearLogs(): void {
		this.logBuffer = [];
	}
}

// Create singleton instance
export const logger = new Logger();

// Convenience functions for common logging patterns
export const logError = (message: string, context?: LogContext, error?: Error) =>
	logger.error(message, context, error);

export const logWarn = (message: string, context?: LogContext) => logger.warn(message, context);

export const logInfo = (message: string, context?: LogContext) => logger.info(message, context);

export const logDebug = (message: string, context?: LogContext) => logger.debug(message, context);

export const logTrace = (message: string, context?: LogContext) => logger.trace(message, context);

// Development-only logging helper
export const devLog = (message: string, context?: LogContext) => {
	if (dev) {
		logger.debug(`[DEV] ${message}`, context);
	}
};

// Production-safe logging that only logs errors and warnings
export const prodLog = {
	error: logError,
	warn: logWarn,
	info: (message: string, context?: LogContext) => {
		// Only log info in production for critical operations
		if (
			context?.operation === 'database_connection' ||
			context?.operation === 'api_initialization'
		) {
			logger.info(message, context);
		}
	}
};
