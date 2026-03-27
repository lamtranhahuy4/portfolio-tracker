# Portfolio Tracker 📈

Một hệ thống quản lý danh mục đầu tư toàn diện (Full-stack), hỗ trợ nạp dữ liệu từ file CSV, theo dõi biến động tài sản theo thời gian thực và tự động hóa việc cập nhật thị giá.

## 🌟 Tính năng nổi bật

* **Xử lý Dữ liệu Nhanh chóng (Client-side Parsing):** Đọc và chuẩn hóa hàng ngàn dòng lịch sử giao dịch từ file CSV ngay trên trình duyệt với PapaParse, loại bỏ hoàn toàn độ trễ mạng.
* **Trạng thái Đồng bộ (Zustand & Server Actions):** Quản lý state mượt mà với Zustand, kết hợp Server Actions để lưu trữ vĩnh viễn vào cơ sở dữ liệu mà không cần tạo API dư thừa.
* **Giao diện Trực quan & Phản hồi Tức thì:** Biểu đồ phân bổ tài sản (Recharts), lưới dữ liệu phân trang, và hệ thống thông báo trạng thái cực mượt (Sonner Toasts).
* **Tự động hóa (Cron Jobs):** Tích hợp endpoint bảo mật cho Vercel Cron, cho phép hệ thống tự động quét và cập nhật thị giá tài sản mỗi đêm mà không cần can thiệp thủ công.
* **Tương thích Cloud IDE:** Kiến trúc linh hoạt, dễ dàng triển khai và code trực tiếp trên các môi trường đám mây như Project IDX hoặc GitHub Codespaces.

## 🏗️ Kiến trúc Hệ thống (System Architecture)

Dự án áp dụng mô hình phân tách Server/Client nghiêm ngặt của Next.js App Router:
1.  **Database Layer:** PostgreSQL Serverless (NeonDB) + Drizzle ORM.
2.  **Server Layer:** Đảm nhiệm fetch dữ liệu lần đầu (`page.tsx`) và thực thi Bulk Insert (`Server Actions`) để tối ưu SEO và tốc độ.
3.  **Client Layer:** Xử lý file CSV, render biểu đồ, quản lý state (Zustand) và tương tác người dùng (`DashboardClient.tsx`).
4.  **Background Worker:** API Route `/api/cron/update-prices` chạy ngầm theo lịch trình để cập nhật giá trị danh mục.

## 🛠️ Công nghệ Sử dụng

* **Framework:** Next.js 14 (App Router)
* **Ngôn ngữ:** TypeScript
* **Styling:** Tailwind CSS
* **State Management:** Zustand
* **Database:** Neon (PostgreSQL Serverless)
* **ORM:** Drizzle ORM
* **Tiện ích:** PapaParse (CSV), Recharts (Biểu đồ), Sonner (Toasts)

## 🚀 Hướng dẫn Cài đặt & Chạy Local

### 1. Clone repository
```bash
git clone https://github.com/lamtranhahuy4/portfolio-tracker.git
cd portfolio-tracker
```

### 2. Cài đặt Dependencies
```bash
npm install
```

### 3. Cấu hình Biến môi trường
Tạo file `.env.local` ở thư mục gốc và cung cấp các thông tin sau:
```env
# Chuỗi kết nối đến Neon PostgreSQL
DATABASE_URL="postgresql://user:password@ep-cold-dew-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# Khóa bảo mật để xác thực Vercel Cron Job
CRON_SECRET="your_super_secret_cron_key"
```

### 4. Khởi tạo Database Schema
Đẩy cấu trúc bảng (schema) lên PostgreSQL:
```bash
npx drizzle-kit push
```

### 5. Chạy môi trường Development
```bash
npm run dev
```
Truy cập `http://localhost:3000` để bắt đầu trải nghiệm ứng dụng.

## 📁 Cấu trúc Thư mục Chính

```text
src/
├── actions/       # Next.js Server Actions (Thao tác DB)
├── app/           # App Router, Pages, Layout, API Routes (Cron)
├── components/    # Client & Server Components (CsvUploader, Table, Banner)
├── db/            # Drizzle Schema & Kết nối Neon
├── lib/           # Helpers & Logic xử lý (csvMapper, Engine)
├── store/         # Zustand Store
└── public/        # Static assets (hero-banner.jpg)
```
