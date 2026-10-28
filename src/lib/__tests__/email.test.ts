import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPasswordResetEmail, isEmailDeliveryConfigured, sendEmail } from '../email';

vi.mock('@/lib/logger', () => ({
  authLogger: { error: vi.fn() },
}));

const message = { to: 'user@example.com', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' };

describe('email', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('EMAIL_FROM', 'Portfolio <no-reply@example.com>');
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('is not configured without API key or sender', () => {
    vi.stubEnv('RESEND_API_KEY', '');
    expect(isEmailDeliveryConfigured()).toBe(false);
  });

  it('posts to Resend and reports success', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));

    await expect(sendEmail(message)).resolves.toBe(true);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer re_test');
    expect(JSON.parse(init.body)).toMatchObject({ to: ['user@example.com'], subject: 'Hi' });
  });

  it('returns false when the provider rejects the request', async () => {
    fetchMock.mockResolvedValue(new Response('bad sender', { status: 422 }));
    await expect(sendEmail(message)).resolves.toBe(false);
  });

  it('skips the network call when not configured', async () => {
    vi.stubEnv('EMAIL_FROM', '');
    await expect(sendEmail(message)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('escapes the reset URL in the HTML body', () => {
    const email = buildPasswordResetEmail('user@example.com', 'https://app.test/reset?token=a&email=b"', 60);
    expect(email.html).toContain('token=a&amp;email=b&quot;');
    expect(email.text).toContain('https://app.test/reset?token=a&email=b"');
  });
});
