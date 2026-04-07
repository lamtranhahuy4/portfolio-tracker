/**
 * Structured logging utilities using Pino.
 * Provides consistent log format for development and production.
 */

import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

const pinoConfig: pino.LoggerOptions = {
  level: isDevelopment ? 'debug' : (process.env.LOG_LEVEL || 'info'),
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'portfolio-tracker',
    env: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  },
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
};

export const logger = pino(pinoConfig);

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function createChildLogger(context: string, extra: Record<string, unknown> = {}) {
  return logger.child({ context, ...extra });
}

export const importLogger = createChildLogger('ImportService');
export const transactionLogger = createChildLogger('Transaction');
export const marketLogger = createChildLogger('MarketData');
export const authLogger = createChildLogger('Auth');
export const calculationLogger = createChildLogger('Calculation');
export const apiLogger = createChildLogger('API');
export const dbLogger = createChildLogger('Database');

export default logger;
