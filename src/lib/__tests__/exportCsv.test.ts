import { describe, expect, it, vi, beforeEach } from 'vitest';
import { downloadCsv } from '../exportCsv';

describe('downloadCsv', () => {
  let anchor: { href: string; download: string; click: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    anchor = { href: '', download: '', click: vi.fn() };

    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn(),
    });

    vi.stubGlobal('document', {
      createElement: vi.fn(() => anchor),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    } as any);
  });

  it('should create a downloadable CSV with headers and rows', () => {
    downloadCsv('test.csv', ['Ticker', 'Price', 'Qty'], [['HPG', 28500, 100], ['FPT', 120000, 50]]);

    expect(anchor.download).toBe('test.csv');
    expect(anchor.click).toHaveBeenCalledOnce();
  });

  it('should escape double quotes in values', () => {
    downloadCsv('test.csv', ['Name'], [['HPG with "special" chars']]);

    expect(anchor.click).toHaveBeenCalledOnce();
  });

  it('should create blob with BOM and revoke URL', () => {
    downloadCsv('test.csv', ['A'], [[1]]);

    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});
