/**
 * Structured logging utilities for application-wide logging.
 * Provides consistent log format and levels for debugging and monitoring.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = LOG_LEVELS[process.env.NODE_ENV === 'production' ? 'info' : 'debug'];

function formatLogEntry(entry: LogEntry): string {
  const base = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.context}] ${entry.message}`;
  
  if (entry.error) {
    return `${base}\n  Error: ${entry.error.name}: ${entry.error.message}${entry.error.stack ? `\n  Stack: ${entry.error.stack}` : ''}`;
  }
  
  if (entry.data && Object.keys(entry.data).length > 0) {
    return `${base}\n  Data: ${JSON.stringify(entry.data, null, 2)}`;
  }
  
  return base;
}

function createLogEntry(
  level: LogLevel,
  context: string,
  message: string,
  data?: Record<string, unknown>,
  error?: Error
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
    data,
    error: error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined,
  };
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= currentLevel;
}

/**
 * Application logger with structured output.
 */
export const logger = {
  debug(context: string, message: string, data?: Record<string, unknown>): void {
    if (shouldLog('debug')) {
      const entry = createLogEntry('debug', context, message, data);
      console.debug(formatLogEntry(entry));
    }
  },

  info(context: string, message: string, data?: Record<string, unknown>): void {
    if (shouldLog('info')) {
      const entry = createLogEntry('info', context, message, data);
      console.info(formatLogEntry(entry));
    }
  },

  warn(context: string, message: string, data?: Record<string, unknown>): void {
    if (shouldLog('warn')) {
      const entry = createLogEntry('warn', context, message, data);
      console.warn(formatLogEntry(entry));
    }
  },

  error(context: string, error: Error, data?: Record<string, unknown>): void {
    if (shouldLog('error')) {
      const entry = createLogEntry('error', context, error.message, data, error);
      console.error(formatLogEntry(entry));
    }
  },

  /**
   * Create a child logger with additional context.
   */
  withContext(context: string) {
    return {
      debug: (message: string, data?: Record<string, unknown>) =>
        logger.debug(context, message, data),
      info: (message: string, data?: Record<string, unknown>) =>
        logger.info(context, message, data),
      warn: (message: string, data?: Record<string, unknown>) =>
        logger.warn(context, message, data),
      error: (error: Error, data?: Record<string, unknown>) =>
        logger.error(context, error, data),
    };
  },
};

// Pre-configured loggers for common contexts
export const importLogger = logger.withContext('ImportService');
export const transactionLogger = logger.withContext('Transaction');
export const marketLogger = logger.withContext('MarketData');
export const authLogger = logger.withContext('Auth');
export const calculationLogger = logger.withContext('Calculation');

export default logger;
