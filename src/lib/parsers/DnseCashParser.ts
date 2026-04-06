import * as XLSX from 'xlsx';
import Decimal from 'decimal.js';
import { CashLedgerEvent, CashLedgerEventType, ImportCashParseResult } from '@/types/portfolio';
import { toMoney, toQuantity } from '@/domain/portfolio/primitives';
import { normalizeText, parseNumber, parseNumberToDecimal, parseViDate } from './BaseParser';

// ─── Header detection ─────────────────────────────────────────────────────────

type CashColumns = { date: number; desc: number; inflow: number; outflow: number; balance: number };
type CashHeader = { headerRow: number; dataStartRow: number; columns: CashColumns };

function findDnseCashHeader(rows: string[][]): CashHeader | null {
  const maxScanRows = Math.min(50, rows.length);

  const includesAny = (cells: string[], aliases: string[]) =>
    aliases.some((alias) => cells.some((cell) => cell.includes(alias)));

  const findIndex = (cells: Array<{ index: number; text: string }>, aliases: string[]) =>
    cells.find((cell) => aliases.some((alias) => cell.text.includes(alias)))?.index ?? -1;

  const resolveHeader = (top: string[], bottom?: string[]): CashColumns | null => {
    const merged = top.map((cell, index) => ({
      index,
      text: [cell, bottom?.[index] ?? ''].filter(Boolean).join(' ').trim(),
    }));
    const topCandidates = top.map((text, index) => ({ index, text }));
    const allCandidates = [...topCandidates, ...merged];

    const date = findIndex(allCandidates, ['ngay gd', 'ngay giao dich', 'ngay']);
    const desc = findIndex(allCandidates, ['mo ta', 'dien giai', 'noi dung', 'dien giai giao dich']);
    const inflow = findIndex(allCandidates, ['tang', 'ps tang', 'phat sinh tang', 'ghi co', 'thu']);
    const outflow = findIndex(allCandidates, ['giam', 'ps giam', 'phat sinh giam', 'ghi no', 'chi']);
    const balance = findIndex(allCandidates, ['so du', 'so du cuoi', 'so du tien', 'du cuoi']);

    if (date === -1 || desc === -1 || inflow === -1 || outflow === -1) return null;
    return { date, desc, inflow, outflow, balance };
  };

  for (let i = 0; i < maxScanRows; i += 1) {
    const top = (rows[i] || []).map((c) => normalizeText(c));
    const bottom = (rows[i + 1] || []).map((c) => normalizeText(c));
    const topLikeCash = includesAny(top, ['ngay', 'mo ta', 'dien giai', 'noi dung', 'phat sinh', 'so du']);
    const bottomLikeCash = includesAny(bottom, ['tang', 'giam', 'ps tang', 'ps giam', 'phat sinh tang', 'phat sinh giam']);

    if (!topLikeCash && !bottomLikeCash) continue;

    const twoRowColumns = resolveHeader(top, bottom);
    if (twoRowColumns) return { headerRow: i, dataStartRow: i + 2, columns: twoRowColumns };

    const oneRowColumns = resolveHeader(top);
    if (oneRowColumns) return { headerRow: i, dataStartRow: i + 1, columns: oneRowColumns };
  }

  return null;
}

// ─── Row classification ───────────────────────────────────────────────────────

function classifyEventType(descLower: string): CashLedgerEventType {
  if (descLower.includes('du dau ky')) return 'OPENING_BALANCE';
  if (descLower.includes('lai tien gui')) return 'INTEREST';
  if (descLower.includes('phi luu ky')) return 'DEPOSITORY_FEE';
  if (descLower.includes('nhan tien ban')) return 'TRADE_SETTLEMENT_SELL';
  if (descLower.includes('tra tien mua')) return 'TRADE_SETTLEMENT_BUY';
  if (descLower.includes('thu phi tra so')) return 'EXCHANGE_FEE';
  if (descLower.includes('thu phi mua') || descLower.includes('thu phi ban') || descLower.includes('thu phi ckck')) return 'TRADE_FEE';
  if (descLower.includes('thue tncn')) return 'SELL_TAX';
  if (descLower.includes('co tuc')) return 'DIVIDEND_CASH';
  if (descLower.includes('hoan tra uttb')) return 'SELL_ADVANCE_REPAYMENT';
  if (descLower.includes('uttb ngay gd') || descLower.startsWith('uttb')) return 'SELL_ADVANCE';
  if (descLower.includes('chuyen tien cho') || descLower.includes('chuyen tien ra')) return 'BANK_TRANSFER_OUT';
  if (descLower.includes('nop tien') || descLower.includes('chuyen tien vao')) return 'DEPOSIT';
  if (descLower.includes('rut tien')) return 'WITHDRAW';
  return 'OTHER_ADJUSTMENT';
}

