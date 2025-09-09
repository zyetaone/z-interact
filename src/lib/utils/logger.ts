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
	[key: string]: any;
}

class Logger {
	private currentLevel: LogLevel = dev ? LogLevel.DEBUG : LogLevel.INFO;

	shouldLog(level: LogLevel): boolean {
		return level <= this.currentLevel;
	}

	private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
		const levelStr = LogLevel[level];
		const timestamp = new Date().toISOString();
		const contextStr = context ? ` ${JSON.stringify(context)}` : '';
		return `[${timestamp}] ${levelStr}: ${message}${contextStr}`;
	}

	private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
		if (!this.shouldLog(level)) {
			return;
		}

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

	error(message: string, context?: LogContext, error?: Error): void {
		this.log(LogLevel.ERROR, message, context, error);
	}

	warn(message: string, context?: LogContext, error?: Error): void {
		this.log(LogLevel.WARN, message, context, error);
	}

	info(message: string, context?: LogContext): void {
		this.log(LogLevel.INFO, message, context);
	}

	debug(message: string, context?: LogContext): void {
		this.log(LogLevel.DEBUG, message, context);
	}

	trace(message: string, context?: LogContext): void {
		this.log(LogLevel.TRACE, message, context);
	}
}

// Create singleton instance
export const logger = new Logger();

// Development-only logging helper
export const devLog = (message: string, context?: LogContext) => {
	if (dev) {
		logger.debug(`[DEV] ${message}`, context);
	}
};
