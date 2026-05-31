import { describe, expect, it, vi } from 'vitest';
import { parseCsv } from '../CsvParser';

const mockParse = vi.hoisted(() => vi.fn());

vi.mock('papaparse', () => ({
  default: {
    parse: mockParse,
  },
  __esModule: true,
}));

function setupMockData(data: Record<string, unknown>[]) {
  mockParse.mockImplementation((_file: File, config: any) => {
    config.complete({ data, errors: [], meta: { fields: Object.keys(data[0] ?? {}) } });
  });
}

describe('parseCsv', () => {
  it('should parse valid CSV with headers', async () => {
    setupMockData([
      { type: 'BUY', ticker: 'HPG', quantity: '100', price: '28500', date: '15/05/2026', fee: '5000', tax: '0' },
      { type: 'SELL', ticker: 'HPG', quantity: '50', price: '30000', date: '20/05/2026', fee: '3000', tax: '0' },
    ]);

    const result = await parseCsv(new File([''], 'test.csv', { type: 'text/csv' }));
    expect(result.transactions).toHaveLength(2);
    expect(result.summary.acceptedRows).toBe(2);
    expect(result.summary.rejectedRows).toBe(0);
    expect(result.transactions[0].ticker).toBe('HPG');
    expect(result.transactions[0].type).toBe('BUY');
    expect(result.transactions[0].quantity).toBe(100);
  });

  it('should reject rows missing ticker', async () => {
    setupMockData([
      { type: 'BUY', ticker: '', quantity: '100', price: '28500', date: '15/05/2026', fee: '0', tax: '0' },
    ]);

    const result = await parseCsv(new File([''], 'test.csv', { type: 'text/csv' }));
    expect(result.summary.acceptedRows).toBe(0);
    expect(result.summary.rejectedRows).toBe(1);
    expect(result.warnings).toHaveLength(1);
  });

  it('should handle invalid quantity', async () => {
    setupMockData([
      { type: 'BUY', ticker: 'HPG', quantity: 'abc', price: '28500', date: '15/05/2026', fee: '0', tax: '0' },
    ]);

    const result = await parseCsv(new File([''], 'test.csv', { type: 'text/csv' }));
    expect(result.summary.acceptedRows).toBe(0);
    expect(result.summary.rejectedRows).toBe(1);
  });

  it('should handle empty result set', async () => {
    setupMockData([]);

    const result = await parseCsv(new File([''], 'test.csv', { type: 'text/csv' }));
    expect(result.summary.totalRows).toBe(0);
    expect(result.summary.acceptedRows).toBe(0);
  });

  it('should handle VN date format dd/mm/yyyy', async () => {
    setupMockData([
      { type: 'BUY', ticker: 'FPT', quantity: '200', price: '120000', date: '01/06/2026', fee: '0', tax: '0' },
    ]);

    const result = await parseCsv(new File([''], 'test.csv', { type: 'text/csv' }));
    expect(result.summary.acceptedRows).toBe(1);
    const tx = result.transactions[0];
    expect(tx.date.getDate()).toBe(1);
    expect(tx.date.getMonth()).toBe(5);
    expect(tx.date.getFullYear()).toBe(2026);
  });

  it('should handle VN column names', async () => {
    setupMockData([
      { loai: 'MUA', ma: 'FPT', sl: '100', gia: '115000', ngay: '10/05/2026' },
    ]);

    const result = await parseCsv(new File([''], 'test.csv', { type: 'text/csv' }));
    expect(result.summary.acceptedRows).toBe(1);
    expect(result.transactions[0].ticker).toBe('FPT');
    expect(result.transactions[0].type).toBe('BUY');
  });

  it('should accept CASH deposits', async () => {
    setupMockData([
      { type: 'DEPOSIT', asset: 'CASH_VND', quantity: '10000000', price: '1', date: '10/05/2026' },
    ]);

    const result = await parseCsv(new File([''], 'test.csv', { type: 'text/csv' }));
    expect(result.summary.acceptedRows).toBe(1);
    expect(result.transactions[0].type).toBe('DEPOSIT');
    expect(result.transactions[0].quantity).toBe(10000000);
  });
});
