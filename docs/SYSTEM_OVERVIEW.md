# Hệ Thống Portfolio Tracker

## Tổng Quan

Portfolio Tracker là hệ thống quản lý danh mục đầu tư chứng khoán full-stack, tập trung vào thị trường Việt Nam. Hệ thống cho phép người dùng import lịch sử giao dịch từ file CSV/Excel (hỗ trợ DNSE), theo dõi giá trị tài sản real-time và tự động cập nhật giá thị trường qua cron jobs.

**Repository:** `https://github.com/lamtranhahuy4/portfolio-tracker`
**Deployment:** Vercel + NeonDB (PostgreSQL Serverless)

---

## Công Nghệ

| Layer | Công Nghệ |
|-------|-----------|
| **Framework** | Next.js 16.2 (App Router) |
| **Ngôn ngữ** | TypeScript (strict) |
| **Styling** | Tailwind CSS 3.4 + `clsx` + `tailwind-merge` |
| **State Management** | Zustand 4.5 |
| **Database** | Neon (PostgreSQL Serverless) |
| **ORM** | Drizzle ORM 0.30 |
| **Charts** | Recharts 2.12 + lightweight-charts 5.2 (TradingView) |
| **CSV Parsing** | PapaParse 5.4 |
| **Excel Parsing** | `xlsx` 0.18 |
| **Money** | `decimal.js` (100% Decimal.js, không floating-point) |
| **Auth** | Custom (scrypt + DB-backed sessions) |
| **Error Tracking** | Sentry 10.47 |
| **Logging** | Pino 10.3 |
| **Testing** | Vitest 4.1 (145 tests) |
| **Load Testing** | k6 |
| **Package Manager** | pnpm |

---

## Kiến Trúc Thư Mục

```
src/
├── actions/          # Next.js Server Actions (11 files)
│   ├── auth.ts       # signUp, signIn, signOut, password reset
│   ├── transaction.ts # CRUD giao dịch
│   ├── cashLedger.ts  # Quản lý sổ quỹ tiền mặt
│   ├── importBatch.ts # Import batch + rollback
│   ├── importFile.ts  # Xử lý upload file
│   ├── market.ts      # Trạng thái thị trường
│   ├── forex.ts       # Tỷ giá ngoại tệ
│   ├── price.ts       # Giá chứng khoán
│   └── portfolioSettings.ts # Cài đặt danh mục
├── app/               # App Router
│   ├── page.tsx       # Dashboard chính (SSR)
│   ├── api/           # 25+ API routes
│   │   ├── cron/      # Vercel Cron Jobs (update-prices, forex-snapshot)
│   │   ├── quotes/    # Real-time stock quotes
│   │   ├── stream/    # SSE streaming
│   │   └── ...
│   ├── account/       # Trang cài đặt tài khoản
│   └── forex/         # Trang tỷ giá
├── components/        # 43 React components
│   ├── DashboardClient.tsx
│   ├── NetWorthChart.tsx
│   ├── MarkToMarketGrid.tsx
│   ├── ReconciliationPanel.tsx
│   ├── CsvUploaderServerImport.tsx
│   └── ...
├── db/
│   ├── index.ts       # Kết nối NeonDB
│   └── schema.ts      # 14 tables: users, sessions, transactions, ...
├── domain/portfolio/  # Core engine
│   ├── decimal.ts     # Decimal.js helpers
│   ├── primitives.ts  # Branded types (Money, Quantity, Price)
│   ├── portfolioMetrics.ts  # Engine tính toán danh mục (670 dòng)
│   └── entities/ReplayEntities.ts
├── lib/               # Utilities
│   ├── parsers/       # Hệ thống parsers (CSV, DNSE Excel)
│   ├── marketData.ts  # DNSE API + Yahoo Finance + CoinGecko
│   ├── priceService.ts # Price caching/audit
│   ├── foreignExchangeService.ts # Vietcombank + Frankfurter API
│   ├── auth.ts        # Session management
│   ├── rateLimiter.ts # Rate limiting
│   └── i18n.ts        # Song ngữ (vi/en)
├── services/
│   └── ImportService.ts  # Orchestrator xử lý import
├── store/
│   └── usePortfolioStore.ts  # Zustand store (5 slices)
├── types/              # TypeScript types
└── test/               # Unit + integration tests
```

