# BÁO CÁO ĐÁNH GIÁ TOÀN DIỆN GIAO DIỆN (UI/UX), KHẢ NĂNG PHẢN HỒI (RESPONSIVE) VÀ KIẾN TRÚC FRONTEND

**Dự án:** `portfolio-tracker`  
**Đơn vị thực hiện:** UI/UX Synthesis & Forensic Review Team  
**Ngày lập báo cáo:** 2026-09-04  
**Chế độ kiểm tra:** Integrity Mode: Development (Kiểm định tĩnh mã nguồn 100% không giả lập, đối chiếu trực tiếp từng dòng code)  
**Phạm vi rà soát:** 6 route pages, 1 loading skeleton, toàn bộ 44 component trong `src/components/`, cấu hình Tailwind CSS, CSS globals, và hạ tầng trực quan hóa SVG/Canvas.  
**Tệp bàn giao:** `/Users/lamtranhahuy/Project/portfolio-tracker/ui_review_report.md`

---

## MỤC LỤC

1. [Tổng Quan Đánh Giá & Kiến Trúc Frontend (Executive Summary)](#1-tổng-quan-đánh-giá--kiến-trúc-frontend-executive-summary)
   - [1.1 Tổng Quan Công Nghệ & Route Topology](#11-tổng-quan-công-nghệ--route-topology)
   - [1.2 Kiểm Kê Toàn Bộ UI Components](#12-kiểm-kê-toàn-bộ-ui-components)
   - [1.3 Điểm Mạnh Kiến Trúc Hiện Tại](#13-điểm-mạnh-kiến-trúc-hiện-tại)
   - [1.4 Các Lỗ Hổng Kiến Trúc Cốt Lõi](#14-các-lỗ-hổng-kiến-trúc-cốt-lõi)
2. [Ma Trận Phân Loại Mức Độ Nghiêm Trọng (Issue Severity Matrix)](#2-ma-trận-phân-loại-mức-độ-nghiêm-trọng-issue-severity-matrix)
   - [2.1 Tiêu Chí Đánh Giá Mức Độ](#21-tiêu-chí-đánh-giá-mức-độ)
   - [2.2 Bảng Thống Kê Tổng Hợp Khuyết Tật](#22-bảng-thống-kê-tổng-hợp-khuyết-tật)
   - [2.3 Danh Mục Vấn Đề Tổng Thể (Master Defect Index)](#23-danh-mục-vấn-đề-tổng-thể-master-defect-index)
3. [Dimension 1: Tính Nhất Quán Thiết Kế (Design Consistency)](#3-dimension-1-tính-nhất-quán-thiết-kế-design-consistency)
   - [3.1 Hệ Thống Màu Sắc & Tokens](#31-hệ-thống-màu-sắc--tokens)
   - [3.2 Hệ Thống Phân Cấp Typography & Tiêu Đề](#32-hệ-thống-phân-cấp-typography--tiêu-đề)
   - [3.3 Spacing, Kích Thước & Cấu Trúc Khung Khối](#33-spacing-kích-thước--cấu-trúc-khung-khối)
   - [3.4 Chuẩn Hóa Component & Lỗi Lồng Ghép Card](#34-chuẩn-hóa-component--lỗi-lồng-ghép-card)
   - [3.5 Đánh Giá Hệ Thống Biểu Tượng (Iconography)](#35-đánh-giá-hệ-thống-biểu-tượng-iconography)
4. [Dimension 2: Khả Năng Phản Hồi (Responsive Design)](#4-dimension-2-khả-năng-phản-hồi-responsive-design)
   - [4.1 Hành Vi Breakpoint & Co Giãn Grid](#41-hành-vi-breakpoint--co-giãn-grid)
   - [4.2 Tràn Khung (Overflow), Cắt Xén (Clipping) & Dịch Chuyển Layout (CLS)](#42-tràn-khung-overflow-cắt-xén-clipping--dịch-chuyển-layout-cls)
   - [4.3 Kích Thước Vùng Chạm (Touch Targets) & Trải Nghiệm Cảm Ứng](#43-kích-thước-vùng-chạm-touch-targets--trải-nghiệm-cảm-ứng)
5. [Dimension 3: Trải Nghiệm Người Dùng (UX - User Experience)](#5-dimension-3-trải-nghiệm-người-dùng-ux---user-experience)
   - [5.1 Điều Hướng & Định Vị (Navigation & Wayfinding)](#51-điều-hướng--định-vị-navigation--wayfinding)
   - [5.2 Trạng Thái Rỗng (Empty States) & Trải Nghiệm Khởi Tạo](#52-trạng-thái-rỗng-empty-states--trải-nghiệm-khởi-tạo)
   - [5.3 Trạng Thái Chờ (Loading), Skeleton & Dịch Chuyển Giao Diện](#53-trạng-thái-chờ-loading-skeleton--dịch-chuyển-giao-diện)
   - [5.4 Phản Hồi Lỗi & Khả Năng Phục Hồi (Error Feedback & Resilience)](#54-phản-hồi-lỗi--khả-năng-phục-hồi-error-feedback--resilience)
   - [5.5 Trải Nghiệm Biểu Mẫu (Form Interactivity)](#55-trải-nghiệm-biểu-mẫu-form-interactivity)
   - [5.6 Chuyển Động, Hiệu Ứng & Khả Năng Tiếp Cận Chuyển Động (Motion Accessibility)](#56-chuyển-động-hiệu-ứng--khả-năng-tiếp-cận-chuyển-động-motion-accessibility)
6. [Dimension 4: Chất Lượng Mã Nguồn UI & Khả Năng Tiếp Cận (Code Quality & A11y)](#6-dimension-4-chất-lượng-mã-nguồn-ui--khả-năng-tiếp-cận-code-quality--a11y)
   - [6.1 Kiến Trúc Thành Phần & Mã Nguồn Thừa (Dead Code)](#61-kiến-trúc-thành-phần--mã-nguồn-thừa-dead-code)
   - [6.2 Ngữ Nghĩa HTML & Cột Mốc Vùng (Landmarks)](#62-ngữ-nghĩa-html--cột-mốc-vùng-landmarks)
   - [6.3 Thuộc Tính ARIA & Vùng Động (Live Regions)](#63-thuộc-tính-aria--vùng-động-live-regions)
   - [6.4 Điều Hướng Bàn Phím & Quản Lý Tiêu Điểm (Keyboard & Focus)](#64-điều-hướng-bàn-phím--quản-lý-tiêu-điểm-keyboard--focus)
   - [6.5 Độ Tương Phản Màu Sắc & Tiếp Cận Thị Giác (WCAG 2.1 AA)](#65-độ-tương-phản-màu-sắc--tiếp-cận-thị-giác-wcag-21-aa)
7. [Dimension 5: Lỗi Hiển Thị (Visual Bugs & Rendering Flaws)](#7-dimension-5-lỗi-hiển-thị-visual-bugs--rendering-flaws)
   - [7.1 Lỗi Tràn Chiều Cao Khung Nhìn (Viewport Traps) & Va Chạm Xếp Lớp (Z-Index)](#71-lỗi-tràn-chiều-cao-khung-nhìn-viewport-traps--va-chạm-xếp-lớp-z-index)
   - [7.2 Lỗi Méo Khung Flexbox & Co Giãn Layout Không Kiểm Soát](#72-lỗi-méo-khung-flexbox--co-giãn-layout-không-kiểm-soát)
   - [7.3 Rò Rỉ Tài Nguyên Canvas & Thiếu Đồng Bộ Đa Ngôn Ngữ](#73-rò-rỉ-tài-nguyên-canvas--thiếu-đồng-bộ-đa-ngôn-ngữ)
   - [7.4 Lỗi Vùng An Toàn Di Động (Safe Area Notches) & CSS Dư Thừa](#74-lỗi-vùng-an-toàn-di-động-safe-area-notches--css-dư-thừa)
8. [Kế Hoạch Hành Động & Lộ Trình Khắc Phục (Action Plan & Roadmap)](#8-kế-hoạch-hành-động--lộ-trình-khắc-phục-action-plan--roadmap)
   - [Phase 1: Quick Wins - Khắc Phục Khẩn Cấp (Sprint 1)](#phase-1-quick-wins---khắc-phục-khẩn-cấp-sprint-1)
   - [Phase 2: Gia Cố Responsive & Hoàn Thiện Tiếp Cận (Sprint 2)](#phase-2-gia-cố-responsive--hoàn-thiện-tiếp-cận-sprint-2)
   - [Phase 3: Chiến Lược Chuẩn Hóa Design System & Thư Viện UI (Sprint 3)](#phase-3-chiến-lược-chuẩn-hóa-design-system--thư-viện-ui-sprint-3)
9. [Bộ Lệnh Kiểm Tra Tự Động & Bảng Kiểm Định Kỳ (Verification & QA Checklist)](#9-bộ-lệnh-kiểm-tra-tự-động--bảng-kiểm-định-kỳ-verification--qa-checklist)

---

## 1. Tổng Quan Đánh Giá & Kiến Trúc Frontend (Executive Summary)

### 1.1 Tổng Quan Công Nghệ & Route Topology

Ứng dụng `portfolio-tracker` là một nền tảng quản trị danh mục đầu tư tài chính cá nhân hiện đại, xây dựng trên nền tảng **Next.js 16.2.6 (App Router / Turbopack)**, **React 19**, **Tailwind CSS 3.4**, **Recharts 2.12**, **Lucide React**, và **Zustand 4.5.2**.

Cây định tuyến trang (Route Topology):
```
src/app/
├── layout.tsx                     # Root Layout: Inter font, Sonner Toaster, metadata & viewport
├── globals.css                    # Directives Tailwind, dark color-scheme, scrollbar styles
├── page.tsx                       # Dashboard Route (SSR): Auth check, store initialization, DashboardClient
├── account/
│   ├── page.tsx                   # Account Settings Route (SSR): Auth check, AccountClient
│   └── loading.tsx                # Skeleton Loader: Container max-w-5xl (Lệch với trang thật)
├── forex/
│   ├── page.tsx                   # Forex Route (SSR): Auth check, ForexClient (Thiếu loading.tsx)
│   └── page.tsx                   # (Ghi chú: Cần bổ sung loading.tsx)
├── auth/
│   ├── page.tsx                   # Auth Route (SSR): AuthPanel (Tabs đăng nhập/đăng ký)
│   └── forgot-password/
│       └── page.tsx               # Forgot Password Route: Yêu cầu reset mật khẩu
└── reset-password/
    └── page.tsx                   # Reset Password Route: Form đổi mật khẩu từ email link
```

### 1.2 Kiểm Kê Thành Phần UI (UI Inventory & Dead Code Audit)

Toán bộ mã nguồn UI chứa **44 files component** trong `src/components/` và `src/components/widgets/`:
1. **Active Core Dashboard Components (16 files):** `DashboardClient.tsx`, `MarkToMarketGrid.tsx`, `GroupedTransactionHistoryTable.tsx`, `NetWorthChart.tsx`, `ReconciliationPanel.tsx`, `HeroBanner.tsx`, `EmptyStateHero.tsx`, `OnboardingWizard.tsx`, `AddTradeForm.tsx`, `AddDepositForm.tsx`, `FeeDebtCard.tsx`, `OpeningPositionCard.tsx`, `CsvUploaderServerImport.tsx`, `ImportWarningsPanel.tsx`, `HoldingPriceChart.tsx`, `StoreInitializer.tsx`.
2. **Active Sidebar Widgets & Auxiliaries (10 files):** `widgets/IRRWidget.tsx`, `AssetAllocationChart.tsx`, `StockNews.tsx`, `WorldNews.tsx`, `Watchlist.tsx`, `PriceAlerts.tsx`, `ForexMiniWidget.tsx`, `DataQualityBadge.tsx`, `TooltipInfo.tsx`, `NumberInput.tsx`.
3. **Active Subpage Components (9 files):** `AccountClient.tsx`, `ForexConverter.tsx`, `GoldPriceCard.tsx`, `CutoffSetupForm.tsx`, `TaxRateForm.tsx`, `TaxSummaryCard.tsx`, `ChangePasswordForm.tsx`, `DeletePortfolioDataForm.tsx`, `ImportHistoryCard.tsx`.
4. **Active Auth Components (4 files):** `AuthPanel.tsx`, `ForgotPassword.tsx`, `LogoutButton.tsx`, `app/reset-password/page.tsx`.
5. **Dead / Orphan Components (5 files - 747 lines code thừa):** `CashLedgerStatusCard.tsx` (82 dòng), `ErrorDisplay.tsx` (233 dòng), `MarketOverview.tsx` (112 dòng), `PortfolioChart.tsx` (105 dòng), `TransactionHistoryTable.tsx` (215 dòng - chứa kiểu `any`). Tổng cộng: 82 + 233 + 112 + 105 + 215 = 747 LOC.

### 1.3 Điểm Mạnh Kiến Trúc Hiện Tại
- **Aesthetic Dark Theme Hiện Đại:** Bảng màu Slate tối (`slate-950`, `slate-900`, `slate-800`) kết hợp viền mờ `border-slate-800/80` và hiệu ứng `backdrop-blur` tạo nên giao diện tài chính chuyên nghiệp dạng Bloomberg/TradingView tinh gọn.
- **Tối Ưu SSR Hydration Với Zustand:** Sử dụng pattern `StoreInitializer` đẩy dữ liệu từ server component sang client store mà không tạo waterfall client request.
- **Cấu Trúc Bảng Dữ Liệu Chi Tiết:** Thành phần `MarkToMarketGrid` và `GroupedTransactionHistoryTable` xử lý dữ liệu phức tạp (phân nhóm theo ngày, tính lãi lỗ theo thời gian thực) với hiệu năng render ổn định.

### 1.4 Các Lỗ Hổng Kiến Trúc Cốt Lõi
1. **Thiếu Lớp Design Tokens Trung Tâm:** `tailwind.config.ts` có `theme.extend: {}` trống rỗng và thiếu `darkMode: 'class'`. Toàn bộ mã nguồn sử dụng các class màu trực tiếp phân tán, dẫn đến xung đột màu sắc (`red` vs `rose`, `green` vs `emerald`, `blue` vs `indigo`).
2. **Khủng Hoảng Dịch Chuyển Giao Diện (CLS) Khi Tải Trang:** Skeleton loading của Dashboard cố định `max-w-7xl` (1280px), nhưng dashboard thực tế mở rộng tới `w-[95%] max-w-[1680px]`. Tương tự, `account/loading.tsx` dùng `max-w-5xl` (1024px) nhưng `AccountClient` giới hạn ở `max-w-[860px]`.
3. **Bẫy Modal Trên Thiết Bị Di Động (Critical Viewport Trap):** `OnboardingWizard` thiếu hoàn toàn `max-h` và thanh cuộn dọc. Khi mở form nhập lệnh trên màn hình có chiều cao dưới 800px hoặc chế độ xoay ngang, footer chứa nút xác nhận bị đẩy ra ngoài màn hình và không thể thao tác.
4. **Rò Rỉ Tiện Ích Kiến Trúc (`cn()` helper):** Hàm tiện ích `cn()` được định nghĩa bên trong `MarkToMarketGrid.tsx` và bị 5 component khác import chéo thay vì đặt ở `src/lib/utils.ts`.
5. **Rào Cản Tiếp Cận (WCAG 2.1 AA) Nghiêm Trọng:** Toàn bộ dự án hoàn toàn thiếu vắng các thuộc tính `aria-*`, không có liên kết `htmlFor` giữa nhãn và input, sử dụng hàng loạt nút bấm chỉ có icon không có nhãn tiếp cận, và tỷ lệ tương phản của chữ màu xám (`text-slate-500`) chỉ đạt 1.98:1 - 4.27:1 (dưới chuẩn 4.5:1).

---

## 2. Ma Trận Phân Loại Mức Độ Nghiêm Trọng (Issue Severity Matrix)

### 2.1 Tiêu Chí Đánh Giá Mức Độ
- **Critical (Nghiêm trọng):** Ngăn cản luồng người dùng hoàn thành tác vụ chính (blocker), làm kẹt UI không thể thoát, hoặc hiển thị sai lệch trầm trọng bản chất dữ liệu tài chính.
- **High (Cao):** Vỡ bố cục trên các thiết bị phổ biến, vi phạm trực tiếp chuẩn accessibility WCAG 2.1 AA, gây sụt giảm hiệu năng nặng (memory leak), hoặc mất mát trải nghiệm điều hướng.
- **Medium (Trung bình):** Bố cục bị ép méo cục bộ, thiếu phản hồi trực quan khi ngắt kết nối, lỗi tương phản nhẹ, hoặc trải nghiệm biểu mẫu thiếu chuẩn hóa.
- **Low (Thấp):** Lỗi thẩm mỹ nhỏ, chuỗi ký tự chưa được dịch bản ngữ, mã nguồn thừa (dead code), hoặc thuộc tính CSS dư thừa.

### 2.2 Bảng Thống Kê Tổng Hợp Khuyết Tật

| Chiều Đánh Giá (Dimension) | Critical | High | Medium | Low | Tổng Số Vấn Đề |
|---|:---:|:---:|:---:|:---:|:---:|
| **Dim 1: Tính Nhất Quán Thiết Kế** | 0 | 4 | 3 | 2 | **9** |
| **Dim 2: Khả Năng Phản Hồi (Responsive)** | 0 | 5 | 6 | 0 | **11** |
| **Dim 3: Trải Nghiệm Người Dùng (UX)** | 1 | 6 | 6 | 2 | **15** |
| **Dim 4: Chất Lượng Mã Nguồn & Tiếp Cận (A11y)** | 0 | 12 | 7 | 2 | **23** |
| **Dim 5: Lỗi Hiển Thị (Visual Bugs)** | 1 | 2 | 4 | 5 | **12** |
| **TỔNG HỢP TOÀN HỆ THỐNG** | **2** | **29** | **26** | **11** | **68 phát hiện itemized** |

*(Ghi chú: Một số vấn đề liên ngành như CLS hay Form Focus xuất hiện ở cả góc độ thiết kế và kỹ thuật đã được đồng bộ hóa chi tiết).*

### 2.3 Danh Mục Vấn Đề Tổng Thể (Master Defect Index)

| Mã ID | Phân Loại | Vị Trí File Tham Chiếu | Dòng Code | Mức Độ | Tóm Tắt Kỹ Thuật |
|---|---|---|---|:---:|---|
| **VIS-01** | Visual/Viewport | `src/components/OnboardingWizard.tsx` | 121–137 | **Critical** | Modal thiếu `max-h` và cuộn dọc, làm kẹt nút bấm trên màn hình nhỏ |
| **UX-03** | UX/Resilience | `src/app/page.tsx` | 29–42 | **Critical** | Server fetch try/catch nuốt lỗi, biến lỗi mạng thành dashboard rỗng |
| **RESP-01**| Responsive Grid | `src/components/DashboardClient.tsx` | 326, 518 | **High** | Grid `xl:grid-cols-6` bóp hẹp card xuống 149px, tràn tiền tệ 280px |
| **RESP-02**| Mobile Layout | `src/components/AssetAllocationChart.tsx` | 151, 218 | **High** | Flex cố định ép ngang biểu đồ tròn, 3-col subgrid vỡ chữ số trên mobile |
| **RESP-05**| Tablet Padding | `src/components/AccountClient.tsx` | 196 | **High** | Khai báo `sm:px-0` xóa sạch padding viền từ 640px đến 860px |
| **RESP-09**| Touch Usability | Multiple Components (8 files) | Multi-line | **High** | Hàng loạt nút thao tác chỉ đạt 14px–28px, vi phạm chuẩn 44px WCAG |
| **RESP-10**| Touch Usability | `MarkToMarketGrid.tsx`, `Watchlist.tsx` | 193, 224 | **High** | `opacity-0 group-hover:opacity-100` ẩn nút sửa/xóa trên màn hình cảm ứng |
| **VIS-02** | Visual/Sidebar | `src/components/OpeningPositionCard.tsx` | 102 | **High** | `md:grid-cols-3` trong sidebar 380px bóp hẹp input xuống 73px gây cắt chữ |
| **VIS-08** | Memory Leak | `src/components/PortfolioChart.tsx` | 65, 96 | **High** | `ResizeObserver` không được ngắt kết nối trong cleanup function |
| **UX-01** | Navigation | `src/components/DashboardClient.tsx` | 289–312 | **High** | Thiếu thẻ `<nav>` và không có menu ngăn kéo (drawer) trên di động |
| **UX-04** | Error Feedback | `src/components/TaxSummaryCard.tsx` | 119–134 | **High** | Lỗi API tính thuế hiển thị sai lệch thành "Chưa có giao dịch bán" |
| **UX-06** | Layout Shift | `src/components/DashboardClient.tsx` | 112, 167 | **High** | Skeleton loading 1280px nhảy vọt sang 1680px gây CLS nặng |
| **UX-07** | Route Loading | `src/app/forex/loading.tsx` | N/A | **High** | Thiếu file loading cho route `/forex` khiến màn hình đơ khi fetch tỷ giá |
| **UX-09** | Live Stream | `src/components/DashboardClient.tsx` | 64 | **High** | Mất kết nối SSE luồng giá realtime nhưng không có thông báo cho người dùng |
| **UX-10** | Safety/Audit | `src/components/ImportHistoryCard.tsx` | 49–60 | **High** | Nút hoàn tác (Rollback) dữ liệu hàng loạt không có hộp thoại xác nhận |
| **UX-11** | Form Interactivity| Multiple Components (7 files) | Multi-line | **High** | Form không bọc thẻ `<form>` làm mất tính năng bấm `Enter` để gửi |
| **UX-12** | Form Component | `src/components/NumberInput.tsx` | 5–10, 54 | **High** | Thiếu prop forwarding (`id`, `disabled`, `aria-*`) gây tê liệt trợ năng |
| **A11Y-01**| Semantic HTML | `src/components/ImportWarningsPanel.tsx` | 59–64 | **High** | Accordion viết bằng `<div onClick>` không thể kích hoạt bằng bàn phím |
| **A11Y-02**| Fake Button | `src/components/HeroBanner.tsx` | 198–204 | **High** | Thẻ `<article>` gán `role="button"` giả mạo, không có hàm xử lý sự kiện |
| **A11Y-05**| Accessible Name | Multiple Components (8 files) | Multi-line | **High** | Nút chỉ có icon không có thuộc tính `aria-label` cho bộ đọc màn hình |
| **A11Y-06**| Tablist ARIA | `MarkToMarketGrid.tsx`, `ForexClient.tsx` | 93, 307 | **High** | Thanh chuyển tab thiếu `role="tablist"`, `role="tab"`, `aria-selected` |
| **A11Y-08**| Modal Semantics | `src/components/OnboardingWizard.tsx` | 121–125 | **High** | Modal không có `role="dialog"`, `aria-modal="true"`, `aria-labelledby` |
| **A11Y-09**| Keyboard Trap | `src/components/GroupedTransactionHistoryTable.tsx` | 128 | **High** | Dòng bảng thụ động gắn `tabIndex={0}` bẫy hàng chục lần nhấn phím Tab |
| **A11Y-10**| Keyboard A11y | `src/components/CsvUploaderServerImport.tsx` | 129–137 | **High** | Input file dùng `className="hidden"` biến mất khỏi luồng focus bàn phím |
| **A11Y-11**| Focus Indicator| Multiple Components (5 files) | Multi-line | **High** | Input triệt tiêu viền (`outline-none`) mà không có `focus-visible:ring` |
| **A11Y-13**| Color Contrast | Multiple Components (7 files) | Multi-line | **High** | Chữ `text-slate-500/600` trên nền tối chỉ đạt 1.98:1 - 4.27:1 (Dưới 4.5:1) |
| **A11Y-14**| Chart Contrast | `src/components/AssetAllocationChart.tsx` | 76–78 | **High** | Chữ trắng trên lát biểu đồ xanh lá/vàng chỉ đạt tỷ lệ tương phản 2.14:1 |
| **A11Y-15**| Data Scalability| `src/components/NetWorthChart.tsx` | 236–238 | **High** | VN-INDEX và NAV vẽ chung một trục Y khiến đường benchmark bị ép phẳng |
| **A11Y-16**| Document Lang | `src/app/layout.tsx` | 76, 94 | **High** | Khai báo `<html lang="en">` dù nội dung tiếng Việt, thiếu link Skip to Content |
| **CODE-01**| Dead Code | `src/components/` (5 files) | 747 LOC | **High** | 5 file component mồ côi không hề được import bất kỳ đâu trong dự án |
| **CODE-02**| Architecture | `src/components/MarkToMarketGrid.tsx` | 11–13 | **High** | Rò rỉ hàm tiện ích hệ thống `cn()` từ bên trong một data grid component |
| **FIND-1.1**| Design Tokens | `tailwind.config.ts` | 9–11 | **High** | `theme.extend: {}` trống rỗng, thiếu lớp token ngữ nghĩa cho theme |
| **FIND-1.3**| Color Palette | `DeletePortfolioDataForm.tsx`, `AuthPanel.tsx` | Multi-line | **High** | Xung đột màu báo động giữa hệ màu `red-*` (thuần đỏ) và `rose-*` (hồng đỏ) |
| **FIND-1.7**| Layout Tokens | Multiple Components | Multi-line | **High** | Phân mảnh 8 mức bo góc tùy tiện (`rounded-[20px]` đến `rounded-[32px]`) |
| **FIND-1.8**| Component Nesting| `DashboardClient.tsx`, `AccountClient.tsx` | Multi-line | **High** | Lỗi lồng ghép 3 lớp card viền lặp lại ở Uploader và Cutoff Setup |

---

## 3. Dimension 1: Tính Nhất Quán Thiết Kế (Design Consistency)

### 3.1 Hệ Thống Màu Sắc & Tokens

#### Vấn Đề 1.1: Thiếu Vắng Hoàn Toàn Lớp Token Ngữ Nghĩa (Design Tokens)
- **Vị trí file:** `tailwind.config.ts:9-11`
- **Thực trạng mã nguồn:**
  ```typescript
  theme: {
    extend: {},
  },
  ```
- **Lý do kỹ thuật:** Không có các biến token màu ngữ nghĩa (như `--background`, `--card`, `--primary`, `--border`), các lập trình viên buộc phải gán cứng các class màu cụ thể của Tailwind (`slate-950`, `slate-900`, `slate-800`, `slate-700`). Khi một lập trình viên sử dụng `gray-900` (như trong `MarketOverview.tsx`) hoặc `red-950` (trong `DeletePortfolioDataForm.tsx`), giao diện bị mất đi tính đồng bộ.
- **Đề xuất khắc phục:** Thiết lập CSS variables trong `globals.css` và ánh xạ token vào `tailwind.config.ts`:
  ```typescript
  // tailwind.config.ts
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
          border: 'hsl(var(--card-border))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        danger: {
          DEFAULT: 'hsl(var(--danger))',
          foreground: 'hsl(var(--danger-foreground))',
        },
      },
    },
  }
  ```

#### Vấn Đề 1.2: Mã Màu Hex / RGB Gán Cứng Trong Biểu Đồ SVG & Tooltip
- **Vị trí file:**
  - `src/components/NetWorthChart.tsx:189-204, 226-231, 236-238`: Gán cứng `#3b82f6`, `#f59e0b`, `#1e293b`, `#94a3b8`, `#334155`, `rgba(15, 23, 42, 0.92)`.
  - `src/components/AssetAllocationChart.tsx:45-53, 176-180`: Gán cứng `#3B82F6`, `#8B5CF6`, `#22C55E`, `#F59E0B`, `#EF4444`, `#64748B`, `#334155`.
  - `src/components/HoldingPriceChart.tsx:116-118, 125`: Gán cứng `#10b981`, `#f43f5e`, `#334155`.
  - `src/app/globals.css:15, 28, 33, 38, 51, 56`: Gán cứng `#334155` và `#475569`.
- **Lý do kỹ thuật:** Việc gán cứng mã màu hex trực tiếp trong component Recharts tách rời hoàn toàn khỏi hệ thống styling Tailwind. Khi thay đổi chủ đề hoặc tinh chỉnh độ tương phản, các biểu đồ này không tự cập nhật được.
- **Đề xuất khắc phục:** Định nghĩa bảng màu biểu đồ trong `globals.css` (ví dụ: `--chart-1: 217 91% 60%`) và tham chiếu trong Recharts qua `hsl(var(--chart-1))` hoặc hàm helper lấy giá trị CSS variable.

#### Vấn Đề 1.3: Xung Đột Bảng Màu Đỏ: Red vs. Rose
- **Vị trí file:**
  - `src/components/DeletePortfolioDataForm.tsx:98, 104, 114, 119`: Dùng `border-red-900/50`, `bg-red-950/20`, `text-red-400`, `bg-red-600`.
  - `src/components/ImportHistoryCard.tsx:118`: Dùng `border-red-900/50`, `bg-red-950/30`, `text-red-200`.
  - `src/components/AuthPanel.tsx:178, 185`: Dùng `border-rose-600`, `text-rose-400`, `bg-rose-950/40`.
  - `src/components/ImportWarningsPanel.tsx:57, 61, 66`: Dùng `border-rose-900/50`, `bg-rose-950/20`, `text-rose-300`.
  - `src/components/DashboardClient.tsx:158, 335, 346`: Dùng `bg-rose-500/10`, `border-rose-500/30`, `text-rose-400`.
- **Lý do kỹ thuật:** Tồn tại sự phân hóa giữa hai họ màu nguy hiểm: `rose` mang ánh hồng tím lạnh (#f43f5e) được dùng ở Dashboard, trong khi `red` mang ánh đỏ cờ ấm (#dc2626) lại được dùng ở Form Xóa dữ liệu và Lịch sử import, phá vỡ tính đồng nhất của các trạng thái cảnh báo/hủy diệt.
- **Đề xuất khắc phục:** Đồng nhất 100% trạng thái nguy hiểm/hủy diệt về hệ màu `rose` (hoặc token `danger`). Thay thế toàn bộ class `red-*` trong `DeletePortfolioDataForm.tsx` và `ImportHistoryCard.tsx` sang `rose-*`.

#### Vấn Đề 1.4: Không Nhất Quán Giữa Hệ Màu Emerald Và Green
- **Vị trí file:**
  - `src/components/AssetAllocationChart.tsx:238`: `<span className="text-lg font-semibold text-green-400">`
  - Tất cả các component còn lại (`DashboardClient.tsx:189, 335`, `MarkToMarketGrid.tsx:136, 160`, `DataQualityBadge.tsx:36`): Sử dụng `text-emerald-400` / `text-emerald-500`.
- **Lý do kỹ thuật:** Màu `green-400` (#4ade80) có ánh vàng lục, trong khi `emerald-400` (#34d399) có ánh ngọc lam. Việc đặt một thẻ có chữ `text-green-400` bên cạnh các thẻ dùng `text-emerald-400` tạo sự lệch tông rõ rệt.
- **Đề xuất khắc phục:** Đổi `text-green-400` tại `AssetAllocationChart.tsx:238` thành `text-emerald-400`.

#### Vấn Đề 1.5: Xung Đột Màu Thương Hiệu: Blue vs. Indigo
- **Vị trí file:**
  - `src/components/AuthPanel.tsx:124, 245`: Nút Submit dùng `bg-indigo-600 hover:bg-indigo-500`, nhưng nút chọn ngôn ngữ ngay bên trên lại dùng `bg-blue-600`.
  - `src/components/ForgotPassword.tsx:80, 146`: Nút chọn ngôn ngữ dùng `bg-blue-600`, nút Submit dùng `bg-indigo-600`.
  - `src/components/DashboardClient.tsx:234, 241`: Nút chuyển ngôn ngữ dùng `bg-blue-600`, trong khi icon StatCard dùng gradient `from-blue-600 to-indigo-600`.
- **Lý do kỹ thuật:** Việc sử dụng lẫn lộn hai màu xanh chính tạo cảm giác thiếu quyết đoán về màu nhận diện thương hiệu.
- **Đề xuất khắc phục:** Chuẩn hóa màu chủ đạo cho các nút hành động chính (Primary Call-To-Action) về `indigo-600` (hoặc `blue-600`) trên toàn bộ các trang xác thực và thanh công cụ.

---

### 3.2 Hệ Thống Phân Cấp Typography & Tiêu Đề

#### Vấn Đề 2.1: Vi Phạm Ngữ Nghĩa Heading — Hai Thẻ `<h1>` Trên Cùng Một Card
- **Vị trí file:** `src/app/reset-password/page.tsx:60-61, 106-107`
- **Mã nguồn hiện tại:**
  ```tsx
  // src/app/reset-password/page.tsx:60-61
  <h1 className="text-2xl font-bold text-rose-400">❌</h1>
  <h1 className="text-2xl font-bold text-slate-100">{t.invalidToken}</h1>
  
  // src/app/reset-password/page.tsx:106-107
  <h1 className="text-4xl">✅</h1>
  <h1 className="text-2xl font-bold text-emerald-400">{t.success}</h1>
  ```
- **Lý do kỹ thuật:** Sử dụng thẻ `<h1>` cho biểu tượng emoji và tiếp tục dùng thêm một thẻ `<h1>` cho tiêu đề thông báo vi phạm cấu trúc tài liệu HTML5 (WCAG 1.3.1 Info and Relationships), gây nhiễu loạn cho bộ đọc màn hình.
- **Đề xuất khắc phục:**
  ```tsx
  // Thay thế bằng:
  <div className="flex justify-center text-4xl mb-3" aria-hidden="true">
    <XCircle className="h-10 w-10 text-rose-400" />
  </div>
  <h1 className="text-2xl font-bold text-slate-100">{t.invalidToken}</h1>
  ```

#### Vấn Đề 2.2: Đảo Ngược Phân Cấp Cỡ Chữ — `h2` Lớn Hơn `h1`
- **Vị trí file:**
  - `src/components/HeroBanner.tsx:165`: `<h2 className="text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl">` (Cỡ chữ 36px/40px).
  - `src/components/DashboardClient.tsx:178`: `<h1 className="text-2xl font-semibold tracking-tight text-slate-100 lg:text-3xl">{t.dashboard}</h1>` (Cỡ chữ 24px/30px).
- **Lý do kỹ thuật:** Tiêu đề cấp 2 (`h2`) trong banner thị trường hiển thị to hơn tiêu đề chính cấp 1 (`h1`) của toàn bộ trang dashboard, làm đảo lộn trọng tâm thị giác của người dùng.
- **Đề xuất khắc phục:** Nâng kích thước `h1` trong `DashboardClient.tsx` lên `text-3xl lg:text-4xl` và điều chỉnh `h2` trong `HeroBanner.tsx` xuống `text-2xl md:text-3xl`.

#### Vấn Đề 2.3: Nhảy Bậc Cấp Độ Heading Trong Trang Account
- **Vị trí file:** `src/components/AccountClient.tsx:222, 289, 317, 356`
- **Mã nguồn hiện tại:**
  ```tsx
  Line 222: <h1 className="... text-3xl font-extrabold">{t.title}</h1>
  Line 289: <h3 className="text-lg font-semibold text-slate-200">Cấu hình chốt sổ đầu kỳ...</h3>
  Line 317: <h3 className="text-lg font-semibold text-slate-200">{t.securityStatus}</h3>
  Line 356: <h4 className="text-sm font-medium text-slate-400">{t.activeSessions}</h4>
  ```
- **Lý do kỹ thuật:** Vi phạm nguyên tắc phân cấp tiêu đề (WCAG 2.4.6). Việc nhảy thẳng từ `h1` xuống `h3` mà không có `h2` làm đứt gãy cây phân cấp tài liệu đối với công nghệ trợ năng.
- **Đề xuất khắc phục:** Đổi dòng 289 và 317 thành thẻ `<h2 className="text-lg font-semibold text-slate-200">`, và đổi dòng 356 từ `<h4>` thành `<h3>`.

#### Vấn Đề 2.4: Tiêu Đề Widget Không Đồng Nhất Trong Sidebar
- **Vị trí file:**
  - `src/components/AddTradeForm.tsx:89`: `<h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">`
  - `src/components/FeeDebtCard.tsx:38`: `<h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">`
  - `src/components/OpeningPositionCard.tsx:78`: `<h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">`
  - `src/components/AssetAllocationChart.tsx:134`: `<h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">`
  - `src/components/Watchlist.tsx:179`: `<h3 className="text-lg font-semibold text-slate-100">`
  - `src/components/PriceAlerts.tsx:210`: `<h3 className="text-lg font-semibold text-slate-100">`
  - `src/components/WorldNews.tsx:100`: `<h3 className="text-lg font-semibold text-slate-100">`
- **Lý do kỹ thuật:** Trong cùng một cột sidebar bên phải (`DashboardClient.tsx:472-495`), các widget xếp chồng lên nhau lại sử dụng 2 kiểu tiêu đề hoàn toàn trái ngược: một nhóm dùng chữ in hoa nhỏ có khoảng cách giãn dòng lớn (`text-sm uppercase tracking-[0.22em] text-slate-400`), nhóm còn lại dùng chữ thường kích thước lớn (`text-lg font-semibold text-slate-100`).
- **Đề xuất khắc phục:** Xây dựng component chung `<WidgetHeader title={...} icon={...} />` để chuẩn hóa toàn bộ tiêu đề widget theo một quy chuẩn kích thước duy nhất.

---

### 3.3 Spacing, Kích Thước & Cấu Trúc Khung Khối

#### Vấn Đề 3.1: Chiều Rộng Khung Chứa Gây Dịch Chuyển Layout Nghiêm Trọng (CLS)
- **Vị trí file:**
  - `src/components/DashboardClient.tsx:112`: Khung skeleton: `className="mx-auto max-w-7xl px-4 py-8"` (1280px).
  - `src/components/DashboardClient.tsx:167`: Khung mounted: `className="mx-auto flex w-[95%] max-w-[1680px] flex-col gap-6 py-6"`.
  - `src/app/account/loading.tsx:3`: Khung skeleton: `className="mx-auto max-w-5xl px-4 py-8"` (1024px).
  - `src/components/AccountClient.tsx:196`: Khung mounted: `className="mx-auto w-full max-w-[860px] space-y-8 px-4 py-8 sm:px-0"`.
- **Lý do kỹ thuật:** Khi quá trình hydration hoàn tất trên màn hình máy tính, dashboard đột ngột nhảy chiều rộng từ 1280px sang 1680px (tăng 400px), trong khi trang Account nhảy co lại từ 1024px xuống 860px. Hiện tượng này làm điểm số Cumulative Layout Shift (CLS) của Google Core Web Vitals vượt ngưỡng an toàn (>0.25).
- **Đề xuất khắc phục:**
  - Trong `DashboardClient.tsx:112`: Đổi `max-w-7xl` thành `w-[95%] max-w-[1680px] py-6`.
  - Trong `src/app/account/loading.tsx:3`: Đổi `max-w-5xl` thành `w-full max-w-[860px]`.

#### Vấn Đề 3.2: Phân Mảnh Tùy Tiện Bán Kính Bo Góc (8 Mức Độ)
- **Thực trạng mã nguồn:**
  - `rounded-md` (6px): `MarkToMarketGrid.tsx:158`
  - `rounded-lg` (8px): `DashboardClient.tsx:405`, `ForexClient.tsx:309`, `Watchlist.tsx:247`
  - `rounded-xl` (12px): `DashboardClient.tsx:253`, `AddTradeForm.tsx:104`, `AuthPanel.tsx:124`
  - `rounded-2xl` (16px): `DashboardClient.tsx:506` (StatCard), `IRRWidget.tsx:46`, `TaxRateForm.tsx:67`
  - `rounded-[20px]`: `CsvUploaderServerImport.tsx:116`
  - `rounded-3xl` / `rounded-[24px]`: `AccountClient.tsx:215`, `CsvUploaderServerImport.tsx:114`, `CutoffSetupForm.tsx:81`
  - `rounded-[28px]`: `DashboardClient.tsx:168`, `MarkToMarketGrid.tsx:90`, `NetWorthChart.tsx:156`, `StockNews.tsx:151`
  - `rounded-[32px]`: `EmptyStateHero.tsx:29`
- **Lý do kỹ thuật:** Việc sử dụng các giá trị bo góc pixel cứng tùy tiện (`[20px]`, `[24px]`, `[28px]`, `[32px]`) xen lẫn với hệ thống chuẩn của Tailwind làm mất tính nhất quán hình học.
- **Đề xuất khắc phục:** Chuẩn hóa toàn bộ hệ thống bo góc về 3 cấp độ:
  - Thành phần nhỏ (Badge, Input, Nút bấm): `rounded-xl` (12px).
  - Thẻ card chuẩn & bảng biểu: `rounded-2xl` (16px).
  - Vùng chứa lớn, modal, hero banner: `rounded-3xl` (24px).
  - Xóa bỏ hoàn toàn các class bo góc gán cứng bằng pixel vuông ngoặc kép.

---

### 3.4 Chuẩn Hóa Component & Lỗi Lồng Ghép Card

#### Vấn Đề 4.1: Phân Mảnh Kiểu Dáng Nút Bấm (Button Fragmentation)
- **Vị trí file:**
  - `AuthPanel.tsx:124`: `w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-500`
  - `AddTradeForm.tsx:193`: `mt-4 w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white`
  - `AddDepositForm.tsx:135`: `mt-4 rounded-xl px-4 py-2 text-sm font-medium text-white bg-emerald-600` (Không full-width)
  - `FeeDebtCard.tsx:62`: `mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white` (Không full-width, dùng màu đỏ hủy diệt cho nút Lưu)
  - `OpeningPositionCard.tsx:146`: Nút Xóa lại dùng viền xám mờ `border-slate-700 bg-slate-950` thay vì phong cách nút nguy hiểm.
- **Lý do kỹ thuật:** Dự án không có component `<Button>` dùng chung. Nút bấm trên từng form do từng lập trình viên viết riêng lẻ với 7 màu nền, 4 kích thước padding và logic màu sắc không thống nhất.
- **Đề xuất khắc phục:** Tạo `src/components/ui/Button.tsx` sử dụng `class-variance-authority` (cva) với các biến thể: `primary`, `secondary`, `destructive`, `outline`, `ghost`.

#### Vấn Đề 4.2: Lỗi Lồng Ghép 3 Lớp Card Đồng Tâm (Concentric Card Nesting)
- **Vị trí file:**
  - **Lỗi Uploader 3 Lớp Viền:**
    - `src/components/DashboardClient.tsx:475`: `<div className="rounded-[28px] border border-slate-800 bg-slate-900/40 p-3 backdrop-blur-sm">`
    - `src/components/CsvUploaderServerImport.tsx:114`: `<div className="flex h-full min-h-[220px] w-full flex-col items-center justify-center rounded-[24px] border border-slate-800 bg-slate-900/60 p-4 shadow-xl...">`
    - `src/components/CsvUploaderServerImport.tsx:116`: `<label className="... rounded-[20px] border border-dashed border-slate-800 bg-slate-900/60...">`
    - *Khắc phục:* Gỡ bỏ thẻ `div` bọc dư thừa tại `DashboardClient.tsx:475` và `EmptyStateHero.tsx:37`. Để bản thân component `CsvUploaderServerImport` đóng vai trò là card duy nhất.
  - **Lỗi CutoffSetupForm Trùng Lặp 2 Header:**
    - `src/components/AccountClient.tsx:286-298`: Bọc form trong một card có tiêu đề "Cấu hình chốt sổ đầu kỳ / Cut-off Settings" và nút chỉnh sửa.
    - `src/components/CutoffSetupForm.tsx:81-92`: Bên trong form lại tự bọc mình trong một card `rounded-3xl border border-slate-800` khác với tiêu đề lặp lại "Cài Đặt Ngày Chốt Sổ (Cut-off)".
    - *Khắc phục:* Tái cấu trúc `CutoffSetupForm` để chỉ render các trường nhập liệu khi được nhúng, loại bỏ vỏ card bên trong.
  - **Lỗi Thẻ `<header>` Bọc Toàn Bộ Trang Tại `ForexClient.tsx`:**
    - `src/app/forex/ForexClient.tsx:226-482`: Mở thẻ `<header>` ở dòng 226 và không đóng cho đến dòng 482. Toàn bộ thanh tab, bảng tỷ giá ngoại tệ, biểu đồ vàng và form chuyển đổi tiền tệ đều bị bọc sai ngữ nghĩa bên trong `<header>`.
    - *Khắc phục:* Đóng thẻ `<header>` ở dòng 280. Đặt các tab và bảng biểu trong `<section>` hoặc `<div className="space-y-6">`.

---

### 3.5 Đánh Giá Hệ Thống Biểu Tượng (Iconography)

#### Vấn Đề 5.1: Dùng Ký Tự Emoji Thay Cho Biểu Tượng SVG Tiếp Cận
- **Vị trí file:**
  - `src/app/reset-password/page.tsx:60`: `<h1 className="text-2xl font-bold text-rose-400">❌</h1>`
  - `src/app/reset-password/page.tsx:106`: `<h1 className="text-4xl">✅</h1>`
  - `src/components/ForgotPassword.tsx:86`: `<h1 className="text-3xl font-bold text-emerald-400">✓</h1>`
  - `src/components/ForgotPassword.tsx:93`: `🔑 Dev Mode - Reset Link:`
  - `src/components/DashboardClient.tsx:221`: `<button ...> × </button>`
- **Lý do kỹ thuật:** Emoji hiển thị khác nhau trên các hệ điều hành (Apple, Windows, Android), không thể kế thừa màu sắc Tailwind CSS, và khiến bộ đọc màn hình đọc to các chuỗi Unicode gây rối rắm.
- **Đề xuất khắc phục:** Thay thế toàn bộ bằng icon Lucide SVG:
  - `❌` -> `<XCircle className="h-10 w-10 text-rose-400" aria-hidden="true" />`
  - `✅` -> `<CheckCircle2 className="h-10 w-10 text-emerald-400" aria-hidden="true" />`
  - `×` -> `<X className="h-4 w-4" aria-hidden="true" />`

#### Vấn Đề 5.2: Trùng Lặp Ngữ Nghĩa Biểu Tượng (Semantic Overloading)
- **Vị trí file:**
  - `src/components/DashboardClient.tsx:354, 361`: Cả hai thẻ chỉ số `avgPnL` (Lãi lỗ bình quân) và `fifoPnL` (Lãi lỗ FIFO) đều dùng chung một icon: `<CheckCircle2 className="h-5 w-5 text-cyan-300" />`.
  - `src/components/DashboardClient.tsx:367`: Thẻ tỷ giá USD/VND dùng `<Globe className="h-5 w-5 text-emerald-300" />`.
  - `src/components/DashboardClient.tsx:298`: Link sang trang tỷ giá dùng `<Globe className="h-4 w-4 text-emerald-400" />`.
  - `src/components/WorldNews.tsx:72, 99`: Tin tức thế giới dùng `<Globe className="h-5 w-5 text-blue-400" />`.
- **Lý do kỹ thuật:** Việc tái sử dụng `CheckCircle2` cho 2 phương pháp hạch toán kế toán khác nhau khiến người dùng không thể phân biệt trực quan nội dung thẻ.
- **Đề xuất khắc phục:** Đối với `avgPnL`, sử dụng `<Scale className="h-5 w-5 text-cyan-300" />` (thể hiện sự cân bằng gia quyền). Đối với `fifoPnL`, sử dụng `<Layers className="h-5 w-5 text-teal-300" />` (thể hiện các tầng lớp vào trước ra trước).

---

## 4. Dimension 2: Khả Năng Phản Hồi (Responsive Design)

### 4.1 Hành Vi Breakpoint & Co Giãn Grid

#### [RESP-01] Vỡ Bố Cục StatCards Khi Grid Chuyển Sang 6 Cột Tại Breakpoint `xl` (1280px - 1535px)
- **Vị trí file:** `src/components/DashboardClient.tsx:326, 504-522`
- **Mức độ:** High
- **Phân tích kỹ thuật chuyên sâu:**
  - Dòng 326 khai báo: `<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">`.
  - Khi màn hình ở mức 1280px (bắt đầu breakpoint `xl`), chiều rộng container khả dụng là `1280px * 0.95 = 1216px`.
  - Trừ đi 5 khoảng cách gap (5 * 16px = 80px), chiều rộng mỗi thẻ card là: `(1216 - 80) / 6 ≈ 189px`.
  - Trừ tiếp padding bên trong card `p-5` (20px trái + 20px phải = 40px), không gian khả dụng cho nội dung bên trong chỉ còn **149px**.
  - Tại dòng 518, giá trị hiển thị: `<div className={cn('text-3xl font-semibold tracking-tight text-slate-100', valueColor)}>{value}</div>`.
  - Một số tiền VND chuẩn như `12.500.000.000 ₫` hoặc `+1.234.567.890 ₫` dài 16-18 ký tự. Khi render ở cỡ chữ `text-3xl` (font size 30px, line-height 36px), độ rộng chữ cần tối thiểu **250px - 280px**.
  - Do `StatCard` không có thuộc tính `truncate` hay cỡ chữ responsive, chuỗi số tràn thẳng ra khỏi mép viền card, đè lên card bên cạnh và làm vỡ layout trang.
- **Mã nguồn trước khi sửa:**
  ```tsx
  // src/components/DashboardClient.tsx:326
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
  
  // src/components/DashboardClient.tsx:518
  <div className={cn('text-3xl font-semibold tracking-tight text-slate-100', valueColor)}>{value}</div>
  ```
- **Mã nguồn sau khi sửa:**
  ```tsx
  // src/components/DashboardClient.tsx:326
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
  
  // src/components/DashboardClient.tsx:518
  <div
    className={cn('text-2xl sm:text-3xl lg:text-2xl xl:text-2xl 2xl:text-3xl font-semibold tracking-tight text-slate-100 truncate', valueColor)}
    title={String(value)}
  >
    {value}
  </div>
  ```
  *Ghi chú kỹ thuật về thang đo kích thước chữ (Typography Scale):*
  - Khung nhìn `< 640px` (Mobile): 1 cột, cỡ chữ `text-2xl` (24px).
  - Khung nhìn `640px – 1023px` (`sm`): 2 cột, cỡ chữ `sm:text-3xl` (30px) tạo độ nổi bật trong card rộng ~340px.
  - Khung nhìn `1024px – 1279px` (`lg`): 3 cột, độ rộng card giảm xuống ~313px (content box 273.6px). Bổ sung tường minh `lg:text-2xl` (24px) để ngăn chặn việc chữ số tiền tệ 18 ký tự bị tràn viền hoặc bị cắt cụt (blowout) khi card co lại.
  - Khung nhìn `1280px – 1535px` (`xl`): 3 cột (thay vì 6 cột), cỡ chữ `xl:text-2xl` đảm bảo số tiền hiển thị trọn vẹn và cân đối.
  - Khung nhìn `≥ 1536px` (`2xl`): 6 cột, cỡ chữ `2xl:text-3xl` (30px) trên màn hình siêu rộng kết hợp `truncate` và thuộc tính `title` để đảm bảo an toàn tuyệt đối.

---

#### [RESP-02] Biểu Đồ AssetAllocationChart Bị Bóp Bẹp Trên Màn Hình Di Động
- **Vị trí file:** `src/components/AssetAllocationChart.tsx:151-244`
- **Mức độ:** High
- **Phân tích kỹ thuật chuyên sâu:**
  - Dòng 151 thiết lập: `<div className="flex items-center gap-6">` chứa biểu đồ tròn cố định `w-[180px]` và cột chú thích `flex-1 space-y-3`.
  - Trên màn hình di động (375px), sau khi trừ padding card `p-5` (40px) còn lại 316px. Trừ đi độ rộng biểu đồ tròn (180px) và khoảng cách `gap-6` (24px), cột hiển thị chi tiết tài sản chỉ còn lại vẻn vẹn **112px**.
  - Trong 112px này, nhãn ("Chứng chỉ quỹ"), giá trị tiền tệ ("150.000.000 ₫") và tỷ lệ ("45.5%") bị chèn ép, vỡ thành 3-4 dòng nát vụn.
  - Dòng 218 thiết lập: `<div className="mt-4 grid grid-cols-3 gap-3">` cho 3 ô Cổ phiếu, Quỹ, Tiền mặt. Trong 316px, mỗi ô chỉ có chiều rộng khả dụng là **73px**, khiến giá trị tài sản hiển thị bị tràn ra ngoài viền ô.
- **Mã nguồn trước khi sửa:**
  ```tsx
  // src/components/AssetAllocationChart.tsx:151, 218
  <div className="flex items-center gap-6">
    <div className="h-[180px] w-[180px] flex-shrink-0">...</div>
    <div className="flex-1 space-y-3">...</div>
  </div>
  <div className="mt-4 grid grid-cols-3 gap-3">
  ```
- **Mã nguồn sau khi sửa:**
  ```tsx
  // src/components/AssetAllocationChart.tsx:151, 218
  <div className="flex flex-col sm:flex-row items-center gap-6">
    <div className="h-[180px] w-[180px] shrink-0 mx-auto sm:mx-0">...</div>
    <div className="w-full flex-1 space-y-3">...</div>
  </div>
  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
  ```

---

#### [RESP-03] Grid Chỉ Số Trả Về Trong NetWorthChart Bị Ép Trên Màn Hình Nhỏ
- **Vị trí file:** `src/components/NetWorthChart.tsx:163-184`
- **Mức độ:** Medium
- **Phân tích kỹ thuật:** Dòng 163 cố định `<div className="grid grid-cols-3 gap-4 mb-4">` không có tiền tố responsive. Trên màn hình 375px, mỗi cột chỉ rộng ~69px. Nhãn "Lợi nhuận Portfolio" bị ngắt thành 4 dòng chữ vụn vặt và tỷ lệ phần trăm kèm icon xu hướng bị tràn sang cột bên cạnh.
- **Mã nguồn trước khi sửa:**
  ```tsx
  <div className="grid grid-cols-3 gap-4 mb-4">
  ```
- **Mã nguồn sau khi sửa:**
  ```tsx
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
    <div className="rounded-xl bg-slate-800/50 p-3 text-center flex sm:flex-col justify-between items-center sm:justify-center">
  ```

---

#### [RESP-04] Lưới 3 Cột Cố Định Trong GoldPriceCard & PriceAlerts Gây Quá Tải Sidebar
- **Vị trí file:**
  - `src/components/GoldPriceCard.tsx:155-181`
  - `src/components/PriceAlerts.tsx:222-246`
- **Mức độ:** Medium
- **Phân tích kỹ thuật:**
  - Trong `GoldPriceCard.tsx:155`: `<div className="mt-4 grid grid-cols-3 gap-3">` hiển thị Giá mua, Giá bán, Thay đổi. Khi hiển thị trong cột sidebar hoặc di động, mỗi cột chỉ rộng 62px, khiến giá vàng SJC `85.200.000 ₫` bị ngắt dòng giữa các con số ("85.200." và "000 ₫").
  - Trong `PriceAlerts.tsx:222`: `<div className="grid grid-cols-3 gap-3 mb-3">` hiển thị 3 input (Mã CP, Giá mục tiêu, Điều kiện) trong chiều rộng sidebar ~308px, khiến các trường chỉ rộng ~70px, che khuất hoàn toàn nội dung người dùng nhập.
- **Mã nguồn sau khi sửa:** Chuyển đổi thành `grid-cols-1 sm:grid-cols-3 gap-3`.

---

#### [RESP-05] Lỗi Triệt Tiêu Padding Trên Tablet Của Trang Account (`sm:px-0`)
- **Vị trí file:** `src/components/AccountClient.tsx:196`
- **Mức độ:** High
- **Phân tích kỹ thuật:** Dòng 196 khai báo `<main className="mx-auto w-full max-w-[860px] space-y-8 px-4 py-8 sm:px-0">`. Tiền tố `sm:px-0` xóa sạch padding ngang từ breakpoint `sm` (640px) trở lên. Trên các thiết bị máy tính bảng như iPad Mini (768px portrait) hay màn hình từ 640px đến 860px, toàn bộ card và form dính sát 100% vào mép kính vật lý của thiết bị (0px margin/padding).
- **Mã nguồn trước khi sửa:**
  ```tsx
  // src/components/AccountClient.tsx:196
  <main className="mx-auto w-full max-w-[860px] space-y-8 px-4 py-8 sm:px-0">
  ```
- **Mã nguồn sau khi sửa:**
  ```tsx
  // src/components/AccountClient.tsx:196
  <main className="mx-auto w-full max-w-[860px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
  ```

---

### 4.2 Tràn Khung (Overflow), Cắt Xén (Clipping) & Dịch Chuyển Layout (CLS)

#### [RESP-06] Chân Trang Phân Trang Va Chạm Bố Cục Trên Di Động
- **Vị trí file:** `src/components/GroupedTransactionHistoryTable.tsx:149-170`
- **Mức độ:** Medium
- **Phân tích kỹ thuật:** Dòng 149 định nghĩa `<div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/40 px-6 py-4">`. Dòng văn bản bên trái dài ~250px và cụm nút bấm bên phải dài ~180px đòi hỏi tổng cộng >470px chiều ngang. Thiếu `flex-wrap` và `flex-col` khiến nút bấm phân trang đè lên chữ hoặc tràn ra ngoài card trên màn hình dưới 640px.
- **Mã nguồn sau khi sửa:**
  ```tsx
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-800 bg-slate-950/40 px-4 sm:px-6 py-4">
    <span className="text-xs sm:text-sm text-slate-400 text-center sm:text-left">
      {t.showing} {currentGroups.length} {t.dayGroups} {groupedDays.length}
    </span>
    <div className="flex items-center justify-center gap-3">...</div>
  </div>
  ```

---

#### [RESP-07] Nút Đảo Chiều ForexConverter Bị Đẩy Lạc Dòng Khi Co Giãn
- **Vị trí file:** `src/components/ForexConverter.tsx:92-136`
- **Mức độ:** Medium
- **Phân tích kỹ thuật:** Dòng 92 định nghĩa `<div className="flex flex-wrap items-end gap-3">` chứa 4 phần tử: Số tiền, Từ loại tiền, Nút hoán đổi `<->`, và Sang loại tiền. Trên màn hình di động hẹp (360px), các khối flex wrap thành 2 dòng: Dòng 1 nhận `[Số tiền] [Từ tiền]`, Dòng 2 nhận `[<-> Nút hoán đổi] [Sang tiền]`. Nút hoán đổi bị văng xuống đầu dòng 2, tách rời khỏi vị trí trung gian giữa hai loại tiền tệ.
- **Mã nguồn sau khi sửa:**
  ```tsx
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end gap-3">
    <div className="w-full lg:flex-1 lg:min-w-[120px]">...Số tiền...</div>
    <div className="flex items-end gap-2 w-full lg:contents">
      <div className="flex-1 lg:min-w-[120px]">...Từ loại tiền...</div>
      <button onClick={...} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 text-slate-300">
        <ArrowLeftRight className="h-4 w-4" />
      </button>
      <div className="flex-1 lg:min-w-[120px]">...Sang loại tiền...</div>
    </div>
  </div>
  ```

---

#### [RESP-08] Bảng Tỷ Giá Forex Bị Ép Nát Do Thiếu `min-w`
- **Vị trí file:** `src/app/forex/ForexClient.tsx:366-427`
- **Mức độ:** Medium
- **Phân tích kỹ thuật:** Dòng 366 có thẻ bọc cuộn `<div className="mt-4 overflow-x-auto">`, nhưng thẻ bảng bên trong dòng 367 lại là `<table className="w-full text-left text-sm">` mà không khai báo `min-w-[...]`. Bảng có 6 cột phức tạp bị trình duyệt ép co cụm vào không gian 360px của điện thoại, làm vỡ các tiêu đề và cột giá trị.
- **Mã nguồn sau khi sửa:** Đổi dòng 367 thành `<table className="w-full min-w-[640px] text-left text-sm">`.

---

### 4.3 Kích Thước Vùng Chạm (Touch Targets) & Trải Nghiệm Cảm Ứng

#### [RESP-09] Vi Phạm Vùng Chạm Tối Thiểu (<44x44px) Lan Rộng Trên Các Nút Tương Tác Cốt Lõi
- **Vị trí file:**
  1. `src/components/TooltipInfo.tsx:7-13`: Nút trợ giúp icon `h-3.5 w-3.5`. Kích thước chạm thực tế là **14x14px**.
  2. `src/components/ForexMiniWidget.tsx:57`: Nút Refresh icon `h-3.5 w-3.5`. Kích thước chạm thực tế là **14x14px**.
  3. `src/components/MarkToMarketGrid.tsx:147-152`: Nút Search `size={14}`. Kích thước chạm là **14x14px**.
  4. `src/components/MarkToMarketGrid.tsx:181-186`: Nút Lưu & Hủy inline edit `p-1.5`. Kích thước chạm là **28x28px**.
  5. `src/components/Watchlist.tsx:224-228`: Nút Xóa mã `p-1.5` với icon 16px. Kích thước chạm là **28x28px**.
  6. `src/components/PriceAlerts.tsx:214, 316`: Nút Xóa cảnh báo `p-1.5`. Kích thước chạm là **28x28px**.
  7. `src/app/forex/ForexClient.tsx:413`: Nút chọn biểu đồ tỷ giá `py-1 text-xs`. Chiều cao nút là **24px**.
  8. `src/components/AccountClient.tsx:375`: Nút Đăng xuất thiết bị `py-1.5 text-xs`. Chiều cao nút là **28px**.
- **Mức độ:** High
- **Phân tích tiêu chuẩn WCAG & Apple HIG:**
  - Tiêu chí WCAG 2.1 Success Criterion 2.5.5 (Target Size) và Apple iOS Human Interface Guidelines yêu cầu kích thước vùng chạm tương tác tối thiểu là **44x44px** (Android Material Design yêu cầu 48x48px).
  - Các nút có kích thước từ 14px đến 28px trên màn hình cảm ứng độ phân giải cao khiến người dùng liên tục bấm trượt hoặc bấm nhầm sang phần tử kế bên.
- **Mã nguồn khắc phục mẫu (`src/components/TooltipInfo.tsx:10`):**
  ```tsx
  <button
    type="button"
    aria-label="Thông tin thêm"
    className="inline-flex min-h-[44px] min-w-[44px] -m-2 cursor-help items-center justify-center rounded-full text-slate-500 outline-none transition-colors hover:text-amber-400 focus-visible:text-amber-400"
  >
    <HelpCircle className="h-4 w-4" />
  </button>
  ```

---

#### [RESP-10] Nút Thao Tác Ẩn Hoàn Toàn Trên Thiết Bị Cảm Ứng Do Phụ Thuộc `group-hover`
- **Vị trí file:**
  - `src/components/MarkToMarketGrid.tsx:191-197`: Nút sửa giá gán `opacity-0 group-hover:opacity-100 focus:opacity-100`.
  - `src/components/Watchlist.tsx:224-228`: Nút xóa mã gán `opacity-0 group-hover:opacity-100 focus:opacity-100`.
- **Mức độ:** High
- **Phân tích kỹ thuật:** Trên màn hình cảm ứng di động và máy tính bảng không tồn tại trạng thái rê chuột (hover). Các nút thao tác này có `opacity-0` vĩnh viễn, khiến người dùng di động hoàn toàn không biết có thể chỉnh sửa giá nắm giữ hoặc xóa mã theo dõi.
- **Mã nguồn sau khi sửa (`MarkToMarketGrid.tsx:193`):**
  ```tsx
  className="rounded-md p-2 text-slate-400 sm:text-slate-500 sm:opacity-0 transition-all hover:bg-blue-500/10 hover:text-blue-300 sm:group-hover:opacity-100 focus:opacity-100"
  ```

---

#### [RESP-11] Cỡ Chữ Input Nhỏ Hơn 16px Gây Ra Lỗi Tự Động Phóng To Trên iOS Safari
- **Vị trí file:**
  - `src/components/AddTradeForm.tsx:104, 116, 132, 173, 184`
  - `src/components/AddDepositForm.tsx:104, 116, 126`
  - `src/components/OpeningPositionCard.tsx:107, 113`
  - `src/components/Watchlist.tsx:247`
  - `src/components/PriceAlerts.tsx:228, 236`
  - `src/components/ForexConverter.tsx:100, 109`
  - `src/components/AuthPanel.tsx:153, 163`
- **Mức độ:** Medium
- **Phân tích kỹ thuật:** Trên trình duyệt iOS WebKit (iPhone/iPad), khi người dùng chạm vào ô `<input>` hoặc `<select>` có cỡ chữ nhỏ hơn 16px (`text-sm` là 14px), trình duyệt sẽ tự động zoom-in toàn bộ màn hình vào ô input đó. Điều này làm vỡ khung nhìn giao diện và buộc người dùng phải dùng hai ngón tay zoom-out thủ công sau khi nhập liệu xong.
- **Mã nguồn sau khi sửa:** Đổi toàn bộ các class input từ `text-sm` thành `text-base md:text-sm`.

---

## 5. Dimension 3: Trải Nghiệm Người Dùng (UX - User Experience)

### 5.1 Điều Hướng & Định Vị (Navigation & Wayfinding)

#### [UX-01] Thiếu Thẻ Cột Mốc `<nav>` Và Menu Ngăn Kéo (Drawer) Trên Mobile
- **Vị trí file:** `src/components/DashboardClient.tsx:289-312`
- **Mức độ:** High
- **Phân tích kỹ thuật:** Cụm liên kết điều hướng (`/forex`, `/account`, `LogoutButton`) đặt trong thẻ `<div>` thường trong header. Trên màn hình điện thoại (<640px), toàn bộ email người dùng, nút chuyển ngôn ngữ, nút chọn ngày và các link này dồn ứ thành một khối lộn xộn chiếm gần hết màn hình đầu tiên. Thiếu landmark `<nav>` và thiếu menu rút gọn (hamburger drawer).
- **Mã nguồn sau khi sửa:**
  ```tsx
  <nav aria-label="Điều hướng chính" className="flex items-center gap-3">
    <div className="hidden lg:flex items-center gap-3">
      {/* Desktop Links */}
    </div>
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={mobileMenuOpen}
        aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu điều hướng'}
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-slate-200"
      >
        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
    </div>
  </nav>
  ```

---

#### [UX-02] Thiếu Breadcrumbs Và Chỉ Báo Vị Trí Trang Hiện Tại (Active Route State)
- **Vị trí file:** `src/components/AccountClient.tsx:199`, `src/app/forex/ForexClient.tsx:229-234`
- **Mức độ:** Medium
- **Phân tích kỹ thuật:** Các trang con `/account` và `/forex` chỉ có một nút quay lại thô sơ gán cứng `<Link href="/">`. Thiếu thanh điều hướng phân cấp (Breadcrumb) và thiếu thuộc tính `aria-current="page"`.
- **Mã nguồn sau khi sửa (`AccountClient.tsx:199`):**
  ```tsx
  <nav aria-label="Breadcrumbs" className="flex items-center gap-2 text-sm text-slate-400">
    <Link href="/" className="transition-colors hover:text-slate-200">
      {language === 'vi' ? 'Bảng điều khiển' : 'Dashboard'}
    </Link>
    <span className="text-slate-600" aria-hidden="true">/</span>
    <span className="font-semibold text-slate-200" aria-current="page">
      {t.title}
    </span>
  </nav>
  ```

---

### 5.2 Trạng Thái Rỗng (Empty States) & Trải Nghiệm Khởi Tạo

#### [UX-03] Lỗi Server Nuốt Ngoại Lệ Biến Lỗi Hệ Thống Thành Trạng Thái Rỗng (Critical Defect)
- **Vị trí file:** `src/app/page.tsx:29-42`
- **Mức độ:** Critical
- **Phân tích kỹ thuật:**
  ```tsx
  // src/app/page.tsx:29-42
  try {
    [initialTransactions, initialCashEvents, openingPositionSnapshot, portfolioSettings] = await Promise.all([
      fetchTransactions(),
      fetchCashEvents(),
      fetchOpeningPositionSnapshot(),
      fetchPortfolioSettings(),
    ]);
  } catch (error) {
    console.error('Failed to load portfolio data for current user.', error);
  }
  ```
  Khi cơ sở dữ liệu gặp sự cố, mạng lỗi hoặc API token hết hạn, `Promise.all` bị reject. Khối `catch` chỉ in log ra console server và tiếp tục render trang với các mảng rỗng (`[]`). Người dùng sở hữu danh mục đầu tư hàng chục tỷ đồng sẽ nhìn thấy màn hình `<EmptyStateHero>` và wizard yêu cầu nạp tài sản từ đầu như một tài khoản mới tinh! Điều này gây hoang mang cực độ cho khách hàng tài chính.
- **Mã nguồn sau khi sửa:**
  1. Trong `src/app/page.tsx:29-42` (bắt cờ lỗi server):
  ```tsx
  let hasServerError = false;
  try {
    [initialTransactions, initialCashEvents, openingPositionSnapshot, portfolioSettings] = await Promise.all([...]);
  } catch (error) {
    console.error('Failed to load portfolio data for current user.', error);
    hasServerError = true;
  }
  return (
    <>
      <StoreInitializer ... />
      <DashboardClient userEmail={user.email} serverError={hasServerError} />
    </>
  );
  ```

  2. Trong `src/components/DashboardClient.tsx:32, 52` (Cập nhật TypeScript interface và giao diện Fallback Error Banner):
  ```tsx
  // Cập nhật interface DashboardClientProps tránh lỗi biên dịch TypeScript (`tsc --noEmit`):
  export interface DashboardClientProps {
    userEmail: string;
    serverError?: boolean;
  }

  export default function DashboardClient({ userEmail, serverError = false }: DashboardClientProps) {
    // Nếu có lỗi server, ngăn chặn việc render nhầm OnboardingWizard / EmptyStateHero
    // và lập tức hiển thị giao diện fallback thông báo lỗi kết nối:
    if (serverError) {
      return (
        <div className="min-h-screen bg-slate-950 p-6 flex items-center justify-center">
          <div className="max-w-md w-full rounded-2xl border border-rose-900/50 bg-rose-950/20 p-6 text-center shadow-xl shadow-black/40">
            <AlertCircle className="h-10 w-10 text-rose-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white mb-2">Không thể tải dữ liệu danh mục</h2>
            <p className="text-sm text-slate-400 mb-4">Kết nối máy chủ cơ sở dữ liệu bị gián đoạn. Vui lòng thử lại sau.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium transition-colors"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }
    // ... tiếp tục luồng render bình thường khi server khỏe mạnh
  }
  ```

---

#### [UX-04] Lỗi API Hiển Thị Sai Lệch Thành Trạng Thái Rỗng Trong `TaxSummaryCard`
- **Vị trí file:** `src/components/TaxSummaryCard.tsx:119-134`
- **Mức độ:** High
- **Phân tích kỹ thuật:** Khi gọi API `/api/tax-calculation` thất bại, khối catch chỉ ghi log. Component kiểm tra `if (!data)` và render ngay thông báo: `"Chưa có giao dịch bán"` (`{t.noData}`). Lỗi server/mạng bị đánh tráo thành thông điệp kế toán sai sự thật.
- **Mã nguồn sau khi sửa:** Bổ sung state `fetchError` và render một alert box viền đỏ có nút "Thử lại" (`Retry`) thay vì thông báo không có giao dịch.

---

#### [UX-05] Sử Dụng Từ Ngữ Tiêu Cực ("Dữ Liệu Rác") Trong Flow Onboarding
- **Vị trí file:** `src/components/OnboardingWizard.tsx:173`
- **Mức độ:** Low
- **Phân tích kỹ thuật:** Câu văn tiếng Việt fallback trong code ghi rõ: `'Bỏ qua bước này và nạp dữ liệu rác để trải nghiệm nhanh.'`. Việc dùng từ "dữ liệu rác" trong sản phẩm tài chính thể hiện sự cẩu thả về mặt UX Copywriting.
- **Mã nguồn sau khi sửa:** Đổi thành `'Bỏ qua bước này và tải dữ liệu mẫu để trải nghiệm nhanh hệ thống.'`.

---

### 5.3 Trạng Thái Chờ (Loading), Skeleton & Dịch Chuyển Giao Diện

#### [UX-06] Trạng Thái Hydration Skeleton Không Khớp Gây Lỗi CLS Nghiêm Trọng
- **Vị trí file:** `src/components/DashboardClient.tsx:110-132`
- **Mức độ:** High
- **Phân tích kỹ thuật:** Skeleton trước khi mount có 4 thẻ card, khung 1280px, không có header và hero banner. Khi mount, màn hình bùng nổ lên 6 thẻ card, khung 1680px, hero banner xuất hiện đẩy toàn bộ trang xuống dưới.
- **Mã nguồn sau khi sửa:** Cấu hình khung skeleton khớp 100% với layout mounted: chiều rộng `w-[95%] max-w-[1680px]`, có placeholder header, placeholder hero banner và 6 placeholder cards sử dụng chính xác hệ breakpoint đồng bộ với dashboard mounted: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6`. Việc đồng nhất lưới breakpoint giữa skeleton và component mounted triệt tiêu hoàn toàn hiện tượng lệch bố cục (CLS = 0) trong quá trình hydration trên các kích thước màn hình 1024px–1535px.

---

#### [UX-07] Thiếu File `loading.tsx` Cho Tuyến Đường `/forex`
- **Vị trí file:** `src/app/forex/loading.tsx` (Chưa tồn tại)
- **Mức độ:** High
- **Phân tích kỹ thuật:** Route `/forex/page.tsx` thực thi hàm bất đồng bộ phía server `await getForexRates()`. Do không có `loading.tsx`, khi người dùng bấm vào link "Tỷ giá", trang web bị đóng băng hoàn toàn trong 1-2 giây mà không có bất kỳ hiệu ứng chuyển trang nào.
- **Đề xuất tạo mới `src/app/forex/loading.tsx`:**
  ```tsx
  export default function ForexLoading() {
    return (
      <main className="mx-auto flex w-[95%] max-w-[1280px] flex-col gap-6 py-6 animate-pulse">
        <div className="h-28 rounded-[28px] border border-slate-800 bg-slate-900/60 p-6" />
        <div className="h-12 w-96 rounded-xl bg-slate-800/40" />
        <div className="h-96 rounded-[28px] border border-slate-800 bg-slate-900/40" />
      </main>
    );
  }
  ```

---

#### [UX-08] Biểu Đồ Sụp Đổ Chiều Cao Khi Đổi Khung Thời Gian Gây Giật Màn Hình
- **Vị trí file:** `src/app/forex/ForexClient.tsx:515-519`, `src/components/GoldPriceCard.tsx:102-104`
- **Mức độ:** Medium
- **Phân tích kỹ thuật:** Khi người dùng đổi khung thời gian (7d sang 30d), biểu đồ cao 320px bị gỡ khỏi DOM và thay thế bằng spinner cao ~60px (`py-16`). Toàn bộ nội dung bên dưới biểu đồ bị giật nảy lên trên rồi lại bị đẩy xuống dưới khi dữ liệu tải xong.
- **Mã nguồn sau khi sửa:** Duy trì khung chứa cố định `relative h-[320px] w-full`, phủ một lớp spinner bán trong suốt `absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]` lên trên biểu đồ cũ trong thời gian fetch dữ liệu mới.

---

### 5.4 Phản Hồi Lỗi & Khả Năng Phục Hồi (Error Feedback & Resilience)

#### [UX-09] Mất Kết Nối Luồng Giá Trực Tiếp (SSE) Bị Bỏ Qua Hoàn Toàn
- **Vị trí file:** `src/components/DashboardClient.tsx:64`, `src/lib/useRealtimePrices.ts:153-166`
- **Mức độ:** High
- **Phân tích kỹ thuật:** Hook `useHoldingsRealtimePrices` trả về `{ isConnected, reconnect }`. Nhưng trong `DashboardClient`, component gọi hook mà không lấy giá trị trả về (`useHoldingsRealtimePrices(isMounted);`). Khi kết nối EventSource tới `/api/stream/prices` bị đứt, giá ngừng cập nhật mà người dùng không hề hay biết.
- **Mã nguồn sau khi sửa:** Lấy biến `isSseConnected` và hiển thị một thanh thông báo nhỏ màu hổ phách: *"Mất kết nối luồng giá trực tiếp. Đang thử kết nối lại..."* cùng nút *"Kết nối lại ngay"*.

---

#### [UX-10] Nút Hoàn Tác Batch Dữ Liệu Thiếu Hộp Thoại Xác Nhận An Toàn
- **Vị trí file:** `src/components/ImportHistoryCard.tsx:49-60, 114-123`
- **Mức độ:** High
- **Phân tích kỹ thuật:** Bấm nút "Rollback batch" lập tức kích hoạt xóa hàng loạt giao dịch mà không có popup xác nhận. Chỉ một thao tác chạm nhầm trên điện thoại có thể xóa vĩnh viễn dữ liệu nhập khẩu của cả năm tài chính.
- **Mã nguồn sau khi sửa:** Bổ sung bước xác nhận click 2 lần hoặc mở modal xác nhận an toàn trước khi gọi action `rollbackImportBatchAction`.

---

### 5.5 Trải Nghiệm Biểu Mẫu (Form Interactivity)

#### [UX-11] 7 Form Nhập Liệu Không Dùng Thẻ `<form>` Khiến Phím `Enter` Bị Vô Hiệu Hóa
- **Vị trí file:**
  - `src/components/AddTradeForm.tsx:86, 189-196`
  - `src/components/AddDepositForm.tsx:69, 131-138`
  - `src/components/OpeningPositionCard.tsx:75, 133-141`
  - `src/components/FeeDebtCard.tsx:35, 58-66`
  - `src/components/TaxRateForm.tsx:67, 110-117`
  - `src/components/Watchlist.tsx:240-258`
  - `src/components/PriceAlerts.tsx:220-263`
- **Mức độ:** High
- **Phân tích kỹ thuật:** Các form này dùng thẻ `<div>` bao quanh và kích hoạt bằng `<button type="button" onClick={handleSubmit}>`. Khi người dùng nhập xong số tiền và gõ phím `Enter` trên bàn phím, biểu mẫu không gửi đi. Trên bàn phím ảo di động, phím hành động hiển thị chữ "Return" thay vì "Go/Submit".
- **Mã nguồn sau khi sửa:** Bọc toàn bộ các input bằng `<form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>` và chuyển nút bấm thành `type="submit"`.

---

#### [UX-12] `NumberInput` Thiếu Thuộc Tính `id`, `disabled` Và Prop Forwarding
- **Vị trí file:** `src/components/NumberInput.tsx:5-10, 54-65`
- **Mức độ:** High
- **Phân tích kỹ thuật:** Interface `NumberInputProps` chỉ có `{ value, onChange, placeholder, className }`. Component không chấp nhận `id`, `name`, `disabled`, `aria-*` hay các thuộc tính chuẩn của HTML `<input>`. Khi form cha đang ở trạng thái `isPending = true`, nút submit bị disabled nhưng ô `NumberInput` vẫn cho phép gõ tiếp!
- **Mã nguồn sau khi sửa:** Mở rộng interface kế thừa `React.InputHTMLAttributes<HTMLInputElement>` và forward toàn bộ thuộc tính `id`, `disabled`, `...rest` vào thẻ input nội bộ.

---

#### [UX-13] Thiếu Nút Xem Mật Khẩu (Eye Toggle) Trên Form Auth & Đặt Lại Mật Khẩu
- **Vị trí file:** `src/components/AuthPanel.tsx:156-187`, `src/app/reset-password/page.tsx:132-150`
- **Mức độ:** Medium
- **Phân tích kỹ thuật:** Các form bắt buộc mật khẩu tối thiểu 8 ký tự nhưng không có icon ẩn/hiện mật khẩu. Trên bàn phím di động rất dễ gõ nhầm ký tự, dẫn đến việc tài khoản bị khóa sau nhiều lần thử sai.
- **Mã nguồn sau khi sửa:** Bổ sung state `showPassword` và nút toggle chứa icon `<Eye />` / `<EyeOff />`.

---

#### [UX-14] Vùng Tải File CSV Kẻ Nét Đứt Nhưng Không Có Sự Kiện Kéo Thả (Drag & Drop)
- **Vị trí file:** `src/components/CsvUploaderServerImport.tsx:116-138`
- **Mức độ:** Medium
- **Phân tích kỹ thuật:** Giao diện vẽ một khung viền nét đứt lớn (`border-dashed`) với icon đám mây tải lên, ngầm định hỗ trợ kéo thả file. Tuy nhiên component thiếu hoàn toàn các event `onDragOver`, `onDragLeave`, và `onDrop`. Kéo file vào ô sẽ khiến trình duyệt mở file sang tab mới thay vì upload.
- **Mã nguồn sau khi sửa:** Cài đặt các handler kéo thả HTML5, cập nhật visual feedback khi `isDragOver = true` và nạp file vào input ref.

---

### 5.6 Chuyển Động, Hiệu Ứng & Khả Năng Tiếp Cận Chuyển Động (Motion Accessibility)

#### [UX-15] Thiếu Hỗ Trợ `prefers-reduced-motion` Cho Toàn Bộ Hiệu Ứng Chuyển Động
- **Vị trí file:** `src/app/globals.css`, `src/components/DashboardClient.tsx:113, 158`
- **Mức độ:** Medium
- **Phân tích kỹ thuật:** Ứng dụng lạm dụng `animate-pulse`, `animate-spin`, `animate-ping` mà không kiểm tra cấu hình giảm chuyển động của hệ điều hành, vi phạm tiêu chí WCAG 2.3.3 (Animation from Interactions).
- **Mã nguồn sau khi sửa:** Bổ sung vào `src/app/globals.css`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```

---

## 6. Dimension 4: Chất Lượng Mã Nguồn UI & Khả Năng Tiếp Cận (Code Quality & A11y)

### 6.1 Kiến Trúc Thành Phần & Mã Nguồn Thừa (Dead Code)

#### [CODE-01] 5 File Component Thừa Bị Bỏ Quên (747 Dòng Dead Code)
- **Danh sách file mồ côi:**
  1. `src/components/CashLedgerStatusCard.tsx` (82 dòng): Bị thay thế hoàn toàn bởi `ReconciliationPanel.tsx`.
  2. `src/components/ErrorDisplay.tsx` (233 dòng): Hệ thống hiển thị lỗi phức tạp không bao giờ được import.
  3. `src/components/MarketOverview.tsx` (112 dòng): Component ngoại lai dùng hệ màu `gray-*`, bị thay thế bởi `HeroBanner.tsx`.
  4. `src/components/PortfolioChart.tsx` (105 dòng): Component canvas cũ dùng `lightweight-charts`, bị thay bởi `NetWorthChart.tsx`.
  5. `src/components/TransactionHistoryTable.tsx` (215 dòng): Bị thay thế bởi `GroupedTransactionHistoryTable.tsx`, chứa nhiều kiểu dữ liệu `any`.
  - **Tổng dung lượng mã nguồn thừa:** `82 + 233 + 112 + 105 + 215 =` **747 dòng code thừa (747 LOC)**.
- **Mức độ:** High
- **Đề xuất khắc phục:** Xóa bỏ an toàn toàn bộ 5 file này khỏi dự án để làm sạch bundle và tránh gây nhầm lẫn khi bảo trì.

---

#### [CODE-02] Rò Rỉ Kiến Trúc: Hàm Tiện Ích `cn()` Xuất Khẩu Từ Data Grid Component
- **Vị trí file:** `src/components/MarkToMarketGrid.tsx:11-13`
- **Mức độ:** High
- **Phân tích kỹ thuật:**
  ```typescript
  // Định nghĩa trong MarkToMarketGrid.tsx:
  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }
  // Bị import chéo bởi các file không liên quan:
  // src/app/forex/ForexClient.tsx:14: import { cn } from '@/components/MarkToMarketGrid';
  // src/components/DashboardClient.tsx:16: import MarkToMarketGrid, { cn } from '@/components/MarkToMarketGrid';
  // src/components/DataQualityBadge.tsx:5: import { cn } from '@/components/MarkToMarketGrid';
  // src/components/TaxSummaryCard.tsx:6: import { cn } from '@/components/MarkToMarketGrid';
  ```
  Hàm nối class Tailwind (`cn`) là một tiện ích tầng thấp. Việc để một bảng dữ liệu xuất khẩu hàm này và các trang cốt lõi import chéo vi phạm nguyên tắc Inversion of Control và Clean Architecture.
- **Đề xuất khắc phục:** Di dời hàm `cn()` sang `src/lib/utils.ts` và cập nhật lại toàn bộ đường dẫn import.

---

#### [CODE-03] Trùng Lặp Giao Diện: Nút Chuyển Ngôn Ngữ Bị Copy-Paste 4 Lần
- **Vị trí file:** `AuthPanel.tsx:240-247`, `ForgotPassword.tsx:79-82`, `DashboardClient.tsx:226-245`, `AccountClient.tsx:205-212`.
- **Mức độ:** Medium
- **Phân tích kỹ thuật:** Cụm pill button chuyển đổi ngôn ngữ (Icon quả địa cầu + nút VI + nút EN) bị sao chép nguyên khối JSX tại 4 nơi khác nhau, xử lý state và màu sắc phân tán.
- **Đề xuất khắc phục:** Tách thành component dùng chung `src/components/LanguageSwitcher.tsx`.

---

#### [CODE-04] Trùng Lặp Logic Định Dạng Tiền Tệ & Tỷ Lệ (8 Lần Khai Báo)
- **Vị trí file:** `DashboardClient.tsx:40`, `MarkToMarketGrid.tsx:21`, `GroupedTransactionHistoryTable.tsx:11`, `Watchlist.tsx:49`, `ReconciliationPanel.tsx:9`, `AssetAllocationChart.tsx:16`, `HoldingPriceChart.tsx:106`, `CashLedgerStatusCard.tsx:6`.
- **Mức độ:** Medium
- **Phân tích kỹ thuật:** Hàm `formatCurrency()` và `formatPercent()` được định nghĩa cục bộ tại 8 file khác nhau, liên tục khởi tạo lại instance `Intl.NumberFormat`.
- **Đề xuất khắc phục:** Đưa vào `src/lib/formatters.ts` với các instance `Intl.NumberFormat` singleton được cache.

---

#### [CODE-05] Sai Khóa LocalStorage Giữa Trang Đặt Lại Mật Khẩu Và Hệ Thống
- **Vị trí file:**
  - `src/app/reset-password/page.tsx:50`: `window.localStorage.getItem('dashboard_language')`
  - `src/lib/dashboardLocale.ts:3`: `export const DASHBOARD_LANGUAGE_STORAGE_KEY = 'portfolio-dashboard-language';`
- **Mức độ:** Medium
- **Phân tích kỹ thuật:** Trang Reset Password đọc khóa `'dashboard_language'`, trong khi toàn bộ ứng dụng ghi vào khóa `'portfolio-dashboard-language'`. Do đó, người dùng đã chuyển sang tiếng Anh trên Dashboard sẽ luôn thấy trang Reset Password hiển thị tiếng Việt.
- **Đề xuất khắc phục:** Import và sử dụng hằng số `DASHBOARD_LANGUAGE_STORAGE_KEY` trong `reset-password/page.tsx`.

---

### 6.2 Ngữ Nghĩa HTML & Cột Mốc Vùng (Landmarks)

#### [A11Y-01] Accordion Mở Rộng Viết Bằng `<div onClick>` Không Thể Tương Tác Bằng Phím (Vi Phạm Chuẩn W3C WAI-ARIA Accordion)
- **Vị trí file:** `src/components/ImportWarningsPanel.tsx:59-85`
- **Mức độ:** High
- **Phân tích kỹ thuật:** Header của panel cảnh báo là một thẻ `<div>` có `onClick={() => setExpanded(!expanded)}`. Người dùng duyệt bằng phím Tab không thể focus vào thẻ này và không thể mở ra xem chi tiết cảnh báo.
  - *Lưu ý quan trọng về chuẩn HTML5 & WAI-ARIA:* Bên trong header hiện tại chứa thẻ tiêu đề `<h3 className="...">` (dòng 70). Theo đặc tả W3C/WHATWG HTML5, thẻ `<button>` chỉ được phép chứa *phrasing content* và tuyệt đối không được chứa thẻ tiêu đề `<h1>`–`<h6>` (*flow content*). Việc bọc trực tiếp `<button>` quanh toàn bộ thẻ `<div>` cũ sẽ dẫn tới lỗi lồng thẻ không hợp lệ (`<button><h3>...</button></h3>`), gây hỏng cây trợ năng (Accessibility Tree) và kích hoạt cảnh báo React DOM validation.
- **Mã nguồn sau khi sửa:** Tuân thủ chuẩn W3C WAI-ARIA Accordion Pattern bằng cách đặt `<button>` bên trong tiêu đề `<h3>` (`<h3 className="..."><button type="button" className="..." aria-expanded={...}>...</button></h3>`):
  ```tsx
  // src/components/ImportWarningsPanel.tsx:59-85
  <h3 className="text-sm font-bold text-slate-100 m-0 p-0">
    <button
      type="button"
      id="warnings-accordion-header"
      aria-expanded={expanded}
      aria-controls="warnings-accordion-panel"
      onClick={() => setExpanded(!expanded)}
      className={cn(
        "flex w-full cursor-pointer items-center justify-between border-b p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        isPerfect ? "border-emerald-900/40 bg-emerald-950/10 hover:bg-emerald-950/20" : "border-rose-900/40 bg-rose-950/10 hover:bg-rose-950/20"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("shrink-0 rounded-xl p-2", isPerfect ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300")}>
          {isPerfect ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span>{t.title}</span>
            <span className="text-xs font-normal text-slate-500">({importedAt.toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US')})</span>
          </div>
          <p className="mt-0.5 max-w-[200px] truncate font-mono text-xs text-slate-400">{summary.fileName}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 pr-2">
        <div className="hidden flex-col gap-1 text-right text-xs sm:flex">
          <span className="whitespace-nowrap font-medium text-slate-400"><strong className="text-emerald-300">{summary.acceptedRows}</strong> {t.valid}</span>
          {summary.rejectedRows > 0 && <span className="whitespace-nowrap font-medium text-slate-400"><strong className="text-rose-300">{summary.rejectedRows}</strong> {t.skipped}</span>}
        </div>
        {expanded ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
      </div>
    </button>
  </h3>
  ```

---

#### [A11Y-02] Thẻ `<article>` Gán `role="button"` Giả Mạo
- **Vị trí file:** `src/components/HeroBanner.tsx:198-204`
- **Mức độ:** High
- **Phân tích kỹ thuật:** Các thẻ chỉ số VN-INDEX, Vàng, Tiền ảo được gán `role="button"` và `tabIndex={0}`. Khi focus bằng bàn phím, bộ đọc màn hình đọc: *"Button, VN-INDEX, 1.280, bấm để kích hoạt"*, nhưng bấm phím Enter hay click chuột đều hoàn toàn không có bất kỳ hành động nào.
- **Mã nguồn sau khi sửa:** Xóa bỏ hoàn toàn `role="button"`, `tabIndex={0}` và `onKeyDown` khỏi thẻ `<article>`.

---

#### [A11Y-03] Toàn Bộ Form Nhập Liệu Cốt Lõi Đặt Sai Vào Thẻ `<aside>`
- **Vị trí file:** `src/components/DashboardClient.tsx:472-495`
- **Mức độ:** Medium
- **Phân tích kỹ thuật:** Cột bên phải chứa form Nạp tiền, form Khớp lệnh, form Tải CSV lại bị bọc trong thẻ `<aside>`. Theo chuẩn W3C, `<aside>` chỉ chứa nội dung phụ trợ. Người dùng khiếm thị điều hướng theo landmark sẽ bỏ qua khu vực nhập liệu chính này.
- **Mã nguồn sau khi sửa:** Đổi `<aside>` thành `<section aria-label="Công cụ quản lý giao dịch" className="flex flex-col gap-6 lg:col-span-1">`.

---

#### [A11Y-04] Thiếu `<caption>` Hoặc `aria-label` Trên Toàn Bộ Bảng Dữ Liệu
- **Vị trí file:** `GroupedTransactionHistoryTable.tsx:113`, `MarkToMarketGrid.tsx:119`, `ForexClient.tsx:367`, `TaxSummaryCard.tsx:182`.
- **Mức độ:** Medium
- **Phân tích kỹ thuật:** Khi người khiếm thị chuyển con trỏ vào bảng, thiết bị chỉ đọc *"Table with 6 columns and 10 rows"* mà không biết bảng này chứa dữ liệu gì.
- **Mã nguồn sau khi sửa:** Thêm `aria-label` và `<caption className="sr-only">{t.tableDescription}</caption>` cho tất cả các bảng.

---

### 6.3 Thuộc Tính ARIA & Vùng Động (Live Regions)

#### [A11Y-05] Nút Bấm Icon Thiếu Tên Tiếp Cận (`aria-label`)
- **Vị trí file:** `DashboardClient.tsx:219`, `MarkToMarketGrid.tsx:151, 181, 196`, `Watchlist.tsx:224`, `PriceAlerts.tsx:213, 317`, `ForexConverter.tsx:117`, `ForexMiniWidget.tsx:57`.
- **Mức độ:** High
- **Phân tích kỹ thuật:** Hàng loạt nút chỉ chứa icon SVG hoặc ký tự `×`. Một số nút dùng thuộc tính `title`, nhưng `title` không được đọc nhất quán trên VoiceOver và hoàn toàn vô hình trên điện thoại.
- **Mã nguồn sau khi sửa:** Bổ sung `aria-label` tường minh cho từng nút bấm.

---

#### [A11Y-06] Thanh Chuyển Tab Thiếu `role="tablist"`, `role="tab"`, `aria-selected`
- **Vị trí file:** `MarkToMarketGrid.tsx:93-110`, `ForexClient.tsx:307-351`, `GoldPriceCard.tsx:138-151`.
- **Mức độ:** High
- **Phân tích kỹ thuật:** Các tab (ALL, STOCK, FUND, CASH) được dựng bằng thẻ `<button>` rời rạc trong `<div>`. Thiết bị trợ năng không nhận biết được đây là một cụm tab có quan hệ ràng buộc và không biết tab nào đang được kích hoạt.
- **Mã nguồn sau khi sửa:** Bổ sung `role="tablist"` cho thẻ cha, và `role="tab"`, `aria-selected={activeTab === tab}` cho từng nút tab.

---

#### [A11Y-07] Biến Động Giá Realtime & Kết Quả Tính Toán Thiếu `aria-live`
- **Vị trí file:** `ForexConverter.tsx:138-150`, `Watchlist.tsx:211`, `DashboardClient.tsx:490`.
- **Mức độ:** Medium
- **Phân tích kỹ thuật:** Khi người dùng đổi số tiền chuyển đổi trong `ForexConverter`, giá trị quy đổi thay đổi ngay lập tức nhưng người dùng khiếm thị không hề được thông báo.
- **Mã nguồn sau khi sửa:** Bọc vùng kết quả chuyển đổi trong `<div aria-live="polite" aria-atomic="true">`.

---

#### [A11Y-08] Hộp Thoại OnboardingWizard Thiếu Khai Báo Cột Mốc Dialog & Tên Tiếp Cận (Accessible Name)
- **Vị trí file:** `src/components/OnboardingWizard.tsx:121-125, 132`
- **Mức độ:** High
- **Phân tích kỹ thuật:** Container modal tại dòng 121-122 là một thẻ `<div>` thông thường, thiếu `role="dialog"` và `aria-modal="true"`. Đặc biệt, nếu chỉ khai báo `aria-labelledby="wizard-title"` trên container mà không gán `id="wizard-title"` vào thẻ tiêu đề `<h1>` (`OnboardingWizard.tsx:125`), công nghệ trợ năng (Screen Readers) sẽ gặp lỗi gãy liên kết ARIA và không thể giải quyết tên tiếp cận (Accessible Name) của hộp thoại khi người dùng khiếm thị điều hướng tới.
- **Mã nguồn sau khi sửa:**
  1. Thêm thuộc tính ARIA vào khung container modal (`OnboardingWizard.tsx:121-122`):
     ```tsx
     <div
       ref={wizardRef}
       role="dialog"
       aria-modal="true"
       aria-labelledby="wizard-title"
       className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/80"
     >
     ```
  2. Thêm tường minh `id="wizard-title"` vào thẻ `<h1>` tiêu đề (`OnboardingWizard.tsx:125`):
     ```tsx
     <h1 id="wizard-title" className="text-2xl font-bold text-white tracking-tight">
       {t.welcome}
     </h1>
     ```

---

### 6.4 Điều Hướng Bàn Phím & Quản Lý Tiêu Điểm (Keyboard & Focus)

#### [A11Y-09] Hàng Bảng Thụ Động Gắn `tabIndex={0}` Gây Bẫy Bàn Phím
- **Vị trí file:** `src/components/GroupedTransactionHistoryTable.tsx:128`
- **Mức độ:** High
- **Phân tích kỹ thuật:** Mỗi dòng `<tr>` trong bảng lịch sử giao dịch chứa `tabIndex={0}`. Do các dòng này hoàn toàn không có tương tác, người dùng bàn phím phải bấm phím `Tab` qua từng dòng một (10 dòng/trang) chỉ để đi qua bảng, tạo rào cản cực lớn khi điều hướng.
- **Mã nguồn sau khi sửa:** Xóa bỏ `tabIndex={0}` và `focus:bg-slate-800/40` khỏi thẻ `<tr>`.

---

#### [A11Y-10] Input Chọn File Ẩn Bằng `display: none` Làm Mất Tiêu Điểm Bàn Phím
- **Vị trí file:** `src/components/CsvUploaderServerImport.tsx:129-137`
- **Mức độ:** High
- **Phân tích kỹ thuật:** Thẻ `<input type="file" className="hidden" />` có thuộc tính `display: none`, khiến phím Tab bỏ qua nó hoàn toàn. Người dùng bàn phím không thể chọn file tải lên.
- **Mã nguồn sau khi sửa:** Đổi class input thành `sr-only` và bổ sung `focus-within:ring-2 focus-within:ring-blue-500` cho nhãn `<label>` bọc bên ngoài.

---

#### [A11Y-11] Triệt Tiêu Viền Focus (`outline-none`) Mà Không Bổ Sung Focus Ring
- **Vị trí file:** `AddTradeForm.tsx:104, 132`, `AddDepositForm.tsx:104, 115`, `FeeDebtCard.tsx:51`, `OpeningPositionCard.tsx:107`.
- **Mức độ:** High
- **Phân tích kỹ thuật:** Áp dụng class `outline-none` mà không có `focus-visible:ring-2` (vi phạm WCAG 2.4.7 Focus Visible). Người dùng di chuyển bằng phím Tab không thể biết con trỏ đang ở ô nhập liệu nào.
- **Mã nguồn sau khi sửa:** Bổ sung `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500` cho tất cả các input.

---

#### [A11Y-12] Ô Sửa Giá Bảng Holdings Thiếu Phím Tắt `Escape` Để Hủy
- **Vị trí file:** `src/components/MarkToMarketGrid.tsx:173-180`
- **Mức độ:** Medium
- **Phân tích kỹ thuật:** Khi mở ô sửa giá nhanh trong bảng, input chỉ lắng nghe phím `Enter` để lưu, không có handler cho phím `Escape`. Người dùng muốn hủy phải nhấn Tab qua các phần tử để tìm nút X.
- **Mã nguồn sau khi sửa:** Bổ sung `if (e.key === 'Escape') handleCancel();` vào sự kiện `onKeyDown`.

---

### 6.5 Độ Tương Phản Màu Sắc & Tiếp Cận Thị Giác (WCAG 2.1 AA)

#### [A11Y-13] Màu Chữ `text-slate-500` & `text-slate-600` Vi Phạm Tương Phản WCAG AA Toàn Diện
- **Vị trí file:** Toàn bộ form và bảng biểu trong dự án (`AddTradeForm.tsx`, `AddDepositForm.tsx`, `DashboardClient.tsx`, `StockNews.tsx`, `TaxSummaryCard.tsx`).
- **Mức độ:** High
- **Phép tính đo lường quang học:**
  - Nền tối `slate-950` (#020617, độ chói: 0.0021) và nền card `slate-900` (#0f172a, độ chói: 0.0081).
  - Màu chữ `text-slate-500` (#64748b, độ chói: 0.1722):
    - Tương phản trên `slate-950`: `(0.1722 + 0.05) / (0.0021 + 0.05) =` **4.27:1** (Thất bại chuẩn WCAG AA 4.5:1 cho chữ thường).
    - Tương phản trên `slate-900`: `(0.1722 + 0.05) / (0.0081 + 0.05) =` **3.82:1** (Thất bại nghiêm trọng).
  - Màu chữ `text-slate-600` (#475569, độ chói: 0.0652):
    - Tương phản trên `slate-950`: **2.21:1**; trên `slate-900`: **1.98:1** (Hầu như không thể đọc được với người suy giảm thị lực).
- **Đề xuất khắc phục:** Thay thế toàn bộ `text-slate-500` bằng `text-slate-400` (#94a3b8 -> tương phản **7.1:1** trên slate-900) hoặc `text-slate-300` (**11.4:1**).

---

#### [A11Y-14] Chữ Trắng Trên Lát Biểu Đồ Tròn Bị Cháy Sáng, Không Đạt Tương Phản
- **Vị trí file:** `src/components/AssetAllocationChart.tsx:76-78`
- **Mức độ:** High
- **Phân tích kỹ thuật:** Hàm `renderCustomLabel` vẽ chữ trắng `fill="white"` trực tiếp trên lát biểu đồ:
  - Lát Tiền mặt màu xanh lá sáng `#22C55E`: Tỷ lệ tương phản chỉ đạt **2.14:1**.
  - Lát Tiết kiệm màu vàng cam `#F59E0B`: Tỷ lệ tương phản chỉ đạt **2.18:1**.
  - *Lưu ý về phương án đổi sang chữ tối:* Nếu đổi chữ sang màu tối tĩnh (`#020617`), thì trên các lát màu tối như Slate (`#334155`), chữ tối lại thất bại chuẩn WCAG AA (đạt **4.24:1** < 4.5:1), đồng thời tạo ra đốm đen làm suy giảm tính thẩm mỹ trên nền dark mode.
- **Mã nguồn sau khi sửa (Giải pháp tối ưu cốt lõi):** Tắt hoàn toàn việc render chữ trực tiếp trên các lát SVG (`label={false}` trên `<Pie>`). Chuyển toàn bộ việc hiển thị nhãn danh mục, tỷ lệ phần trăm và giá trị sang cột chú thích bên ngoài (Accessible External Legend) đồng bộ với bảng mẫu màu (swatches), tên tài sản, phần trăm (%) và số dư tiền VND rõ ràng, đảm bảo tỷ lệ tương phản vượt trội (> 7:1) trên nền tối.

---

#### [A11Y-15] Biểu Đồ VN-INDEX Bị Ép Thành Đường Thẳng Do Chung Trục Với Tiền Tỷ
- **Vị trí file:** `src/components/NetWorthChart.tsx:236-238`
- **Mức độ:** High
- **Phân tích kỹ thuật:** Cả hai đường `portfolioValue` (tiền triệu/tỷ VND) và `vnindexValue` (khoảng 1.280 điểm) được vẽ trên một trục `<YAxis>` duy nhất không có `yAxisId`. Kết quả là đường VN-INDEX bị nén bẹp dí xuống đáy 0. Người dùng không thể so sánh tương quan hiệu quả đầu tư.
- **Mã nguồn sau khi sửa:** Cấu hình trục Y kép (`yAxisId="left"` cho VND và `yAxisId="right"` cho Index Points), hoặc chuẩn hóa cả hai đường về tỷ lệ phần trăm tăng trưởng `0% - 100%`.

---

#### [A11Y-16] Khai Báo `<html lang="en">` Dù Nội Dung Tiếng Việt, Thiếu Link Bỏ Qua Nội Dung & Đích Đến Anchor
- **Vị trí file:** `src/app/layout.tsx:76, 94-97`, `src/components/DashboardClient.tsx:167`, `src/components/AccountClient.tsx:196`, `src/app/forex/ForexClient.tsx:225`
- **Mức độ:** High
- **Phân tích kỹ thuật:**
  1. Thẻ gốc trong `src/app/layout.tsx:76` ghi `lang="en"`, khiến các công cụ đọc màn hình phát âm từ vựng tiếng Việt theo quy tắc ngữ âm tiếng Anh, tạo ra âm thanh vô nghĩa.
  2. Thiếu liên kết *"Skip to main content"* (WCAG 2.4.1 Bypass Blocks), buộc người dùng bàn phím phải tab qua toàn bộ thanh header trên từng trang.
  3. Đặc biệt, nếu chỉ thêm thẻ `<a href="#main-content">` trong `layout.tsx` mà không có bất kỳ thẻ `<main>` nào trên trang sở hữu thuộc tính `id="main-content"`, liên kết skip link sẽ là liên kết rỗng (dead anchor) không hoạt động.
- **Mã nguồn sau khi sửa:**
  1. Trong `src/app/layout.tsx:76, 94-97`: Đổi sang `<html lang="vi">` và thêm thẻ skip link ngay đầu thẻ `<body>`:
     ```tsx
     <a
       href="#main-content"
       className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-xl focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg focus:outline-none"
     >
       Chuyển đến nội dung chính
     </a>
     ```
  2. Thêm tường minh `id="main-content"` vào thẻ `<main>` tại tất cả các component route chính:
     - `src/components/DashboardClient.tsx:167`:
       ```tsx
       <main id="main-content" className="mx-auto flex w-[95%] max-w-[1680px] flex-col gap-6 py-6">
       ```
     - `src/components/AccountClient.tsx:196`:
       ```tsx
       <main id="main-content" className="mx-auto w-full max-w-[860px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
       ```
     - `src/app/forex/ForexClient.tsx:225`:
       ```tsx
       <main id="main-content" className="mx-auto flex w-[95%] max-w-[1280px] flex-col gap-6 py-6">
       ```

---

## 7. Dimension 5: Lỗi Hiển Thị (Visual Bugs & Rendering Flaws)

### 7.1 Lỗi Tràn Chiều Cao Khung Nhìn (Viewport Traps) & Va Chạm Xếp Lớp (Z-Index)

#### [VIS-01] Bẫy Màn Hình OnboardingWizard Làm Mất Nút Bấm Trên Màn Hình Nhỏ (Critical Defect)
- **Vị trí file:** `src/components/OnboardingWizard.tsx:121-137, 257-315`
- **Mức độ:** Critical
- **Phân tích kỹ thuật chuyên sâu:**
  - Dòng 121 khai báo: `<div ref={wizardRef} className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/80">` chứa container thẻ card `<div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">`.
  - Khung modal có `overflow-hidden` nhưng **hoàn toàn không có giới hạn `max-h`** và **không có `overflow-y-auto`**!
  - Khi người dùng tới Bước 3 và bấm "Nhập tay vị thế" (`showManualTrade = true`), form `AddTradeForm` được render vào body modal. Tổng chiều cao của modal lúc này lên tới **>800px** (Header 140px + Body 520px + Footer 90px + Spacing).
  - Trên bất kỳ thiết bị nào có chiều cao màn hình dưới 800px (iPhone SE, iPhone 12/13/14 mở trình duyệt kèm thanh URL bar, hoặc BẤT KỲ điện thoại/máy tính bảng nào xoay ngang landscape có chiều cao 375px–500px), phần chân modal (Footer) chứa các nút "Tiếp tục", "Bắt đầu sử dụng", "Quay lại" bị tràn hoàn toàn xuống dưới mép màn hình. Do không có cuộn, người dùng bị kẹt vĩnh viễn trong modal, không thể hoàn tất hoặc thoát khỏi onboarding!
- **Mã nguồn trước khi sửa:**
  ```tsx
  // src/components/OnboardingWizard.tsx:121
  <div ref={wizardRef} className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/80">
    <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
  ```
- **Mã nguồn sau khi sửa:**
  ```tsx
  // src/components/OnboardingWizard.tsx:121
  <div ref={wizardRef} className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-md bg-slate-950/80 overflow-y-auto">
    <div className="w-full max-w-2xl max-h-[calc(100vh-2rem)] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
      <div className="p-6 sm:p-8 pb-4 sm:pb-6 border-b border-slate-800 bg-gradient-to-b from-slate-800/50 shrink-0">...</div>
      <div className="p-6 sm:p-8 bg-slate-900 flex-1 overflow-y-auto min-h-0">...</div>
      <div className="p-4 sm:p-6 bg-slate-950 border-t border-slate-800 flex justify-between items-center shrink-0">...</div>
    </div>
  </div>
  ```

---

#### [VIS-02] `OpeningPositionCard` Vỡ Layout 3 Cột Khi Nằm Trong Cột Sidebar
- **Vị trí file:** `src/components/OpeningPositionCard.tsx:102`
- **Mức độ:** High
- **Phân tích kỹ thuật:**
  - Dòng 102 chia lưới: `<div key={index} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-3 md:grid-cols-3">`.
  - Trên màn hình máy tính (>=1024px), sidebar chỉ rộng ~380px. Tuy nhiên, vì viewport >768px (`md`), class `md:grid-cols-3` được kích hoạt!
  - Trong sidebar 380px, trừ đi padding chỉ còn **316px**. Chia cho 3 cột, mỗi ô input chỉ rộng **73px**. Ô nhập giá có placeholder "Giá vốn bình quân" (18 ký tự) bị cắt cụt ngủn thành "Giá vốn b...", khiến người dùng không thể nhìn thấy chữ số vừa nhập.
- **Mã nguồn sau khi sửa:** Bỏ `md:grid-cols-3`. Tổ chức 2 ô Ticker và Số lượng trên 1 hàng 2 cột, và chuyển ô Giá vốn xuống hàng riêng full-width.

---

#### [VIS-03] Banner Demo Khai Báo `z-50` Nhưng Vô Tác Dụng Do Thiếu Context Định Vị
- **Vị trí file:** `src/components/DashboardClient.tsx:158`
- **Mức độ:** Low
- **Phân tích kỹ thuật:** Dòng 158 khai báo `<div className="... z-50">`. Theo chuẩn CSS 2.1, thuộc tính `z-index` hoàn toàn vô tác dụng trên các phần tử có `position: static`. Khi cuộn trang, các phần tử có `sticky top-0 z-10` phía dưới sẽ đè lên banner này.
- **Mã nguồn sau khi sửa:** Bổ sung class `relative` vào trước `z-50`.

---

#### [VIS-04] TooltipInfo Bị Cắt Cụt Mép Trái Màn Hình Trên Các Card Nằm Sát Viền
- **Vị trí file:** `src/components/TooltipInfo.tsx:14-19`
- **Mức độ:** Medium
- **Phân tích kỹ thuật:** Thẻ tooltip dùng `left-1/2 -translate-x-1/2` với độ rộng tối đa 18rem (288px). Khi đặt trong thẻ StatCard đầu tiên sát mép trái màn hình (cách mép 32px), nửa bên trái của tooltip (144px) bị đẩy lùi về tọa độ âm (`32px - 144px = -112px`), khiến toàn bộ nửa trái của đoạn văn bản giải nghĩa bị che khuất ngoài khung nhìn.
- **Mã nguồn sau khi sửa:** Bổ sung responsive alignment: `left-0 sm:left-1/2 -translate-x-2 sm:-translate-x-1/2`.

---

### 7.2 Lỗi Méo Khung Flexbox & Co Giãn Layout Không Kiểm Soát

#### [VIS-05] Thiếu `shrink-0` Làm Biến Dạng Icon Tròn Và Bẻ Gãy Chữ Số Tiền Tệ
- **Vị trí file:** `ReconciliationPanel.tsx:33`, `Watchlist.tsx:200`, `AccountClient.tsx:364`, `GroupedTransactionHistoryTable.tsx:132`.
- **Mức độ:** Medium
- **Phân tích kỹ thuật:** Trong CSS Flexbox, mặc định `flex-shrink` là `1`. Khi không gian hẹp, các icon avatar vuông 40x40px bị thuật toán flex nén thành hình bầu dục dọc méo mó. Tương tự, tại `ReconciliationPanel.tsx:33`, các con số tiền tệ dài bị ép ngắt đôi thành 2 dòng (ví dụ: `1.234.567.` ở dòng 1 và `890 ₫` ở dòng 2).
- **Mã nguồn sau khi sửa:** Thêm `shrink-0` cho icon và `shrink-0 whitespace-nowrap` cho các nhãn tiền tệ.

---

#### [VIS-06] HeroBanner Hiển Thị Độ Rộng Thẻ Lồi Lõm Không Đều Nhau
- **Vị trí file:** `src/components/HeroBanner.tsx:196-226`
- **Mức độ:** Low
- **Phân tích kỹ thuật:** Trên màn hình lớn, dòng 196 khai báo `xl:flex xl:gap-3`, nhưng các thẻ `<article>` bên trong không có `flex-1`. Các thẻ tự co giãn theo độ dài tên thị trường, tạo nên hàng thẻ so le méo mó.
- **Mã nguồn sau khi sửa:** Thêm class `xl:flex-1` vào mỗi thẻ card.

---

#### [VIS-07] Tràn Chuỗi Ngày Tháng Trong Ô Cột Hẹp Của `CashLedgerStatusCard`
- **Vị trí file:** `src/components/CashLedgerStatusCard.tsx:55-60`
- **Mức độ:** Low
- **Lưu ý mã nguồn thừa (Dead Code Priority):** `CashLedgerStatusCard.tsx` là component mồ côi đã nằm trong danh sách xóa bỏ triệt để theo mục `[CODE-01]` (Phase 1). Giải pháp tiên quyết và ưu tiên số 1 là **xóa file này khỏi dự án**, giúp tự động đóng vấn đề mà không tốn tài nguyên sprint. Đề xuất sửa mã bên dưới chỉ áp dụng nếu đội ngũ quyết định tái sử dụng (resurrect) component này trong tương lai.
- **Phân tích kỹ thuật:** Chuỗi khoảng ngày như `01/01/2026 - 31/12/2026` dài 23 ký tự đặt trong cột rộng 140px bị tràn ra khỏi khung viền.
- **Mã nguồn sau khi sửa (Nếu tái sử dụng):** Bổ sung class `truncate` kèm thuộc tính `title`.

---

### 7.3 Rò Rỉ Tài Nguyên Canvas & Thiếu Đồng Bộ Đa Ngôn Ngữ

#### [VIS-08] Rò Rỉ Bộ Nhớ Do Không Hủy `ResizeObserver` Trong `PortfolioChart`
- **Vị trí file:** `src/components/PortfolioChart.tsx:65, 96-98`
- **Mức độ:** High
- **Lưu ý mã nguồn thừa (Dead Code Priority):** `PortfolioChart.tsx` là component canvas cũ đã bị thay thế hoàn toàn bởi `NetWorthChart.tsx` và nằm trong danh sách 5 component dead code cần xóa bỏ theo `[CODE-01]` (Phase 1). Giải pháp tiên quyết và ưu tiên số 1 là **xóa bỏ file này khỏi repository**, giúp giải phóng bundle và tự động triệt tiêu nguy cơ rò rỉ bộ nhớ. Bản vá bổ sung `observer.disconnect()` dưới đây chỉ cần thiết nếu đội ngũ quyết định phục hồi (resurrect) component này.
- **Phân tích kỹ thuật:**
  ```tsx
  // src/components/PortfolioChart.tsx:65, 96-98
  const observer = new ResizeObserver(handleResize);
  observer.observe(chartContainerRef.current);
  ...
  return () => {
    if (chart) chart.remove();
  };
  ```
  Trong hàm cleanup của `useEffect`, lập trình viên gọi `chart.remove()` nhưng quên không gọi `observer.disconnect()`. Observer này tồn tại mãi trong bộ nhớ, tiếp tục lắng nghe và cố gọi hàm trên đối tượng canvas đã bị hủy, gây leak bộ nhớ ứng dụng.
- **Mã nguồn sau khi sửa (Nếu tái sử dụng):** Bổ sung `observer.disconnect()` vào cleanup function.

---

#### [VIS-09] Chuỗi Thời Gian Trong WorldNews Bị Gán Cứng Tiếng Anh
- **Vị trí file:** `src/components/WorldNews.tsx:34-43`
- **Mức độ:** Low
- **Phân tích kỹ thuật:** Hàm `formatTime` nhận `language: DashboardLanguage`, nhưng lại return cứng `"15m ago"`, `"2h ago"`, và `"Yesterday"`. Khi người dùng bật tiếng Việt, tin tức thế giới vẫn hiển thị thời gian tiếng Anh.
- **Mã nguồn sau khi sửa:** Bản địa hóa chuỗi thời gian dựa theo biến `language` (`"15 phút trước"`, `"2 giờ trước"`, `"Hôm qua"`).

---

### 7.4 Lỗi Vùng An Toàn Di Động (Safe Area Notches) & CSS Dư Thừa

#### [VIS-10] Bật `viewportFit: cover` Nhưng Thiếu Khai Báo Biến CSS Safe Area Insets
- **Vị trí file:** `src/app/layout.tsx:66`, `src/app/globals.css:9-11`
- **Mức độ:** Medium
- **Phân tích kỹ thuật:** Trong `layout.tsx:66`, ứng dụng khai báo `viewportFit: 'cover'`, cho phép web vẽ tràn màn hình ra sát mép tai thỏ và thanh gạt Home của iPhone. Tuy nhiên, trong `globals.css` không hề có các biến `env(safe-area-inset-*)`. Kết quả là banner cảnh báo bị tai thỏ che khuất, và các nút bấm dưới đáy màn hình bị thanh gạt Home đè lên.
- **Mã nguồn sau khi sửa:** Thêm `padding-top: env(safe-area-inset-top, 0px)` và `padding-bottom: env(safe-area-inset-bottom, 0px)` vào thẻ `body` trong `globals.css`.

---

#### [VIS-11] Thông Báo Reconciliation Thiếu Thuộc Tính Bẻ Dòng Từ Ngữ Dài
- **Vị trí file:** `src/components/ReconciliationPanel.tsx:123`
- **Mức độ:** Low
- **Phân tích kỹ thuật:** Khi danh sách mã chứng khoán bị âm kéo dài, chuỗi thông báo được đưa vào thẻ `<span>` mà không có `break-words`, gây tràn vỡ container trên điện thoại.
- **Mã nguồn sau khi sửa:** Đổi thành `<span className="break-words leading-relaxed">{message}</span>`.

---

#### [VIS-12] Sao Chép Trùng Lặp 22 Dòng CSS Tùy Biến Thanh Cuộn Trong `globals.css`
- **Vị trí file:** `src/app/globals.css:13-34, 36-57`
- **Mức độ:** Low
- **Phân tích kỹ thuật:** Toàn bộ 22 dòng CSS định nghĩa thanh cuộn cho bộ chọn `*` (áp dụng cho mọi phần tử) bị copy lại 100% xuống phía dưới cho class `.custom-scrollbar`.
- **Mã nguồn sau khi sửa:** Xóa bỏ đoạn mã thừa từ dòng 36 đến dòng 57 trong `globals.css`.

---

## 8. Kế Hoạch Hành Động & Lộ Trình Khắc Phục (Action Plan & Roadmap)

### Phase 1: Quick Wins - Khắc Phục Khẩn Cấp (Sprint 1: 1 - 2 Ngày)
*Mục tiêu: Xóa bỏ hoàn toàn các lỗi blocker làm nghẽn luồng người dùng, vá rò rỉ bộ nhớ và dọn dẹp mã nguồn thừa.*
1. **Khắc phục bẫy modal Onboarding [VIS-01]:** Thêm `max-h-[calc(100vh-2rem)]` và `overflow-y-auto` vào `OnboardingWizard.tsx`.
2. **Khắc phục nuốt lỗi Server Fetch [UX-03]:** Bổ sung cờ `hasServerError` trong `src/app/page.tsx` để ngăn chặn việc hiển thị giao diện rỗng khi backend gặp sự cố.
3. **Di dời hàm tiện ích `cn()` [CODE-02]:** Tạo `src/lib/utils.ts` chứa `cn()` và cập nhật lại 5 file đang import chéo từ `MarkToMarketGrid.tsx`.
4. **Xóa bỏ 5 file Dead Code [CODE-01]:** Xóa `CashLedgerStatusCard.tsx`, `ErrorDisplay.tsx`, `MarketOverview.tsx`, `PortfolioChart.tsx`, `TransactionHistoryTable.tsx` (loại bỏ 747 dòng code thừa, tự động đóng các vấn đề `VIS-07` và `VIS-08`).
5. **Gỡ bỏ bẫy bàn phím trên bảng lịch sử giao dịch [A11Y-09]:** Xóa `tabIndex={0}` khỏi các hàng `<tr>` trong `GroupedTransactionHistoryTable.tsx`.
6. **Sửa lỗi phím bấm giả mạo [A11Y-02]:** Gỡ bỏ `role="button"` khỏi thẻ `<article>` trong `HeroBanner.tsx`.
7. **Sửa lỗi khóa LocalStorage [CODE-05]:** Đồng bộ khóa `portfolio-dashboard-language` vào `reset-password/page.tsx:50`.
8. **Dọn sạch CSS scrollbar trùng lặp [VIS-12]:** Xóa dòng 36-57 trong `globals.css`.

---

### Phase 2: Gia Cố Responsive & Hoàn Thiện Tiếp Cận (Sprint 2: 3 - 5 Ngày)
*Mục tiêu: Đảm bảo giao diện phản hồi mượt mà trên 100% thiết bị từ 360px đến 1920px và đạt chuẩn tiếp cận WCAG 2.1 AA.*
1. **Tối ưu lưới StatCards [RESP-01]:** Đổi `xl:grid-cols-6` thành `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6`, áp dụng thang font responsive (`text-2xl sm:text-3xl lg:text-2xl xl:text-2xl 2xl:text-3xl`) và `truncate` trong `DashboardClient.tsx`.
2. **Đồng bộ hóa Skeleton Loading triệt tiêu CLS [UX-06]:** Cấu hình lại kích thước khung chứa trong `DashboardClient.tsx` (1680px kèm grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6` khớp hoàn hảo với component mounted) và `account/loading.tsx` (860px).
3. **Tạo mới `src/app/forex/loading.tsx` [UX-07]:** Cung cấp loading skeleton cho trang tỷ giá.
4. **Sửa lỗi padding tablet trang Account [RESP-05]:** Thay `sm:px-0` bằng `sm:px-6 lg:px-8` trong `AccountClient.tsx`.
5. **Sửa lỗi vỡ biểu đồ phân bổ tài sản [RESP-02]:** Chuyển flex ngang thành flex cột trên di động cho `AssetAllocationChart.tsx`.
6. **Mở rộng vùng chạm tối thiểu 44px [RESP-09]:** Tăng kích thước các nút icon đạt chuẩn WCAG 2.5.5 trên toàn hệ thống.
7. **Hiển thị nút thao tác trên màn hình cảm ứng [RESP-10]:** Gỡ bỏ `opacity-0` cứng trên thiết bị di động trong `MarkToMarketGrid.tsx` và `Watchlist.tsx`.
8. **Chuẩn hóa cỡ chữ input >=16px [RESP-11]:** Ngăn chặn lỗi auto-zoom khó chịu của iOS Safari.
9. **Chuẩn hóa tương phản màu chữ xám [A11Y-13]:** Nâng cấp toàn bộ `text-slate-500/600` lên `text-slate-400/300`.
10. **Bổ sung thẻ `<form>` [UX-11]:** Bọc toàn bộ các form nhập liệu trong thẻ `<form>` để phục hồi chức năng gửi bằng phím `Enter`.

---

### Phase 3: Chiến Lược Chuẩn Hóa Design System & Thư Viện UI (Sprint 3: 1 - 2 Tuần)
*Mục tiêu: Xây dựng nền tảng Design System bài bản, ngăn chặn hoàn toàn nợ kỹ thuật giao diện.*
1. **Thiết lập Semantic Tokens trong `tailwind.config.ts` [FIND-1.1]:**
   - Kích hoạt `darkMode: 'class'`.
   - Ánh xạ các biến màu CSS (`background`, `foreground`, `card`, `primary`, `danger`, `muted`).
2. **Xây dựng Thư Viện UI Primitives Dùng Chung (`src/components/ui/`):**
   - `Button.tsx`: Chuẩn hóa các biến thể nút bấm và trạng thái loading spinner.
   - `Input.tsx`: Chuẩn hóa viền focus (`focus-visible:ring-2`) và kích thước font responsive.
   - `Badge.tsx`: Chuẩn hóa các huy hiệu trạng thái lãi lỗ, mua bán.
   - `Card.tsx`: Chuẩn hóa bo góc `rounded-2xl`, viền và padding.
3. **Trích xuất Component Tái Sử Dụng:**
   - `LanguageSwitcher.tsx`: Thay thế 4 đoạn mã copy-paste hiện tại.
   - `src/lib/formatters.ts`: Tập trung hóa toàn bộ logic định dạng tiền tệ và tỷ lệ phần trăm.
4. **Tích hợp ARIA & Live Regions Toàn Diện:**
   - Bổ sung `role="tablist"` cho toàn bộ cụm tab.
   - Thiết lập `aria-live` cho các vùng biến động số liệu realtime.
   - Tạo liên kết *"Skip to main content"* trong `src/app/layout.tsx`.

---

## 9. Bộ Lệnh Kiểm Tra Tự Động & Bảng Kiểm Định Kỳ (Verification & QA Checklist)

### 9.1 Bộ Lệnh Kiểm Tra Mã Nguồn (Verification Commands)

Sau khi thực hiện các sửa đổi mã nguồn, kỹ sư bắt buộc phải chạy chuỗi lệnh kiểm tra nghiêm ngặt sau:

```bash
# 1. Kiểm tra toàn vẹn kiểu dữ liệu TypeScript (Đảm bảo không phát sinh lỗi Type do gỡ Dead Code hoặc đổi Props)
pnpm tsc --noEmit

# 2. Kiểm tra Linting và quy chuẩn Accessibility với eslint-plugin-jsx-a11y
pnpm lint

# 3. Kiểm tra đóng gói ứng dụng Production (Đảm bảo CSS không lỗi và Tree Shaking tối ưu)
pnpm build

# 4. Chạy toàn bộ Unit & Integration Test hiện có
pnpm test
```

### 9.2 Bảng Kiểm Định Kỳ Cho Từng Thiết Bị (Device & Viewport Checklist)

| Thiết Bị Kiểm Thử | Độ Phân Giải Viewport | Mục Tiêu Kiểm Tra Trọng Yếu | Tiêu Chí Đạt (Pass Criteria) |
|---|:---:|---|---|
| **iPhone SE (3rd Gen)** | 375 x 667 px | Mở `OnboardingWizard`, chọn nhập tay vị thế | Footer nút Tiếp tục hiển thị đầy đủ, cuộn mượt mà, không bị kẹt |
| **iPhone 14 / 15 Pro** | 393 x 852 px | Chạm vào các ô input trong `AddTradeForm` | Trình duyệt Safari không bị tự động phóng to (auto-zoom) |
| **iPad Mini (Portrait)** | 768 x 1024 px | Truy cập trang `/account` | Các card cách mép màn hình tối thiểu 24px, không dính sát viền |
| **Desktop 13-inch (HD)** | 1280 x 800 px | Xem 6 thẻ StatCard trên Dashboard | Chữ tiền tệ VND không tràn viền, không đè lên card bên cạnh |
| **Desktop 24-inch (FHD)**| 1920 x 1080 px| Tải lại trang Dashboard (F5) | Không có hiện tượng giật giãy chiều rộng từ 1280px sang 1680px (CLS < 0.1) |
| **Duyệt Bằng Bàn Phím** | Bất kỳ | Nhấn phím `Tab` xuyên suốt Dashboard | Vòng focus hiển thị rõ ràng trên mọi input, không bị kẹt ở hàng bảng |
| **Chế Độ Ngắt Mạng** | Bất kỳ | Tắt kết nối WiFi / Dừng SSE stream | Dashboard hiển thị banner cảnh báo mất kết nối trực tiếp |

---
*Báo cáo được hoàn thành và phê duyệt bởi UI Review Report Synthesizer Worker vào ngày 2026-09-04.*
