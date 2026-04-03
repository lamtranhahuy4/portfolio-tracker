import { describe, expect, it } from 'vitest';
import { parseDnseCashRows } from '../importParser';

describe('Import Parser - parseDnseCashRows', () => {
  it('map đúng eventType, amount và balanceAfter từ 2D Array thô của DNSE', () => {
    // Mock mảng 2 chiều theo cấu trúc DNSE Cash Excel (Sao kê tiền)
    const mockDnseRows = [
      // 2 Dòng header
      ['Ngày GD', 'Diễn giải giao dịch', 'Phát sinh', '', 'Số dư tiền'],
      ['', '', 'Tăng', 'Giảm', ''],
      // Dòng 1: Nộp tiền
      ['01/01/2023', 'Nộp tiền vào tài khoản', '1000000', '', '1000000'],
      // Dòng 2: Mua cổ phiếu (Trừ tiền)
      ['02/01/2023', 'Trả tiền mua 100 HPG', '', '200000', '800000'],
      // Dòng 3: Trả phí mua
      ['02/01/2023', 'Thu phí mua 100 HPG', '', '2000', '798000'],
      // Dòng 4: Cổ tức tiền mặt
      ['03/01/2023', 'Cổ tức bằng tiền mặt', '50000', '', '848000']
    ];

    const result = parseDnseCashRows(mockDnseRows);

    expect(result.events).toHaveLength(4);

    // Kiểm tra dòng Nộp tiền
    expect(result.events[0].eventType).toBe('DEPOSIT');
    expect(result.events[0].amount).toBe(1000000);
    expect(result.events[0].direction).toBe('INFLOW');

    // Kiểm tra dòng Mua cổ phiếu
    expect(result.events[1].eventType).toBe('TRADE_SETTLEMENT_BUY');
    expect(result.events[1].amount).toBe(200000);
    expect(result.events[1].direction).toBe('OUTFLOW');
    // Regex lấy thông tin reference
    expect(result.events[1].referenceQuantity).toBe(100);
    expect(result.events[1].referenceTicker).toBe('HPG');

    // Kiểm tra dòng Phí mua
    expect(result.events[2].eventType).toBe('TRADE_FEE');
    expect(result.events[2].amount).toBe(2000);

    // Kiểm tra dòng Cổ tức
    expect(result.events[3].eventType).toBe('DIVIDEND_CASH');
    expect(result.events[3].amount).toBe(50000);
  });

  it('throw Error (hoặc trả về lỗi) khi mảng thiếu cột bắt buộc', () => {
    // Mảng chỉ có ngày và diễn giải, không có cột Phân sinh tăng/giảm và số dư
    const badRows = [
      ['Ngày GD', 'Diễn giải giao dịch'],
      ['01/01/2023', 'Nộp tiền']
    ];

    // parseDnseCashRows sẽ ném lỗi khi không tìm thấy header hợp lệ
    expect(() => parseDnseCashRows(badRows)).toThrowError(/Không tìm thấy header/i);
  });
});
