# R4 Architecture Review — Handoff Report

**Agent**: Explorer Architecture (`explorer_architecture`)  
**Mission**: R4 Architecture Review  
**Timestamp**: 2026-09-01T06:50:00Z  
**Status**: Completed (Hard Handoff)

---

## 1. Observation

Direct code observations from inspecting the codebase:

1. **End-to-End Data Flow & SSR Initialization**:
   - `src/app/page.tsx:30-38`: `Promise.all([fetchTransactions(), fetchCashEvents(), fetchOpeningPositionSnapshot(), fetchPortfolioSettings()])` concurrently fetches all initial data on the server.
   - `src/components/StoreInitializer.tsx:23, 31-32`: `StoreInitializer` uses `const initialized = useRef(false)` and skips updating when `initialized.current` is true, ignoring subsequent Next.js server component re-renders from `revalidatePath('/')`.
   - `src/hooks/useDashboardData.ts:44`: Quotes polling runs `data.quotes.forEach((quote) => updatePrice(quote.ticker, quote.price))`, calling Zustand `set()` for each individual quote instead of batching.
   - `src/lib/useRealtimePrices.ts:66`: SSE price streaming calls `usePortfolioStore.getState().updatePricesBatch(batch)`.
   - `src/store/usePortfolioStore.ts:250-276`: `usePortfolioMetrics()` selector runs `memoizedCalculateMetrics` on every price change, executing a full $O(N)$ historical replay.

2. **Inngest Cron Jobs & Background Tasks**:
   - `src/inngest/functions.ts:16-20`: `updatePricesCron` queries `transactions` (where `type = 'BUY'`) and `openingPositions` to extract unique active tickers.
   - `src/inngest/functions.ts:27-31, 38-50`: Chunks tickers into batches of 50 (`BATCH_SIZE = 50`) and executes each via `step.run`, but iterates sequentially in a loop with individual `await cachePrice(ticker, price, 'STOCK', 'VND', 'CRON_JOB')` calls.
   - `src/app/api/cron/update-prices/route.ts:23-24`: Redundant Vercel Cron endpoint queries `marketPrices` directly (`db.select({ ticker: marketPrices.ticker }).from(marketPrices)`), completely omitting newly added user holdings from `transactions`.
   - `src/inngest/functions.ts:77-84`: `cleanupPricesCron` only deletes from `priceHistory` where `recordedAt < NOW() - INTERVAL '90 days'`. It omits `cleanupExpiredPrices()` and `cleanupExpiredSessions()`.

3. **Circuit Breaker Pattern**:
   - `src/lib/circuitBreaker.ts:27-36`: `CircuitBreaker` class maintains state in private in-memory fields (`failures`, `successes`, `lastFailureTime`, `state`).
   - `src/lib/goldPriceService.ts:55, 93`: `getGoldPrices()` and `getGoldHistory()` call `fetch('https://www.vang.today/api/prices')` without wrapping in `vangTodayCircuitBreaker.execute()` or `withRetry()`.
   - `src/lib/circuitBreaker.ts:126-130`: `quotesCircuitBreaker` is exported but never imported or referenced in any file.

4. **Import / Export Pipeline**:
   - `src/actions/transaction.ts:27-68` & `src/actions/cashLedger.ts:26-74`: `saveTransactionsBatch` and `saveCashEventsBatch` call `createImportBatch()` in a separate transaction *before* starting the transaction to insert records.
   - `src/db/schema.ts:31`: `importBatches` indexes checksum via `index('import_batches_checksum_idx')` (a standard index), lacking a DB-level `uniqueIndex` for active imports.
   - `src/actions/transaction.ts:49`: `tx.insert(transactions).values(mappedData).onConflictDoNothing()` does not specify conflict target columns, unlike `src/actions/cashLedger.ts:50-56`.
   - `src/lib/parsers/DnseTradeParser.ts:143-146` & `src/lib/parsers/DnseCashParser.ts:182-185`: Spreadsheets are read entirely into memory as `ArrayBuffer` via `file.arrayBuffer()` and `XLSX.read(arrayBuffer, { type: 'array' })`.

5. **Security & Rate Limiting Infrastructure**:
   - `src/lib/apiRateLimiter.ts:8, 93-100`: Rate limiter uses an in-memory `Map<string, RateLimitEntry>` and a module-level `setInterval` for cleanup, which resets across serverless lambda container instances.

