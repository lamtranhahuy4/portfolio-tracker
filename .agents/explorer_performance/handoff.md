# Handoff Report: R2 Performance Review

**Agent**: Explorer Performance (`explorer_performance`)  
**Mission**: Milestone M2 — Comprehensive Performance Review (R2)  
**Status**: COMPLETE  
**Artifacts Generated**:
- `/Users/lamtranhahuy/Project/portfolio-tracker/.agents/explorer_performance/report.md`
- `/Users/lamtranhahuy/Project/portfolio-tracker/.agents/explorer_performance/handoff.md`
- `/Users/lamtranhahuy/Project/portfolio-tracker/.agents/explorer_performance/BRIEFING.md`
- `/Users/lamtranhahuy/Project/portfolio-tracker/.agents/explorer_performance/progress.md`

---

## 1. Observation

Direct code observations verified across the codebase:

1. **SWR Polling Bypasses Zustand Batch Updates**:
   - `src/hooks/useDashboardData.ts:44`: `data.quotes.forEach((quote) => updatePrice(quote.ticker, quote.price));`
   - `src/components/DashboardClient.tsx:55, 96`: passes single `updatePrice` to `useDashboardData` instead of `updatePricesBatch`.
2. **Client-Side EventSource Memory Leak**:
   - `src/lib/useRealtimePrices.ts:79-83`: `setTimeout(() => { if (enabled && tickers.length > 0) { connectRef.current(); } }, 5000);` is scheduled inside `eventSource.onerror` without saving the timer ID to a ref or clearing it in `disconnect` / `useEffect` cleanup.
3. **Server-Side SSE Stream Overlap & Missing Cancel**:
   - `src/app/api/stream/prices/route.ts:68-74`: `setInterval(async () => { await sendUpdate(); }, 5000)` spawns async work without awaiting previous completion.
   - `src/app/api/stream/prices/route.ts:41-80`: `new ReadableStream` defines `start(controller)` but omits `cancel(reason)`, risking persistent Node.js event loop timer if abort event is missed.
4. **Missing Database Foreign Key Indexes**:
   - `src/db/schema.ts:34-52`: `transactions` table has `batchId: uuid('batch_id').references(...)` but table indexes only cover `userDateIdx`, `userAssetIdx`, and `dedupIdx`. No index exists on `batchId`.
   - `src/db/schema.ts:54-77`: `cashLedgerEvents` table has `batchId: uuid('batch_id').references(...)` with no index on `batchId`.
   - `src/actions/importBatch.ts:28-36, 123-130`: `assertNoActiveDuplicateBatch` and `rollbackImportBatchAction` filter on `batchId`, forcing full table scans.
5. **N+1 Price Ingestion in Inngest Cron & Quotes API**:
   - `src/inngest/functions.ts:42-48`: `for (const ticker of batch) { await cachePrice(ticker, price, 'STOCK', 'VND', 'CRON_JOB'); }`
   - `src/lib/priceService.ts:169-198`: `cachePrice` executes 2 separate database writes (`insert into marketPrices` + `insert into priceHistory`) per ticker.
6. **Index Scan Disabling via `upper()` Expression**:
   - `src/lib/priceService.ts:125-130`: `where(sql`upper(${marketPrices.ticker}) IN (...)`)` query condition against table with standard B-tree index `market_prices_ticker_idx` on `ticker`.
7. **Sequential Database Queries in Server Actions**:
   - `src/actions/account.ts:32-55`: 8 sequential `await` queries executing one after another over Neon HTTP.
   - `src/actions/portfolioSettings.ts:53-67, 194-208, 222-243`: select-then-insert/update pattern instead of `onConflictDoUpdate`.
8. **Write-on-Read Penalty in Auth Session Validation**:
   - `src/lib/auth.ts:100-103`: `await db.update(sessions).set({ lastUsedAt: new Date() }).where(eq(sessions.id, session.id));` runs an unthrottled SQL write on every single request.
9. **Dashboard Component Memoization Gaps**:
   - `src/components/DashboardClient.tsx:317-486`: Only `StatCard` is wrapped in `React.memo`. `NetWorthChart`, `AssetAllocationChart`, `HoldingsRealtimeCharts`, `MarkToMarketGrid`, and `GroupedTransactionHistoryTable` all lack `React.memo`.
10. **Cache-Control: no-store on Daily Historical Chart Data**:
    - `src/app/api/vnindex-history/route.ts:15`: `headers: { 'Cache-Control': 'no-store, max-age=0' }`
    - `src/app/api/historical-prices/route.ts:45`: `headers: { 'Cache-Control': 'no-store, max-age=0' }`

---

## 2. Logic Chain

