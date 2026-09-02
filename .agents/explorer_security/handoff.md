# Handoff Report — Explorer Security (R1 Security Review)

**Agent:** `explorer_security`  
**Milestone:** M1 (Security Review)  
**Status:** Hard Handoff (Task Complete)  
**Report Artifact:** `/Users/lamtranhahuy/Project/portfolio-tracker/.agents/explorer_security/report.md`

---

## 1. Observation

Direct code observations verified across the codebase:

1. **Unauthenticated Public Server Action RPC in `src/actions/forex.ts:1-6`:**
   - Code:
     ```typescript
     'use server';
     import { snapshotDailyRates } from '@/lib/foreignExchangeService';
     export const triggerForexSnapshot = snapshotDailyRates;
     ```
   - In Next.js App Router, every export from a `'use server'` file generates a publicly callable POST endpoint. `snapshotDailyRates` performs no authentication checks and executes database inserts.

2. **Exposed Test Endpoint in Production in `src/app/api/test-post/route.ts:1-7`:**
   - Code:
     ```typescript
     import { NextResponse } from 'next/server';
     export async function POST() {
       console.log('[TEST] POST /api/test-post called successfully!');
       return NextResponse.json({ success: true, message: 'POST works!' });
     }
     ```
   - Unlike `src/app/api/test/route.ts` which has `if (process.env.NODE_ENV === 'production') return 404;`, `test-post` has no environment guard, auth check, or rate limiting.

3. **Timing Side-Channel Attacks in Secret Validations:**
   - `src/app/api/admin/users/route.ts:13`: `return authHeader === \`Bearer ${ADMIN_SECRET}\`;`
   - `src/app/api/cron/forex-snapshot/route.ts:13`: `if (authHeader !== \`Bearer ${cronSecret}\`)`
   - `src/app/api/cron/update-prices/route.ts:18`: `if (authHeader !== \`Bearer ${cronSecret}\`)`
   - `src/lib/debugAccess.ts:8`: `return authHeader === \`Bearer ${adminSecret}\`;`
   - All four locations use non-constant-time JavaScript string equality operators (`===` / `!==`) instead of `crypto.timingSafeEqual`.

4. **Unauthenticated Outbound API Flooding in `src/app/api/stock-news/route.ts:564-659`:**
   - `/api/stock-news` accepts arbitrary tickers and makes external HTTP requests to Alpha Vantage, Marketaux, and Polygon without calling `getCurrentUser()` / `requireUser()` and without calling `checkRateLimit()`.

5. **IP Spoofing Vulnerability in `src/lib/apiRateLimiter.ts:21-25`:**
   - Code:
     ```typescript
     const forwarded = request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for');
     const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
     ```
   - Falls back to first element of `X-Forwarded-For`, which is client-controlled when running outside Vercel Edge.

6. **CSV Formula Injection (CWE-1236) in `src/lib/exportCsv.ts:4`:**
   - Code:
     ```typescript
     ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
     ```
   - Cells beginning with `=`, `+`, `-`, `@`, `\t`, `\r` are not sanitized or prepended with `'`.

