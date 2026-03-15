# 📈 Ứng dụng Quản lý Danh mục Đầu tư (Portfolio Tracker)

## 📌 Giới thiệu

**Portfolio Tracker** là một ứng dụng Dashboard web trực quan được xây dựng hoàn toàn bằng **Python Streamlit**. Ứng dụng này giải quyết bài toán quản lý danh mục đa tài sản (Cổ phiếu, Tiền mặt, Crypto, Chứng chỉ quỹ, Tiết kiệm, Bất động sản...) của các nhà đầu tư cá nhân. 

Hệ thống tự động tính toán Bình quân giá vốn (Average Cost), quản lý Dư nợ Tiền mặt (CASH Flow), định giá lại theo Giá thị trường (Mark-to-Market), xử lý Lãi dồn tích cho Tiết kiệm (Accrued Interest) và trực quan hóa Dòng vốn đầu tư cá nhân bằng biểu đồ bậc thang tuyệt đẹp.

---

## ✨ Các tính năng nổi bật

1. **Quản lý Đa Tài sản Thông minh**: Hỗ trợ đa lớp tài sản. Đặc biệt, phân hệ **Tiết kiệm** sở hữu logic riêng tính `Lãi dồn tích (Accrued Interest)` tự động theo số ngày nắm giữ (days_elapsed) mà không bị ảnh hưởng bởi công thức bình quân giá vốn của Cổ phiếu.
2. **Biểu đồ Dòng Vốn Tích lũy (Step-line Area Chart)**: Trực quan hóa quá trình nạp/rút vốn ròng theo thời gian thực thành một dải diện tích bậc thang (Step Line `hv`) xanh lục bắt mắt. Biểu đồ đi kèm thuật toán "Mỏ neo thời gian" đảm bảo hiển thị hoàn hảo đường kẻ ngang tới hiện tại kể cả khi chỉ có 1 điểm giao dịch nạp vốn duy nhất.
3. **Data Editor Thông minh / Mark-to-Market**: Bảng danh mục tích hợp Inline-Editor cho phép thay đổi "Live" giá thị trường của tài sản. Cơ chế "Nhớ Giá" (Memory) ngăn chặn việc reset giá khi có giao dịch mới. Tại đây, lớp `CASH` và `Tiết kiệm` được hệ thống viết filter chặn ghi đè để bảo vệ tính toán sinh lời tự động của hệ thống.
4. **Nhập liệu Hàng loạt (Bulk Import)**: Hỗ trợ nạp file `.csv` và `.xlsx` với Nút "Xác nhận" giúp xử lý triệt để căn bệnh Double-Import của Streamlit form.
5. **Cơ sở dữ liệu Vĩnh viễn (Data Persistence)**: Các file hệ thống được sao lưu lập tức vào phân vùng `/data/`. Mở lại trình duyệt khối tài sản vẫn y nguyên.
6. **Bảng Điều khiển Tổng (Account Summary)**: Tính toán Lãi/Lỗ ròng, Tổng Tài Sản, Tổng Vốn Nạp và Sinh lời (ROI%). Đi kèm là Biểu đồ Donut vẽ cơ cấu danh mục phân bổ rủi ro.

---

## 💾 Cấu trúc dữ liệu (Data Schema)

Ứng dụng vận hành dựa trên cơ chế Session State truyền vào Pandas DataFrame.

### 1. Bảng Lịch sử Giao dịch (`transactions_df`)
* `Date`: Ngày thực hiện giao dịch.
* `Asset_Class`: Lớp tài sản phân loại (Cổ phiếu, Tiết kiệm, Tiền mặt...).
* `Ticker`: Mã giao dịch của tài sản.
* `Type`: Phân loại luồng tiền (BUY / SELL / DEPOSIT / WITHDRAW / DIVIDEND).
* `Quantity` & `Price`: Khối lượng và Mức giá. (Đối với sổ Tiết kiệm, linh hoạt biến thành Số tiền gửi đôn lên `Total_Value`).
* `Interest_Rate`: Thuộc tính Lãi suất %/năm (Phục vụ độc quyền cho lớp Tiết kiệm).
* `Total_Value`: Số tiền luân chuyển thuần.

### 2. Bảng Danh mục Hiện tại (`holdings_df`)
* `Total_Shares`: Tổng số lượng dự trữ hoặc Số dư.
* `Average_Cost`: Mức giá vốn trung bình (Bình quân gia quyền) hoặc Mức gốc đầu tư (Tính cho Tiết kiệm).
* `Current_Price`: Giá thị trường Live đang giao dịch.
* `Market_Value`: Tổng định giá tài sản hiện tại. Nơi lưu trữ và phản ánh ngay khối tiền lãi mẹ đẻ lãi con của Tiết kiệm tính đến từng ngày.

---

## 🚀 Hướng dẫn Cài đặt & Khởi động

### Cài đặt thư viện (Dependencies)
```bash
pip install streamlit pandas numpy plotly openpyxl
```

### Chạy ứng dụng
Mở Terminal / Command Prompt tại thư mục dự án và thực thi lệnh sau:
```bash
streamlit run app.py
```
Mở trình duyệt tại `http://localhost:8502` để tận hưởng hệ thống Quản lý Tài chính Tuyệt đỉnh!
