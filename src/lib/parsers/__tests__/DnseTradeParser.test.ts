import { describe, expect, it, vi, beforeEach } from 'vitest';
import { parseDnseExcel } from '../DnseTradeParser';

vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
  },
}));

import * as XLSX from 'xlsx';

function createMockExcel(rows: string[][]): void {
  const mockWorkbook = { SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } };
  vi.mocked(XLSX.read).mockReturnValue(mockWorkbook as any);
  vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(rows as any);
}

function mockFile(): File {
  return new File(['mock'], 'dnse-trade.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

describe('parseDnseExcel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const topHeader = ['Ngày GD', 'Loại Lệnh', 'Mã', 'Chi tiết giao dịch', '', '', '', '', 'Thuế'];
  const bottomHeader = ['', '', '', 'KHỐI LƯỢNG', 'GIÁ KHỚP', 'GIÁ TRỊ KHỚP', 'PHÍ TRẢ SỐ', 'PHÍ DNSE', ''];

  it('should detect DNSE header and parse rows', async () => {
    createMockExcel([
      topHeader,
      bottomHeader,
      ['15/05/2026', 'MUA', 'HPG', '100', '28500', '28500000', '5000', '0', '0'],
      ['20/05/2026', 'BÁN', 'FPT', '50', '120000', '6000000', '3000', '0', '0'],
    ]);

    const result = await parseDnseExcel(mockFile());
    expect(result.summary.acceptedRows).toBe(2);
    expect(result.summary.rejectedRows).toBe(0);
    expect(result.transactions[0].ticker).toBe('HPG');
    expect(result.transactions[0].type).toBe('BUY');
    expect(result.transactions[0].quantity).toBe(100);
    expect(result.transactions[1].ticker).toBe('FPT');
  });

  it('should reject rows missing ticker', async () => {
    createMockExcel([
      topHeader,
      bottomHeader,
      ['15/05/2026', 'MUA', '', '100', '28500', '2850000', '0', '0', '0'],
    ]);

    const result = await parseDnseExcel(mockFile());
    expect(result.summary.acceptedRows).toBe(0);
    expect(result.summary.rejectedRows).toBe(1);
  });

  it('should skip summary rows', async () => {
    createMockExcel([
      topHeader,
      bottomHeader,
      ['15/05/2026', 'MUA', 'HPG', '100', '28500', '2850000', '0', '0', '0'],
      ['Tổng cộng', '', '', '100', '', '', '', '', ''],
      ['Ngày 31 tháng 05 năm 2026', '', '', '', '', '', '', '', ''],
    ]);

    const result = await parseDnseExcel(mockFile());
    expect(result.summary.acceptedRows).toBe(1);
    expect(result.transactions).toHaveLength(1);
  });

  it('should throw on non-DNSE format', async () => {
    createMockExcel([
      ['Some', 'Random', 'Data'],
      ['1', '2', '3'],
    ]);

    await expect(parseDnseExcel(mockFile())).rejects.toThrow('Không tìm thấy header DNSE');
  });
});
