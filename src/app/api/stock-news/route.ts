'use server';

import { NextResponse } from 'next/server';

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
const MARKETAUX_BASE_URL = 'https://api.marketaux.com/v1/news/all';
const POLYGON_BASE_URL = 'https://api.polygon.io/v2/reference/news';

const VIETNAMESE_NEWS_SOURCES = [
  { name: 'cafef', baseUrl: 'https://cafef.vn', rssPattern: (ticker: string) => `https://cafef.vn/rss/tim-kiem/${ticker}.rss`, enabled: false },
  { name: 'vietstock', baseUrl: 'https://vietstock.vn', rssPattern: (ticker: string) => `https://vietstock.vn/rss/${ticker.toLowerCase()}.rss`, enabled: false },
  { name: 'thanhnien', baseUrl: 'https://thanhnien.vn', rssPattern: () => 'https://thanhnien.vn/rss/kinh-te.rss', enabled: true },
  { name: 'vnexpress', baseUrl: 'https://vnexpress.net', rssPattern: () => 'https://vnexpress.net/rss/kinh-te.rss', enabled: true },
  { name: 'baodautu', baseUrl: 'https://baodautu.vn', rssPattern: () => 'https://baodautu.vn/rss/tin-moi-nhat.rss', enabled: true },
];

const MAX_NEWS_PER_TICKER = 6;
const LOOKBACK_DAYS = 7;
const PROVIDER_TIMEOUT_MS = 6000;
const POLYGON_LIMIT_PER_TICKER = 10;
const BLOOMBERG_RSS_URL = 'https://feeds.bloomberg.com/markets/news.rss';
const MAX_BLOOMBERG_FALLBACK = 3;
const providerWarnedKeys = new Set<string>();

interface NewsItem {
  id: number;
  category: string;
  datetime: number;
  headline: string;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

interface AlphaVantageArticle {
  title?: string;
  url?: string;
  time_published?: string;
  summary?: string;
  source?: string;
  banner_image?: string;
  category_within_source?: string;
  topics?: Array<{ topic?: string }>;
  ticker_sentiment?: Array<{ ticker?: string }>;
}

interface AlphaVantageResponse {
  feed?: AlphaVantageArticle[];
  Information?: string;
  Note?: string;
  ErrorMessage?: string;
}

interface MarketauxArticle {
  uuid?: string;
  title?: string;
  url?: string;
  published_at?: string;
  description?: string;
  source?: string;
  image_url?: string;
  entities?: Array<{ symbol?: string }>;
}

interface MarketauxResponse {
  data?: MarketauxArticle[];
  error?: string;
}

interface PolygonArticle {
  id?: string;
  title?: string;
  article_url?: string;
  published_utc?: string;
  description?: string;
  amp_url?: string;
  image_url?: string;
  tickers?: string[];
  publisher?: {
    name?: string;
  };
}

interface PolygonResponse {
  results?: PolygonArticle[];
  status?: string;
  error?: string;
}

const normalizeTicker = (value: string) => value.trim().toUpperCase();

const toUnixSeconds = (value?: string) => {
  if (!value) return Math.floor(Date.now() / 1000);

  const compact = /^(\d{8})T?(\d{6})$/;
  const compactMatch = value.match(compact);
  if (compactMatch) {
    const date = compactMatch[1];
    const time = compactMatch[2];
    const normalized = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}Z`;
    const parsed = Date.parse(normalized);
    if (!Number.isNaN(parsed)) return Math.floor(parsed / 1000);
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return Math.floor(Date.now() / 1000);
  return Math.floor(parsed / 1000);
};

const stableId = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const dedupeAndSort = (items: NewsItem[]) => {
  const seen = new Set<string>();
  const result: NewsItem[] = [];

  for (const item of items) {
    const key = `${item.url}::${item.headline.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  result.sort((a, b) => b.datetime - a.datetime);
  return result.slice(0, MAX_NEWS_PER_TICKER);
};

const buildEmptyNewsMap = (tickers: string[]) =>
  Object.fromEntries(tickers.map((ticker) => [ticker, [] as NewsItem[]]));

const fetchJsonWithTimeout = async (url: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
    });
    const raw = await response.text();

