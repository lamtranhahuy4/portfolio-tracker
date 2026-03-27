import Papa from 'papaparse';
import { Transaction, TransactionType } from '../types/portfolio';

export function parseCSVToTransactions(file: File): Promise<Transaction[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const transactions: Transaction[] = [];
        const rows = results.data as Record<string, any>[];

        rows.forEach((row, index) => {
          try {
            // Function hỗ trợ mapping các tên cột phổ biến
            const getCol = (possibleNames: string[]) => {
              const key = Object.keys(row).find(k => 
                possibleNames.some(p => p.toLowerCase() === k.trim().toLowerCase())
              );
              return key ? row[key] : undefined;
            };

            const rawTicker = getCol(['Asset', 'Symbol', 'Coin', 'Ticker']);
            const rawType = getCol(['Type', 'Side', 'Action']);
            const rawQuantity = getCol(['Amount', 'Quantity', 'Qty']);
            const rawPrice = getCol(['Price', 'Cost']);
            const rawDate = getCol(['Date', 'Time']);

            if (!rawTicker || !rawType) {
              console.warn(`[Row ${index + 1}] Thiếu dữ liệu bắt buộc (asset, type):`, row);
              return; 
            }

            // Chuẩn hóa Transaction Type
            const typeStr = rawType.toString().toUpperCase();
            let mappedType: TransactionType | null = null;
            if (typeStr.includes('BUY') || typeStr === 'MUA') mappedType = 'BUY';
            else if (typeStr.includes('SELL') || typeStr === 'BÁN') mappedType = 'SELL';
            
            if (!mappedType) {
              console.warn(`[Row ${index + 1}] Loại giao dịch không hợp lệ (${rawType}):`, row);
              return;
            }

            const quantity = parseFloat(rawQuantity);
            const price = parseFloat(rawPrice);

            if (isNaN(quantity) || quantity <= 0 || isNaN(price) || price <= 0) {
              console.warn(`[Row ${index + 1}] Số lượng hoặc giá trị không hợp lệ:`, row);
              return;
            }

            const date = rawDate ? new Date(rawDate) : new Date();

            const transaction: Transaction = {
              id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
              date,
              assetClass: 'STOCK', // Default fallback
              ticker: rawTicker.toString().trim().toUpperCase(),
              type: mappedType,
              quantity,
              price,
              fee: 0,
              totalValue: quantity * price,
            };

            transactions.push(transaction);
          } catch (err) {
            console.warn(`[Row ${index + 1}] Lỗi logic khi parse dữ liệu:`, err);
          }
        });

        resolve(transactions);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}
