// Test script to verify market data APIs
// Run with: node --experimental-fetch src/scripts/test-market-apis.ts

async function testAPIs() {
  console.log('=== Testing Market Data APIs ===\n');

  // Test 1: DNSE VN-INDEX
  console.log('1. Testing DNSE VN-INDEX API...');
  try {
    const now = Math.floor(Date.now() / 1000);
    const url = `https://services.entrade.com.vn/chart-api/v2/ohlcs/index?resolution=1&symbol=VNINDEX&from=${now - 86400 * 2}&to=${now}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2).slice(0, 500));
    if (data.c && data.c.length > 0) {
      console.log('✅ DNSE working, latest close:', data.c[data.c.length - 1]);
    } else {
      console.log('❌ DNSE returned empty data');
    }
  } catch (e) {
    console.log('❌ DNSE error:', e);
  }

  // Test 2: CoinGecko
  console.log('\n2. Testing CoinGecko API...');
  try {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true';
    const res = await fetch(url);
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    if (data.bitcoin) {
      console.log('✅ CoinGecko working, BTC:', data.bitcoin.usd);
    } else {
      console.log('❌ CoinGecko returned empty data');
    }
  } catch (e) {
    console.log('❌ CoinGecko error:', e);
  }

  // Test 3: VNExpress Gold
  console.log('\n3. Testing VNExpress Gold API...');
  try {
    const url = 'https://gateway.vnexpress.net/gold/v2/gold/getPrice';
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2).slice(0, 1000));
  } catch (e) {
    console.log('❌ VNExpress error:', e);
  }
}

testAPIs();
