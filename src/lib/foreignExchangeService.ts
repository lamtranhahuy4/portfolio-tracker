const VIETCOMBANK_URL = 'https://portal.vietcombank.com.vn/UserControls/TVPortal.TyGia/pXML.aspx';
const FRANKFURTER_LATEST_URL = 'https://api.frankfurter.app/latest?from=USD';

export interface VcbRate {
  code: string;
  name: string;
  buyCash: number | null;
  buyTransfer: number | null;
  sell: number | null;
}

export interface InternationalRate {
  currency: string;
  rate: number;
}

export interface ForexResponse {
  vndPairs: {
    rates: VcbRate[];
    updatedAt: string;
  };
  international: {
    base: string;
    rates: InternationalRate[];
    updatedAt: string;
  };
}

export interface ForexHistoryPoint {
  date: string;
  rate: number;
}

function parseVcbValue(val: string | undefined): number | null {
  if (!val) return null;
  const num = parseFloat(val.replace(/,/g, ''));
  return isNaN(num) ? null : num;
}

async function fetchVietcombankRates(): Promise<VcbRate[]> {
  try {
    const res = await fetch(VIETCOMBANK_URL, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const exrateRegex = /<Exrate\s+([^>]+)\/>/g;

    const relevantCodes = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'SGD', 'CNY', 'KRW', 'THB', 'HKD', 'MYR', 'NZD'];
    const results: VcbRate[] = [];
    const attrRegex = /(\w+)\s*=\s*"([^"]*)"/g;

    let exrateMatch: RegExpExecArray | null;
    while ((exrateMatch = exrateRegex.exec(xml)) !== null) {
      const attrsStr = exrateMatch[1];
      const attrs: Record<string, string> = {};
      let attrMatch: RegExpExecArray | null;
      while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
        attrs[attrMatch[1]] = attrMatch[2];
      }

      const code = attrs['CurrencyCode'];
      if (!code || !relevantCodes.includes(code)) continue;

      results.push({
        code,
        name: attrs['CurrencyName']?.trim() || `${code}/VND`,
        buyCash: parseVcbValue(attrs['Buy']),
        buyTransfer: parseVcbValue(attrs['Transfer']),
        sell: parseVcbValue(attrs['Sell']),
      });
    }

    return results;
  } catch {
    return [];
  }
}

async function fetchFrankfurterRates(): Promise<{ rates: Record<string, number>; date: string } | null> {
  try {
    const res = await fetch(FRANKFURTER_LATEST_URL, {
      cache: 'no-store',
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return null;

    const json = await res.json();
    return {
      rates: json.rates,
      date: json.date,
    };
  } catch {
    return null;
  }
}

const COMMON_PAIRS = [
  'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD',
  'SEK', 'NOK', 'DKK', 'HKD', 'SGD', 'CNY', 'KRW',
  'THB', 'INR', 'MXN', 'ZAR', 'TRY', 'BRL', 'TWD',
];

function computeInternationalRates(usdRates: Record<string, number>): InternationalRate[] {
  return COMMON_PAIRS
    .filter((currency) => usdRates[currency] !== undefined)
    .map((currency) => ({ currency, rate: usdRates[currency] }));
}

export async function getForexRates(): Promise<ForexResponse> {
  const [vcbRates, frankfurter] = await Promise.all([
    fetchVietcombankRates(),
    fetchFrankfurterRates(),
  ]);

  const now = new Date().toISOString();

  const international = frankfurter
    ? {
        base: 'USD',
        rates: computeInternationalRates(frankfurter.rates),
        updatedAt: frankfurter.date || now,
      }
    : { base: 'USD', rates: [], updatedAt: now };

  return {
    vndPairs: {
      rates: vcbRates,
      updatedAt: now,
    },
    international,
  };
}

export async function getForexHistory(
  from: string,
  to: string,
  days: number = 30
): Promise<ForexHistoryPoint[]> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const url = `https://api.frankfurter.app/${startStr}..${endStr}?from=${from}&to=${to}`;

    const res = await fetch(url, {
      cache: 'no-store',
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return [];

    const json = await res.json();
    const data = json.rates as Record<string, Record<string, number>>;

    return Object.entries(data)
      .map(([date, rates]) => ({
        date,
        rate: rates[to] || 0,
      }))
      .filter((p) => p.rate > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}
