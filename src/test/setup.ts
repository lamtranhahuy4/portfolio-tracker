import { beforeAll, afterAll, vi } from 'vitest';

beforeAll(() => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('DATABASE_URL', process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/portfolio_test');
});

afterAll(() => {
  vi.unstubAllEnvs();
});
