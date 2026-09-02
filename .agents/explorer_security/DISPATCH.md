## 2026-09-01T06:45:43Z
Audit the ENTIRE codebase for security vulnerabilities, covering:
1. Authentication flows (Better Auth implementation, session handling, cookie security)
2. Cached getCurrentUser implementation (is cache valid, can it leak across requests or sessions, cache key isolation)
3. Disabled password/email auth (verify it cannot be bypassed or invoked)
4. Authorization checks across EVERY API route (in src/app/api/ or equivalent) and EVERY Server Action (in src/actions/ or equivalent). Enumerate every route and action and verify user ownership/tenant isolation.
5. IDOR vulnerabilities (can user A query/modify/delete user B's portfolios, transactions, holdings, imports, alerts, etc.?)
6. Rate limiting implementation (where applied, what store/mechanism, bypasses)
7. Input validation (Zod schemas, SQL injection, parameter tampering)
8. Secret exposure (env variables, public API keys vs private, Next.js client-side env leaks)
9. CSP headers and security headers in next.config.ts / middleware
10. SSRF risks (external URL fetching, price APIs, webhook URLs, import URLs)

REQUIREMENTS:
- Enumerate and inspect EVERY API route and EVERY Server Action in the codebase.
- For every finding, provide:
  * Title and Severity (Critical / High / Medium / Low)
  * Exact File Path and Line Number(s)
  * Vulnerability Explanation & Evidence (verified against actual code)
  * Concrete Before / After Code Fix
- Ensure zero false positives (double check against actual code).
- Write your complete findings to /Users/lamtranhahuy/Project/portfolio-tracker/.agents/explorer_security/report.md
- Write a structured /Users/lamtranhahuy/Project/portfolio-tracker/.agents/explorer_security/handoff.md
- Send a completion message via send_message to the parent orchestrator when finished.
