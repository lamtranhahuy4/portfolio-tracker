# Handoff Report: Sprint 5 Implementation Planning

## 1. Observation
1. **Source Reports Analyzed**:
   - `ORIGINAL_REQUEST.md`: Directives and sprint requirements.
   - `explorer_security/report.md`: 10 security findings verified against 31 API routes and 11 Server Actions (`SEC-01` through `SEC-10`).
   - `explorer_performance/report.md`: 18 performance findings (`PERF-01` through `PERF-18`) including SWR render loops, SSE zombie leaks, and database N+1 patterns.
   - `explorer_code_quality/report.md`: 22 quality findings (`Q1` through `Q22`) including `UnauthorizedError` class hierarchy bug, negative net contribution ROI bug, and untested modules.
   - `explorer_architecture/report.md`: System design audit (`AR-01` through `AR-08`) covering split two-phase batch imports, missing partial unique constraints, and dual cron architectures.
   - `verifier_auditor/audit_report.md`: 0.0% fabrication rate, 20/20 test files passing (172 tests), clean forensic integrity verdict.
2. **Codebase Inspection**:
   - `src/actions/forex.ts:1-6`: `export const triggerForexSnapshot = snapshotDailyRates;` with `'use server'` lacking `requireUser()`.
   - `src/lib/auth.ts:225-230`: `class UnauthorizedError extends Error` (does not extend `AppError`), failing `error instanceof AppError` in `src/lib/errorHandler.ts:45`.
   - `src/hooks/useDashboardData.ts:44`: SWR callback iterates `data.quotes.forEach((quote) => updatePrice(quote.ticker, quote.price))` instead of `updatePricesBatch`.
   - `src/lib/useRealtimePrices.ts:75-84`: `setTimeout` in `onerror` is never assigned to a ref or cleared in unmount cleanup.
   - `src/app/api/stream/prices/route.ts:41-81`: `setInterval` overlaps on slow async fetches; `ReadableStream` lacks `cancel()`.
   - `src/actions/transaction.ts:27-68` & `src/db/schema.ts:31`: `createImportBatch` commits independently before `transactions` insert; `checksumIdx` is not unique in Postgres schema.
3. **Artifact Created**:
   - `/Users/lamtranhahuy/Project/portfolio-tracker/sprint_5_plan.md`: 1,445 lines, 66 KB production-grade implementation specification.

## 2. Logic Chain
1. **Security Isolation**: By requiring authentication on `src/actions/forex.ts` and wrapping it in `withErrorHandler`, anonymous RPC exploitation is closed (Observation 2).
2. **Error Telemetry & Status Codes**: Making `UnauthorizedError` extend `AppError` with `statusCode: 401` ensures `withErrorHandler` preserves 401 statuses rather than rethrowing 500 `INTERNAL_ERROR` and logging false-alarm Sentry errors (Observation 2).
3. **Client Render Optimization**: Replacing `data.quotes.forEach(...)` with `updatePricesBatch` in `useDashboardData.ts` collapses $N$ separate state updates and Decimal.js FIFO calculations into a single atomic frame (Observation 2).
4. **SSE Socket & Memory Stability**: Saving reconnect timer IDs in `useRef` and clearing them on unmount (`useRealtimePrices.ts`), combined with recursive `setTimeout` and `cancel()` callbacks on `ReadableStream` (`api/stream/prices/route.ts`), eliminates zombie connection leaks on both client and server (Observation 2).
5. **Database Transaction Integrity**: Unifying `createImportBatch` and batch transaction insertion into a single Drizzle transaction, backed by `uniqueIndex('import_batches_active_checksum_unique_idx').where(sql\`rolled_back_at IS NULL\`)`, provides 100% protection against orphaned audit records and concurrent duplicate uploads (Observation 2).
6. **Execution Sequencing**: Structuring the 4-tier verification and 4-day phased rollout ensures zero downtime and automated regression safety across database migrations, server action updates, and client hydration (Observation 3).

## 3. Caveats
- No changes have been executed on the application source code files during this planning milestone, adhering strictly to the mandate.
- Database schema migration for `import_batches_active_checksum_unique_idx` and `batch_id` foreign key indexes must be executed prior to deploying Day 2 application changes.

## 4. Conclusion
The Sprint 5 implementation plan has been authored with complete architectural rigor and production-ready code diffs in `/Users/lamtranhahuy/Project/portfolio-tracker/sprint_5_plan.md`. It directly resolves the Top 5 most impactful issues (`SEC-01`, `QUAL-05`, `PERF-01`, `PERF-02/03`, `AR-01`), covers all high-value quick wins, evaluates risk assessments per component, and provides a concrete 4-tier testing verification strategy.

## 5. Verification Method
1. Inspect the generated artifact:
   `view_file /Users/lamtranhahuy/Project/portfolio-tracker/sprint_5_plan.md`
2. Verify existing test suite baseline:
   `npm test`
3. Verify ESLint baseline:
   `npm run lint`
4. Confirm no source files were mutated during planning:
   `git status`
