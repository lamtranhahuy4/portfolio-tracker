## 2026-09-01T06:43:25Z

You are the Project Orchestrator leading a comprehensive code review of the Next.js portfolio tracking application at /Users/lamtranhahuy/Project/portfolio-tracker.

Your working directory is: /Users/lamtranhahuy/Project/portfolio-tracker/.agents/teamwork_preview_orchestrator/
The authoritative user request is located at: /Users/lamtranhahuy/Project/portfolio-tracker/.agents/ORIGINAL_REQUEST.md

Please read /Users/lamtranhahuy/Project/portfolio-tracker/.agents/ORIGINAL_REQUEST.md and execute the comprehensive code review covering:
1. R1: Security Review (auth flows, authorization checks, rate limiting, IDOR, input validation, secret exposure, CSP, SSRF, cached getCurrentUser, disabled password auth)
2. R2: Performance Review (database query patterns, N+1, caching, SSE connection management, Zustand batch updates, memoization, bundle size)
3. R3: Code Quality Review (dead code, error handling, silent failures, type safety gaps, edge cases, test coverage holes, test correctness)
4. R4: Architecture Review (data flow SSR->Client->Store->Actions->DB, Inngest cron jobs & cleanup, circuit breaker pattern, import/export pipeline, architectural risks)

Acceptance Criteria:
- Check every API route and server action
- Include specific file paths, line numbers, severity (Critical/High/Medium/Low), and concrete before/after code fixes for each finding
- Verify each finding against actual code (no false positives)
- Provide data flow description/diagram and ranked architectural risks
- Produce a structured executive summary with top 5 most impactful issues

Coordinate specialists/workers as needed, maintain progress in your working directory (.agents/teamwork_preview_orchestrator/progress.md and BRIEFING.md), and report your final synthesis when complete.
