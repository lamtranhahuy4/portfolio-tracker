import { describe, expect, it, beforeEach, vi } from 'vitest';

const mockExecute = vi.fn().mockResolvedValue({ rows: [{ '1': 1 }] });

vi.mock('@/db/index', () => ({
  db: {
    execute: mockExecute,
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Health Check API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockResolvedValue({ rows: [{ '1': 1 }] });
  });

  describe('GET /api/health', () => {
    it('should return healthy status when database is accessible', async () => {
      const { GET } = await import('@/app/api/health/route');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.checks.database.status).toBe('pass');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('uptime');
    });

    it('should include proper response headers', async () => {
      const { GET } = await import('@/app/api/health/route');
      const response = await GET();

      expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0');
      expect(response.headers.get('X-Health-Status')).toBe('healthy');
    });

    it('should return degraded status when database latency is high', async () => {
      mockExecute.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1100));
        return { rows: [{ '1': 1 }] };
      });

      const { GET } = await import('@/app/api/health/route');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('degraded');
      expect(data.checks.database.latency).toBeGreaterThan(1000);
    });

    it('should return unhealthy status when database fails', async () => {
      mockExecute.mockRejectedValue(new Error('Connection refused'));

      const { GET } = await import('@/app/api/health/route');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.checks.database.status).toBe('fail');
      expect(data.checks.database.error).toBe('Connection refused');
    });
  });
});
