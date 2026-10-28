# HANDOFF — Portfolio Tracker 📈

## 🆕 Phiên 28/10/2026 — Audit + security hardening (branch `feature/security-hardening`, đã commit, chưa push)

**Đã làm** (chi tiết từng bước trong `process.md` ở thư mục gốc):
- **Dependency:** next 16.2.6→16.4.3, better-auth 1.7.1→1.7.14, drizzle-orm 0.30→0.45.4 (+ drizzle-kit 0.31.11, snapshot meta nâng lên v7 bằng `drizzle-kit up`), @sentry/nextjs 10.77.1, zod 3→4.6.7, `xlsx` chuyển sang bản chính thức `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`. `pnpm audit --prod`: 7 critical/42 high → 0 critical/25 high (còn lại là transitive build-time).
- **Zod validate cho Server Actions** ghi dữ liệu: `src/lib/validation/actionSchemas.ts` + `parseActionInput()` (lỗi → `AppError` 400 `VALIDATION_ERROR`).
- **`setManualPriceAction`** (ghi đè giá dùng chung cho mọi user) chỉ cho admin: `requireAdmin()` trong `src/lib/auth.ts` — email thuộc `ADMIN_EMAILS` **và** `emailVerified` (chỉ tài khoản OAuth mới có).
- **`/api/stock-news`:** bắt buộc đăng nhập, 20 req/phút/user, tối đa 20 mã, `unstable_cache` 15 phút.
- **Quên mật khẩu:** gửi email qua Resend HTTP API (`src/lib/email.ts`, không thêm SDK); production thiếu cấu hình → báo rõ `EMAIL_UNAVAILABLE`; throttle theo email/IP.
- **Fix CSP nonce (lỗi có sẵn trên production):** `/forgot-password`, `/reset-password`, `/_not-found` bị prerender tĩnh nên script không có nonce → CSP chặn toàn bộ JS, trang không tương tác được. Sửa: middleware forward CSP + `x-nonce` qua **request** headers; root layout gọi `await connection()` để mọi trang render theo request.
- ESLint bỏ qua `.ua/`, `coverage/`, `playwright-report/`, `test-results/`, `.agents/`, `.claude/` → `pnpm run check` xanh (0 error, 23 warning cũ).

**Đã verify:** `pnpm run check` (238 test pass), `next build` OK, chạy `next start` local: `/api/stock-news` không đăng nhập → 401; `/`, `/forgot-password`, `/reset-password` hydrate; form quên mật khẩu hiện đúng thông báo khi chưa cấu hình email. Chưa test gửi email thật (cần `RESEND_API_KEY`).

**⚠️ Cần người dùng quyết định trước khi deploy:**
1. **Lệch schema có sẵn:** `schema.ts` có `portfolio_settings.telegram_chat_id` + partial unique index `import_batches_active_checksum_unique_idx` nhưng `drizzle/` không có migration nào tạo chúng. Cần kiểm tra DB prod đã có chưa (có thể từng dùng `push`). Nếu chưa → `pnpm run db:generate` sẽ sinh migration (đã thử và gỡ ra trong phiên này); nếu có rồi → cần migration "baseline" để không lỗi `already exists` khi `build` chạy `db:migrate`.
2. Set biến môi trường Vercel mới: `ADMIN_EMAILS`, `RESEND_API_KEY`, `EMAIL_FROM`, và đảm bảo `NEXT_PUBLIC_APP_URL`.

**Next steps (từ audit, chưa làm):** rate limiter API vẫn in-memory (nên chuyển sang DB/Upstash); `/api/admin/*` dùng secret tĩnh, `/api/admin/users` không constant-time/rate limit; dedup index `transactions` (user, ngày, mã, loại, KL, giá) có thể bỏ sót lệnh khớp trùng cùng ngày; Inngest price-alert có thể gửi Telegram trùng khi retry; engine PnL cảnh báo "Treating as zero" cho phí/thuế âm nhưng không clamp; đổi `middleware.ts` → `proxy.ts` (Next 16), import `withSentryConfig` từ `@sentry/nextjs/config`; 53 chỗ `console.*`; script `db:push` vẫn còn trong `package.json`.

