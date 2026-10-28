import { authLogger } from '@/lib/logger';

/**
 * Transactional email via the Resend HTTP API (plain fetch, no SDK).
 * Requires RESEND_API_KEY and EMAIL_FROM (a sender on a domain verified in Resend).
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const SEND_TIMEOUT_MS = 8000;

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return false;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [message.to], subject: message.subject, html: message.html, text: message.text }),
      signal: controller.signal,
    });

    if (!response.ok) {
      authLogger.error({ status: response.status, body: (await response.text()).slice(0, 300) }, 'Email delivery failed');
      return false;
    }
    return true;
  } catch (error) {
    authLogger.error({ err: error instanceof Error ? error.message : String(error) }, 'Email delivery error');
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildPasswordResetEmail(to: string, resetUrl: string, ttlMinutes: number): EmailMessage {
  const safeUrl = escapeHtml(resetUrl);
  return {
    to,
    subject: 'Đặt lại mật khẩu Portfolio Tracker',
    text: [
      'Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản Portfolio Tracker.',
      `Mở liên kết sau trong ${ttlMinutes} phút để đặt mật khẩu mới:`,
      resetUrl,
      '',
      'Nếu bạn không yêu cầu, hãy bỏ qua email này — mật khẩu hiện tại vẫn giữ nguyên.',
    ].join('\n'),
    html: `
      <p>Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản Portfolio Tracker.</p>
      <p>Liên kết có hiệu lực trong ${ttlMinutes} phút:</p>
      <p><a href="${safeUrl}">Đặt lại mật khẩu</a></p>
      <p style="color:#64748b;font-size:12px">Nếu bạn không yêu cầu, hãy bỏ qua email này — mật khẩu hiện tại vẫn giữ nguyên.</p>
    `,
  };
}