1. **Zustand Batching Defect**: The team created `updatePricesBatch` in `usePortfolioStore` in Sprint 3. However, tracing callers reveals `useDashboardData` continues using `data.quotes.forEach(q => updatePrice(q.ticker, q.price))`. Therefore, during quote polling, re-render storms are still happening exactly as before the refactor.
2. **SSE Memory Leak**: When an SSE disconnects on network glitch or page transition, `eventSource.onerror` fires and sets a 5000ms timer. If the user navigates away, the component unmounts, but the timer is never cleared. When it fires, it calls `connectRef.current()`, creating a zombie `EventSource` instance. Repeating navigation creates multiple concurrent zombie connections.
3. **Database Latency Compounding**: The Neon serverless driver communicates via HTTPS REST calls (`neon-http`). Each individual sequential query has network latency overhead (40-80ms). In `getAccountSummary`, 8 sequential queries compound to ~400-600ms. In `updatePricesCron`, 50 tickers × 2 queries compound to 100 sequential HTTP requests. Parallelizing with `Promise.all` and multi-row batch inserts (`cachePricesBatch`) reduces total latency by 80-95%.
4. **Index Inefficiency**: `transactions.batch_id` and `cash_ledger_events.batch_id` are foreign keys without B-tree indexes. Rollback operations (`DELETE ... WHERE batch_id = ?`) and duplicate import checks (`SELECT ... WHERE batch_id = ?`) perform sequential table scans. Adding B-tree indexes changes complexity from $O(N)$ to $O(\log N)$.
5. **Component Subtree Re-render Storm**: Because `usePortfolioMetrics` recalculates on every price update batch, `DashboardClient` re-renders every 5 seconds. Because child chart and table components (`NetWorthChart`, `AssetAllocationChart`, `GroupedTransactionHistoryTable`, `MarkToMarketGrid`) are not wrapped in `React.memo`, React re-renders all 20+ components and their internal DOM trees on every tick.

---

## 3. Caveats

- **Load Testing Environment**: Analysis was conducted via static code auditing and architectural inspection of the codebase. Live load test scripts (`k6/comprehensive.js`, `k6/quotes-batch.js`) should be executed in staging to measure exact throughput deltas.
- **Neon HTTP vs Neon WebSockets**: The project currently uses `drizzle-orm/neon-http`. If interactive transactions become more complex in future sprints, switching to Neon WebSocket pooling (`@neondatabase/serverless` pool) could be evaluated, though HTTP is optimal for serverless cold starts.
- **Third-Party API Rate Limits**: DNSE, Vietcombank, and Vang.Today APIs are external services with undocumented rate limits. Edge caching (`s-maxage=3600`) and circuit breaker protections are critical to prevent 429/503 cascades.

---

## 4. Conclusion

The application architecture has solid foundation blocks, but has accumulated significant I/O and re-render performance debt:
1. **P0 Fixes Required Immediately**:
   - Update `useDashboardData.ts` to call `updatePricesBatch` instead of `forEach(updatePrice)`.
   - Clear reconnect timeout in `useRealtimePrices.ts` on unmount to stop zombie `EventSource` leaks.
   - Add B-Tree indexes on `batchId` in `transactions` and `cashLedgerEvents` tables in `schema.ts`.
   - Refactor server SSE stream to use non-overlapping timer loop with `cancel()` cleanup.
2. **P1 Fixes**:
   - Implement `cachePricesBatch` for Inngest cron and API quote caching.
   - Fix `upper(ticker)` in `priceService.ts` to restore B-Tree index scan.
   - Parallelize `getAccountSummary()` with `Promise.all`.
   - Add `React.memo` to `GroupedTransactionHistoryTable`, `AssetAllocationChart`, and `NetWorthChart`.
   - Enable CDN/Edge caching on historical daily endpoints (`/api/vnindex-history`).

---

## 5. Verification Method

To independently verify all findings and validate fixes:

1. **Verify Line Numbers and Source Code**:
   ```bash
   # Check SWR poller calling updatePrice in loop
   git grep -n "data.quotes.forEach" src/hooks/useDashboardData.ts

   # Check missing batchId index in transactions and cash_ledger_events
   git grep -n "batchId" src/db/schema.ts

   # Check upper() expression on ticker in getCachedPrices
   git grep -n "upper" src/lib/priceService.ts

   # Check sequential queries in getAccountSummary
   git grep -n "await db" src/actions/account.ts

   # Check lack of React.memo in dashboard components
   git grep -n "React.memo" src/components/
   ```

2. **Run Typecheck & Test Suites**:
   ```bash
   pnpm typecheck
   pnpm test
   ```

3. **Run Load Test Suite**:
   ```bash
   pnpm load:quotes
   pnpm load:batch
   pnpm load:refresh
   ```
