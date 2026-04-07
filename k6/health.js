import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, options } from './config.js';

export { options };

export default function () {
  const res = http.get(`${BASE_URL}/api/health`);

  check(res, {
    'health check status is 200': (r) => r.status === 200,
    'health check returns healthy status': (r) => {
      const body = JSON.parse(r.body);
      return body.status === 'healthy' || body.status === 'degraded';
    },
    'health check has database check': (r) => {
      const body = JSON.parse(r.body);
      return body.checks && body.checks.database;
    },
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
