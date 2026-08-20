# Portfolio Tracker 📈

Một hệ thống quản lý danh mục đầu tư toàn diện (Full-stack), hỗ trợ nạp dữ liệu từ file CSV, theo dõi biến động tài sản theo thời gian thực và tự động hóa việc cập nhật thị giá với kiến trúc **Enterprise-ready**.

## 🌟 Tính năng nổi bật

* **Xử lý Dữ liệu Nhanh chóng (Client-side Parsing):** Đọc và chuẩn hóa hàng ngàn dòng lịch sử giao dịch từ file CSV ngay trên trình duyệt với PapaParse, loại bỏ hoàn toàn độ trễ mạng.
* **Hệ thống Xác thực "Dual-core" (Better-Auth):** Hỗ trợ đăng nhập linh hoạt bằng tài khoản mạng xã hội (Google/GitHub OAuth) song song với hệ thống Custom Session (tích hợp Rate Limiting & chống Brute-force).
* **Tự động hóa Bất tử (Inngest Background Jobs):** Tự động quét và cập nhật thị giá, lịch sử ngoại tệ mỗi đêm. Các tác vụ nặng được Inngest tự động phân lô (batching) và retry khi có lỗi, loại bỏ hoàn toàn giới hạn 15s Timeout của Serverless.
* **Trạng thái Đồng bộ (Zustand & RSC):** Quản lý state mượt mà với Zustand (sử dụng memoizeOne cho các phép tính PnL phức tạp), kết hợp Server Actions để xử lý logic lưu trữ an toàn.
* **Giao diện Trực quan & Phản hồi Tức thì:** Biểu đồ phân bổ tài sản (Recharts), lưới dữ liệu phân trang, và hệ thống thông báo trạng thái cực mượt (Sonner Toasts).

## 🏗️ Kiến trúc Hệ thống (System Architecture)

Dự án áp dụng mô hình phân tách Server/Client nghiêm ngặt:
1.  **Database Layer:** PostgreSQL Serverless (NeonDB) + Drizzle ORM (Quản lý schema bằng luồng `generate/migrate` an toàn tuyệt đối).
2.  **Server Layer:** Đảm nhiệm fetch dữ liệu lần đầu (React Server Components) và thực thi Bulk Insert qua Server Actions.
3.  **Auth Layer:** Catch-all API Route `/api/auth/[...all]` từ Better-Auth kết hợp middleware bảo vệ route.
4.  **Background Worker:** Server Inngest tương tác trực tiếp với `/api/inngest` thông qua các "Step Functions", cho phép điều phối các tác vụ phân tán.
5.  **Client Layer:** Xử lý render UI bằng Tailwind + Shadcn, quản lý state (Zustand).

## 🛠️ Công nghệ Sử dụng

* **Framework:** Next.js 16 (App Router + Turbopack)
* **Ngôn ngữ:** TypeScript
* **Package Manager:** pnpm
* **Authentication:** Better-Auth
* **Background Jobs:** Inngest (v4)
* **Database:** Neon (PostgreSQL Serverless)
* **ORM:** Drizzle ORM
* **Styling & UI:** Tailwind CSS, Shadcn UI, Lucide React, Recharts
* **Testing:** Vitest

## 🚀 Hướng dẫn Cài đặt & Chạy Local

### 1. Clone repository
```bash
git clone https://github.com/lamtranhahuy4/portfolio-tracker.git
cd portfolio-tracker
```

### 2. Cài đặt Dependencies (Bắt buộc dùng pnpm)
```bash
pnpm install
```

### 3. Cấu hình Biến môi trường
Tạo file `.env.local` ở thư mục gốc và cung cấp các thông tin sau:
```env
# 1. Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@ep-cold-dew-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# 2. Inngest Background Jobs (Lấy tại https://app.inngest.com)
INNGEST_EVENT_KEY="local"
INNGEST_SIGNING_KEY="local"

# 3. Better-Auth (Xác thực OAuth)
BETTER_AUTH_SECRET="random-string-min-32-chars"
BETTER_AUTH_URL="http://localhost:3000" # Đổi thành domain thật khi lên Production
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# 4. APIs bên thứ ba
ALPHA_VANTAGE_API_KEY="your_alpha_vantage_api_key"
MARKETAUX_API_KEY="your_marketaux_api_key"
POLYGON_API_KEY="your_polygon_api_key"

# 5. Security nội bộ
CRON_SECRET="your_super_secret_cron_key"
ADMIN_SECRET="your_admin_secret"
ENABLE_DEBUG_ROUTES="false"
```

### 4. Khởi tạo Database Schema
Dự án sử dụng luồng Migration an toàn để không làm mất dữ liệu:
```bash
pnpm run db:generate
pnpm run db:migrate
```

### 5. Chạy môi trường Development

Để chạy toàn bộ hệ thống ở Local, bạn cần khởi động Next.js và Inngest Dev Server:

**Terminal 1 (Next.js):**
```bash
pnpm run dev
```
Truy cập Next.js Web: `http://localhost:3000`

**Terminal 2 (Inngest Dev Server):**
```bash
npx inngest-cli@latest dev
```
Truy cập Bảng điều khiển Inngest (Dashboard): `http://localhost:8288` (Để test và kích hoạt thủ công các hàm Cron ngầm).

## 🧪 Quy trình Kiểm tra (Crosscheck)

Trước khi tạo Pull Request hoặc Commit lên `main`, bắt buộc phải chạy bộ lệnh sau để đảm bảo hệ thống không có lỗi:
```bash
# Kiểm tra TypeScript, Linter và chạy 168+ Unit Tests
pnpm run check

# Kiểm thử quy trình Build Production
pnpm run build
```

## 📁 Cấu trúc Thư mục Chính

```text
src/
├── actions/       # Server Actions (Xử lý Auth, Portfolio)
├── app/           # App Router (Pages & API Routes)
├── components/    # Client & Server Components
├── db/            # Drizzle Schema, Connections, Migrations
├── inngest/       # Hàm Background Jobs & Steps
├── lib/           # Tiện ích, Better-Auth config (`better-auth.ts`)
├── store/         # Zustand State Management
└── services/      # Logic nghiệp vụ lõi lõi (ImportService, Parser)
drizzle/           # Lịch sử SQL Migrations
```
