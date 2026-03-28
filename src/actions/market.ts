'use server';

import yahooFinance from 'yahoo-finance2';

import fs from 'fs';
import path from 'path';

export async function fetchMarketIndices() {
  const symbols = ['^VNINDEX', '^GSPC', 'BTC-USD', 'GC=F'];
  const logPath = path.join(process.cwd(), 'yahoo-debug.log');

  try {
    fs.writeFileSync(logPath, 'Starting fetch...\n', { flag: 'a' });
    
    // Check if yahooFinance has quote
    if (!yahooFinance || !yahooFinance.quote) {
      fs.writeFileSync(logPath, `yahooFinance is invalid. Type: ${typeof yahooFinance}, Object hooks: ${Object.keys(yahooFinance || {})}\n`, { flag: 'a' });
      // Thử dùng default
      // @ts-ignore
      if (yahooFinance && yahooFinance.default && yahooFinance.default.quote) {
        fs.writeFileSync(logPath, `Found via default!\n`, { flag: 'a' });
      }
    }

    // Fetch từng symbol riêng biệt để nếu 1 cái lỗi, các cái khác vẫn hoạt động
    const promises = symbols.map(symbol => 
      // @ts-ignore
      yahooFinance.quote(symbol).catch(err => {
        fs.writeFileSync(logPath, `Error fetching ${symbol}: ${err.message}\n`, { flag: 'a' });
        console.error(`Error fetching ${symbol}:`, err.message);
        return null; // Trả về null nếu symbol này lỗi
      })
    );
    
    const results = await Promise.all(promises);
    fs.writeFileSync(logPath, `Results length: ${results.length}. Valid results: ${results.filter(r => r !== null).length}\n`, { flag: 'a' });
    
    // Lọc bỏ những kết quả null (do lỗi)
    const validQuotes = results.filter(quote => quote !== null);

    const formattedData = validQuotes.map((quote: any) => {
      let name = quote.symbol;
      if (name === '^VNINDEX') name = 'VN-INDEX';
      if (name === '^GSPC') name = 'S&P 500';
      if (name === 'BTC-USD') name = 'BITCOIN';
      if (name === 'GC=F') name = 'GOLD (Oz)';

      const price = quote.regularMarketPrice || 0;
      const change = quote.regularMarketChange || 0;
      const percent = quote.regularMarketChangePercent || 0;

      return {
        name,
        price: new Intl.NumberFormat('en-US').format(price),
        change: change > 0 ? `+${change.toFixed(2)}` : change.toFixed(2),
        percent: percent > 0 ? `+${percent.toFixed(2)}%` : `${percent.toFixed(2)}%`,
        up: change >= 0
      };
    });

    fs.writeFileSync(logPath, `Success: returned ${formattedData.length} items.\n`, { flag: 'a' });
    return formattedData;
  } catch (error: any) {
    fs.writeFileSync(logPath, `Outer Error: ${error.message}\n${error.stack}\n`, { flag: 'a' });
    console.error('Yahoo Finance API Error:', error);
    return [];
  }
}
