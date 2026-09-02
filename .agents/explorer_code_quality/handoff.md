# Handoff Report: R3 Code Quality Review

**Agent**: `explorer_code_quality`  
**Working Directory**: `/Users/lamtranhahuy/Project/portfolio-tracker/.agents/explorer_code_quality`  
**Handoff Type**: Hard (Task complete)  
**Date**: 2026-09-01  

---

## 1. Observation

Direct observations from source inspection, TypeScript checks, and test executions:

1. **Auth & Error Handler Mismatch**:
   - In `src/lib/auth.ts:225-230`: `export class UnauthorizedError extends Error { ... }`
   - In `src/lib/errorHandler.ts:45-56`:
     ```typescript
     if (error instanceof AppError) {
       throw error;
     }
     captureError(error, ...);
     console.error('[withErrorHandler] Unhandled error:', error);
     throw new AppError('Đã xảy ra lỗi hệ thống. Vui lòng thử lại.', 'INTERNAL_ERROR', 500);
     ```
   - Running `pnpm test` produced verbatim stderr:
     ```
     stderr | src/actions/__tests__/transaction.test.ts > transaction actions > saveTransactionsBatch should throw error if requireUser fails
     [withErrorHandler] Unhandled error: Error: Unauthorized
     ```
   - Any Server Action wrapped with `withErrorHandler` converting authentication failures to 500 status.

2. **Dead Code & Unused Files**:
   - `src/lib/csvMapper.ts` (7 lines), `src/lib/excelMapper.ts` (7 lines), `src/lib/portfolioEngine.ts` (10 lines), `src/lib/portfolioMetrics.ts` (3 lines) have 0 import references across the codebase.
   - `src/actions/forex.ts` (exports `triggerForexSnapshot`) has 0 references.
   - `src/actions/price.ts` (exports `setManualPriceAction`) has 0 references.
   - `src/app/api/stock-news/route.ts:452-497`: `fetchBloombergWorldNews` is defined and never called; lines 22 & 398 define unused `MAX_BLOOMBERG_FALLBACK` and `RssFeed`.
   - `src/app/api/test-post/route.ts:1-7`: exposed unauthenticated test route with `console.log`.

3. **Multi-Table Mutations Lacking DB Transactions**:
   - `src/actions/account.ts:110-112`: 3 independent `await db.delete(...)` calls for `transactions`, `cashLedgerEvents`, and `openingPositions`.
   - `src/actions/openingPositions.ts:52-63`: `await db.delete(openingPositions)` followed by `await db.insert(openingPositions)` without `db.transaction`.
   - `src/actions/auth.ts:354-362`: `db.update(users)` and `db.update(passwordResets)` executed without `db.transaction`.

4. **Missing Error Handling in API Routes**:
   - `src/app/api/forex-summary/route.ts:6-23`, `src/app/api/foreign-exchange/route.ts:8-31`, `src/app/api/foreign-exchange/history/route.ts:8-45` lack `try/catch` blocks.

5. **Calculation & Edge Case Inconsistencies**:
   - `src/domain/portfolio/portfolioMetrics.ts:618-619`: `netNavDec.div(activeNetContributionsDec).minus(DECIMAL_ONE)` produces negative ROI when `activeNetContributionsDec < 0`.
   - `src/lib/foreignExchangeService.ts:233-255`: `getForexHistory` returns non-inverted rate when `from === 'VND'`.
   - `src/actions/portfolioSettings.ts:98-144`: Duplicates FIFO matching with floating point `Number` arithmetic instead of Decimal.js, ignoring buy fees and taxes.

6. **Test Coverage & Verification**:
   - `pnpm test` passes 20 test files (172 tests).
   - 9 Server Action files (`account.ts`, `auth.ts`, `importBatch.ts`, `importFile.ts`, `market.ts`, `openingPositions.ts`, `portfolioSettings.ts`, `price.ts`, `forex.ts`) have no unit tests.
   - `src/lib/parsers/DnseCashParser.ts` (188 lines) has 0 unit tests.
   - `src/actions/__tests__/transaction.test.ts` and `src/actions/__tests__/cashLedger.test.ts` only test batch insert, casting input data to `any[]` and ignoring rollback verification.

