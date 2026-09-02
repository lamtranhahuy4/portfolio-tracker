## 2026-09-01T07:33:07Z
You are the Lead Planning Engineer / Worker for the Sprint 5 Implementation Planning milestone.

Your working directory is: /Users/lamtranhahuy/Project/portfolio-tracker/.agents/worker_planner
Project workspace: /Users/lamtranhahuy/Project/portfolio-tracker
Original request: /Users/lamtranhahuy/Project/portfolio-tracker/.agents/ORIGINAL_REQUEST.md

Source Reports to read and analyze:
- /Users/lamtranhahuy/Project/portfolio-tracker/.agents/ORIGINAL_REQUEST.md
- /Users/lamtranhahuy/Project/portfolio-tracker/.agents/explorer_security/report.md
- /Users/lamtranhahuy/Project/portfolio-tracker/.agents/explorer_performance/report.md
- /Users/lamtranhahuy/Project/portfolio-tracker/.agents/explorer_code_quality/report.md
- /Users/lamtranhahuy/Project/portfolio-tracker/.agents/explorer_architecture/report.md
- /Users/lamtranhahuy/Project/portfolio-tracker/.agents/verifier_auditor/audit_report.md

Mission Objectives:
You must author the comprehensive, production-grade Sprint 5 implementation plan document at:
`/Users/lamtranhahuy/Project/portfolio-tracker/sprint_5_plan.md`

## 2026-09-01T07:40:00Z
Refine and update `/Users/lamtranhahuy/Project/portfolio-tracker/sprint_5_plan.md` to incorporate the 7 critical refinements identified by the Independent Reviewers and Adversarial Challengers:

1. **[DATABASE DRIVER MIGRATION - Phase 1 Priority]**:
   - Explicitly include migrating `src/db/index.ts` from `drizzle-orm/neon-http` to `drizzle-orm/neon-serverless` using `@neondatabase/serverless` `Pool`.
   - Explain that `neon-http` driver throws `Error: No transactions support in neon-http driver` when `db.transaction()` is called. `neon-serverless` with `Pool` supports full interactive multi-statement ACID transactions over WebSockets while maintaining connection pooling in serverless environments.
   - Provide concrete before/after code for `src/db/index.ts`.

2. **[SEC-01 & `foreignExchangeService.ts` SIGNATURE ALIGNMENT]**:
   - Update `snapshotDailyRates()` in `src/lib/foreignExchangeService.ts` to return `Promise<number>` (count of inserted/processed rates).
   - In `src/actions/forex.ts`, type `triggerForexSnapshot` as `Promise<{ success: boolean; count: number }>`.

3. **[SEC-03 CRYPTOGRAPHIC SHA-256 PRE-HASHING]**:
   - In `src/lib/security.ts`, update `constantTimeCompare` to pre-hash both input strings with SHA-256 using `crypto.createHash('sha256')` into fixed 32-byte buffers before executing `timingSafeEqual`. This eliminates timing leaks based on string length and prevents `RangeError` buffer length mismatches.

4. **[PERF-01 QUOTE SANITIZATION & SHALLOW CHANGE CHECK]**:
   - In `src/hooks/useDashboardData.ts`, sanitize quotes with `typeof quote.price === 'number' && Number.isFinite(quote.price) && quote.price >= 0`.
   - In `src/store/usePortfolioStore.ts`, add a shallow change check in `updatePricesBatch` to skip `set()` if all incoming prices match existing prices.

5. **[PERF-02 / PERF-03 SSE HOOK `onPriceUpdateRef` STABILIZATION]**:
   - In `src/lib/useRealtimePrices.ts`, store `onPriceUpdate` in `onPriceUpdateRef = useRef(onPriceUpdate)` and update in `useLayoutEffect`. Remove `onPriceUpdate` from `connect`'s dependency array to guarantee `connect` is never recreated when callers pass inline callback functions.

6. **[PERF-05 & PERF-08 BACKEND STABILITY]**:
   - In `cachePricesBatch` (`src/lib/priceService.ts`), deduplicate items by ticker using a `Map<string, ...>` before building SQL insert rows, preventing PostgreSQL SQLSTATE 21000 errors on duplicate tickers in the same batch.
   - In `validateDbSessionAndUser` (`src/lib/auth.ts`), properly await the throttled `lastUsedAt` update or use an atomic conditional update to ensure serverless lambdas do not terminate before the write completes.

7. **[Q18 TAX CALCULATION RETURN TYPE COMPATIBILITY]**:
   - In `src/actions/portfolioSettings.ts`, update `calculateRealizedPnLWithTax` to return the full `PortfolioTaxSummary` structure expected by `TaxSummaryCard.tsx` (`{ totalProceeds, totalCostBasis, totalGrossProfit, totalTaxAmount, totalNetProfit, taxRate, byTicker }`), deriving all fields from canonical `calculatePortfolioMetrics(transactions, {}, [], settings)`.

Ensure the updated `sprint_5_plan.md` maintains all existing structure (Goals, Top 5 Issues, Quick Wins, Risk Assessments, Stack Compatibility, 4-Tier Verification, Phased Rollout) with 100% production readiness.

