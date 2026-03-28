import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  AssetClass,
  ImportParseResult,
  ImportWarning,
  NormalizedTransaction,
  TransactionType,
} from '@/types/portfolio';

function normalizeText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function toTicker(value: string, assetClass: AssetClass) {
  if (assetClass === 'CASH') return 'CASH_VND';
  return value.trim().toUpperCase();
}

function parseNumber(value: unknown) {
  if (value === null || value === undefined) return NaN;

  const raw = String(value).trim();
  if (!raw) return NaN;

  const normalized = raw
    .replace(/\s+/g, '')
    .replace(/,/g, '')
    .replace(/[^\d.-]/g, '');

  return Number(normalized);
}

function parseViDate(value: unknown) {
  if (!value) return null;

  const raw = String(value).trim();
  const parts = raw.split(/[/-]/);
  if (parts.length >= 3) {
    const [day, month, year] = parts;
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function parseTransactionType(value: unknown): TransactionType | null {
  const normalized = normalizeText(value);

  if (!normalized) return null;
  if (normalized === 'b' || normalized.includes('mua') || normalized.includes('buy')) return 'BUY';
  if (normalized === 's' || normalized.includes('ban') || normalized.includes('sell')) return 'SELL';
  if (normalized.includes('co tuc bang tien') || normalized.includes('dividend')) return 'DIVIDEND';
  if (normalized.includes('co tuc bang co phieu') || normalized.includes('stock dividend')) return 'STOCK_DIVIDEND';
  if (normalized.includes('nop') || normalized.includes('deposit')) return 'DEPOSIT';
  if (normalized.includes('rut') || normalized.includes('withdraw')) return 'WITHDRAW';
  if (normalized.includes('lai') || normalized.includes('interest')) return 'INTEREST';

  return null;
}

function getAssetClass(type: TransactionType): AssetClass {
  return ['DEPOSIT', 'WITHDRAW', 'INTEREST'].includes(type) ? 'CASH' : 'STOCK';
}

function buildTransaction(input: {
  row: number;
  ticker: string;
  type: TransactionType;
  quantity: number;
  price: number;
  fee?: number;
  tax?: number;
  date: Date;
  notes?: string;
  source: string;
}): NormalizedTransaction {
  const assetClass = getAssetClass(input.type);
  const quantity = input.quantity;
  const price = input.price;
  const fee = input.fee ?? 0;
  const tax = input.tax ?? 0;
  const grossValue = quantity * price;
  const totalValue = input.type === 'SELL'
    ? grossValue - fee - tax
    : grossValue + fee + tax;

  return {
    id: crypto.randomUUID(),
    date: input.date,
    assetClass,
    ticker: toTicker(input.ticker, assetClass),
    type: input.type,
    quantity,
    price,
    fee,
    tax,
    totalValue,
    notes: input.notes,
    source: input.source,
  };
}

function resolveColumn(row: Record<string, unknown>, aliases: string[]) {
  const keys = Object.keys(row);
  const aliasSet = aliases.map(normalizeText);
  const key = keys.find((candidate) => aliasSet.includes(normalizeText(candidate)));
  return key ? row[key] : undefined;
}

async function parseCsv(file: File): Promise<ImportParseResult> {
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

          if (!type) {
            pushWarning('Không nhận diện được loại giao dịch.');
            return;
          }

          const assetClass = getAssetClass(type);
          const ticker = assetClass === 'CASH'
            ? 'CASH_VND'
            : String(rawTicker ?? '').trim();
          const quantity = parseNumber(rawQuantity);
          const price = assetClass === 'CASH' ? 1 : parseNumber(rawPrice);
          const fee = Number.isNaN(parseNumber(rawFee)) ? 0 : parseNumber(rawFee);
          const tax = Number.isNaN(parseNumber(rawTax)) ? 0 : parseNumber(rawTax);
          const date = parseViDate(rawDate) ?? new Date();

          if (!ticker) {
            pushWarning('Thiếu mã tài sản.');
            return;
          }

          if (Number.isNaN(quantity) || quantity <= 0) {
            pushWarning('Khối lượng hoặc số tiền không hợp lệ.');
            return;
          }

          if (Number.isNaN(price) || price <= 0) {
            pushWarning('Giá giao dịch không hợp lệ.');
            return;
          }

          transactions.push(buildTransaction({
            row: rowNumber,
            ticker,
            type,
            quantity,
            price,
            fee,
            tax,
            date,
            notes: rawNotes ? String(rawNotes) : undefined,
            source: 'csv',
          }));
          acceptedRows++;
        });

        resolve({
          transactions,
          warnings,
          summary: {
            fileName: file.name,
            source: 'csv',
            totalRows,
            acceptedRows,
            rejectedRows,
          },
        });
      },
      error: (error) => reject(error),
    });
  });
}

