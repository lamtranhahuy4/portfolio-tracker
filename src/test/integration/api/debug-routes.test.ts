import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetCurrentUser = vi.fn();
const mockHashValue = vi.fn().mockReturnValue('a'.repeat(64));
const mockDbSelect = vi.fn();

vi.mock('@/lib/auth', () => ({
  getCurrentUser: mockGetCurrentUser,
  hashValue: mockHashValue,
}));

vi.mock('@/db/index', () => ({
  db: {
    select: mockDbSelect,
  },
}));

describe('Debug routes access control', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should block check-env route in production by default', async () => {
    Object.assign(process.env, { NODE_ENV: 'production' });
    delete process.env.ENABLE_DEBUG_ROUTES;
    process.env.ADMIN_SECRET = 'admin-secret';

    const { GET } = await import('@/app/api/check-env/route');
    const request = new Request('http://localhost:3000/api/check-env', {
      method: 'GET',
    });

    const response = await GET(request);

    expect(response.status).toBe(404);
  });

  it('should allow check-env route only with debug flag and valid admin secret in production', async () => {
    Object.assign(process.env, {
      NODE_ENV: 'production',
      ENABLE_DEBUG_ROUTES: 'true',
      ADMIN_SECRET: 'admin-secret',
      AUTH_SECRET: 'very-secret',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
    });

    const { GET } = await import('@/app/api/check-env/route');
    const request = new Request('http://localhost:3000/api/check-env', {
      method: 'GET',
      headers: {
        authorization: 'Bearer admin-secret',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasAuthSecret).toBe(true);
    expect(data.hasAdminSecret).toBe(true);
    expect(data.hasDatabaseUrl).toBe(true);
    expect(data.debugRoutesEnabled).toBe(true);
    expect(data).not.toHaveProperty('authSecretPrefix');
  });

  it('should block debug-session route in production by default', async () => {
    Object.assign(process.env, { NODE_ENV: 'production' });
    delete process.env.ENABLE_DEBUG_ROUTES;
    process.env.ADMIN_SECRET = 'admin-secret';

    const { GET } = await import('@/app/api/debug-session/route');
    const request = new Request('http://localhost:3000/api/debug-session', {
      method: 'GET',
    });

    const response = await GET(request);

    expect(response.status).toBe(404);
    expect(mockDbSelect).not.toHaveBeenCalled();
  });

  it('should allow debug-session route with sanitized payload in production when authorized', async () => {
    Object.assign(process.env, {
      NODE_ENV: 'production',
      ENABLE_DEBUG_ROUTES: 'true',
      ADMIN_SECRET: 'admin-secret',
      AUTH_SECRET: 'very-secret',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
    });

    mockGetCurrentUser.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });

    mockDbSelect
      .mockImplementationOnce(() => ({
        from: vi.fn().mockResolvedValue([{ count: 2 }]),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'session-1',
                userId: 'user-1',
                tokenHash: 'hash',
                expiresAt: new Date(),
              },
            ]),
          })),
        })),
      }));

    const { GET } = await import('@/app/api/debug-session/route');
    const request = new Request('http://localhost:3000/api/debug-session', {
      method: 'GET',
      headers: {
        authorization: 'Bearer admin-secret',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.currentUserAuthenticated).toBe(true);
    expect(data.activeSessionSampleCount).toBe(1);
    expect(data).not.toHaveProperty('currentUser');
    expect(data).not.toHaveProperty('sampleSessions');
    expect(data.env).not.toHaveProperty('authSecretPrefix');
  });

  it('should return only login state from session-check route', async () => {
    Object.assign(process.env, { NODE_ENV: 'test' });
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });

    const { GET } = await import('@/app/api/session-check/route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isLoggedIn).toBe(true);
    expect(data).not.toHaveProperty('userEmail');
    expect(data).not.toHaveProperty('userId');
  });
});
