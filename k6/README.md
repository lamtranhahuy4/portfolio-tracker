# Load Testing with k6

## Prerequisites

Install k6:
```bash
brew install k6
```

## Test Scripts

### Health Check
Tests the `/api/health` endpoint:
```bash
k6 run k6/health.js
```

### Smoke Test
Quick validation with 5 concurrent users:
```bash
k6 run --env SCENARIO=smoke k6/health.js
```

### Load Test
Sustained load with 20 concurrent users for 3 minutes:
```bash
k6 run --env SCENARIO=load k6/comprehensive.js
```

### Stress Test
Gradually increase load to 100 users:
```bash
k6 run --env SCENARIO=stress k6/comprehensive.js
```

## Test Endpoints

| Script | Description | Target |
|--------|-------------|--------|
| `health.js` | Health check endpoint | `/api/health` |
| `quotes.js` | Single ticker quotes | `/api/quotes?tickers=HPG` |
| `quotes-batch.js` | Multiple tickers | `/api/quotes?tickers=HPG,FPT,VND` |
| `quotes-refresh.js` | Force refresh | `/api/quotes?tickers=HPG&forceRefresh=true` |
| `comprehensive.js` | All endpoints | Mixed |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000` | Target API base URL |
| `SCENARIO` | `default` | Test scenario to run |

## Example: Staging Test

```bash
k6 run \
  --env BASE_URL=https://staging.your-domain.com \
  --env SCENARIO=load \
  k6/comprehensive.js
```

## Output

k6 provides detailed metrics:
- `http_req_duration`: Response time (p95, p99)
- `http_req_failed`: Error rate
- `http_reqs`: Total requests

## Thresholds

Default thresholds in `config.js`:
- p95 response time < 500ms
- p99 response time < 1000ms
- Error rate < 1%
