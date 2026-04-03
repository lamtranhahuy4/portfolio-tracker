import * as XLSX from 'xlsx';
import Decimal from 'decimal.js';
import { ImportParseResult, ImportWarning, NormalizedTransaction } from '@/types/portfolio';
import { toMoney } from '@/domain/portfolio/primitives';
import { MAX_HEADER_SCAN_ROWS } from '@/lib/constants';
import { buildTransaction, normalizeText, parseNumber, parseTransactionType, parseViDate } from './BaseParser';

// ─── Header detection ────────────────────────────────────────────────────────

function findDnseTradeHeader(rows: string[][]) {
  const limit = Math.min(rows.length - 1, MAX_HEADER_SCAN_ROWS);
  for (let i = 0; i < limit; i += 1) {
    const top = rows[i].map(normalizeText);
    const bottom = rows[i + 1].map(normalizeText);

    const hasTradeHeader =
      top.includes('ngay gd') && top.includes('loai lenh') && top.includes('ma') && top.includes('chi tiet giao dich');
    const hasDetailHeader =
      bottom.includes('khoi luong') && bottom.includes('gia khop') && bottom.includes('gia tri khop');

    if (hasTradeHeader && hasDetailHeader) {
      return {
        headerRow: i,
        columns: {
          date: top.indexOf('ngay gd'),
          type: top.indexOf('loai lenh'),
          ticker: top.indexOf('ma'),
          quantity: bottom.indexOf('khoi luong'),
          price: bottom.indexOf('gia khop'),
          grossValue: bottom.indexOf('gia tri khop'),
          feeSo: bottom.indexOf('phi tra so'),
          feeDnse: bottom.indexOf('phi dnse'),
          tax: top.indexOf('thue'),
        },
      };
    }
  }
  return null;
}

// ─── Row processing ──────────────────────────────────────────────────────────

type TradeColumns = {
  date: number; type: number; ticker: number; quantity: number;
  price: number; grossValue: number; feeSo: number; feeDnse: number; tax: number;
};

function processTradeRows(
  rows: string[][],
  headerRow: number,
  columns: TradeColumns,
  fileName: string
): ImportParseResult {
  const warnings: ImportWarning[] = [];
  const transactions: NormalizedTransaction[] = [];
  let acceptedRows = 0;
  let rejectedRows = 0;
  let totalRows = 0;

  for (let i = headerRow + 2; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || row.every((cell) => normalizeText(cell) === '')) continue;

    const rowText = row.map((cell) => normalizeText(cell)).join(' ');
    if (rowText.includes('tong cong')) continue;
    if (/ngay\s+\d+\s+thang\s+\d+\s+nam\s+\d+/.test(rowText)) continue;

    const hasTicker = Boolean(String(row[columns.ticker] ?? '').trim());
    const hasType = Boolean(String(row[columns.type] ?? '').trim());
    const hasQuantity = Boolean(String(row[columns.quantity] ?? '').trim());
    const hasPrice = Boolean(String(row[columns.price] ?? '').trim());
    if (!hasTicker && !hasType && !hasQuantity && !hasPrice) continue;

    totalRows++;
    const rowNumber = i + 1;

    const type = parseTransactionType(row[columns.type]);
    const ticker = String(row[columns.ticker] ?? '').trim();
    const quantity = parseNumber(row[columns.quantity]);
    const price = parseNumber(row[columns.price]);
    const grossValue = parseNumber(row[columns.grossValue]);
    const feeSo = Number.isNaN(parseNumber(row[columns.feeSo])) ? 0 : parseNumber(row[columns.feeSo]);
    const feeDnse = Number.isNaN(parseNumber(row[columns.feeDnse])) ? 0 : parseNumber(row[columns.feeDnse]);
    const tax = Number.isNaN(parseNumber(row[columns.tax])) ? 0 : parseNumber(row[columns.tax]);
    const date = parseViDate(row[columns.date]);

    const pushWarning = (msg: string) => {
      warnings.push({
        row: rowNumber, message: msg,
        rawType: String(row[columns.type] ?? ''),
        rawTicker: String(row[columns.ticker] ?? ''),
        rawQuantity: String(row[columns.quantity] ?? ''),
        rawPrice: String(row[columns.price] ?? ''),
        rawDate: String(row[columns.date] ?? ''),
      });
      rejectedRows++;
    };

    if (!ticker && hasType) { pushWarning('Thiếu mã chứng khoán.'); continue; }
    if (!type && hasTicker) { pushWarning('Không nhận diện được loại lệnh từ file DNSE.'); continue; }
    if (!type && !ticker) { pushWarning('Thiếu cả mã chứng khoán và loại lệnh.'); continue; }
    if (Number.isNaN(quantity) || quantity <= 0) { pushWarning('Khối lượng không hợp lệ.'); continue; }
    if (Number.isNaN(price) || price <= 0) { pushWarning('Giá khớp không hợp lệ.'); continue; }
    if (!date) { pushWarning('Ngày giao dịch không hợp lệ.'); continue; }

    const fee = feeSo + feeDnse;
    const normalized = buildTransaction({
      row: rowNumber, ticker, type: type!, quantity, price, fee, tax, date,
      notes: `DNSE gross=${Number.isNaN(grossValue) ? quantity * price : grossValue}`,
      source: 'dnse-xlsx',
    });

    if (!Number.isNaN(grossValue) && grossValue > 0) {
      normalized.totalValue = toMoney((
        type === 'SELL'
          ? new Decimal(grossValue).minus(fee).minus(tax)
          : new Decimal(grossValue).plus(fee).plus(tax)
      ).toNumber());
    }

    transactions.push(normalized);
    acceptedRows++;
  }

  return {
    transactions, warnings,
    summary: { fileName, source: 'dnse-xlsx', totalRows, acceptedRows, rejectedRows },
  };
}

// ─── Public parser ───────────────────────────────────────────────────────────

export async function parseDnseExcel(file: File): Promise<ImportParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false, defval: '' });

  if (!Array.isArray(rawRows)) throw new Error('Invalid Excel format');
  const rows = (rawRows as unknown[]).filter((r): r is string[] => Array.isArray(r));

  const header = findDnseTradeHeader(rows);
  if (!header) throw new Error('Không tìm thấy header DNSE hợp lệ trong file Excel.');

  return processTradeRows(rows, header.headerRow, header.columns, file.name);
}
