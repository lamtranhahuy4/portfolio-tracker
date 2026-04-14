# Vercel Deployment Checklist

## Pre-Deployment ✅

- [x] `vercel.json` configured with security headers
- [x] Environment variables documented in `.env.example`
- [x] Database schema ready for production
- [ ] Environment variables set in Vercel Dashboard

## Vercel Dashboard Setup

### 1. Project Settings
- [ ] Name: `portfolio-tracker`
- [ ] Framework: Next.js (auto)
- [ ] Root Directory: `.`
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `.next`

### 2. Environment Variables (Production)
- [ ] `DATABASE_URL` - Neon connection string
- [ ] `AUTH_SECRET` - Random 256-bit key
- [ ] `ADMIN_SECRET` - Random 256-bit key for protected admin/debug access
- [ ] `CRON_SECRET` - Random secret for cron jobs
- [ ] `ENABLE_DEBUG_ROUTES=false` - Keep debug endpoints disabled by default
- [ ] `SENTRY_DSN` - Sentry DSN URL
- [ ] `NEXT_PUBLIC_APP_URL` - Production URL

### 3. Environment Variables (Preview/Staging)
- [ ] Same as production with staging database
- [ ] `ENABLE_DEBUG_ROUTES=false` unless temporary authorized troubleshooting is required
- [ ] Staging URL for `NEXT_PUBLIC_APP_URL`

### 4. Domains
- [ ] Production domain configured (optional)
- [ ] SSL certificate active

### 5. Security
- [ ] Password protection on staging (optional)
- [ ] Authentication on preview deployments

---

## Quick Deploy Commands

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Link project
vercel link

# 4. Deploy to preview
vercel

# 5. Deploy to production
vercel --prod

# 6. Deploy staging environment
vercel --environment staging
```

---

## Post-Deployment Verification

### Health Check
```bash
curl https://your-domain.com/api/health
# Expected: {"status":"healthy",...}
```

### Database Connection
```bash
curl https://your-domain.com/api/health | jq '.checks.database.status'
# Expected: "pass"
```

### Rate Limiting
```bash
for i in {1..65}; do curl -s -o /dev/null -w "%{http_code}\n" https://your-domain.com/api/quotes?tickers=HPG; done
# Expected: First 60 return 200, rest return 429
```

### Debug Routes Safety
```bash
# Production should be blocked by default (404)
curl -i https://your-domain.com/api/check-env

# If temporary troubleshooting is approved:
# 1) set ENABLE_DEBUG_ROUTES=true
# 2) call with admin secret
curl -i https://your-domain.com/api/check-env \
	-H "Authorization: Bearer $ADMIN_SECRET"
```

---

## Monitoring Setup

### Vercel Analytics
- [ ] Enable Vercel Analytics in project settings

### Sentry Integration
- [ ] Verify DSN is set
- [ ] Test error capturing by triggering a test error
- [ ] Check Sentry dashboard for issues

### Uptime Monitoring
- [ ] Set up uptime check on `/api/health`
- [ ] Configure alerts for downtime

---

## Load Testing (Before Production)

```bash
# Run load tests against staging
k6 run k6/comprehensive.js
```

---

## Deployment Complete ✅

Once all checks pass:
1. Update this checklist with dates
2. Share production URL with stakeholders
3. Schedule post-deployment review (24h later)