---

**Ngày:** 10/10/2026
**Repo:** `https://github.com/lamtranhahuy4/portfolio-tracker`
**Thư mục local:** `/Users/lamtranhahuy/Project/portfolio-tracker`
**Branch:** `main` @ `1207e08` — "docs: clarify auth secrets in .env.example to prevent CI crashes", đã sync với `origin/main`
**Working tree:** chỉ có `.serena/project.yml` và `next-env.d.ts` bị sửa (artifact auto-generated, không quan trọng), untracked `.claude/`, `.ua/` (tooling nội bộ). **Không có code dở dang chưa commit.**

---

## 1. Dự án là gì?

**Portfolio Tracker** — hệ thống full-stack quản lý danh mục đầu tư, tập trung thị trường Việt Nam:

- **Import giao dịch** từ CSV/Excel ngay trên client (PapaParse + `xlsx`), hỗ trợ định dạng **DNSE Trade / DNSE Cash** (`src/lib/parsers/`, `src/services/ImportService.ts`, `src/actions/importBatch.ts`, `src/actions/importFile.ts`).
- **Theo dõi real-time:** quotes, SSE stream tại `/api/stream`, hook `useRealtimePrices`, SWR.
- **Dashboard:** phân bổ tài sản, NetWorthChart, IRR, PnL (Decimal.js — không floating-point), biểu đồ Recharts + lightweight-charts (TradingView), forex, vàng, quỹ, VNIndex, watchlist, price-alerts, stock-news/world-news, tax-calculation.
- **Tự động hóa:** cập nhật giá & snapshot forex đêm qua **Inngest v4 Step Functions** (`src/inngest/functions.ts`, serve tại `/api/inngest`) và **Vercel Cron** (`/api/cron/update-prices`, `/api/cron/forex-snapshot`, gate bằng `CRON_SECRET`).
- **Auth "dual-core":** Custom Session (scrypt + DB session — `src/lib/auth.ts`, secret `AUTH_SECRET`) chạy **song song** Better-Auth OAuth Google/GitHub (`src/lib/better-auth.ts`, catch-all `/api/auth/[...all]`, secret `BETTER_AUTH_SECRET`).
- **Enterprise-ready:** Drizzle `generate/migrate` (cấm `push`), Pino logger, Sentry, rate limiter + circuit breaker + retry, CSP, middleware bảo vệ route, debug/admin routes harden (gate kép).

**Deploy:** Vercel + NeonDB (PostgreSQL Serverless). Script `build` tự chạy migrate trước (`pnpm db:migrate && next build`), điều phối bởi `vercel.json` + `vercel-ignore-build-step.sh`.

## 2. Tech Stack (đã chốt — không thêm lib mới nếu chưa confirm)

| Layer | Công nghệ |
|---|---|
| Framework | Next.js **^16.4.3** (App Router + Turbopack), React **^19** |
| Ngôn ngữ | TypeScript **^5.4.5** (strict) |
| Package manager | **pnpm only** (đã xóa `yarn.lock`) |
| DB | Neon PostgreSQL Serverless (`@neondatabase/serverless ^0.9.3`, `pg ^8.23.0`) |
| ORM | Drizzle ORM **^0.45.4** + drizzle-kit ^0.31.11 |
| Auth | Better-Auth **^1.7.14** + custom session `src/lib/auth.ts` |
| Background jobs | Inngest **^4.18.1** (`npx inngest-cli@latest dev` để test local) |
| State | Zustand **^4.5.2** (`memoizeOne` cho PnL nặng) + SWR |
| UI | Tailwind **^3.4.19**, Shadcn-style, `clsx` + `tailwind-merge`, Lucide, Sonner |
| Charts | Recharts **^2.12.7** + lightweight-charts **^5.2.0** |
| Parsing | PapaParse **^5.4.1** (CSV), xlsx **0.20.3** từ cdn.sheetjs.com (Excel) |
| Tiền tệ | **decimal.js** — cấm floating-point cho tiền |
| Validate / Log / Errors | Zod ^4.6.7, Pino ^10.3.1, @sentry/nextjs ^10.47.0 (`src/lib/sentry.ts`) |
| Test | Vitest **^4.1.2** + coverage-v8, Playwright **^1.63.0** (E2E), **k6** (load) |
| Quality gates | ESLint 9 flat config, Husky ^9.1.7 + lint-staged ^17.5.1 |

