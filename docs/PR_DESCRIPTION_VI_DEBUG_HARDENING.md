## Mục tiêu
Harden các debug/diagnostic endpoints để an toàn mặc định trên production, nhưng vẫn giữ khả năng troubleshoot ở local/dev.

## Thay đổi chính
- Thêm guard dùng chung cho debug routes tại `src/lib/debugAccess.ts`.
- Harden `GET /api/debug-session`:
  - Chặn mặc định ở production.
  - Chỉ cho phép khi `ENABLE_DEBUG_ROUTES=true` và có header `Authorization: Bearer <ADMIN_SECRET>`.
  - Sanitize payload, không trả PII/token hash/secret prefix.
- Xóa `POST /api/debug-session` để loại bỏ đường tạo test session.
- Harden `GET /api/check-env` với cùng policy và payload an toàn.
- `GET /api/session-check` chỉ còn trả `isLoggedIn`.

## Behavior change cần lưu ý
- `GET /api/session-check` không còn `userEmail` và `userId`.
- Debug routes trả `404` ở production nếu không bật tạm thời theo policy.

## Env vars liên quan
- `ADMIN_SECRET`: bắt buộc cho truy cập admin/debug có bảo vệ.
- `ENABLE_DEBUG_ROUTES`: mặc định `false` ở production/preview.

## Tài liệu đã cập nhật
- `docs/DEPLOYMENT.md`
- `docs/VERCEL_CHECKLIST.md`
- `README.md`
- `.env.example`
- `COMPLETION_SUMMARY_TASK_1_4.md`

## Kiểm tra
- `yarn typecheck`: pass
- `yarn test`: pass (150 tests)

## Commit
- `4539f59` - security: harden debug routes and add production access-policy tests