---

## 2. Logic Chain

1. **Step 1 (Auth Error Pipeline)**:
   - Observation: `UnauthorizedError` does not inherit from `AppError` (Obs 1).
   - Inference: When `requireUser()` rejects, `withErrorHandler` catches `UnauthorizedError`. Because `!(error instanceof AppError)`, the handler classifies it as an unexpected fatal crash, triggers Sentry reporting, and throws generic 500 `INTERNAL_ERROR`.
   - Deduction: Fix requires `UnauthorizedError extends AppError` with code `UNAUTHORIZED` and status `401`.

2. **Step 2 (Data Integrity in Mutations)**:
   - Observation: Multi-step deletions and updates in `account.ts`, `openingPositions.ts`, and `auth.ts` run outside database transactions (Obs 3).
   - Inference: Neon PostgreSQL serverless connections can drop or encounter lock timeouts mid-operation.
   - Deduction: An unhandled failure in step 2 leaves orphaned rows or wipes out user opening balances permanently. Wrapping in `db.transaction` guarantees atomicity.

3. **Step 3 (Mathematical Edge Cases)**:
   - Observation: `portfolioMetrics.ts:619` divides NAV by `netContributions` (Obs 5).
   - Inference: In trading portfolios where cumulative withdrawals exceed cumulative deposits, `netContributions` is negative.
   - Deduction: Inverting the denominator sign turns positive returns into negative percentages. A fallback to current cost basis prevents sign flip.

4. **Step 4 (Test Coverage & Code Health)**:
   - Observation: 9 actions and `DnseCashParser` have 0 tests; existing tests in `actions/__tests__` use shallow mocks (Obs 6).
   - Inference: Recent Sprint 1-4 refactors introduced Server Action tests, but only covered 2 functions superficially.
   - Deduction: Full confidence in financial calculations requires unit tests for `DnseCashParser` and comprehensive integration tests for Server Actions.

---

## 3. Caveats

- **External API Availability**: Third-party APIs (DNSE, Vietcombank XML, Frankfurter, CoinGecko) are rate-limited or geolocation-sensitive; mocked tests pass locally, but real network resilience relies on circuit breakers and proper fallback error logging.
- **Database Migrations**: No schema alterations were made during this read-only review; unique constraints (such as `(userId, targetCurrency, date)` on forex snapshots) require Drizzle migrations.
- No other caveats.

---

## 4. Conclusion

The application is structurally capable and passes existing unit tests (172/172), but contains 2 critical architectural flaws:
1. **Error classification mismatch** causing 401s to become 500 system errors in Server Actions (`src/lib/auth.ts`).
2. **Missing transactional atomicity** on account data reset and opening position updates, risking irreversible data loss.

In addition, 8 high-severity issues (untested cash parser, missing route error handlers, inverted forex history rate, divergent FIFO calculations, and negative net contributions ROI distortion) should be remediated prior to production deployment.

Full itemized findings and before/after code fixes are documented in:
`/Users/lamtranhahuy/Project/portfolio-tracker/.agents/explorer_code_quality/report.md`

---

## 5. Verification Method

To independently verify all findings:

1. **Verify Typecheck and Tests**:
   ```bash
   pnpm typecheck
   pnpm test
   pnpm lint
   ```
2. **Inspect Identified Files and Line Numbers**:
   - `src/lib/auth.ts:225` vs `src/lib/errorHandler.ts:45` (UnauthorizedError mismatch)
   - `src/actions/openingPositions.ts:52-63` (Non-transactional delete/insert)
   - `src/domain/portfolio/portfolioMetrics.ts:618-619` (Negative net contribution ROI)
   - `src/lib/foreignExchangeService.ts:250-256` (Forex rate inversion)
   - `src/actions/portfolioSettings.ts:98-144` (Divergent FIFO logic)
   - `src/lib/parsers/DnseCashParser.ts` (Absence of test file in `src/lib/parsers/__tests__/`)
