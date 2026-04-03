import Papa from 'papaparse';
import { ImportParseResult, ImportWarning, NormalizedTransaction } from '@/types/portfolio';
import {
  buildTransaction,
  getAssetClass,
  parseNumber,
  parseTransactionType,
  parseViDate,
  resolveColumn,
} from './BaseParser';

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

          const pushWarning = (msg: string) => {
            warnings.push({
              row: rowNumber,
              message: msg,
              rawType: String(rawType ?? ''),
              rawTicker: String(rawTicker ?? ''),
              rawQuantity: String(rawQuantity ?? ''),
              rawPrice: String(rawPrice ?? ''),
              rawDate: String(rawDate ?? ''),
            });
            rejectedRows++;
          };

          if (!type) { pushWarning('Không nhận diện được loại giao dịch.'); return; }

          const assetClass = getAssetClass(type);
          const ticker = assetClass === 'CASH' ? 'CASH_VND' : String(rawTicker ?? '').trim();
          const quantity = parseNumber(rawQuantity);
          const price = assetClass === 'CASH' ? 1 : parseNumber(rawPrice);
          const fee = Number.isNaN(parseNumber(rawFee)) ? 0 : parseNumber(rawFee);
          const tax = Number.isNaN(parseNumber(rawTax)) ? 0 : parseNumber(rawTax);
          const date = parseViDate(rawDate) ?? new Date();

          if (!ticker) { pushWarning('Thiếu mã tài sản.'); return; }
          if (Number.isNaN(quantity) || quantity <= 0) { pushWarning('Khối lượng hoặc số tiền không hợp lệ.'); return; }
          if (Number.isNaN(price) || price <= 0) { pushWarning('Giá giao dịch không hợp lệ.'); return; }

          transactions.push(buildTransaction({
            row: rowNumber, ticker, type, quantity, price, fee, tax, date,
            notes: rawNotes ? String(rawNotes) : undefined,
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
