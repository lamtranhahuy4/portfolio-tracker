'use server';

import yahooFinance from 'yahoo-finance2';

export async function fetchMarketIndices() {
  try {
    const symbols = ['^VNINDEX.VN', '^GSPC', 'BTC-USD', 'GC=F'];
    
    // Yêu cầu lấy dữ liệu song song cho tất cả các chỉ số (VN-Index, S&P 500, Crypto, Vàng)
    const results = await Promise.allSettled(
      symbols.map(symbol => yahooFinance.quote(symbol))
    );

    const formattedData = results.map((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        const quote = result.value;
        const symbol = symbols[index];
        
        let name = symbol;
        if (name === '^VNINDEX.VN') name = 'VN-INDEX';
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
      }
      return null;
    });

    return formattedData.filter(Boolean);
  } catch (error) {
    console.error('Yahoo Finance API Error:', error);
    return [];
  }
}
