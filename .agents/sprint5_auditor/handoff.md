# Forensic Audit Report: Sprint 5 Implementation Plan

**Work Product**: `/Users/lamtranhahuy/Project/portfolio-tracker/sprint_5_plan.md`  
**Auditor**: `sprint5_auditor` (Forensic Integrity Auditor)  
**Profile**: General Project (Development Mode)  
**Verdict**: **CLEAN**  

---

## 1. Observation

Direct empirical observations from inspecting the codebase, running test commands, checking file modification timestamps, and analyzing the plan artifact:

### 1.1 Source Code Modification & Milestone Boundary Check
- Executed `stat -f "%m %Sm %N"` and `git status`.
- `sprint_5_plan.md` was created at `14:35:32` (Sep 1, 2026).
- All source files in `src/` have modification timestamps prior to `12:23:12` (Sep 1, 2026) from previous sprints.
- **Finding**: Zero source code, test, or config files were illegally modified during this planning milestone.

### 1.2 Verification of Cited File Paths & Line Numbers in Real Codebase
Every file path and line number cited in `sprint_5_plan.md` was inspected and verified verbatim:
1. **SEC-01**: `src/actions/forex.ts:1-6` contains verbatim:
   ```typescript
   'use server';
   import { snapshotDailyRates } from '@/lib/foreignExchangeService';
   export const triggerForexSnapshot = snapshotDailyRates;
   ```
2. **QUAL-05**:
   - `src/lib/auth.ts:225-230`: `UnauthorizedError` extends JavaScript standard `Error`, not `AppError`.
   - `src/lib/errorHandler.ts:41-58`: `withErrorHandler` checks `error instanceof AppError`. When `requireUser()` throws `UnauthorizedError`, `instanceof AppError` is `false`, triggering `captureError` and converting it to generic 500 `INTERNAL_ERROR`.
3. **PERF-01**:
   - `src/hooks/useDashboardData.ts:42-47`: Contains `data.quotes.forEach((quote) => updatePrice(quote.ticker, quote.price));`, sequentially firing `updatePrice` for each quote.
   - `src/store/usePortfolioStore.ts:245-276`: Defines `usePortfolioMetrics` hook which is recalculated on every store mutation.
4. **PERF-02 & PERF-03**:
   - `src/lib/useRealtimePrices.ts:75-84`: Reconnection timer `setTimeout(..., 5000)` in `eventSource.onerror` is unreferenced and never cleared in `disconnect()` or `useEffect` cleanup.
   - `src/lib/useRealtimePrices.ts:107-117`: `tickersKey = tickers.join(',')` causes dependency churn when caller passes new array instances.
   - `src/app/api/stream/prices/route.ts:41-81`: Uses `setInterval` without execution duration gating, lacks `ReadableStream.cancel()` cleanup, and sends zero keep-alive bytes during idle market periods.
5. **AR-01**:
   - `src/db/schema.ts:16-32`: `checksumIdx` is defined as a non-unique index on `(userId, fileChecksum, importKind)`.
   - `src/actions/transaction.ts:27-68` & `src/actions/cashLedger.ts:26-74`: `createImportBatch` executes in transaction 1, while inserting trade rows executes in transaction 2, leaving orphaned batch records if child insert fails.
6. **Quick Win Issues**:
   - `src/app/api/test-post/route.ts:1-7`: Verbatim unauthenticated test route logging to console without `NODE_ENV` check.
   - `src/app/api/admin/users/route.ts:8-14`: Standard string equality (`===`) used on `ADMIN_SECRET`.
   - `src/app/api/stock-news/route.ts:564-659`: Unauthenticated `GET` handler accepting arbitrary tickers.
   - `src/lib/priceService.ts:125-130`: Expression `sql\`upper(${marketPrices.ticker}) IN (...)\`` disabling B-Tree index scans.
   - `src/domain/portfolio/portfolioMetrics.ts:618-619`: `activeNetContributionsDec.eq(0) ? 0 : decimalToNumber(netPnLDec.div(activeNetContributionsDec))` inverting ROI on negative net contributions.
   - `src/lib/foreignExchangeService.ts:233-255`: Missing inverse rate calculation when `from === 'VND'`.
   - `src/actions/portfolioSettings.ts:98-144`: Duplicate FIFO calculation in Server Action differing from canonical `portfolioMetrics.ts`.

