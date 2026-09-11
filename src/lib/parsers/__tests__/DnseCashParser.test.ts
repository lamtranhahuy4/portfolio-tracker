import { describe, it, expect } from 'vitest';
import { parseDnseCashRows } from '../DnseCashParser';

describe('DnseCashParser', () => {
  it('parses valid DNSE cash rows correctly', () => {
    const rows = [
      ['Ngày giao dịch', 'Mô tả', 'Phát sinh', '', 'Số dư cuối'],
      ['', '', 'Tăng', 'Giảm', ''],
      ['01/01/2026', 'Nộp tiền vào tài khoản', '10000000', '', '10000000'],
      ['02/01/2026', 'Rút tiền', '', '5000000', '5000000'],
      ['03/01/2026', 'Lãi tiền gửi', '50000', '', '5050000'],
    ];

    const result = parseDnseCashRows(rows);
    expect(result.events).toHaveLength(3);
    
    const deposit = result.events[0];
    expect(deposit.eventType).toBe('DEPOSIT');
    expect(deposit.direction).toBe('INFLOW');
    expect(deposit.amount).toBe(10000000);

    const withdraw = result.events[1];
    expect(withdraw.eventType).toBe('WITHDRAW');
    expect(withdraw.direction).toBe('OUTFLOW');
    expect(withdraw.amount).toBe(5000000);

    const interest = result.events[2];
    expect(interest.eventType).toBe('INTEREST');
    expect(interest.direction).toBe('INFLOW');
    expect(interest.amount).toBe(50000);
  });

  it('extracts trade metadata (ticker, quantity, date)', () => {
    const rows = [
      ['Ngày giao dịch', 'Mô tả', 'Phát sinh', '', 'Số dư cuối'],
      ['', '', 'Tăng', 'Giảm', ''],
      ['05/01/2026', 'Thu phí mua 100 SSI ngay 05/01/2026', '', '15000', '5035000'],
    ];

    const result = parseDnseCashRows(rows);
    expect(result.events).toHaveLength(1);
    
    const tradeFee = result.events[0];
    expect(tradeFee.eventType).toBe('TRADE_FEE');
    expect(tradeFee.referenceTicker).toBe('SSI');
    expect(tradeFee.referenceQuantity).toBe(100);
    expect(tradeFee.referenceTradeDate?.toISOString().startsWith('2026-01-05')).toBe(true);
  });

  it('validates missing required fields by throwing error', () => {
    const invalidRows = [
      ['Cột 1', 'Cột 2', 'Cột 3'],
      ['Data 1', 'Data 2', 'Data 3']
    ];

    expect(() => parseDnseCashRows(invalidRows)).toThrow('Không tìm thấy header');
  });
});