---

## Database (14 tables)

| Table | Mục Đích |
|-------|----------|
| `users` | Tài khoản người dùng |
| `sessions` | Session đăng nhập |
| `transactions` | Sổ cái giao dịch (BUY/SELL/DEPOSIT/WITHDRAW/DIVIDEND...) |
| `cashLedgerEvents` | Sổ quỹ tiền mặt thực tế |
| `openingPositions` | Ảnh chụp vị thế đầu kỳ |
| `portfolioSettings` | Cài đặt danh mục (phí, thuế, cutoff date) |
| `marketPrices` | Giá thị trường cached |
| `priceHistory` | Lịch sử thay đổi giá |
| `forexRatesHistory` | Lịch sử tỷ giá |
| `importBatches` | Lịch sử import file |
| `watchlist` | Danh sách theo dõi |
| `priceAlerts` | Cảnh báo giá |
| Và 3 tables khác (loginAttempts, accountLockouts, passwordResets) |

---

## Core Engine: Portfolio Metrics

File `src/domain/portfolio/portfolioMetrics.ts` (670 dòng) là trái tim của hệ thống:

- **FIFO + Average-Cost** P&L: Tính đồng thời cả 2 phương pháp
- **Lot tracking**: Mỗi lệnh BUY tạo một lot FIFO, SELL tiêu thụ lot theo thứ tự
- **Cash Drift Analysis**: So sánh tiền mặt derived (từ trade replay) vs ledger (từ sao kê thực tế)
- **Daily NAV Series**: Chuỗi giá trị tài sản ròng theo ngày
- **100% Decimal.js**: Không floating-point trong tính toán tài chính

---

## Parsers (Import File)

Hệ thống tự động phát hiện định dạng file import:

1. **CSV**: Generic parser dùng PapaParse
2. **DNSE Trade (.xlsx)**: Parser chuyên biệt cho báo cáo giao dịch DNSE
3. **DNSE Cash (.xlsx)**: Parser cho sao kê tiền DNSE

Logic auto-detect: kiểm tra tên file → thử trade parser → fallback cash parser.

---

## Tính Năng Chính

- **Dashboard**: Tổng quan danh mục (NAV, Cost Basis, P&L, Asset Allocation)
- **Reconciliation Panel**: Phân tích tài sản với cash drift
- **Mark-to-Market Grid**: Bảng holdings có inline editing
- **Net Worth Chart**: Biểu đồ NAV theo thời gian
- **Real-time Prices**: Quotes qua DNSE API + SSE streaming
- **Import File**: Upload CSV/XLSX với auto-detect + rollback
- **Manual Entry**: Thêm giao dịch thủ công (BUY/SELL/DEPOSIT)
- **Cron Jobs**: Cập nhật giá tự động hàng đêm
- **Forex Converter**: Tỷ giá VCB + Frankfurter
- **News Feed**: Tin tức chứng khoán + thế giới
- **Watchlist + Price Alerts**: Theo dõi và cảnh báo giá
- **Bilingual UI**: Tiếng Việt / English
- **PWA**: Cài đặt như ứng dụng desktop

---

## Bảo Mật

- **Password**: scrypt hash (64-byte) với per-user salt
- **Sessions**: DB-backed, httpOnly/SameSite/Secure, 30-day TTL
- **Rate Limiting**: 5 lần auth fail → lockout 15 phút
- **API Rate Limiting**: 60 requests/phút/client
- **CSP**: Nonce-based Content Security Policy
- **Headers**: HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- **Sentry**: Monitoring production, tunnel qua `/monitoring`
- **Debug routes**: Tắt trong production

---

## Testing

- **145 tests** (118 unit + 27 integration)
- **Vitest** với path aliases
- **k6** load testing (smoke, load, stress)
- **ESLint + TypeScript strict**

---

## Deployment

- **Platform**: Vercel
- **Database**: Neon (PostgreSQL Serverless)
- **CI/CD**: GitHub → Vercel
- **Local Dev**: Docker Compose (PostgreSQL)
- **Cron**: Vercel Cron (nightly price/forex updates)
