'use server';

import yahooFinance from 'yahoo-finance2';

export async function fetchMarketIndices() {
  const symbols = ['^VNINDEX', '^GSPC', 'BTC-USD', 'GC=F'];

  try {
    // Fetch từng symbol riêng biệt để nếu 1 cái lỗi, các cái khác vẫn hoạt động
    const promises = symbols.map(symbol => 
      // @ts-ignore
      yahooFinance.quote(symbol).catch(err => {
        console.error(`Error fetching ${symbol}:`, err.message);
        return null; // Trả về null nếu symbol này lỗi
      })
    );
    
    const results = await Promise.all(promises);
    
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

    return formattedData;
  } catch (error) {
    console.error('Yahoo Finance API Error:', error);
    return [];
  }
}