    let json: unknown = null;
    if (raw) {
      try {
        json = JSON.parse(raw);
      } catch {
        json = null;
      }
    }

    return { response, raw, json };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Provider timeout after ${PROVIDER_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const extractErrorMessage = (raw: string, json: unknown) => {
  if (json && typeof json === 'object') {
    const candidate = json as Record<string, unknown>;
    const direct = candidate.error || candidate.message || candidate.Note || candidate.Information;
    if (typeof direct === 'string' && direct.trim()) {
      return direct.trim();
    }
  }

  const compact = raw.trim().slice(0, 180);
  return compact || 'No error details';
};

const warnProviderOnce = (key: string, message: string) => {
  if (providerWarnedKeys.has(key)) return;
  providerWarnedKeys.add(key);
  console.warn(message);
};

const fetchAlphaVantageNews = async (
  tickers: string[],
  apiKey: string,
  timeFrom: string,
): Promise<Record<string, NewsItem[]>> => {
  const url = `${ALPHA_VANTAGE_BASE_URL}?function=NEWS_SENTIMENT&tickers=${encodeURIComponent(tickers.join(','))}&time_from=${timeFrom}&sort=LATEST&limit=200&apikey=${encodeURIComponent(apiKey)}`;
  const { response, raw, json } = await fetchJsonWithTimeout(url);
  if (!response.ok) {
    const details = extractErrorMessage(raw, json);
    throw new Error(`Alpha Vantage API error: ${response.status} - ${details}`);
  }

  const payload = (json ?? {}) as AlphaVantageResponse;
  if (payload.ErrorMessage) throw new Error(payload.ErrorMessage);
  if (payload.Note) throw new Error(payload.Note);

  const result: Record<string, NewsItem[]> = {};
  for (const ticker of tickers) result[ticker] = [];

  const feed = Array.isArray(payload.feed) ? payload.feed : [];
  for (const article of feed) {
    const related = new Set(
      Array.isArray(article.ticker_sentiment)
        ? article.ticker_sentiment
            .map((entry) => normalizeTicker(entry.ticker || ''))
            .filter(Boolean)
        : []
    );

    for (const ticker of tickers) {
      if (!related.has(ticker)) continue;
      const headline = (article.title || '').trim();
      const articleUrl = (article.url || '').trim();
      if (!headline || !articleUrl) continue;

      result[ticker].push({
        id: stableId(`av:${ticker}:${articleUrl}`),
        category: (article.category_within_source || article.topics?.[0]?.topic || 'news').trim(),
        datetime: toUnixSeconds(article.time_published),
        headline,
        image: (article.banner_image || '').trim(),
        related: ticker,
        source: (article.source || 'Alpha Vantage').trim(),
        summary: (article.summary || '').trim(),
        url: articleUrl,
      });
    }
  }

  return result;
};

const fetchMarketauxNews = async (
  tickers: string[],
  apiKey: string,
  publishedAfter: string,
): Promise<Record<string, NewsItem[]>> => {
  const result: Record<string, NewsItem[]> = buildEmptyNewsMap(tickers);
  const symbolsUrl = `${MARKETAUX_BASE_URL}?api_token=${encodeURIComponent(apiKey)}&symbols=${encodeURIComponent(tickers.join(','))}&language=en&filter_entities=true&limit=50&published_after=${encodeURIComponent(publishedAfter)}`;
  const symbolsRequest = await fetchJsonWithTimeout(symbolsUrl);

  // Marketaux often returns 400 for unsupported symbols (e.g. some non-US tickers).
  // Fallback to per-ticker search to keep feed populated where possible.
  if (!symbolsRequest.response.ok && symbolsRequest.response.status !== 400) {
    const details = extractErrorMessage(symbolsRequest.raw, symbolsRequest.json);
    throw new Error(`Marketaux API error: ${symbolsRequest.response.status} - ${details}`);
  }

  const mapArticlesToTickers = (articles: MarketauxArticle[]) => {
    for (const article of articles) {
      const relatedTickers = new Set(
        Array.isArray(article.entities)
          ? article.entities
              .map((entity) => normalizeTicker(entity.symbol || ''))
              .filter(Boolean)
          : []
      );

      const headline = (article.title || '').trim();
      const articleUrl = (article.url || '').trim();
      if (!headline || !articleUrl) continue;

      for (const ticker of tickers) {
        const matchesByEntity = relatedTickers.has(ticker);
        const matchesByHeadline = new RegExp(`\\b${ticker}\\b`, 'i').test(headline);
        if (!matchesByEntity && !matchesByHeadline) continue;
        result[ticker].push({
          id: stableId(`mx:${ticker}:${article.uuid || articleUrl}`),
          category: 'news',
          datetime: toUnixSeconds(article.published_at),
          headline,
          image: (article.image_url || '').trim(),
          related: ticker,
          source: (article.source || 'Marketaux').trim(),
          summary: (article.description || '').trim(),
          url: articleUrl,
        });
      }
    }
  };

  if (symbolsRequest.response.ok) {
    const payload = (symbolsRequest.json ?? {}) as MarketauxResponse;
    if (payload.error) throw new Error(payload.error);
    const articles = Array.isArray(payload.data) ? payload.data : [];
    mapArticlesToTickers(articles);
    return result;
  }

  for (const ticker of tickers) {
    const searchUrl = `${MARKETAUX_BASE_URL}?api_token=${encodeURIComponent(apiKey)}&search=${encodeURIComponent(ticker)}&language=en&limit=15&published_after=${encodeURIComponent(publishedAfter)}`;
    const searchRequest = await fetchJsonWithTimeout(searchUrl);
    if (!searchRequest.response.ok) {
      const details = extractErrorMessage(searchRequest.raw, searchRequest.json);
      console.warn(`Marketaux fallback failed for ${ticker}: ${searchRequest.response.status} - ${details}`);
      continue;
    }

    const payload = (searchRequest.json ?? {}) as MarketauxResponse;
    const articles = Array.isArray(payload.data) ? payload.data : [];
    for (const article of articles) {
      const headline = (article.title || '').trim();
      const articleUrl = (article.url || '').trim();
      if (!headline || !articleUrl) continue;

      result[ticker].push({
        id: stableId(`mxs:${ticker}:${article.uuid || articleUrl}`),
        category: 'news',
        datetime: toUnixSeconds(article.published_at),
        headline,
        image: (article.image_url || '').trim(),
        related: ticker,
        source: (article.source || 'Marketaux').trim(),
        summary: (article.description || '').trim(),
        url: articleUrl,
      });
    }
  }

  return result;
};

const fetchPolygonNews = async (
  tickers: string[],
  apiKey: string,
  publishedGte: string,
): Promise<Record<string, NewsItem[]>> => {
  const result: Record<string, NewsItem[]> = buildEmptyNewsMap(tickers);

  for (const ticker of tickers) {
    const url = `${POLYGON_BASE_URL}?ticker=${encodeURIComponent(ticker)}&published_utc.gte=${encodeURIComponent(publishedGte)}&order=desc&sort=published_utc&limit=${POLYGON_LIMIT_PER_TICKER}&apiKey=${encodeURIComponent(apiKey)}`;
    const request = await fetchJsonWithTimeout(url);

    if (!request.response.ok) {
      const details = extractErrorMessage(request.raw, request.json);
      if (request.response.status === 429) {
        warnProviderOnce('polygon:429', `Polygon rate limit hit: ${details}`);
        break;
      }

      if (request.response.status === 403) {
        warnProviderOnce('polygon:403', `Polygon access denied: ${details}`);
        continue;
      }

      throw new Error(`Polygon API error for ${ticker}: ${request.response.status} - ${details}`);
    }

    const payload = (request.json ?? {}) as PolygonResponse;
    if (payload.error) throw new Error(payload.error);

    const results = Array.isArray(payload.results) ? payload.results : [];
    for (const article of results) {
      const headline = (article.title || '').trim();
      const articleUrl = (article.article_url || article.amp_url || '').trim();
      if (!headline || !articleUrl) continue;

      const relatedTickers = new Set((article.tickers || []).map((t) => normalizeTicker(t)));
      if (relatedTickers.size > 0 && !relatedTickers.has(ticker)) continue;

      result[ticker].push({
        id: stableId(`pg:${ticker}:${article.id || articleUrl}`),
        category: 'news',
        datetime: toUnixSeconds(article.published_utc),
        headline,
        image: (article.image_url || '').trim(),
        related: ticker,
        source: (article.publisher?.name || 'Polygon').trim(),
        summary: (article.description || '').trim(),
        url: articleUrl,
      });
    }
  }

  return result;
};

interface RssItem {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  'content:encoded'?: string;
}

interface RssChannel {
  item?: RssItem[];
}

interface RssFeed {
  channel?: RssChannel;
}

const parseRssXml = (xmlString: string): RssItem[] => {
  const items: RssItem[] = [];
  const itemMatches = [...xmlString.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
  
  for (const match of itemMatches) {
    const itemXml = match[1];
    const item: RssItem = {};
    
    const getValue = (tag: string) => {
      const m = itemXml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return m ? (m[1] || m[2] || '').trim() : '';
    };
    
    item.title = getValue('title');
    item.link = getValue('link');
    item.pubDate = getValue('pubDate');
    item.description = getValue('description');
    item['content:encoded'] = getValue('content:encoded');
    
    if (item.title || item.link) {
      items.push(item);
    }
  }
  
  return items;
};

const parseRssJson = (jsonString: string): RssItem[] => {
  try {
    const feed = JSON.parse(jsonString);
    if (Array.isArray(feed)) {
      return feed.slice(0, 20).map((item) => ({
        title: item.title || '',
        link: item.link || item.guid || '',
        pubDate: item.pubDate || item.isoDate || '',
        description: item.description || '',
      }));
    }
    if (feed.channel?.item) {
      return (Array.isArray(feed.channel.item) ? feed.channel.item : [feed.channel.item]).slice(0, 20);
    }
    if (feed.items) {
      return (Array.isArray(feed.items) ? feed.items : [feed.items]).slice(0, 20);
    }
  } catch {
    // Ignore parse errors
  }
  return [];
};

const fetchBloombergWorldNews = async (): Promise<NewsItem[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

    const response = await fetch(BLOOMBERG_RSS_URL, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PortfolioTracker/1.0)' },
    });

    clearTimeout(timeoutId);
    if (!response.ok) return [];

    const raw = await response.text();
    const items = parseRssXml(raw);
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    const news: NewsItem[] = [];
    for (const item of items.slice(0, 10)) {
      const pubTime = item.pubDate ? new Date(item.pubDate).getTime() : now;
      if (pubTime < oneDayAgo) continue;

      const headline = item.title || '';
      const articleUrl = item.link || '';
      if (!headline || !articleUrl) continue;

      news.push({
        id: stableId(`bloomberg:${articleUrl}`),
        category: 'world-markets',
        datetime: Math.floor(pubTime / 1000),
        headline: headline.replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
        image: '',
        related: 'WORLD',
        source: 'Bloomberg Markets',
        summary: (item.description || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, '').trim().slice(0, 300),
        url: articleUrl,
      });
    }

    return news;
  } catch {
    return [];
  }
};

