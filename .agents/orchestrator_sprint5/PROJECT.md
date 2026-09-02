# Project: Sprint 5 Implementation Planning

## Architecture
- Target Output: `sprint_5_plan.md` at project root (`/Users/lamtranhahuy/Project/portfolio-tracker/sprint_5_plan.md`).
- Focus: Planning and architecting solutions across Security, Performance, Code Quality, and Architecture with priority on Top 5 issues.
- Framework: Next.js 15 App Router (Server Actions), Drizzle ORM (Neon Serverless PostgreSQL), Zustand, Better Auth, Inngest, SSE.

## Feature Inventory
| # | Feature / Priority | Description | Milestone | Source |
|---|-------------------|-------------|-----------|--------|
| 1 | SEC-01 | Unauthenticated Server Action RPC (`actions/forex.ts`) | M1 | `explorer_security/report.md` |
| 2 | QUAL-05 | `UnauthorizedError` class hierarchy bug converting 401s to 500s | M1 | `explorer_code_quality/report.md` |
| 3 | PERF-01 | SWR Quote Poller bypassing Zustand batching | M2 | `explorer_performance/report.md` |
| 4 | PERF-02 / PERF-03 | Zombie SSE connections (client timer leak & server stream overlap) | M2 | `explorer_performance/report.md` |
| 5 | AR-01 | Non-atomic two-phase batch import & missing DB unique constraint | M3 | `explorer_architecture/report.md` |
| 6 | High-Value Quick Wins | SEC-02/03/04, PERF-04/05/06/07/08, Q13/14/15, AR-02/03/04 | M4 | All Explorer Reports |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Plan Drafting | Author comprehensive `sprint_5_plan.md` covering all Top 5 issues + Quick Wins + Risk Assessments + Verification | none | IN_PROGRESS |
| 2 | Independent Review | 2 Reviewers independently evaluate completeness, accuracy, risk coverage, and compatibility | M1 | PLANNED |
| 3 | Adversarial Challenge | 2 Challengers stress-test proposed designs, edge cases, and failure modes | M1 | PLANNED |
| 4 | Forensic Audit | Forensic Auditor verifies absence of cheating/fabrication and strict adherence to requirements | M1 | PLANNED |
| 5 | Gate & Synthesis | Evaluate all verdicts, compile handoff report, and deliver to Sentinel | M2, M3, M4 | PLANNED |

## Interface Contracts & Guidelines
- All proposed solutions must include:
  1. Root cause analysis with exact file paths and line numbers
  2. Concrete Before / After code implementations
  3. Risk Assessment evaluating side effects, regressions, edge cases, and deployment trade-offs
  4. 4-tier verification test suite design (Unit, Integration, E2E, Regression)
- Strict compatibility with Next.js 15, Drizzle ORM, and Neon PostgreSQL serverless.
