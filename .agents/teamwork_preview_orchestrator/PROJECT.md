# Project: Portfolio Tracker Comprehensive Code Review

## Architecture
- Framework: Next.js 15 (App Router, Server Actions, API Routes, SSR)
- Database & ORM: Drizzle ORM, Neon PostgreSQL
- State Management: Zustand (client-side stores, SSE batching)
- Authentication: Better Auth (session cookies, cached `getCurrentUser`, OAuth/email)
- Background Jobs: Inngest (cron jobs, price updates, cleanup jobs)
- Realtime: Server-Sent Events (SSE) for price streaming

## Feature Inventory
| # | Feature / Area | Description | Milestone | Source |
|---|---|---|---|---|
| 1 | R1: Security Review | Authentication, authorization, IDOR, rate limiting, SSRF, CSP, secrets, cached user | M1 | ORIGINAL_REQUEST §R1 |
| 2 | R2: Performance Review | DB query patterns, N+1, caching, SSE connections, Zustand batch updates, memoization | M2 | ORIGINAL_REQUEST §R2 |
| 3 | R3: Code Quality Review | Dead code, error handling, silent failures, type safety, edge cases, test coverage & correctness | M3 | ORIGINAL_REQUEST §R3 |
| 4 | R4: Architecture Review | Data flow (SSR->Client->Store->Actions->DB), Inngest cron, circuit breakers, import/export, risk ranking | M4 | ORIGINAL_REQUEST §R4 |
| 5 | Adversarial Verification | Empirical code verification, line number verification, false positive elimination | M5 | ORIGINAL_REQUEST §Acceptance Criteria |
| 6 | Executive Synthesis | Structured report, data flow diagrams, ranked architectural risks, Top 5 issues | M6 | ORIGINAL_REQUEST §Report Format |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Security Review | Comprehensive audit of all API routes, server actions, auth, headers, SSRF, IDOR | none | IN_PROGRESS |
| M2 | Performance Review | Query analysis, N+1, SSE connection lifecycle, Zustand batching, memoization | none | IN_PROGRESS |
| M3 | Code Quality Review | Dead code, error handling, silent failures, types, test coverage & test correctness | none | IN_PROGRESS |
| M4 | Architecture Review | End-to-end data flow, Inngest jobs, circuit breaker, import/export, architectural risks | none | IN_PROGRESS |
| M5 | Adversarial Verification | Cross-verifying all findings against actual code files and lines | M1, M2, M3, M4 | PLANNED |
| M6 | Synthesis & Final Report | Executive summary, structured findings with before/after fixes, diagrams | M5 | PLANNED |

## Code Layout
- `src/app/` — Next.js App Router pages, layouts, and API routes (`src/app/api/`)
- `src/actions/` or `src/server/actions/` — Server actions for data mutations/queries
- `src/lib/` — Shared libraries (auth, db, inngest, circuit-breaker, api clients, sse)
- `src/components/` — React components (dashboard, charts, tables, dialogs)
- `src/store/` or `src/stores/` — Zustand state stores
- `src/db/` — Drizzle schema, migrations, db client
- `tests/` or `__tests__/` — Unit, integration, and E2E tests
