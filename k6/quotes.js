import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, defaultHeaders, options } from './config.js';

export { options };

const tickers = ['HPG', 'FPT', 'VND', 'SSI', 'ACB'];

export default function () {
  const ticker = tickers[Math.floor(Math.random() * tickers.length)];
  const url = `${BASE_URL}/api/quotes?tickers=${ticker}`;

  const res = http.get(url, { headers: defaultHeaders });

  check(res, {
    'quotes response status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    'response time < 1s': (r) => r.timings.duration < 1000,
    'response contains quotes array': (r) => {
      if (r.status !== 200) return true;
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.quotes);
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}
