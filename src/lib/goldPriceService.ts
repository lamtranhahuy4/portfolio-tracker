export interface GoldPriceItem {
  type: string;
  name: string;
  buy: number;
  sell: number;
  changeBuy: number;
  changeSell: number;
  currency: string;
}

export interface GoldHistoryPoint {
  date: string;
  buy: number;
  sell: number;
}

export interface GoldResponse {
  prices: GoldPriceItem[];
  updatedAt: string;
}

interface VangTodayPrice {
  name: string;
  buy: number;
  sell: number;
  change_buy: number;
  change_sell: number;
  currency: string;
}

interface VangTodayResponse {
  success: boolean;
  timestamp: number;
  prices: Record<string, VangTodayPrice>;
}

interface VangTodayHistoryResponse {
  success: boolean;
  history: {
    date: string;
    prices: Record<string, {
      name: string;
      buy: number;
      sell: number;
      day_change_buy: number;
      day_change_sell: number;
    }>;
  }[];
}

const RELEVANT_TYPES = ['SJL1L10', 'SJ9999', 'XAUUSD', 'DOHNL', 'DOHCML', 'BT9999NTT'];

export async function getGoldPrices(): Promise<GoldResponse> {
  try {
    const res = await fetch('https://www.vang.today/api/prices', {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return { prices: [], updatedAt: new Date().toISOString() };

    const json: VangTodayResponse = await res.json();
    if (!json.success) return { prices: [], updatedAt: new Date().toISOString() };

    const prices: GoldPriceItem[] = RELEVANT_TYPES
      .filter((type) => json.prices[type])
      .map((type) => {
        const p = json.prices[type];
        return {
          type,
          name: p.name,
          buy: p.buy,
          sell: p.sell,
          changeBuy: p.change_buy,
          changeSell: p.change_sell,
          currency: p.currency,
        };
      });

    return {
      prices,
      updatedAt: new Date(json.timestamp * 1000).toISOString(),
    };
  } catch {
    return { prices: [], updatedAt: new Date().toISOString() };
  }
}

export async function getGoldHistory(
  type: string,
  days: number = 30
): Promise<GoldHistoryPoint[]> {
  try {
    const res = await fetch(
      `https://www.vang.today/api/prices?type=${encodeURIComponent(type)}&days=${days}`,
      { cache: 'no-store', headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!res.ok) return [];

    const json: VangTodayHistoryResponse = await res.json();
    if (!json.history) return [];

    return json.history
      .filter((day) => day.prices[type] && (day.prices[type].buy > 0 || day.prices[type].sell > 0))
      .map((day) => ({
        date: day.date,
        buy: day.prices[type].buy,
        sell: day.prices[type].sell,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}
