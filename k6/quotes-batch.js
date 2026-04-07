import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, defaultHeaders, options } from './config.js';

export { options };

const tickerCombos = [
  'HPG,FPT',
  'VND,SSI,ACB',
  'HPG,FPT,VND',
  'SSI,ACB,CTG',
  'HPG,FPT,VND,SSI',
];

export default function () {
  const combo = tickerCombos[Math.floor(Math.random() * tickerCombos.length)];
  const url = `${BASE_URL}/api/quotes?tickers=${combo}`;

  const res = http.get(url, { headers: defaultHeaders });

  check(res, {
    'batch quotes status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
    'response contains quotes array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.quotes);
      } catch {
        return false;
      }
    },
    'returns correct number of quotes': (r) => {
      try {
        const body = JSON.parse(r.body);
        const expected = combo.split(',').length;
        return body.quotes && body.quotes.length === expected;
      } catch {
        return false;
      }
    },
  });

  sleep(2);
}