## 3. Cấu trúc mã nguồn thực tế

```
src/
  actions/        # 11 Server Actions: auth, transaction, cashLedger, importBatch,
                  #   importFile, market, forex, price, portfolioSettings,
                  #   openingPositions, account (+ __tests__/)
  app/            # page.tsx (Dashboard SSR), layout.tsx, account/, forex/,
                  #   forgot-password/, reset-password/
    api/          # ~28 route groups: auth/[...all], admin/{users,reset-password},
                  #   cron/{update-prices,forex-snapshot}, quotes, stream (SSE),
                  #   inngest, health, gold, fund-price, foreign-exchange{,history,snapshot},
                  #   forex-summary, historical-prices, history, market-indices,
                  #   vnindex-history, price-alerts, watchlist, trending-assets,
                  #   stock-news, world-news, tax-calculation, session-check,
                  #   check-env, debug-session, robots, sitemap
  components/     # ~43 components (DashboardClient, NetWorthChart, ...)
  db/             # schema.ts, index.ts (connection), migrate.ts
  domain/  hooks/  types/
  inngest/        # client.ts, functions.ts (step.run batch/chunk)
  lib/            # 30+ module: auth, better-auth, priceService, marketData,
                  #   foreignExchangeService, goldPriceService, portfolioMetrics,
                  #   circuitBreaker, retry, rateLimiter, apiRateLimiter, csp,
                  #   logger, errorHandler, sentry, i18n, dashboardLocale,
                  #   exportCsv, importParser, importBatches, memoization,
                  #   formatters, constants, utils, requestUtils, debugAccess,
                  #   useRealtimePrices, mockData,
                  #   parsers/{BaseParser,CsvParser,DnseCashParser,DnseTradeParser}
  middleware.ts
  services/       # ImportService.ts
  store/          # usePortfolioStore.ts (Zustand)
  test/           # setup.ts, factories, fetchMock, dbHelpers, apiHelpers,
                  #   integration/api/*, integration/db/*
drizzle/          # SQL migration history (+ drizzle.config.ts)
e2e/              # global-setup.ts, auth.spec.ts, import.spec.ts,
                  #   authenticated-flows.spec.ts, additional-flows.spec.ts
k6/               # health.js, quotes.js, quotes-batch.js, quotes-refresh.js, comprehensive.js
scripts/          # daily_maintenance.sh
docs/             # SYSTEM_OVERVIEW.md, architecture-review, SECURITY_AUDIT, SECURITY_
                  #   VULNERABILITIES, DEPLOYMENT, VERCEL_CHECKLIST, GIT_WORKFLOW,
                  #   sprint-plan-2026-09-11, PR_*.md, adr/, archive/
.agents/          # workspace sub-agent (explorer_*, challenger_*, auditor_ui* + iteration2)
                  #   mỗi folder có BRIEFING/DISPATCH/handoff/progress/report
docker-compose.yml  # Postgres local cho integration test
coverage/ playwright-report/ test-results/  # artifacts (đã gitignore)
```

## 4. Biến môi trường (theo `.env.example`)

⚠️ Máy dev đang có `.env` và `.env.local` chứa secrets thật — **tuyệt đối không commit** (`.gitignore` đã cover; từng có commit `9c83526` untrack planning docs).

