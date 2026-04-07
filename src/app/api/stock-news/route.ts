'use server';

import { NextResponse } from 'next/server';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickers = searchParams.get('tickers');

  if (!tickers) {
    return NextResponse.json({ error: 'Missing tickers parameter' }, { status: 400 });
  }

  const tickerList = tickers.split(',').map(t => t.trim()).filter(Boolean);
  if (tickerList.length === 0) {
    return NextResponse.json({ news: {} });
  }

  const finnhubApiKey = process.env.FINNHUB_API_KEY;
  if (!finnhubApiKey) {
    return NextResponse.json({ error: 'FINNHUB_API_KEY not configured' }, { status: 500 });
  }

  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setDate(fromDate.getDate() - 7);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  try {
    const newsMap: Record<string, NewsItem[]> = {};

    await Promise.all(
      tickerList.map(async (ticker) => {
        try {
          const url = `${FINNHUB_BASE_URL}/company-news?symbol=${encodeURIComponent(ticker)}&from=${formatDate(fromDate)}&to=${formatDate(today)}&token=${finnhubApiKey}`;
          const response = await fetch(url, { next: { revalidate: 900 } });

          if (!response.ok) {
            console.error(`Finnhub API error for ${ticker}: ${response.status}`);
            newsMap[ticker] = [];
            return;
          }

          const articles: NewsItem[] = await response.json();
          newsMap[ticker] = articles.slice(0, 2).map((article) => ({
            id: article.id,
            category: article.category,
            datetime: article.datetime,
            headline: article.headline,
            image: article.image,
            related: article.related,
            source: article.source,
            summary: article.summary,
            url: article.url,
          }));
        } catch (error) {
          console.error(`Error fetching news for ${ticker}:`, error);
          newsMap[ticker] = [];
        }
      })
    );

    return NextResponse.json({ news: newsMap });
  } catch (error) {
    console.error('Error fetching stock news:', error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