const fetchVietnameseNews = async (
  tickers: string[],
): Promise<Record<string, NewsItem[]>> => {
  const result: Record<string, NewsItem[]> = buildEmptyNewsMap(tickers);
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - LOOKBACK_DAYS);
  const lookbackTime = lookbackDate.getTime();

  const tickerRegexes = tickers.map((t) => new RegExp(`\\b${t}\\b`, 'i'));

  const matchesTicker = (text: string): string | null => {
    for (let i = 0; i < tickers.length; i++) {
      if (tickerRegexes[i].test(text)) {
        return tickers[i];
      }
    }
    return null;
  };

  for (const source of VIETNAMESE_NEWS_SOURCES) {
    if (!source.enabled) continue;

    try {
      const rssUrl = source.rssPattern(tickers[0] || 'VN30');
      const request = await fetchJsonWithTimeout(rssUrl);

      if (!request.response.ok) continue;

      const items = request.raw.includes('<item>')
        ? parseRssXml(request.raw)
        : parseRssJson(request.raw);

      for (const item of items) {
        const pubTime = item.pubDate ? new Date(item.pubDate).getTime() : Date.now();
        if (pubTime < lookbackTime) continue;

        const headline = item.title || '';
        const articleUrl = item.link || '';
        if (!headline || !articleUrl) continue;

        const content = item.description || item['content:encoded'] || '';
        const matchedTicker = matchesTicker(headline + ' ' + content);
        if (!matchedTicker) continue;

        result[matchedTicker].push({
          id: stableId(`vn:${source.name}:${matchedTicker}:${articleUrl}`),
          category: 'news',
          datetime: Math.floor(pubTime / 1000),
          headline: headline.replace(/<[^>]*>/g, '').trim(),
          image: '',
          related: matchedTicker,
          source: source.name,
          summary: (content.replace(/<[^>]*>/g, '').trim()).slice(0, 500),
          url: articleUrl,
        });
      }
    } catch {
      // Silently skip failed sources
    }
  }

  return result;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickers = searchParams.get('tickers');

  if (!tickers) {
    return NextResponse.json({ error: 'Missing tickers parameter' }, { status: 400 });
  }

  const tickerList = Array.from(new Set(
    tickers
      .split(',')
      .map((value) => normalizeTicker(value))
      .filter(Boolean)
  ));

  if (tickerList.length === 0) {
    return NextResponse.json({ news: {} });
  }

  const alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY;
  const marketauxApiKey = process.env.MARKETAUX_API_KEY;
  const polygonApiKey = process.env.POLYGON_API_KEY;

  if (!alphaVantageApiKey && !marketauxApiKey && !polygonApiKey) {
    return NextResponse.json(
      { error: 'Missing news API keys (ALPHA_VANTAGE_API_KEY, MARKETAUX_API_KEY, POLYGON_API_KEY)' },
      { status: 500 }
    );
  }

  const now = new Date();
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - LOOKBACK_DAYS);

  const alphaTimeFrom = `${fromDate.toISOString().slice(0, 10).replace(/-/g, '')}T0000`;
  const marketauxPublishedAfter = fromDate.toISOString().slice(0, 10);
  const polygonPublishedGte = fromDate.toISOString();

  const sourceCalls: Array<Promise<Record<string, NewsItem[]>>> = [];

  if (alphaVantageApiKey) {
    sourceCalls.push(
      fetchAlphaVantageNews(tickerList, alphaVantageApiKey, alphaTimeFrom).catch((error) => {
        warnProviderOnce('alpha:error', `Alpha Vantage news fetch failed: ${error instanceof Error ? error.message : String(error)}`);
        return buildEmptyNewsMap(tickerList);
      })
    );
  }

  if (marketauxApiKey) {
    sourceCalls.push(
      fetchMarketauxNews(tickerList, marketauxApiKey, marketauxPublishedAfter).catch((error) => {
        warnProviderOnce('marketaux:error', `Marketaux news fetch failed: ${error instanceof Error ? error.message : String(error)}`);
        return buildEmptyNewsMap(tickerList);
      })
    );
  }

  if (polygonApiKey) {
    sourceCalls.push(
      fetchPolygonNews(tickerList, polygonApiKey, polygonPublishedGte).catch((error) => {
        warnProviderOnce('polygon:error', `Polygon news fetch failed: ${error instanceof Error ? error.message : String(error)}`);
        return buildEmptyNewsMap(tickerList);
      })
    );
  }

  sourceCalls.push(
    fetchVietnameseNews(tickerList).catch((error) => {
      warnProviderOnce('vietnamese:error', `Vietnamese news fetch failed: ${error instanceof Error ? error.message : String(error)}`);
      return buildEmptyNewsMap(tickerList);
    })
  );

  try {
    const sourceResults = await Promise.all(sourceCalls);
    const merged: Record<string, NewsItem[]> = Object.fromEntries(
      tickerList.map((ticker) => [ticker, []])
    );

    for (const sourceMap of sourceResults) {
      for (const ticker of tickerList) {
        merged[ticker].push(...(sourceMap[ticker] || []));
      }
    }

    for (const ticker of tickerList) {
      merged[ticker] = dedupeAndSort(merged[ticker]);
    }

    return NextResponse.json({ news: merged });
  } catch (error) {
    console.error('Error fetching stock news:', error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
