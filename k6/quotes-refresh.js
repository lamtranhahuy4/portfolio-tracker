import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, defaultHeaders, options } from './config.js';

export { options };

export default function () {
  const ticker = 'HPG';
  const url = `${BASE_URL}/api/quotes?tickers=${ticker}&forceRefresh=true`;

  const res = http.get(url, { headers: defaultHeaders });

  check(res, {
    'force refresh status is 200': (r) => r.status === 200,
    'response time < 3s': (r) => r.timings.duration < 3000,
    'response contains quote data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.quotes && body.quotes.length > 0;
      } catch {
        return false;
      }
    },
    'response has timestamp': (r) => {
      try {
        const body = JSON.parse(r.body);
        return !!body.timestamp;
      } catch {
        return false;
      }
    },
  });

  sleep(2);
}