| Nhóm | Biến | Bắt buộc |
|---|---|---|
| DB | `DATABASE_URL` (+ `TEST_DATABASE_URL` cho integration test) | ✅ |
| Auth | `AUTH_SECRET` (custom session) **và** `BETTER_AUTH_SECRET` + `BETTER_AUTH_URL` | ✅ **cả hai** — thiếu 1 cái là crash prod/CI (nguyên nhân của 2 commit HEAD gần nhất) |
| Admin | `ADMIN_SECRET` (cho `/api/admin/*`, password reset) | ✅ |
| Cron | `CRON_SECRET` | ✅ |
| Debug | `ENABLE_DEBUG_ROUTES` — route debug chỉ mở khi `true` **và** header `Authorization: Bearer <ADMIN_SECRET>` | mặc định `false` |
| App | `NEXT_PUBLIC_APP_URL` | nên có |
| Sentry | `SENTRY_DSN` | tùy chọn |
| News APIs | `ALPHA_VANTAGE_API_KEY`, `MARKETAUX_API_KEY`, `POLYGON_API_KEY` | cho StockNews |
| Inngest (local) | `INNGEST_EVENT_KEY=local`, `INNGEST_SIGNING_KEY=local` | local dev |
| OAuth (tuỳ chọn) | `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET` | khi bật social login |

## 5. Lệnh thường dùng

```bash
pnpm install

# Database — QUY TẮC VÀNG: KHÔNG dùng `drizzle-kit push`
pnpm run db:generate && pnpm run db:migrate

# Local dev (2 terminal)
pnpm run dev                    # Next.js → http://localhost:3000
npx inngest-cli@latest dev      # Inngest dashboard → http://localhost:8288

# Quality gate BẮT BUỘC trước khi commit lớn
pnpm run check                  # typecheck + lint + vitest
pnpm run build                  # = pnpm db:migrate && next build

# Test
pnpm run test        # (hoặc test:watch, test:coverage)
npx playwright test  # E2E (cần TEST_DATABASE_URL, xem e2e/global-setup.ts)

# Load test
pnpm run load:smoke   # (hoặc load:all, load:stress / k6 run k6/comprehensive.js)
```

## 6. Quy ước & luật bất di bất dịch

1. **Migration:** cấm `drizzle-kit push`. Luôn `db:generate` → `db:migrate` (script custom `src/db/migrate.ts`).
2. **Task nặng / gọi API ngoài:** bắt buộc queue qua Inngest, chia batch bằng `step.run()` — tránh limit 15s của Vercel Serverless.
3. **Tiền tệ:** Decimal.js, không bao giờ floating-point.
4. **Data-fetch:** ưu tiên RSC + Server Actions.
5. **Logging:** qua `src/lib/logger.ts` (Pino) — không `console.log`.
6. **Types:** không `any` (đã dọn sạch trong test files — giữ nguyên tiêu chuẩn này).
7. **Git:** làm việc trên `feature/xxx`, Conventional Commits (`feat/fix/chore/refactor(scope): …`), merge vào `main` chỉ sau khi `pnpm run check && pnpm run build` xanh. Component PascalCase, function/var camelCase.

## 7. Trạng thái hiện tại — đã xong gì?

`git log -40` cho thấy chuỗi hoàn chỉnh: Sprint 1-2 (security hotfix + perf) → Sprint 5 (security hardening, resilience) → Sprint 6 (UI) → Sprint 7 (CI/CD + IRR) → UI/UX master plan → dọn dead code/`console.log`/`any` → xây test infrastructure (factories, fetchMock, coverage, unit cho utils/Tier-2/BaseParser/priceService/ImportService) → Husky + lint-staged quality gates → E2E Playwright (fix DB connection, align specs với app behavior, luồng import DNSE authenticated, xử lý hidden file input + OnboardingWizard gate, cấp `AUTH_SECRET` cho CI).

**Hiện tại `main` xanh, không nợ commit.**

**Việc tiếp theo đã được xác định** (`docs/sprint-plan-2026-09-11.md`): *"E2E coverage cho luồng import (DNSE parser) + xác thực E2E Playwright"* — spec đã commit, cần: (a) xác nhận chạy xanh ổn định trên CI, (b) mở rộng E2E cho cash import + rollback batch.

## 8. Rủi ro & nợ kỹ thuật người tiếp nhận PHẢI biết