7. **SSRF Query Parameter Tampering in `src/lib/foreignExchangeService.ts:265`:**
   - Code:
     ```typescript
     const frankUrl = `https://api.frankfurter.app/${startStr}..${endStr}?from=${from}&to=${to}`;
     ```
   - Query parameters `from` and `to` from `/api/foreign-exchange/history` are directly concatenated into the Frankfurter API URL.

8. **CSRF Bypass on Unset `NEXT_PUBLIC_APP_URL` in `src/lib/auth.ts:250-252`:**
   - Code:
     ```typescript
     const appUrl = process.env.NEXT_PUBLIC_APP_URL;
     if (!appUrl) return;
     ```
   - Silently returns without verifying `origin` or `referer` headers if `NEXT_PUBLIC_APP_URL` is omitted from environment variables in production.

9. **Multi-Tenant Isolation & Zero IDOR:**
   - Inspected all CRUD operations across `transactions`, `cashLedgerEvents`, `openingPositions`, `portfolioSettings`, `importBatches`, `priceAlerts`, and `watchlist`. All operations enforce `userId: user.id` filtering.

10. **Cached `getCurrentUser` Scoping in `src/lib/auth.ts:184-223`:**
    - Wrapped in React's `cache()`. Invokes `await cookies()` and `await headers()` per request, ensuring request-level isolation with zero cross-request session leakage.

---

## 2. Logic Chain

1. **Server Action RPC Exposure:** In Next.js App Router, any export in a `'use server'` file becomes a public HTTP POST endpoint. Because `triggerForexSnapshot` in `src/actions/forex.ts` directly references `snapshotDailyRates` without calling `requireUser()`, remote users can trigger DB writes without authentication.
2. **Timing Attack Surface:** Standard string comparison operators (`===`) abort comparison on the first mismatched byte. An attacker sending thousands of requests while measuring microsecond latency differences can deduce the `ADMIN_SECRET` and `CRON_SECRET` values character by character.
3. **Third-Party Quota Exhaustion:** The `stock-news` API route requires no user session and imposes no rate limits. Attackers can flood the endpoint with unique ticker lists, triggering downstream paid API queries to Alpha Vantage, Marketaux, and Polygon until quotas are exhausted.
4. **Rate Limit Bypass:** The in-memory rate limiter relies on `request.headers.get('x-forwarded-for')?.split(',')[0]`. Since clients can supply arbitrary `X-Forwarded-For` headers when not stripped by edge proxies, rate limit counters can be evaded by randomizing the header per request.
5. **Spreadsheet Client Code Execution:** Spreadsheet software treats cells starting with `=`, `+`, `-`, or `@` as formulas. Unsanitized export of user-supplied text fields (notes, ticker descriptions) allows Formula Injection into exported CSV files.

---

## 3. Caveats

1. **Dual Auth Intent:** The codebase maintains Better Auth alongside a custom session cookie system (`portfolio_session` with `sessions` table). Better Auth has `emailAndPassword: { enabled: false }`, while custom actions `signUpAction` and `signInAction` handle email/password credentials. If the long-term plan is to migrate exclusively to OAuth via Better Auth, custom auth actions in `src/actions/auth.ts` should eventually be deprecated.
2. **In-Memory Rate Limiting:** `src/lib/apiRateLimiter.ts` uses an in-memory `Map`. On serverless infrastructure (Vercel Lambdas), this rate limiter resets per cold start and is not shared across lambda instances. For distributed environments, Redis (e.g. Upstash Redis) is recommended.
3. **No External Network Probing:** Audit was performed via local static analysis and source code tracing without executing active external penetration tests against live third-party APIs.

---

## 4. Conclusion

The application has excellent data tenant isolation and robust database-backed auth brute-force protection. However, 1 Critical, 3 High, 5 Medium, and 1 Low vulnerabilities were identified in Server Action authorization, timing-safe cryptographic comparisons, rate limiting IP extraction, CSV formula sanitization, and external URL parameter handling. All vulnerabilities have been documented in `/Users/lamtranhahuy/Project/portfolio-tracker/.agents/explorer_security/report.md` with line numbers, explanations, and before/after code remediation.

---

## 5. Verification Method

To independently verify all findings:

1. **Verify Unauthenticated Server Action RPC:**
   - Inspect `src/actions/forex.ts:1-6` to confirm `'use server'` with unauthenticated `snapshotDailyRates` export.
2. **Verify Timing Attack Comparisons:**
   - Inspect `src/app/api/admin/users/route.ts:13`, `src/app/api/cron/forex-snapshot/route.ts:13`, `src/app/api/cron/update-prices/route.ts:18`, and `src/lib/debugAccess.ts:8`.
3. **Verify Exposed Test Route:**
   - Inspect `src/app/api/test-post/route.ts:1-7` and compare with `src/app/api/test/route.ts:4-6`.
4. **Verify Stock News Quota Vector:**
   - Inspect `src/app/api/stock-news/route.ts:564-659` to confirm absence of `requireUser()` and `checkRateLimit()`.
5. **Verify Rate Limiter IP Extraction:**
   - Inspect `src/lib/apiRateLimiter.ts:21-25`.
6. **Run Existing Test Suite:**
   - Execute vitest tests:
     ```bash
     npm test
     ```
     Confirm all unit and integration tests pass.
