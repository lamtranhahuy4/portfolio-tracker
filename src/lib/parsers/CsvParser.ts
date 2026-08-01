import Papa from 'papaparse';
import { z } from 'zod';
import { ImportParseResult, ImportWarning, NormalizedTransaction } from '@/types/portfolio';
import {
  buildTransaction,
  getAssetClass,
  parseNumber,
  parseTransactionType,
  parseViDate,
  resolveColumn,
} from './BaseParser';

const csvRowSchema = z.object({
  type: z.enum(['BUY', 'SELL', 'DIVIDEND_CASH', 'DIVIDEND_STOCK', 'DEPOSIT', 'WITHDRAW', 'FEE']),
  ticker: z.string().min(1, 'Thiếu mã tài sản'),
  quantity: z.number().positive('Khối lượng phải lớn hơn 0'),
  price: z.number().positive('Giá giao dịch phải lớn hơn 0'),
  fee: z.number().min(0, 'Phí giao dịch không được âm'),
  tax: z.number().min(0, 'Thuế không được âm'),
  date: z.date({ invalid_type_error: 'Ngày không hợp lệ' }),
  notes: z.string().optional(),
});

export async function parseCsv(file: File): Promise<ImportParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const warnings: ImportWarning[] = [];
        const transactions: NormalizedTransaction[] = [];
        let acceptedRows = 0;
        let rejectedRows = 0;
        let totalRows = 0;

        results.data.forEach((row, index) => {
          totalRows++;
          const rowNumber = index + 2;

          const rawType = resolveColumn(row, ['type', 'side', 'action', 'loai', 'gd']);
          const type = parseTransactionType(rawType);
          const rawTicker = resolveColumn(row, ['asset', 'symbol', 'coin', 'ticker', 'ma']);
          const rawQuantity = resolveColumn(row, ['amount', 'quantity', 'qty', 'sl', 'khoi luong']);
          const rawPrice = resolveColumn(row, ['price', 'cost', 'gia']);
          const rawDate = resolveColumn(row, ['date', 'time', 'ngay', 'thoi gian']);
          const rawFee = resolveColumn(row, ['fee', 'phi']);
          const rawTax = resolveColumn(row, ['tax', 'thue']);
          const rawNotes = resolveColumn(row, ['notes', 'ghi chu']);

          const rawTickerStr = String(rawTicker ?? '').trim();
          const assetClass = type ? getAssetClass(type, rawTickerStr) : undefined;
          
          const parsedData = {
            type,
            ticker: assetClass === 'CASH' ? 'CASH_VND' : rawTickerStr,
            quantity: parseNumber(rawQuantity),
            price: assetClass === 'CASH' ? 1 : parseNumber(rawPrice),
            fee: Number.isNaN(parseNumber(rawFee)) ? 0 : parseNumber(rawFee),
            tax: Number.isNaN(parseNumber(rawTax)) ? 0 : parseNumber(rawTax),
            date: parseViDate(rawDate),
            notes: rawNotes ? String(rawNotes) : undefined,
          };

          const validation = csvRowSchema.safeParse(parsedData);
          if (!validation.success) {
            const errorMessages = validation.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
            warnings.push({
              row: rowNumber,
              message: `Lỗi dữ liệu: ${errorMessages}`,
              rawType: String(rawType ?? ''),
              rawTicker: String(rawTicker ?? ''),
              rawQuantity: String(rawQuantity ?? ''),
              rawPrice: String(rawPrice ?? ''),
              rawDate: String(rawDate ?? ''),
            });
            rejectedRows++;
            return;
          }

          transactions.push(buildTransaction({
            row: rowNumber,
            ticker: validation.data.ticker,
            type: validation.data.type,
            quantity: validation.data.quantity,
            price: validation.data.price,
            fee: validation.data.fee,
            tax: validation.data.tax,
            date: validation.data.date,
            notes: validation.data.notes,
            source: 'csv',
          }));
          acceptedRows++;
        });

        resolve({
          transactions, warnings,
          summary: { fileName: file.name, source: 'csv', totalRows, acceptedRows, rejectedRows },
        });
      },
      error: (error) => reject(error),
    });
  });
}