1. **Dual-auth dễ nhầm:** `AUTH_SECRET` (custom session) và `BETTER_AUTH_SECRET` (Better-Auth lib) là 2 hệ thống song song. Thiếu 1 cái là crash prod/CI. Sign-out phải invalidate cả hai loại session, nếu không dính bug "OAuth re-login" (đã fix một lần ở commit `7578a51`).
2. **Docs mâu thuẫn về auth:** `docs/SYSTEM_OVERVIEW.md` ghi "Auth: Custom (scrypt + DB sessions)" còn `README.md` ghi "Better-Auth Dual-core" — cả hai đúng một nửa. Cần thống nhất mô tả. Ngoài ra `docs/` trùng lặp theo thời gian (SECURITY_AUDIT vs SECURITY_VULNERABILITIES, nhiều `PR_*.md`, `archive/`) → nên chỉ định một "source of truth".
3. **DB schema vừa thay đổi:** cột enum `asset_type` đã bị drop khỏi `transactions`, `market_prices`, `price_history` (commit `4a2557e`). Luôn verify `src/db/schema.ts` + `drizzle/` trước khi migrate/refactor.
4. **Import DNSE là lõi nghiệp vụ:** sửa parser (`BaseParser/DnseTradeParser/DnseCashParser/CsvParser`) hoặc UI import → **phải** cập nhật kèm unit test + `e2e/import.spec.ts`. E2E phụ thuộc OnboardingWizard gate và hidden file input — hai điểm từng làm spec fail.
5. **External API quota:** AlphaVantage/MarketAux/Polygon phải đi qua Inngest + `retry`/`circuitBreaker`/`rateLimiter`, không fetch trực tiếp dài trong Serverless.
6. **Debug/admin routes** (`/api/admin/*`, `/api/debug-session`, `/api/check-env`, `/api/session-check`) đã harden — khi test phải thử cả 2 điều kiện của gate kép (`ENABLE_DEBUG_ROUTES=true` **và** `Authorization: Bearer <ADMIN_SECRET>`).
7. **Trước khi refactor lớn:** đọc `report.md` trong `.agents/auditor_ui*`, `.agents/challenger_ui_*`, `.agents/explorer_*` để khỏi lặp lại finding cũ.
8. **Untracked `.claude/`, `.ua/`** và file `.serena/project.yml` bị sửa: quyết định có đưa vào `.gitignore` hay không trước commit kế tiếp.

## 9. Checklist bàn giao cho người/agent tiếp theo

- [ ] Đọc `README.md`, `CLAUDE.md`, `docs/SYSTEM_OVERVIEW.md`, `docs/architecture-review-2026-03-30.md`, `docs/SECURITY_AUDIT.md`, `docs/DEPLOYMENT.md`, `docs/VERCEL_CHECKLIST.md`, `docs/sprint-plan-2026-09-11.md`
- [ ] Dựng `.env.local` từ `.env.example` — đủ **2 auth secrets** + Neon URL; chạy `db:generate`/`db:migrate`; chạy `dev` + Inngest dev; verify `/api/health`, `/api/quotes`
- [ ] Chạy `pnpm run check && pnpm run build` làm baseline; `test:coverage` + `npx playwright test` nếu đụng import/auth
- [ ] Xác nhận Vercel env vars khớp `.env.example`; xem lại `vercel.json` (cron schedules) và `vercel-ignore-build-step.sh`
- [ ] Tuân thủ mục 6 (quy ước); không thêm lib ngoài stack đã chốt
- [ ] Việc gợi ý tiếp theo: consolidate dual-auth về 1 source of truth; mở rộng E2E (cash import, rollback); chạy `k6/comprehensive.js` trước release; đồng bộ `docs/SYSTEM_OVERVIEW.md` với coverage thực tế

---

*Phạm vi & giả định:* handoff tổng hợp từ trực tiếp đọc `README.md`, `package.json`, `CLAUDE.md`, `.env.example`, `docs/SYSTEM_OVERVIEW.md`, `docs/sprint-plan-2026-09-11.md`, `git log/status`, và listing `src/`, `docs/`, `e2e/`. Chưa đọc sâu từng dòng của `schema.ts`, `functions.ts` hay từng component — người nhận nên verify schema và Inngest steps trực tiếp trong code trước khi migrate/refactor.
