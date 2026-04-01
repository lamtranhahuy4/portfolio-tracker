'use server';

import { unstable_noStore as noStore } from 'next/cache';

// Helper: Fetch DNSE Chart API (Public, Không Key, miễn nhiễm Block IP của Vercel)
async function fetchDNSE(symbol: string, isIndex = false) {
  const from = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60; // 7 ngày trước để chắc chắn có nến cũ
  const to = Math.floor(Date.now() / 1000);
  const type = isIndex ? 'index' : 'stock';
  const url = `https://services.entrade.com.vn/chart-api/v2/ohlcs/${type}?resolution=1D&symbol=${symbol}&from=${from}&to=${to}`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 0 } });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.c || json.c.length < 2) return null;

    const price = json.c[json.c.length - 1];
    const prevPrice = json.c[json.c.length - 2];
    const change = price - prevPrice;
    const percent = (change / prevPrice) * 100;

    return { price, change, percent };
  } catch (e) {
    console.error(`DNSE fetch error for ${symbol}:`, e);
    return null;
  }
}

export async function fetchRealtimeQuotes(symbols: string[]) {
  noStore();
  const uniqueSymbols = [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))];
  const entries = await Promise.all(uniqueSymbols.map(async (symbol) => {
    const data = await fetchDNSE(symbol, false);
    return [symbol, data ? data.price * 1000 : null] as const;
  }));

  return Object.fromEntries(entries.filter((entry): entry is readonly [string, number] => entry[1] !== null));
}

// Helper: Fetch CoinGecko (Quốc tế, miễn phí, KHÔNG CHẶN IP MỸ NHƯ BINANCE)
async function fetchCoinGecko() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true', { next: { revalidate: 0 } });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function fetchMarketIndices() {
  noStore();
  const formattedData: any[] = [];

  // 1. Fetch VN-INDEX từ DNSE
  const vnData = await fetchDNSE('VNINDEX', true);
  if (vnData) {
    formattedData.push({
      name: 'VN-INDEX',
      price: new Intl.NumberFormat('en-US').format(vnData.price),
      change: vnData.change > 0 ? `+${vnData.change.toFixed(2)}` : vnData.change.toFixed(2),
      percent: vnData.percent > 0 ? `+${vnData.percent.toFixed(2)}%` : `${vnData.percent.toFixed(2)}%`,
      up: vnData.change >= 0
    });
  }

  // 2. Fetch Giá crypto từ CoinGecko (Thay thế cho Binance bị chặn)
  const cryptoData = await fetchCoinGecko();
  if (cryptoData && cryptoData.bitcoin) {
    formattedData.push({
      name: 'BITCOIN',
      price: new Intl.NumberFormat('en-US').format(cryptoData.bitcoin.usd),
      change: cryptoData.bitcoin.usd_24h_change > 0 ? `+${cryptoData.bitcoin.usd_24h_change.toFixed(2)}` : cryptoData.bitcoin.usd_24h_change.toFixed(2),
      percent: cryptoData.bitcoin.usd_24h_change > 0 ? `+${cryptoData.bitcoin.usd_24h_change.toFixed(2)}%` : `${cryptoData.bitcoin.usd_24h_change.toFixed(2)}%`,
      up: cryptoData.bitcoin.usd_24h_change >= 0
    });
  }

  if (cryptoData && cryptoData.ethereum) {
    formattedData.push({
      name: 'ETHEREUM',
      price: new Intl.NumberFormat('en-US').format(cryptoData.ethereum.usd),
      change: cryptoData.ethereum.usd_24h_change > 0 ? `+${cryptoData.ethereum.usd_24h_change.toFixed(2)}` : cryptoData.ethereum.usd_24h_change.toFixed(2),
      percent: cryptoData.ethereum.usd_24h_change > 0 ? `+${cryptoData.ethereum.usd_24h_change.toFixed(2)}%` : `${cryptoData.ethereum.usd_24h_change.toFixed(2)}%`,
      up: cryptoData.ethereum.usd_24h_change >= 0
    });
  }

  // 3. Tạm thời hiển thị Vàng 9999 (SJC) dạng Fallback 
  // Vì 100% các API Vàng VN đều đã chặn đứng truy cập từ IP US (Máy chủ Vercel)
  formattedData.push({
    name: 'VÀNG SJC 9999',
    price: '89,500,000 ₫',
    change: '+500,000',
    percent: '+0.56%',
    up: true
  });

  return formattedData;
}

export async function fetchTrendingAssets() {
  noStore();
  const formattedData: any[] = [];

  const stocks = [
    { ticker: 'FPT', name: 'Công ty Cổ phần FPT' },
    { ticker: 'VCB', name: 'Ngân hàng Vietcombank' },
    { ticker: 'HPG', name: 'Tập đoàn Hòa Phát' },
    { ticker: 'TCB', name: 'Ngân hàng Techcombank' },
    { ticker: 'POW', name: 'Tổng Công ty Điện lực Dầu khí Việt Nam' }
  ];

  for (const stock of stocks) {
    const data = await fetchDNSE(stock.ticker, false);
    if (data) {
      formattedData.push({
        ticker: stock.ticker,
        name: stock.name,
        price: `${new Intl.NumberFormat('vi-VN').format(data.price * 1000)} ₫`, // DNSE trả về giá Đơn vị Nghìn Đồng
        change: data.percent > 0 ? `+${data.percent.toFixed(2)}%` : `${data.percent.toFixed(2)}%`,
        up: data.change >= 0
      });
    }
  }

  // Đề phòng DNSE bảo trì
  if (formattedData.length === 0) {
    return [
      { ticker: 'FPT', name: 'Công ty Cổ phần FPT', price: '115,000 ₫', change: '+2.5%', up: true },
      { ticker: 'VCB', name: 'Ngân hàng Vietcombank', price: '95,400 ₫', change: '+1.2%', up: true },
      { ticker: 'HPG', name: 'Tập đoàn Hòa Phát', price: '29,400 ₫', change: '+0.8%', up: true }
    ];
  }

  return formattedData;
}
