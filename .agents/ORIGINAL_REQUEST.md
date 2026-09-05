# Original User Request

## 2026-09-01T06:42:47Z

Comprehensive code review of a Next.js portfolio tracking application after completing 4 sprints of hotfixes, performance optimization, frontend refactoring, and tech debt cleanup. The review should assess the current state of the entire codebase across security, performance, code quality, and architecture dimensions. Each finding must include specific file paths, line numbers, severity, and a concrete fix suggestion.

Working directory: /Users/lamtranhahuy/Project/portfolio-tracker
Integrity mode: development

## Context

This is a production portfolio tracker built with Next.js 15, Drizzle ORM (Neon PostgreSQL), Zustand, Better Auth, Inngest (cron jobs), and SSE for realtime prices. Recent changes (Sprint 1-4) include:
- Database index optimization, UPSERT refactoring
- Per-service circuit breakers (replacing a monolithic breaker)
- SSE batch price updates to reduce re-render storms
- React.memo optimization on dashboard components
- Cron job fixes (ticker source, cleanup job)
- Unique index for duplicate import prevention
- New unit tests for server actions

## Requirements

### R1. Security Review
Audit authentication flows (Better Auth), authorization checks across all API routes and server actions, rate limiting implementation, IDOR vulnerabilities, input validation, secret exposure, CSP headers, and SSRF risks. Check that the recent auth changes (cached `getCurrentUser`, disabled email+password) are correctly implemented.

### R2. Performance Review
Evaluate database query patterns for N+1 issues, cache effectiveness, SSE connection management, Zustand store re-render behavior after the batch update refactor, component memoization completeness, and bundle size concerns. Verify the new `updatePricesBatch` actually prevents re-render storms.

### R3. Code Quality Review
Identify dead code, inconsistent error handling patterns, silent failures, type safety gaps, missing edge cases, and test coverage holes. Review the new test files for correctness and completeness. Check for code duplication and opportunities for consolidation.

### R4. Architecture Review
Assess the overall data flow (SSR → Client → Store → Server Actions → DB), the Inngest cron job design (including the new cleanup job), the circuit breaker pattern implementation, and the import/export pipeline. Identify any architectural risks or anti-patterns.

## Acceptance Criteria

### Security
- [ ] Every API route and server action has been checked for authentication and authorization
- [ ] All findings include file path, line number, severity (Critical/High/Medium/Low), and a specific code fix
- [ ] No false positives — each finding must be reproducible from the code

### Performance
- [ ] Database queries reviewed for index utilization and N+1 patterns
- [ ] SSE and Zustand batch update verified for correctness
- [ ] Each performance concern includes estimated impact and fix priority

### Code Quality
- [ ] Test coverage gaps identified with specific functions/modules that need tests
- [ ] Each code quality issue includes a concrete before/after code suggestion
- [ ] Dead code and unused imports identified

### Architecture
- [ ] Data flow diagram or description of how data moves through the system
- [ ] Architectural risks ranked by impact with mitigation suggestions

### Report Format
- [ ] All findings organized by category (Security, Performance, Quality, Architecture)
- [ ] Each finding has: severity, file:line, description, suggested fix
- [ ] Executive summary with top 5 most impactful issues to address next

## 2026-09-01T07:31:03Z

Create a detailed Sprint 5 implementation plan based on the recent comprehensive code review of the Portfolio Tracker application. The focus is strictly on planning and architecting solutions, not executing code changes.

Working directory: /Users/lamtranhahuy/Project/portfolio-tracker
Integrity mode: development

## Requirements

### R1. Report Analysis
Analyze the existing code review summary (`code_review.md`) and the detailed explorer reports (located in the `.agents/` directory) to thoroughly understand the identified security vulnerabilities, performance bottlenecks, code quality issues, and architectural risks.

### R2. Sprint 5 Implementation Plan
Develop a prioritized, concrete implementation plan for Sprint 5. The plan must prioritize resolving the Top 5 most impactful issues identified in the review:
1. `SEC-01`: Unauthenticated Server Action RPC (`actions/forex.ts`)
2. `QUAL-05`: `UnauthorizedError` class hierarchy bug
3. `PERF-01`: SWR Quote Poller bypassing Zustand batching
4. `PERF-02`/`PERF-03`: Zombie SSE connections (client and server)
5. `AR-01`: Non-atomic two-phase batch import

### R3. Risk Assessment
For every proposed solution or architectural change, you must include a specific "Risk Assessment" section that evaluates potential side effects, regressions, edge cases, or deployment trade-offs.

## Acceptance Criteria

### Plan Completeness & Accuracy
- [ ] An independent auditor agent can verify that all Top 5 critical issues have a concrete, actionable mitigation plan.
- [ ] Proposed architectural solutions are strictly compatible with the existing stack (Next.js 15 Server Actions, Drizzle ORM, Neon PostgreSQL serverless environment).

### Output Format
- [ ] The final output must be an artifact named `sprint_5_plan.md`.
- [ ] The document structure must include: Goals, Proposed Changes (grouped logically by component/file), Risk Assessment for each proposed change, and a Verification Plan.

## 2026-09-04T03:35:31Z

# Teamwork Project Prompt — Draft

> Requested team: Full team

Tiến hành đánh giá toàn diện UI và Layout của dự án portfolio-tracker, bao gồm tính nhất quán, responsive, UX, chất lượng code và phát hiện visual bugs. Sử dụng toàn bộ nhóm (Full team).

Working directory: /Users/lamtranhahuy/Project/portfolio-tracker
Integrity mode: development

## Requirements

### R1. Phân tích giao diện và trải nghiệm
Phân tích UI/Layout trên toàn bộ mã nguồn của dự án để đánh giá tính nhất quán trong thiết kế, khả năng phản hồi (responsive) trên các kích thước màn hình, và trải nghiệm người dùng (UX) tổng thể. Đánh giá hoàn toàn dựa trên mã nguồn hiện tại, không có tài liệu tham chiếu bên ngoài.

### R2. Đánh giá mã nguồn và lỗi hiển thị
Đánh giá chất lượng code của các UI components, bao gồm cấu trúc HTML/JSX, cách quản lý CSS/styling, và khả năng tiếp cận (accessibility). Phát hiện và ghi nhận các lỗi hiển thị (visual bugs) tiềm ẩn thông qua việc đọc hiểu luồng UI.

### R3. Xuất báo cáo đánh giá
Tổng hợp kết quả thành một file Markdown chi tiết. Mỗi vấn đề phát hiện được phải ghi rõ vị trí (đường dẫn file), mô tả vấn đề và đề xuất cách khắc phục cụ thể.

## Acceptance Criteria

### Báo cáo Markdown
- [ ] Báo cáo được lưu thành file `ui_review_report.md` trong thư mục dự án (hoặc thư mục gốc).
- [ ] Báo cáo bao phủ đầy đủ 5 khía cạnh: Tính nhất quán thiết kế, Responsive, UX, Chất lượng code UI, và Lỗi hiển thị (Visual bugs).

### Tính cụ thể và khả năng hành động
- [ ] 100% các vấn đề được nêu ra phải có đường dẫn file tham chiếu chính xác.
- [ ] Mỗi vấn đề đều đi kèm với một đề xuất sửa đổi cụ thể ở mức mã nguồn hoặc cấu trúc component.
- [ ] Không có các đánh giá cảm tính, chung chung (như "nhìn không đẹp") mà thiếu dẫn chứng hoặc lý do kỹ thuật.