function findDnseTradeHeader(rows: string[][]) {
  for (let i = 0; i < rows.length - 1; i += 1) {
    const top = rows[i].map(normalizeText);
    const bottom = rows[i + 1].map(normalizeText);

    const hasTradeHeader = top.includes('ngay gd')
      && top.includes('loai lenh')
      && top.includes('ma')
      && top.includes('chi tiet giao dich');

    const hasDetailHeader = bottom.includes('khoi luong')
      && bottom.includes('gia khop')
      && bottom.includes('gia tri khop');

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

async function parseDnseExcel(file: File): Promise<ImportParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false, defval: '' }) as string[][];
  const header = findDnseTradeHeader(rows);

  if (!header) {
    throw new Error('Không tìm thấy header DNSE hợp lệ trong file Excel.');
  }

  const warnings: ImportWarning[] = [];
  const transactions: NormalizedTransaction[] = [];
  const { columns, headerRow } = header;
  let acceptedRows = 0;
  let rejectedRows = 0;
  let totalRows = 0;

  for (let i = headerRow + 2; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || row.every((cell) => normalizeText(cell) === '')) {
      continue;
    }

    const rowText = row.map((cell) => normalizeText(cell)).join(' ');

    if (rowText.includes('tong cong')) {
      continue;
    }
    
    if (/ngay\s+\d+\s+thang\s+\d+\s+nam\s+\d+/.test(rowText)) {
      continue;
    }

    const hasTicker = Boolean(String(row[columns.ticker] ?? '').trim());
    const hasType = Boolean(String(row[columns.type] ?? '').trim());
    const hasQuantity = Boolean(String(row[columns.quantity] ?? '').trim());
    const hasPrice = Boolean(String(row[columns.price] ?? '').trim());

    if (!hasTicker && !hasType && !hasQuantity && !hasPrice) {
      continue;
    }

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
        row: rowNumber,
        message: msg,
        rawType: String(row[columns.type] ?? ''),
        rawTicker: String(row[columns.ticker] ?? ''),
        rawQuantity: String(row[columns.quantity] ?? ''),
        rawPrice: String(row[columns.price] ?? ''),
        rawDate: String(row[columns.date] ?? ''),
      });
      rejectedRows++;
    };

    if (!ticker && hasType) {
      pushWarning('Thiếu mã chứng khoán.');
      continue;
    }

    if (!type && hasTicker) {
      pushWarning('Không nhận diện được loại lệnh từ file DNSE.');
      continue;
    }

    if (!type && !ticker) {
      pushWarning('Thiếu cả mã chứng khoán và loại lệnh.');
      continue;
    }

    if (Number.isNaN(quantity) || quantity <= 0) {
      pushWarning('Khối lượng không hợp lệ.');
      continue;
    }

    if (Number.isNaN(price) || price <= 0) {
      pushWarning('Giá khớp không hợp lệ.');
      continue;
    }

    if (!date) {
      pushWarning('Ngày giao dịch không hợp lệ.');
      continue;
    }

    const fee = feeSo + feeDnse;
    const normalized = buildTransaction({
      row: rowNumber,
      ticker,
      type,
      quantity,
      price,
      fee,
      tax,
      date,
      notes: `DNSE gross=${Number.isNaN(grossValue) ? quantity * price : grossValue}`,
      source: 'dnse-xlsx',
    });

    if (!Number.isNaN(grossValue) && grossValue > 0) {
      normalized.totalValue = type === 'SELL'
        ? grossValue - fee - tax
        : grossValue + fee + tax;
    }

    transactions.push(normalized);
    acceptedRows++;
  }

  return {
    transactions,
    warnings,
    summary: {
      fileName: file.name,
      source: 'dnse-xlsx',
      totalRows,
      acceptedRows,
      rejectedRows,
    },
  };
}

export async function parseImportFile(file: File): Promise<ImportParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') {
    return parseDnseExcel(file);
  }

  return parseCsv(file);
}
