# Deployment Guide - Portfolio Tracker

## Prerequisites

- Vercel CLI (`npm i -g vercel`)
- Vercel account with billing enabled
- Neon PostgreSQL database (or similar)
- Domain configured (optional)

---

## Environment Setup

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host/database?ssl=true

# Authentication
AUTH_SECRET=your-256-bit-secret-key-here
ADMIN_SECRET=your-admin-secret-key-here

# Debug route control (keep false in production)
ENABLE_DEBUG_ROUTES=false

# External APIs (optional)
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=your-sentry-auth-token
DNSE_API_KEY=your-dnse-api-key
COINGECKO_API_KEY=your-coingecko-api-key
GOLD_API_KEY=your-gold-api-key

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## Deployment Steps

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Link Project

```bash
vercel link
```

### 4. Add Environment Variables

**Production:**
```bash
vercel env add DATABASE_URL
vercel env add AUTH_SECRET
vercel env add SENTRY_DSN
# ... add other variables
```

**Staging:**
```bash
vercel env add DATABASE_URL --environment staging
vercel env add AUTH_SECRET --environment staging
# ... add other variables
```

### 5. Deploy

**Preview (auto on push):**
```bash
git push origin main
```

**Staging:**
```bash
vercel --environment staging
```

**Production:**
```bash
vercel --prod
```

---

## Vercel Project Settings

### Project Name
`portfolio-tracker`

### Framework
Next.js (auto-detected)

### Build Command
```bash
npm run build
```

### Output Directory
```bash
.next
```

### Environment Variables
Set in Vercel Dashboard:
- `DATABASE_URL` (Production + Preview + Development)
- `AUTH_SECRET` (Production + Preview)
- `ADMIN_SECRET` (Production + Preview)
- `ENABLE_DEBUG_ROUTES` (Production + Preview, default: `false`)
- `SENTRY_DSN` (Production + Preview)
- `NEXT_PUBLIC_APP_URL` (Production + Preview)

### Debug Routes Policy

- Keep `ENABLE_DEBUG_ROUTES=false` in production and preview by default.
- Debug routes are only available in production when BOTH are true:
	- `ENABLE_DEBUG_ROUTES=true`
	- request includes `Authorization: Bearer <ADMIN_SECRET>`
- Never expose secret prefixes or token/session details in debug responses.

---

## Branch Deployments

| Branch | Environment | URL Pattern |
|--------|-------------|------------|
| `main` | Production | `portfolio-tracker.vercel.app` |
| `staging` | Preview | `staging-portfolio-tracker.vercel.app` |
| `feature/*` | Preview | Auto-generated |

---

## Database Setup (Neon)

### 1. Create Neon Project

```bash
# Install Neon CLI
npm install -g @neonctl

# Login
neonctl auth login

# Create project
neonctl projects create --name portfolio-tracker --region sinapore

# Get connection string
neonctl connection-string --project-name portfolio-tracker
```

### 2. Run Migrations

```bash
# Using Drizzle Kit
npx drizzle-kit push

# Or run migrations manually
psql $DATABASE_URL < migrations/001_initial.sql
```

---

## Post-Deployment Checklist

- [ ] Verify `/api/health` returns 200
- [ ] Test authentication flow
- [ ] Verify price quotes endpoint
- [ ] Check Sentry error tracking
- [ ] Configure custom domain (optional)
- [ ] Set up monitoring alerts
- [ ] Test rate limiting
- [ ] Verify cron job execution

---

## Monitoring

### Health Check
```bash
curl https://your-domain.com/api/health
```

### Check Logs
```bash
vercel logs your-project
```

### View Metrics
Vercel Analytics dashboard at `vercel.com/dashboard`

---

## Troubleshooting

### Build Failures

1. Check environment variables are set
2. Verify Node.js version compatibility
3. Check for TypeScript errors: `npm run typecheck`

### Database Connection Issues

1. Verify `DATABASE_URL` format
2. Check Neon connection pool limits
3. Ensure SSL is enabled: `?ssl=true`

### Runtime Errors

1. Check Sentry for error details
2. Review Vercel function logs
3. Verify API keys are valid

---

## Rollback

To rollback to a previous deployment:

```bash
# List deployments
vercel list

#rollback
vercel rollback <deployment-url>
```

---

## Security Considerations

### Headers (Already Configured)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Strict-Transport-Security: max-age=63072000
- Referrer-Policy: strict-origin-when-cross-origin

### Recommendations
1. Enable Vercel Firewall (Pro plan)
2. Set up custom domain with SSL
3. Configure DDoS protection
4. Enable Vercel Analytics
5. Set up budget alerts

---

## Support

For issues, check:
1. Vercel Status: `vercel.statuspage.io`
2. Neon Status: `status.neon.tech`
3. Sentry Issues: `sentry.io`
