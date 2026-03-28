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
    
    const price = json.c[json.c.length - 1]; // Giá hiện tại (hoặc đóng cửa gần nhất)
    const prevPrice = json.c[json.c.length - 2]; // Giá đóng cửa phiên trước
    const change = price - prevPrice;
    const percent = (change / prevPrice) * 100;
    
    return { price, change, percent };
  } catch (e) {
    console.error(`DNSE fetch error for ${symbol}:`, e);
    return null;
  }
}

// Helper: Fetch Binance
async function fetchBinance(symbol: string) {
  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    const json = await res.json();
    const price = parseFloat(json.lastPrice || '0');
    const change = parseFloat(json.priceChange || '0');
    const percent = parseFloat(json.priceChangePercent || '0');
    return { price, change, percent };
  } catch(e) {
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

  // 2. Fetch VN30 từ DNSE
  const vn30Data = await fetchDNSE('VN30', true);
  if (vn30Data) {
    formattedData.push({
      name: 'VN30-INDEX',
      price: new Intl.NumberFormat('en-US').format(vn30Data.price),
      change: vn30Data.change > 0 ? `+${vn30Data.change.toFixed(2)}` : vn30Data.change.toFixed(2),
      percent: vn30Data.percent > 0 ? `+${vn30Data.percent.toFixed(2)}%` : `${vn30Data.percent.toFixed(2)}%`,
      up: vn30Data.change >= 0
    });
  }

  // 3. Bitcoin từ Binance
  const btcData = await fetchBinance('BTCUSDT');
  if (btcData) {
      formattedData.push({
        name: 'BITCOIN',
        price: new Intl.NumberFormat('en-US').format(btcData.price),
        change: btcData.change > 0 ? `+${btcData.change.toFixed(2)}` : btcData.change.toFixed(2),
        percent: btcData.percent > 0 ? `+${btcData.percent.toFixed(2)}%` : `${btcData.percent.toFixed(2)}%`,
        up: btcData.change >= 0
      });
  }

  // 4. Ethereum từ Binance
  const ethData = await fetchBinance('ETHUSDT');
  if (ethData) {
      formattedData.push({
        name: 'ETHEREUM',
        price: new Intl.NumberFormat('en-US').format(ethData.price),
        change: ethData.change > 0 ? `+${ethData.change.toFixed(2)}` : ethData.change.toFixed(2),
        percent: ethData.percent > 0 ? `+${ethData.percent.toFixed(2)}%` : `${ethData.percent.toFixed(2)}%`,
        up: ethData.change >= 0
      });
  }

  return formattedData;
}

export async function fetchTrendingAssets() {
  noStore();
  const formattedData: any[] = [];
  
  const stocks = [
    { ticker: 'FPT', name: 'Công ty Cổ phần FPT' },
    { ticker: 'VCB', name: 'Ngân hàng Vietcombank' },
    { ticker: 'HPG', name: 'Tập đoàn Hòa Phát' } // Đổi mã NVDA bị ẩn thành HPG (Thép Hòa Phát)
  ];

  for (const stock of stocks) {
    const data = await fetchDNSE(stock.ticker, false);
    if (data) {
      formattedData.push({
        ticker: stock.ticker,
        name: stock.name,
        price: `${new Intl.NumberFormat('vi-VN').format(data.price * 1000)} ₫`, // DNSE trả về giá rút gọn theo Đơn vị Nghìn Đồng
        change: data.percent > 0 ? `+${data.percent.toFixed(2)}%` : `${data.percent.toFixed(2)}%`,
        up: data.change >= 0
      });
    }
  }

  return formattedData;
}
