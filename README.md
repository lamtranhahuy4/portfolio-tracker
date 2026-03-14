# 📈 Ứng dụng Quản lý Danh mục Đầu tư (Portfolio Tracker)

## 📌 Giới thiệu

**Portfolio Tracker** là một ứng dụng Dashboard web trực quan được xây dựng hoàn toàn bằng **Python Streamlit**. Ứng dụng này giải quyết bài toán quản lý danh mục đa tài sản (Cổ phiếu, Tiền mặt, Crypto, Chứng chỉ quỹ, Bất động sản...) của các nhà đầu tư cá nhân. 

Thay vì phải duy trì các file Excel cồng kềnh với hàng chục tab và công thức phức tạp, hệ thống sẽ tự động tính toán Bình quân giá vốn (Average Cost), quản lý Dư nợ Tiền mặt (CASH Flow), định giá lại theo Giá thị trường (Mark-to-Market) bằng cơ chế cập nhật Real-time và đo lường % sinh lời (ROI) nhanh chóng.

---

## 💾 Cấu trúc dữ liệu (Data Schema)

Ứng dụng vận hành dựa trên cơ chế Lưu trữ State (Session State) truyền thẳng vào 2 DataFrame lõi của Pandas. Các DataFrame này được Backup tự động vào thư mục `/data/` dưới định dạng CSV (Data Persistence).

### 1. Bảng Lịch sử Giao dịch (`transactions_df`)
Lưu trữ mọi hoạt động mua bán, nạp rút tĩnh.
* `Date` (datetime): Ngày thực hiện giao dịch.
* `Asset_Class` (string): Lớp tài sản phân loại (Cổ phiếu, Crypto, Tiền mặt...).
* `Ticker` (string): Mã giao dịch của tài sản (VD: FPT, HPG, CASH...).
* `Type` (string): Phân loại luồng tiền (BUY / SELL / DEPOSIT / WITHDRAW / DIVIDEND).
* `Quantity` (float): Số lượng tài sản giao dịch.
* `Price` (float): Giá khớp / Số tiền thao tác.
* `Total_Value` (float): Tổng giá trị lệnh (Quantity * Price), riêng nạp/rút bằng chính Price.

### 2. Bảng Danh mục Hiện tại (`holdings_df`)
Bản tổng hợp Real-time số lượng và giá trị hiện có (Dynamic).
* `Asset_Class` (string): Kế thừa từ `transactions` để vẽ biểu đồ cơ cấu tài sản.
* `Ticker` (string): Mã tài sản (Unique key).
* `Total_Shares` (float): Số dư hiện tại cầm nắm (Balance).
* `Average_Cost` (float): Giá vốn trung bình được tính bằng phương pháp Bình quân gia quyền.
* `Current_Price` (float): Mức giá thị trường (Mark-to-Market), cho phép Data Editor can thiệp chỉnh sửa thủ công.
* `Market_Value` (float): Giá trị thị trường hiện hành của tài sản (Total_Shares * Current_Price).

---

## 🧠 Luồng Logic cốt lõi (Core Logic)

Logic tài chính của ứng dụng được xử lý chủ yếu thông qua hàm `update_holdings()` và tính năng Data Editor.

### 1. Thuật toán Bình quân Giá vốn (Average Costing)
Duyệt từ trên xuống (Top-down) tất cả các dòng trong `transactions_df`:
* Nếu là lệnh **BUY**: Tính Giá trung bình mới tiếp nối. 
  * *Công thức*: `[(Cổ phiếu cũ * Giá vốn cũ) + (Số lượng mua mới * Giá mua)] / Tổng cổ phiếu mới`.
* Nếu là lệnh **SELL**: Trừ đi khối lượng cổ phiếu `Total_Shares`. Mức `Average_Cost` được GIỮ NGUYÊN (Không ảnh hưởng giá vốn).
* Nếu Mua thêm sau khi Bán sạch: Bắt đầu tính giá vốn lại từ đầu.

### 2. Quản lý Dư nợ Tiền mặt (CASH Management)
Tiền mặt là một Ticker đặc biệt (`Ticker: CASH`) không có lệnh BUY/SELL trực tiếp trong sổ Giao dịch. 
Nó được nội suy tự động vào `holdings_df` thông qua:
* **Cộng tiền (Tăng CASH):** Khi có lệnh `DEPOSIT` (Nạp), `DIVIDEND` (Cổ tức), hoặc `SELL` (Bán tài sản lấy tiền).
* **Trừ tiền (Giảm CASH):** Khi có lệnh `WITHDRAW` (Rút) hoặc `BUY` (Mua tài sản mất tiền).
* `Average_Cost` và `Current_Price` của CASH mặc định bị khóa cứng ở mức `1.0`.

### 3. Cập nhật Giá thị trường (Mark-to-Market)
Phần **Bảng Danh mục Hiện tại** sử dụng tính năng **Inline-Editor** (`st.data_editor`). 
* **Nhớ Giá (Memory Mechanism):** Khối `update_holdings()` luôn trích xuất một từ điển các Giá Thị Trường cũ (`old_prices`) trước khi tổng hợp giao dịch mới, nhờ đó việc mua mã mới sẽ không làm các mã cũ bị reset Giá thị trường về giá vốn mặc định.
* **Cập nhật Live:** Bắt sự kiện người dùng bấm đúp sửa số (`Current_Price`) -> So sánh thay đổi `.equals()` -> Nhân thẳng ra `Market_Value` -> Rerun trang để đẩy dữ liệu lên `Account Summary` ở phía trên. Vận hành theo luồng Thác đổ chuẩn.

---

## ✨ Các tính năng hiện có

1. **Thêm Giao dịch Thủ công:** Nút Form điền tay đầy đủ tham số và Validations.
2. **Nhập liệu Hàng loạt (Bulk Import):** Hỗ trợ kéo thả file `.csv` và `.xlsx`. Có nút bấm Xác nhận chặn cửa (Anti-Double Import).
3. **Cơ sở dữ liệu Vĩnh viễn (Data Persistence):** Hệ thống Memory độc lập ghi đè vào thư mục `/data/`. Mở lại trang web vẫn nguyên vẹn tài sản. Có nút Xóa sổ Data.
4. **Bảng Điều khiển Tổng (Account Summary):** Tính Lãi/Lỗ ròng, Tổng Tài Sản, Tổng Vốn Nạp và Sinh lời (ROI%).
5. **Data Editor Thông minh:** Chỉnh sửa giá thủ công nhảy số cực nhạy, có Check condition bảo vệ dòng "CASH".
6. **Biểu đồ Donut Đa dạng:** Trực quan phân bổ tiền theo từng lớp tài sản trên Plotly.

---

## 🚀 Hướng dẫn Cài đặt & Khởi động

### Yêu cầu Nền tảng
Dự án được viết trên Python 3.8+.

### Bước 1: Cài đặt thư viện (Dependencies)
```bash
pip install streamlit pandas numpy plotly openpyxl
```
*(Lưu ý: Thư viện `openpyxl` là engine bắt buộc để Pandas có khả năng đọc được định dạng file Excel `.xlsx` khi sử dụng tính năng Bulk Import)*

### Bước 2: Chạy ứng dụng Web
Mở Terminal / Command Prompt tại thư mục dự án (chứa file `app.py`) và thực thi lệnh sau:
```bash
streamlit run app.py
```
Ứng dụng sẽ tự động khởi chạy và mở trên trình duyệt tại địa chỉ mặc định `http://localhost:8502`.
