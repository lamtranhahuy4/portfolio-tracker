# Process — Security hardening (nhóm ưu tiên cao từ audit 28/10/2026)

**Branch:** `feature/security-hardening`

## Mục tiêu
Xử lý các vấn đề ưu tiên cao phát hiện trong lần audit source code:
dependency có CVE, server action thiếu validate, ghi đè giá toàn cục, endpoint tin tức công khai
đốt quota, luồng quên mật khẩu không hoạt động ở production, lint fail do quét thư mục tooling.

## Tiêu chí hoàn thành
- `pnpm audit --prod` không còn critical/high ở `next`, `better-auth`, `drizzle-orm`, `xlsx`, `@sentry/nextjs`.
- Mọi server action ghi dữ liệu đều validate input bằng Zod trước khi chạm DB.
- `pnpm run check` xanh và `next build` thành công.

## Checklist
- [x] Tạo branch `feature/security-hardening` và `process.md`
- [x] Nâng cấp `next`, `eslint-config-next`, `better-auth`, `drizzle-orm`/`drizzle-kit`, `@sentry/nextjs`; thay `xlsx` npm bằng bản chính thức SheetJS
  - next 16.4.3, better-auth 1.7.14, drizzle-orm 0.45.4 + drizzle-kit 0.31.11, @sentry/nextjs 10.77.1, xlsx 0.20.3 (cdn.sheetjs.com), zod 4.6.7 (CsvParser đổi sang API v4).
  - Audit prod: 7 critical/42 high → 0 critical/25 high; phần high còn lại là transitive build-time (Sentry bundler plugin, OpenTelemetry của Inngest, vitest của better-auth).
  - `drizzle-kit up` nâng snapshot meta lên v7 (chỉ metadata, không có SQL).
  - ⚠️ Phát hiện lệch schema có sẵn: `schema.ts` có `portfolio_settings.telegram_chat_id` và partial unique index `import_batches_active_checksum_unique_idx` nhưng **không có migration nào**. Đã gỡ migration `drizzle-kit generate` sinh ra để không đụng DB — cần người dùng xác nhận DB prod đã có cột này chưa trước khi tạo migration.
- [x] Thêm Zod schema + validate cho server actions ghi dữ liệu
  - `src/lib/validation/actionSchemas.ts` + `parseActionInput()` → `AppError` 400 `VALIDATION_ERROR`.
  - Áp dụng: `saveTransactionsBatch`, `saveManualTransaction`, `saveCashEventsBatch`, `saveManualDeposit`, `saveOpeningPositionSnapshot`, `saveCutoffSettings`. Giới hạn 20.000 dòng/batch, giá trị < 1e14 (tránh tràn `numeric(18,4)`), id phải là UUID.
  - Thêm 2 test chặn dữ liệu xấu; test cũ đổi id sang UUID hợp lệ.
- [x] Khoá `setManualPriceAction` (chỉ admin)
  - `requireAdmin()` trong `src/lib/auth.ts`: email nằm trong `ADMIN_EMAILS` **và** `emailVerified = true` (đăng ký email/mật khẩu không xác minh email nên không đủ điều kiện).
- [x] `/api/stock-news`: yêu cầu đăng nhập, rate limit, cache kết quả
  - 401 khi chưa đăng nhập; 20 req/phút/user; tối đa 20 mã (cắt bớt, không lỗi); `unstable_cache` 15 phút theo danh sách mã đã sort → dùng chung giữa các user và instance.
  - Gỡ `'use server'` thừa ở đầu file route (biến `GET` thành server action).
- [x] Luồng quên mật khẩu: gửi email thật (Resend qua HTTP) hoặc báo rõ tính năng chưa khả dụng
  - `src/lib/email.ts` (fetch tới Resend, không thêm SDK) + 5 test.
  - Production thiếu `RESEND_API_KEY`/`EMAIL_FROM`/`NEXT_PUBLIC_APP_URL` → trả `EMAIL_UNAVAILABLE`, UI hiện thông báo rõ thay vì giả vờ "đã gửi". Kiểm tra trước khi tra user nên không lộ email tồn tại.
  - Throttle 3 lần/15 phút/email, 10 lần/IP (in-memory, theo instance).
- [x] ESLint bỏ qua `.ua/`, `coverage/`, `playwright-report/`, `test-results/`, `.agents/`, `.claude/`
  - Lint: 0 error, 23 warning (warning có sẵn, chưa xử lý).
- [x] Chạy `pnpm run check` + `next build`; cập nhật README, handoff
  - `pnpm run check`: typecheck sạch, lint 0 error, 238/238 test pass. `next build` OK (chạy `next build` trực tiếp, **không** chạy `pnpm build` vì script đó gọi `db:migrate` vào DB thật).
  - Smoke test `next start` local: `/api/stock-news` chưa đăng nhập → 401; `/`, `/forgot-password`, `/reset-password` hydrate; form quên mật khẩu hiện đúng thông báo `EMAIL_UNAVAILABLE`.
  - **Phát sinh & đã sửa:** CSP nonce chặn toàn bộ JS ở các trang prerender tĩnh (`/forgot-password`, `/reset-password`, `/_not-found`) — lỗi có sẵn trên production. Middleware forward CSP qua request headers + root layout `await connection()`.
  - README: thêm `ADMIN_EMAILS`, `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_APP_URL`. `.env.example` cập nhật tương ứng. `docs/HANDOFF.md`: thêm mục phiên 28/10.
- [ ] (Dời — cần người dùng quyết định) Migration cho lệch schema `telegram_chat_id` / `import_batches_active_checksum_unique_idx`
- [x] Commit lên `feature/security-hardening` (chưa push, chưa mở PR).
