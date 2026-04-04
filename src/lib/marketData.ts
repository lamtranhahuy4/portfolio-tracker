export type MarketCard = {
  name: string;
  price: string;
  change: string;
  percent: string;
  up: boolean;
};

export type TrendingAssetCard = {
  ticker: string;
  name: string;
  price: string;
  change: string;
  up: boolean;
};

type DnseSeriesResponse = {
  c?: number[];
};

const DNSE_BASE_URL = 'https://services.entrade.com.vn/chart-api/v2/ohlcs';

function uniqueSymbols(symbols: string[]) {
  return [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))];
}

async function fetchDnseSeries(
  symbol: string,
  isIndex: boolean,
  resolution: '1' | '1D',
  from: number,
  to: number
) {
  const type = isIndex ? 'index' : 'stock';
  const url = `${DNSE_BASE_URL}/${type}?resolution=${resolution}&symbol=${symbol}&from=${from}&to=${to}`;

  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return null;

    const json = await res.json() as DnseSeriesResponse;
    if (!Array.isArray(json.c) || json.c.length === 0) return null;

    return json.c;
  } catch {
    return null;
  }
}

async function fetchDnseLatest(symbol: string, isIndex = false) {
  const now = Math.floor(Date.now() / 1000);
  const intradaySeries = await fetchDnseSeries(symbol, isIndex, '1', now - (2 * 24 * 60 * 60), now);
  const closes = intradaySeries && intradaySeries.length > 0
    ? intradaySeries
    : await fetchDnseSeries(symbol, isIndex, '1D', now - (14 * 24 * 60 * 60), now);

  if (!closes || closes.length === 0) return null;

  const latest = closes[closes.length - 1];
  const previous = closes.length >= 2 ? closes[closes.length - 2] : latest;
  const change = latest - previous;
  const percent = previous === 0 ? 0 : (change / previous) * 100;

  return { price: latest, change, percent };
}

async function fetchCoinGecko() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true',
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getRealtimeQuotes(symbols: string[]) {
  const entries = await Promise.all(uniqueSymbols(symbols).map(async (symbol) => {
    const data = await fetchDnseLatest(symbol, false);
    return [symbol, data ? data.price * 1000 : null] as const;
  }));

  return Object.fromEntries(entries.filter((entry): entry is readonly [string, number] => entry[1] !== null));
}

export async function getMarketIndices(): Promise<MarketCard[]> {
  const formattedData: MarketCard[] = [];

  const vnData = await fetchDnseLatest('VNINDEX', true);
  if (vnData) {
    formattedData.push({
      name: 'VN-INDEX',
      price: new Intl.NumberFormat('en-US').format(vnData.price),
      change: vnData.change > 0 ? `+${vnData.change.toFixed(2)}` : vnData.change.toFixed(2),
      percent: vnData.percent > 0 ? `+${vnData.percent.toFixed(2)}%` : `${vnData.percent.toFixed(2)}%`,
      up: vnData.change >= 0,
    });
  }

  const cryptoData = await fetchCoinGecko();
  if (cryptoData?.bitcoin) {
    formattedData.push({
      name: 'BITCOIN',
      price: new Intl.NumberFormat('en-US').format(cryptoData.bitcoin.usd),
      change: cryptoData.bitcoin.usd_24h_change > 0 ? `+${cryptoData.bitcoin.usd_24h_change.toFixed(2)}` : cryptoData.bitcoin.usd_24h_change.toFixed(2),
      percent: cryptoData.bitcoin.usd_24h_change > 0 ? `+${cryptoData.bitcoin.usd_24h_change.toFixed(2)}%` : `${cryptoData.bitcoin.usd_24h_change.toFixed(2)}%`,
      up: cryptoData.bitcoin.usd_24h_change >= 0,
    });
  }

  if (cryptoData?.ethereum) {
    formattedData.push({
      name: 'ETHEREUM',
      price: new Intl.NumberFormat('en-US').format(cryptoData.ethereum.usd),
      change: cryptoData.ethereum.usd_24h_change > 0 ? `+${cryptoData.ethereum.usd_24h_change.toFixed(2)}` : cryptoData.ethereum.usd_24h_change.toFixed(2),
      percent: cryptoData.ethereum.usd_24h_change > 0 ? `+${cryptoData.ethereum.usd_24h_change.toFixed(2)}%` : `${cryptoData.ethereum.usd_24h_change.toFixed(2)}%`,
      up: cryptoData.ethereum.usd_24h_change >= 0,
    });
  }

  const goldData = await fetchGoldPrice();
  if (goldData) {
    formattedData.push({
      name: 'VANG SJC 9999',
      price: goldData.price,
      change: goldData.change,
      percent: goldData.percent,
      up: goldData.up,
    });
  } else {
    formattedData.push({
      name: 'VANG SJC 9999',
      price: '89,500,000 ₫',
      change: '--',
      percent: '--',
      up: true,
    });
  }

  return formattedData;
}

