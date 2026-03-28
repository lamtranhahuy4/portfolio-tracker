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

export async function fetchMarketIndices() {
  noStore();
  const formattedData: any[] = [];

  // 1. Fetch VN-INDEX từ DNSE (Real-time ổn định)
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

  // 2. Tạm ẩn S&P 500 do thiếu Public API không cần Key ở US. 
  // Chỉ khi fetch ok nó mới hiện lên, nếu không ok mảng trả về sẽ ít đi 1 card không làm vỡ UI.

  // 3. Bitcoin từ Binance
  try {
    const btcRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT', { next: { revalidate: 0 } }).catch(() => null);
    if (btcRes && btcRes.ok) {
      const btcJson = await btcRes.json();
      const price = parseFloat(btcJson.lastPrice || '0');
      const change = parseFloat(btcJson.priceChange || '0');
      const percent = parseFloat(btcJson.priceChangePercent || '0');
      formattedData.push({
        name: 'BITCOIN',
        price: new Intl.NumberFormat('en-US').format(price),
        change: change > 0 ? `+${change.toFixed(2)}` : change.toFixed(2),
        percent: percent > 0 ? `+${percent.toFixed(2)}%` : `${percent.toFixed(2)}%`,
        up: change >= 0
      });
    }
  } catch (e) { console.error('BTC fetch error:', e); }

  // 4. Giá Vàng mượn PAX Gold (Binance)
  // 1 PAXG Token = Phản chiếu chính xác 1 oz vàng thực ngoài đời
  try {
    const goldRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=PAXGUSDT', { next: { revalidate: 0 } }).catch(() => null);
    if (goldRes && goldRes.ok) {
      const goldJson = await goldRes.json();
      const price = parseFloat(goldJson.lastPrice || '0');
      const change = parseFloat(goldJson.priceChange || '0');
      const percent = parseFloat(goldJson.priceChangePercent || '0');
      formattedData.push({
        name: 'GOLD (Oz)', 
        price: new Intl.NumberFormat('en-US').format(price),
        change: change > 0 ? `+${change.toFixed(2)}` : change.toFixed(2),
        percent: percent > 0 ? `+${percent.toFixed(2)}%` : `${percent.toFixed(2)}%`,
        up: change >= 0
      });
    }
  } catch (e) { console.error('Gold fetch error:', e); }

  return formattedData;
}

export async function fetchTrendingAssets() {
  noStore();
  const formattedData: any[] = [];
  
  // 1. FPT từ DNSE
  const fptData = await fetchDNSE('FPT', false);
  if (fptData) {
    formattedData.push({
      ticker: 'FPT',
      name: 'Công ty Cổ phần FPT',
      price: `${new Intl.NumberFormat('vi-VN').format(fptData.price * 1000)} ₫`, // DNSE trả về giá rút gọn theo Đơn vị Nghìn Đồng
      change: fptData.percent > 0 ? `+${fptData.percent.toFixed(2)}%` : `${fptData.percent.toFixed(2)}%`,
      up: fptData.change >= 0
    });
  }

  // 2. VCB từ DNSE
  const vcbData = await fetchDNSE('VCB', false);
  if (vcbData) {
    formattedData.push({
      ticker: 'VCB',
      name: 'Ngân hàng Vietcombank',
      price: `${new Intl.NumberFormat('vi-VN').format(vcbData.price * 1000)} ₫`,
      change: vcbData.percent > 0 ? `+${vcbData.percent.toFixed(2)}%` : `${vcbData.percent.toFixed(2)}%`,
      up: vcbData.change >= 0
    });
  }

  // 3. Giữ NVDA là Placeholder tĩnh để tránh vỡ giao diện 3 cột của grid.
  formattedData.push({
    ticker: 'NVDA',
    name: 'Nvidia Corp',
    price: '$850.50',
    change: '+3.8%',
    up: true
  });

  // Nếu cả DNSE cũng bảo trì thì fallback 2 fake data
  if (formattedData.length === 1) { 
    return [
      { ticker: 'FPT', name: 'Công ty Cổ phần FPT', price: '115,000 ₫', change: '+2.5%', up: true },
      { ticker: 'VCB', name: 'Ngân hàng Vietcombank', price: '95,400 ₫', change: '+1.2%', up: true },
      ...formattedData
    ];
  }

  return formattedData;
}
