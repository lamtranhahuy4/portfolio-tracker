import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Transaction, TransactionType } from '../types/portfolio';

export async function parseFileToTransactions(file: File): Promise<Transaction[]> {
  const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');

  if (isExcel) {
    return new Promise(async (resolve, reject) => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert Excel sheet to JSON array (similar to PapaParse results.data)
        const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];
        const transactions = processRows(rows);
        resolve(transactions);
      } catch (err) {
        reject(err);
      }
    });
  } else {
    // Original CSV Parsing
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as Record<string, any>[];
          const transactions = processRows(rows);
          resolve(transactions);
        },
        error: (error) => reject(error)
      });
    });
  }
}

// Logic Mapping dòng thô từ PapaParse/Xlsx sang Object Transaction nội bộ
function processRows(rows: Record<string, any>[]): Transaction[] {
  const transactions: Transaction[] = [];
  rows.forEach((row, index) => {
    try {
      const getCol = (possibleNames: string[]) => {
        const key = Object.keys(row).find(k => 
          possibleNames.some(p => p.toLowerCase() === k.trim().toLowerCase())
        );
        return key ? row[key] : undefined;
      };

      const rawTicker = getCol(['Asset', 'Symbol', 'Coin', 'Ticker', 'Mã']);
      const rawType = getCol(['Type', 'Side', 'Action', 'Loại', 'GD']);
      const rawQuantity = getCol(['Amount', 'Quantity', 'Qty', 'SL', 'Khối lượng']);
      const rawPrice = getCol(['Price', 'Cost', 'Giá']);
      const rawDate = getCol(['Date', 'Time', 'Ngày', 'Thời gian']);

      if (!rawTicker || !rawType) return;

      const typeStr = rawType.toString().toUpperCase();
      let mappedType: TransactionType | null = null;
      if (typeStr.includes('BUY') || typeStr.includes('MUA')) mappedType = 'BUY';
      else if (typeStr.includes('SELL') || typeStr.includes('BÁN')) mappedType = 'SELL';
      else if (typeStr.includes('DEPOSIT') || typeStr.includes('NẠP')) mappedType = 'DEPOSIT';
      
      if (!mappedType) return;

      const quantity = parseFloat(rawQuantity);
      const price = parseFloat(rawPrice);

      if (isNaN(quantity) || quantity <= 0 || isNaN(price) || price <= 0) return;

      const date = rawDate ? new Date(rawDate) : new Date();

      transactions.push({
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
        date,
        assetClass: 'STOCK',
        ticker: rawTicker.toString().trim().toUpperCase(),
        type: mappedType,
        quantity,
        price,
        fee: 0,
        totalValue: quantity * price,
      });
    } catch (err) {}
  });
  return transactions;
}
