# Architecture Review & Progress Report

## Summary

- The project has moved beyond an MVP shell and now has a usable domain core, import pipeline, auth baseline, and account surface.
- The strongest current areas are portfolio replay, cash ledger mode, DNSE import parsing, and the new import batch audit trail.
- The application is still not production-ready for a fintech launch because financial precision, security hardening, market data infrastructure, and operational maturity remain incomplete.

## Progress Snapshot

### Phase 1: Technical Foundation
- In progress.
- `lint`, `typecheck`, and test harness exist.
- `i18n` exists, but app-wide coverage and folder boundaries are still inconsistent.
- `.env.example` now exists.

### Phase 2: Financial Engine
- In progress.
- Replay logic and tests exist, but core money math still relies on `number`.
- `Decimal.js` ADR exists, yet the engine is not fully migrated to deterministic decimal primitives.

### Phase 3: Data Model and Audit Trail
- Implemented in this iteration:
  - `import_batches` schema and SQL migration
  - `batch_id` linkage for `transactions` and `cash_ledger_events`
  - SHA-256 checksum-based duplicate import guard
  - rollback by batch
  - account import history UI
- Remaining:
  - richer batch status details
  - import warnings/history drill-down
  - soft delete or broader audit log beyond import flows

### Phase 4: Auth and Security
- Still pending beyond MVP baseline.
- Auth works, but session rotation, rate limiting, auth audit logs, and weak-secret cleanup remain open.

### Phase 5: Market Data Infrastructure
- Still prototype-level.
- No persisted `market_prices`, freshness policy, or audited override path yet.

### Phase 6: Professional UX
- Basic dashboard and account UX exist.
- Explainability, provenance visibility, and professional data-quality affordances remain incomplete.

### Phase 7: Testing, CI/CD, Observability
- Unit tests are in place and passing locally.
- No full CI, integration/E2E coverage, or structured observability stack yet.

### Phase 8: Production Hardening
- Not started in a meaningful way.

## What Was Implemented

### Import Audit Trail
- Added `import_batches` as the batch identity layer for imports.
- Every new trade import or cash ledger import creates a server-side batch record.
- Imported records are linked back to their batch through `batch_id`.
- Duplicate imports are blocked by active checksum match per user and import kind.

### Rollback
- Added rollback-by-batch server action.
- Rollback deletes transactions and cash events associated with the selected batch, then marks the batch as `ROLLED_BACK`.

### UI and Developer Experience
- Added account-level import history with rollback controls.
- Added `.env.example` for safer onboarding.
- Added a focused unit test for import batch status derivation.

## Current Quality Gates

- `npm run test`: pass
- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm run build`: intentionally skipped in the latest pass to preserve delivery pace

## Recommended Next Steps

1. Finish the financial engine migration to decimal-safe domain primitives.
2. Expand regression tests around FIFO, dividends, valuation snapshots, and cash reconciliation.
3. Harden auth with session rotation, rate limiting, and audit logging.
4. Introduce CI gates and structured runtime logging before expanding more UI and market data behavior.

## Notes

- The workspace currently contains an existing modification in `src/lib/portfolioMetrics.ts` that was not part of this batch.
- The checked-in `.env` currently contains a live-looking database URL and should be rotated or removed from tracked/local sharing practices.