### 1.3 Baseline Test Suite Execution
- Executed `npm test` (`vitest run --config vitest.config.mjs`).
- Output: 22 test files passed, 175 tests passed, 0 failures.
- Captured test stderr confirming `QUAL-05` behavior in existing tests:
  ```
  stderr | src/actions/__tests__/transaction.test.ts > transaction actions > saveTransactionsBatch should throw error if requireUser fails
  [withErrorHandler] Unhandled error: Error: Unauthorized
  ```

---

## 2. Logic Chain

1. **Acceptance Criteria Verification**:
   - `ORIGINAL_REQUEST.md` requires prioritized, concrete mitigation plans for the Top 5 issues: `SEC-01`, `QUAL-05`, `PERF-01`, `PERF-02/03`, and `AR-01`.
   - `sprint_5_plan.md` devotes comprehensive architectural subsections (Section 2, Issues 1–5) to each of these 5 issues, providing verbatim before/after code specifications, exact file paths, line numbers, root cause analyses, and test specifications.
   - Each proposed solution addresses the root cause at the architecture level (e.g. Next.js Server Action auth wrappers, `AppError` prototype inheritance, atomic Zustand batch state updates, non-overlapping `setTimeout` with WHATWG stream cancel handlers, and single-transaction Drizzle mutations with PostgreSQL partial unique indexes).

2. **Risk Assessment Coverage**:
   - `ORIGINAL_REQUEST.md` mandates that every proposed change includes a dedicated "Risk Assessment" evaluating side effects, regressions, edge cases, or deployment trade-offs.
   - Forensic review confirmed that all 5 critical issues and all 13 secondary issues in Sections 2 and 3 contain structured Risk Assessments explicitly analyzing potential side effects, regressions, edge cases, and deployment/migration trade-offs.

3. **Stack Compatibility**:
   - Next.js 15 App Router: Uses `'use server'`, `requireUser()`, `withErrorHandler`, and `revalidatePath('/')`.
   - Drizzle ORM & Neon PostgreSQL Serverless: Leverages `uniqueIndex().where()`, `db.transaction(async (tx) => ...)`, and `inArray()` B-Tree index lookups.
   - React 19 & Zustand: Uses atomic selector hooks, `updatePricesBatch`, and `useLayoutEffect` ref synchronization.
   - Better Auth: Aligns session validation with throttled `lastUsedAt` updates and constant-time secret verification.

4. **Integrity Forensics & Cheating Pattern Analysis**:
   - Hardcoded shortcuts: None found. All proposed code changes implement genuine logic with proper error handling and edge-case boundaries.
   - Facade implementations: None found.
   - Hallucinations: Zero. All 18+ cited files and code snippets exist and match line numbers character-for-character.
   - Source code modifications during planning: Confirmed 0 files modified during the milestone.

---

## 3. Caveats

- **Runtime Migration Execution**: The PostgreSQL migration for `import_batches_active_checksum_unique_idx` and `transactions_batch_id_idx` must be executed during the Sprint 5 implementation phase prior to deploying the server action code.
- **Scope Boundary**: This audit verifies the planning artifact (`sprint_5_plan.md`). Implementation and code execution will occur in the subsequent implementation milestone.

---

## 4. Conclusion

The Sprint 5 Implementation Plan (`sprint_5_plan.md`) is structurally rigorous, mathematically sound, 100% factually accurate, and strictly compatible with the application's technology stack. It satisfies all acceptance criteria in `ORIGINAL_REQUEST.md`.

**Forensic Audit Verdict**: **CLEAN**

---

## 5. Verification Method

To independently verify this audit:
1. Check that no source files were modified during the planning milestone:
   ```bash
   git status
   ```
2. Verify all existing tests pass:
   ```bash
   npm test
   ```
3. Inspect `sprint_5_plan.md` against target files:
   - `src/actions/forex.ts`
   - `src/lib/auth.ts` vs `src/lib/errorHandler.ts`
   - `src/hooks/useDashboardData.ts`
   - `src/lib/useRealtimePrices.ts` and `src/app/api/stream/prices/route.ts`
   - `src/db/schema.ts`, `src/actions/transaction.ts`, `src/actions/cashLedger.ts`
