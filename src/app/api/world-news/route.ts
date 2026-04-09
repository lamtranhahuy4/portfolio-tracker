'use server';

import { NextResponse } from 'next/server';

const BLOOMBERG_RSS_URL = 'https://feeds.bloomberg.com/markets/news.rss';
const PROVIDER_TIMEOUT_MS = 8000;

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

interface RssItem {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
}

const stableId = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

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
    
    if (item.title || item.link) {
      items.push(item);
    }
  }
  
  return items;
};

const fetchBloombergWorldNews = async (limit: number = 5): Promise<NewsItem[]> => {
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
    for (const item of items.slice(0, limit * 2)) {
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

      if (news.length >= limit) break;
    }

    return news;
  } catch {
    return [];
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '5', 10), 10);

  const news = await fetchBloombergWorldNews(limit);

  return NextResponse.json({ news });
}
