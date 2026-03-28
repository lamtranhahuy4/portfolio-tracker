'use server';

import { unstable_noStore as noStore } from 'next/cache';

export async function fetchMarketIndices() {
  noStore(); // Bắt buộc Vercel bỏ qua Cache
  const formattedData: any[] = [];

  try {
    // 1. Fetch VN-INDEX từ VNDirect
    const vnRes = await fetch('https://finfo-api.vndirect.com.vn/v4/stock_quotes?q=code:VNINDEX', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 0 }
    }).catch(() => null);
    
    if (vnRes && vnRes.ok) {
      const vnJson = await vnRes.json();
      const data = vnJson?.data?.[0]; 
      if (data) {
        // Fallback multiple common fields from VNDirect
        const price = data.matchPrice ?? data.close ?? data.basicPrice ?? 1250.0;
        const change = data.priceChange ?? data.change ?? 0;
        const percent = data.priceChangePercent ?? data.pctChange ?? 0;
        formattedData.push({
          name: 'VN-INDEX',
          price: new Intl.NumberFormat('en-US').format(price),
          change: change > 0 ? `+${change.toFixed(2)}` : change.toFixed(2),
          percent: percent > 0 ? `+${percent.toFixed(2)}%` : `${percent.toFixed(2)}%`,
          up: change >= 0
        });
      }
    }
  } catch (e) { console.error('VNINDEX fetch error:', e); }

  // 2. S&P 500 (Hardcode tạm)
  formattedData.push({
    name: 'S&P 500',
    price: '5,254.35',
    change: '-5.10',
    percent: '-0.10%',
    up: false
  });

  // 3. Bitcoin từ Binance
  try {
    const btcRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT', {
      next: { revalidate: 0 }
    }).catch(() => null);
    
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

  // 4. Vàng (Hardcode tạm)
  formattedData.push({
    name: 'GOLD (Oz)',
    price: '2,350.50',
    change: '+15.20',
    percent: '+0.65%',
    up: true
  });

  return formattedData;
}

export async function fetchTrendingAssets() {
  noStore();
  const formattedData: any[] = [];
  
  try {
    // Lấy FPT và VCB từ VNDirect
    const vnRes = await fetch('https://finfo-api.vndirect.com.vn/v4/stock_quotes?q=code:FPT,VCB', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 0 }
    }).catch(() => null);
    
    if (vnRes && vnRes.ok) {
      const vnJson = await vnRes.json();
      const dataArr = vnJson?.data || [];
      
      dataArr.forEach((data: any) => {
        const ticker = data.code || data.symbol || data.ticker || 'UNK';
        if (ticker !== 'FPT' && ticker !== 'VCB') return;
        
        const price = data.matchPrice ?? data.close ?? data.basicPrice ?? 0;
        const change = data.priceChange ?? data.change ?? 0;
        const percent = data.priceChangePercent ?? data.pctChange ?? 0;
        
        formattedData.push({
          ticker: ticker,
          name: ticker === 'FPT' ? 'Công ty Cổ phần FPT' : 'Ngân hàng Vietcombank',
          price: `${new Intl.NumberFormat('vi-VN').format(price * 1000)} ₫`, // Cần nhân 1000 nếu sàn VN hiển thị theo k
          change: percent > 0 ? `+${percent.toFixed(2)}%` : `${percent.toFixed(2)}%`,
          up: change >= 0
        });
      });
    }
  } catch (e) { console.error('FPT/VCB fetch error:', e); }
  
  // Hardcode fallback nếu fetch lỗi
  if (formattedData.length === 0) {
    formattedData.push(
      { ticker: 'FPT', name: 'Công ty Cổ phần FPT', price: '115,000 ₫', change: '+2.5%', up: true },
      { ticker: 'VCB', name: 'Ngân hàng Vietcombank', price: '95,400 ₫', change: '+1.2%', up: true }
    );
  }

  // NVDA (Hardcode tạm)
  formattedData.push({
    ticker: 'NVDA',
    name: 'Nvidia Corp',
    price: '$850.50',
    change: '+3.8%',
    up: true
  });

  return formattedData;
}