function extractReferenceTradeMetadata(description: string) {
  const tradePattern = /(mua|ban)\s+([\d.,]+|\d+)\s+([A-Z0-9]+)/i;
  const datePattern = /ngay\s+(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i;
  const tradeMatch = description.match(tradePattern);
  const dateMatch = description.match(datePattern);
  return {
    referenceQuantity: tradeMatch?.[2] ? parseNumber(tradeMatch[2]) : undefined,
    referenceTicker: tradeMatch?.[3] ? tradeMatch[3].toUpperCase() : undefined,
    referenceTradeDate: dateMatch?.[1] ? (parseViDate(dateMatch[1]) ?? undefined) : undefined,
  };
}

// ─── Public parsers ───────────────────────────────────────────────────────────

export function parseDnseCashRows(rows: string[][], fileName = 'mock.xlsx'): ImportCashParseResult {
  const header = findDnseCashHeader(rows);
  if (!header) throw new Error('Không tìm thấy header báo cáo tiền DNSE hợp lệ trong file Excel.');

  const events: CashLedgerEvent[] = [];
  const { columns, dataStartRow } = header;
  const firstDatedEvent = rows
    .slice(dataStartRow)
    .map((row) => parseViDate(row?.[columns.date]))
    .find((value): value is Date => Boolean(value));

  let totalEvents = 0;
  let unclassifiedEvents = 0;

  for (let i = dataStartRow; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || row.every((cell) => normalizeText(cell) === '')) continue;

    const rowText = row.map((cell) => normalizeText(cell)).join(' ');
    if (/ngay\s+\d+\s+thang\s+\d+\s+nam\s+\d+/.test(rowText)) continue;
    if (rowText.includes('tong cong')) continue;

    const descText = String(row[columns.desc] ?? '').trim();
    const descLower = normalizeText(descText);
    const dateStr = String(row[columns.date] ?? '').trim();
    if (dateStr.toLowerCase().includes('ngay gd')) continue;

    const parsedDate = parseViDate(dateStr)
      ?? (descLower.includes('du dau ky') ? firstDatedEvent : null)
      ?? new Date();

    const inflowDec = parseNumberToDecimal(row[columns.inflow]);
    const outflowDec = parseNumberToDecimal(row[columns.outflow]);
    const balanceDec = parseNumberToDecimal(row[columns.balance]);

    if (!inflowDec.isFinite() && !outflowDec.isFinite() && !balanceDec.isFinite()) continue;

    let direction: 'INFLOW' | 'OUTFLOW' = 'INFLOW';
    let amount = inflowDec;

    if (inflowDec.isFinite() && !inflowDec.isZero()) {
      direction = inflowDec.gt(0) ? 'INFLOW' : 'OUTFLOW';
      amount = inflowDec.abs();
    } else if (outflowDec.isFinite() && !outflowDec.isZero()) {
      direction = outflowDec.gt(0) ? 'OUTFLOW' : 'INFLOW';
      amount = outflowDec.abs();
    }

    if (amount.isZero() && !descLower.includes('du dau ky')) continue;

    totalEvents++;
    const eventType = classifyEventType(descLower);
    if (eventType === 'OTHER_ADJUSTMENT') unclassifiedEvents++;

    const { referenceTicker, referenceQuantity, referenceTradeDate } = extractReferenceTradeMetadata(descText);

    events.push({
      id: crypto.randomUUID(),
      date: parsedDate,
      direction,
      amount: toMoney(amount),
      balanceAfter: toMoney(balanceDec.isFinite() ? balanceDec : new Decimal(0)),
      eventType,
      description: descText,
      source: 'dnse-cash-xlsx',
      referenceTicker,
      referenceQuantity: referenceQuantity !== undefined ? toQuantity(referenceQuantity) : undefined,
      referenceTradeDate,
    });
  }

  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    events,
    summary: {
      fileName,
      source: 'dnse-cash-xlsx',
      totalEvents,
      unclassifiedEvents,
      coverageStart: events.length > 0 ? events[0].date : undefined,
      coverageEnd: events.length > 0 ? events[events.length - 1].date : undefined,
    },
  };
}

export async function parseDnseCashExcel(file: File): Promise<ImportCashParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'xlsx' && ext !== 'xls') {
    throw new Error('Định dạng báo cáo tiền phải là Excel (.xlsx, .xls)');
  }
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false, defval: '' }) as string[][];
  return parseDnseCashRows(rows, file.name);
}
