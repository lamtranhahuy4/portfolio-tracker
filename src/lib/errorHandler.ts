/**
 * Application-level error class with structured metadata.
 * Use this instead of plain `Error` in Server Actions and service layers
 * so that callers can distinguish expected (client-facing) errors from
 * unexpected internal failures.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number = 500) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

async function captureError(error: unknown, context?: Record<string, unknown>): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    try {
      const Sentry = await import('@sentry/nextjs');
      Sentry.captureException(error, { extra: context });
    } catch {
      console.error('[Error Handler] Failed to capture error in Sentry:', error);
    }
  }
}

/**
 * Wraps an async Server Action (or any async function) with standardized
 * error handling. Known `AppError` instances are re-thrown as-is; unknown
 * errors are logged and converted to a generic `AppError` so the call-site
 * always receives a typed error.
 */
export function withErrorHandler<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      captureError(error, { args: args.map(a => typeof a === 'object' ? JSON.stringify(a)?.slice(0, 200) : a) });
      
      console.error('[withErrorHandler] Unhandled error:', error);
      throw new AppError(
        'Đã xảy ra lỗi hệ thống. Vui lòng thử lại.',
        'INTERNAL_ERROR',
        500
      );
    }
  };
}

/**
 * Convenience factory for creating domain-specific errors with a common
 * HTTP status code so callers don't need to repeat the status inline.
 */
export const createError = {
  badRequest: (message: string, code = 'BAD_REQUEST') =>
    new AppError(message, code, 400),
  unauthorized: (message: string, code = 'UNAUTHORIZED') =>
    new AppError(message, code, 401),
  notFound: (message: string, code = 'NOT_FOUND') =>
    new AppError(message, code, 404),
  internal: (message: string, code = 'INTERNAL_ERROR') =>
    new AppError(message, code, 500),
};