async function fetchGoldPrice(): Promise<{ price: string; change: string; percent: string; up: boolean } | null> {
  try {
    const res = await fetch('https://gateway.vnexpress.net/gold/v2/gold/getPrice', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      next: { revalidate: 0 },
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    
    const sjc = data?.data?.find((item: { name?: string }) => 
      item?.name?.toLowerCase()?.includes('sjc') || item?.name?.toLowerCase()?.includes('9999')
    );
    
    if (!sjc) return null;
    
    const price = Number(sjc.price);
    const buyPrice = Number(sjc.buy);
    const sellPrice = Number(sjc.sell);
    
    if (isNaN(price) || isNaN(buyPrice) || isNaN(sellPrice)) return null;
    
    const change = price - buyPrice;
    const percent = (change / buyPrice) * 100;
    
    return {
      price: `${new Intl.NumberFormat('vi-VN').format(price)} ₫`,
      change: change >= 0 ? `+${new Intl.NumberFormat('vi-VN').format(change)}` : new Intl.NumberFormat('vi-VN').format(change),
      percent: percent >= 0 ? `+${percent.toFixed(2)}%` : `${percent.toFixed(2)}%`,
      up: change >= 0,
    };
  } catch {
    return null;
  }
}

export async function getTrendingAssets(): Promise<TrendingAssetCard[]> {
  const stocks = [
    { ticker: 'FPT', name: 'Cong ty Co phan FPT' },
    { ticker: 'VCB', name: 'Ngan hang Vietcombank' },
    { ticker: 'HPG', name: 'Tap doan Hoa Phat' },
    { ticker: 'TCB', name: 'Ngan hang Techcombank' },
    { ticker: 'POW', name: 'Tong Cong ty Dien luc Dau khi Viet Nam' },
  ];

  const entries = await Promise.all(stocks.map(async (stock) => {
    const data = await fetchDnseLatest(stock.ticker, false);
    if (!data) return null;

    return {
      ticker: stock.ticker,
      name: stock.name,
      price: `${new Intl.NumberFormat('vi-VN').format(data.price * 1000)} VND`,
      change: data.percent > 0 ? `+${data.percent.toFixed(2)}%` : `${data.percent.toFixed(2)}%`,
      up: data.change >= 0,
    } satisfies TrendingAssetCard;
  }));

  const formattedData = entries.filter((entry): entry is TrendingAssetCard => entry !== null);
  if (formattedData.length > 0) return formattedData;

  return [
    { ticker: 'FPT', name: 'Cong ty Co phan FPT', price: '115,000 VND', change: '+2.5%', up: true },
    { ticker: 'VCB', name: 'Ngan hang Vietcombank', price: '95,400 VND', change: '+1.2%', up: true },
    { ticker: 'HPG', name: 'Tap doan Hoa Phat', price: '29,400 VND', change: '+0.8%', up: true },
  ];
}
