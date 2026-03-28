import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function GET() {
  try {
    const symbols = ['^VNINDEX', '^GSPC', 'BTC-USD', 'GC=F'];
    const results = [];
    const errors = [];
    
    // check if yahooFinance is imported correctly
    if (!yahooFinance || !yahooFinance.quote) {
      return NextResponse.json({ error: 'yahooFinance is undefined or quote is missing', yahooFinanceType: typeof yahooFinance });
    }

    for (const symbol of symbols) {
      try {
        // @ts-ignore - type definition in yahoo-finance2 causes 'this' context error with ModuleThis
        const data = await yahooFinance.quote(symbol);
        results.push(data);
      } catch (e: any) {
        errors.push({ symbol, message: e.message, name: e.name, stack: e.stack });
      }
    }
    return NextResponse.json({ results, errors });
  } catch (error: any) {
    return NextResponse.json({ error: 'Outer error', message: error.message, stack: error.stack });
  }
}
