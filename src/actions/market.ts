'use server';

import yahooFinance from 'yahoo-finance2';
import { unstable_noStore as noStore } from 'next/cache';

export async function fetchMarketIndices() {
  noStore(); // Bắt buộc Vercel bỏ qua Cache, luôn luôn lấy dữ liệu mới hổi từ Yahoo!
  const symbols = ['^VNINDEX', '^GSPC', 'BTC-USD', 'GC=F'];

  try {
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
  } catch (error: any) {
    console.error('Yahoo Finance API Error:', error);
    return [];
  }
}

export async function fetchTrendingAssets() {
  noStore();
  const symbols = ['FPT.VN', 'VCB.VN', 'NVDA'];
  
  try {
    const promises = symbols.map(symbol => 
      // @ts-ignore
      yahooFinance.quote(symbol).catch(err => {
        console.error(`Error fetching ${symbol}:`, err.message);
        return null;
      })
    );
    const results = await Promise.all(promises);
    const validQuotes = results.filter(quote => quote !== null);

    const formattedData = validQuotes.map((quote: any) => {
      let ticker = quote.symbol;
      let name = quote.shortName || quote.longName || ticker;
      
      if (ticker === 'FPT.VN') {
        ticker = 'FPT';
        name = 'Công ty Cổ phần FPT';
      }
      if (ticker === 'VCB.VN') {
        ticker = 'VCB';
        name = 'Ngân hàng Vietcombank';
      }
      if (ticker === 'NVDA') {
        name = 'Nvidia Corp';
      }

      const price = quote.regularMarketPrice || 0;
      const change = quote.regularMarketChange || 0;
      const percent = quote.regularMarketChangePercent || 0;
      
      const isVND = ticker === 'FPT' || ticker === 'VCB';

      return {
        ticker,
        name,
        price: isVND ? `${new Intl.NumberFormat('vi-VN').format(price)} ₫` : `$${new Intl.NumberFormat('en-US').format(price)}`,
        change: percent > 0 ? `+${percent.toFixed(2)}%` : `${percent.toFixed(2)}%`,
        up: change >= 0
      };
    });

    return formattedData;
  } catch (error) {
    console.error('Yahoo Finance API Error (Trending):', error);
    return [];
  }
}

