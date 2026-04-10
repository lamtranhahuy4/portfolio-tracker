import { describe, expect, it } from 'vitest';
import { AppError, withErrorHandler, createError } from '../errorHandler';

describe('errorHandler', () => {
  describe('AppError', () => {
    it('should create error with message, code, and status', () => {
      const error = new AppError('Test error', 'TEST_CODE', 400);
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('AppError');
    });

    it('should default statusCode to 500', () => {
      const error = new AppError('Test error', 'TEST_CODE');
      expect(error.statusCode).toBe(500);
    });

    it('should maintain prototype chain', () => {
      const error = new AppError('Test', 'TEST');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
    });

    it('should capture stack trace', () => {
      const error = new AppError('Test', 'TEST');
      expect(error.stack).toBeDefined();
    });
  });

  describe('withErrorHandler', () => {
    it('should re-throw AppError instances unchanged', async () => {
      const appError = new AppError('Bad request', 'BAD_REQUEST', 400);
      const handler = withErrorHandler(async () => {
        throw appError;
      });

      await expect(handler()).rejects.toThrow(appError);
      await expect(handler()).rejects.toMatchObject({
        message: 'Bad request',
        code: 'BAD_REQUEST',
        statusCode: 400,
      });
    });

    it('should wrap unknown errors as INTERNAL_ERROR', async () => {
      const handler = withErrorHandler(async () => {
        throw new Error('Unknown error');
      });

      await expect(handler()).rejects.toMatchObject({
        code: 'INTERNAL_ERROR',
        statusCode: 500,
      });
    });

    it('should preserve AppError properties when wrapping unknown errors', async () => {
      const handler = withErrorHandler(async () => {
        throw new Error('Unknown');
      });

      try {
        await handler();
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).message).toBe('Đã xảy ra lỗi hệ thống. Vui lòng thử lại.');
      }
    });

    it('should call the wrapped function successfully', async () => {
      const handler = withErrorHandler(async (value: number) => {
        return value * 2;
      });

      const result = await handler(5);
      expect(result).toBe(10);
    });

    it('should pass arguments to wrapped function', async () => {
      const handler = withErrorHandler(async (a: number, b: number) => {
        return a + b;
      });

      const result = await handler(3, 7);
      expect(result).toBe(10);
    });

    it('should handle async errors in server actions', async () => {
      const handler = withErrorHandler(async () => {
        await new Promise((_, reject) => setTimeout(() => reject(new Error('Async error')), 10));
      });

      await expect(handler()).rejects.toMatchObject({
        code: 'INTERNAL_ERROR',
      });
    });

    it('should return correct value type', async () => {
      const handler = withErrorHandler(async () => {
        return { success: true, data: [1, 2, 3] };
      });

      const result = await handler();
      expect(result).toEqual({ success: true, data: [1, 2, 3] });
    });
  });

  describe('createError factory', () => {
    it('should create badRequest errors', () => {
      const error = createError.badRequest('Invalid input');
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.message).toBe('Invalid input');
    });

    it('should create badRequest errors with custom code', () => {
      const error = createError.badRequest('Missing field', 'MISSING_FIELD');
      expect(error.code).toBe('MISSING_FIELD');
    });

    it('should create unauthorized errors', () => {
      const error = createError.unauthorized('Not logged in');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should create notFound errors', () => {
      const error = createError.notFound('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should create internal errors', () => {
      const error = createError.internal('Server error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
    });

    it('should allow custom code for all error types', () => {
      const error1 = createError.badRequest('msg', 'CUSTOM_BAD');
      const error2 = createError.unauthorized('msg', 'CUSTOM_AUTH');
      const error3 = createError.notFound('msg', 'CUSTOM_NOT_FOUND');
      const error4 = createError.internal('msg', 'CUSTOM_INTERNAL');

      expect(error1.code).toBe('CUSTOM_BAD');
      expect(error2.code).toBe('CUSTOM_AUTH');
      expect(error3.code).toBe('CUSTOM_NOT_FOUND');
      expect(error4.code).toBe('CUSTOM_INTERNAL');
    });
  });
});
