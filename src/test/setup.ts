import { beforeAll, afterAll } from 'vitest';

beforeAll(() => {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/portfolio_test',
  });
});

afterAll(() => {
  delete process.env.DATABASE_URL;
});
