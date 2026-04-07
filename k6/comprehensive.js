import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, defaultHeaders, options } from './config.js';

export { options };

export default function () {
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/api/health`);
    check(res, {
      'health check passes': (r) => r.status === 200,
      'health is healthy or degraded': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status === 'healthy' || body.status === 'degraded';
        } catch {
          return false;
        }
      },
    });
  });

  group('Quotes API', () => {
    const res = http.get(`${BASE_URL}/api/quotes?tickers=HPG,FPT,VND`);
    check(res, {
      'quotes API responds': (r) => r.status === 200 || r.status === 429,
      'response time acceptable': (r) => r.timings.duration < 1000,
    });
  });

  group('Quotes with Force Refresh', () => {
    const res = http.get(`${BASE_URL}/api/quotes?tickers=HPG&forceRefresh=true`);
    check(res, {
      'force refresh responds': (r) => r.status === 200 || r.status === 429,
      'response time < 3s': (r) => r.timings.duration < 3000,
    });
  });

  sleep(1);
}