---

## 2. Logic Chain

1. **Import Atomicity**: From Observation 4 (`transaction.ts:29-50`), `createImportBatch` commits independently before `tx.insert(transactions)` begins. If an unhandled process termination or timeout occurs between these two steps, an orphan row is left in `import_batches`. Furthermore, because `schema.ts:31` defines `import_batches_checksum_idx` as a non-unique index, concurrent uploads can race past application-level validation and create duplicate batches.
2. **Serverless State Volatility**: From Observations 3 (`circuitBreaker.ts:28-31`) and 5 (`apiRateLimiter.ts:8`), in-memory state is local to each Node.js process. In Vercel serverless functions, instances are ephemeral and spun up on demand. During an external outage, every lambda instance starts with a closed circuit and attempts requests until it hits its local threshold, rendering the circuit breaker ineffective under distributed burst traffic.
3. **Background Job Divergence**: From Observation 2 (`inngest/functions.ts:17-20` vs `api/cron/update-prices/route.ts:23`), the codebase maintains two divergent cron systems. The Vercel cron route misses new user tickers because it only checks `marketPrices`, while Inngest checks `transactions`. Furthermore, Inngest's step-based price update triggers $2 \times N$ sequential database roundtrips per batch.
4. **Fault Isolation Gaps**: From Observation 3 (`goldPriceService.ts:55`), external calls to `vang.today` bypass circuit breakers, meaning network hangs or provider downtime will directly block and time out API responses.
5. **Rendering & Replay Overhead**: From Observations 1 (`useDashboardData.ts:44` and `usePortfolioStore.ts:250-276`), un-batched SWR updates trigger multiple sequential re-renders, and every 5s SSE price tick invalidates `memoizeOne`, forcing an $O(N)$ calculation replay over all portfolio history on the client.

---

## 3. Caveats

- **Load Testing Under Production Concurrency**: Live concurrency behavior under hundreds of simultaneous SSE connections was assessed through architectural inspection; actual connection saturation limits depend on Vercel's Serverless Function duration and Neon connection pooling configuration.
- **Neon HTTP Batching Internals**: Neon's `@neondatabase/serverless` HTTP driver executes transactions as single-roundtrip batches where supported, but interactive asynchronous operations with branching logic within `db.transaction()` over HTTP have driver-specific nuances.

---

## 4. Conclusion

The application demonstrates strong domain modeling and modern Next.js 15 capabilities, but requires targeted architectural remediation across 4 key areas:
1. **Transaction Safety**: Unify `createImportBatch` and data insertion into a single atomic transaction and add a partial unique index on active import batch checksums.
2. **Resilience & Fault Isolation**: Wrap `goldPriceService` with `vangTodayCircuitBreaker` and evaluate Redis-backed distributed state for serverless circuit breakers and rate limiters.
3. **Cron Consolidation**: Retire redundant `/api/cron/*` endpoints, standardize on Inngest, implement bulk SQL upserts for price caching, and expand nightly cleanup to purge expired sessions and market prices.
4. **Client State Optimization**: Switch `useDashboardData` SWR callbacks to `updatePricesBatch` to prevent re-render cascades.

Full detailed findings, ranked risk table, and before/after code snippets are documented in `.agents/explorer_architecture/report.md`.

---

## 5. Verification Method

To independently verify all findings:

1. **Verify Source Code Locations**:
   - Inspect `src/actions/transaction.ts:27-68` and `src/actions/cashLedger.ts:26-74` to confirm two-phase transaction execution.
   - Inspect `src/db/schema.ts:31` to confirm non-unique `checksumIdx`.
   - Inspect `src/lib/goldPriceService.ts:55, 93` to confirm absence of circuit breaker wrapping.
   - Inspect `src/inngest/functions.ts:16-52` vs `src/app/api/cron/update-prices/route.ts:23-24` to confirm cron logic divergence and N+1 query loop.
   - Inspect `src/hooks/useDashboardData.ts:44` to confirm un-batched `updatePrice` loop.
   - Inspect `src/components/StoreInitializer.tsx:23, 31-44` to confirm `initialized.current` hydration behavior.

2. **Run Test Suite**:
   ```bash
   npm test
   ```
