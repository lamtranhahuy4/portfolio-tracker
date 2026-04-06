# ADR 0001: Decimal Strategy cho Financial Engine

## Bối cảnh (Context)
Javascript và Typescript mặc định lưu trữ mọi số liệu ở định dạng Floating-Point (chuẩn IEEE 754). Việc này gây ra rủi ro sai số cực kỳ nguy hiểm trong các bài toán tài chính, ví dụ như `0.1 + 0.2 = 0.30000000000000004`. 
Core Engine quản lý danh mục đầu tư (Portfolio Engine) thường xuyên phải thực hiện các phép cộng tích lũy (Cumulative), nhân đơn giá với khối lượng (Quantity * Price), tính toán phần trăm lãi/lỗ và đối chiếu với ngân hàng (Reconciliation). Việc sử dụng thẳng kiểu `number` gốc của Typescript là không an toàn.

## Các lựa chọn (Options)
1. **Dùng chuẩn Integer (Minor-unit format)**: Nhân tất cả tiền tệ cho 100 hoặc 1000 (VND, USD), lưu dạng số nguyên, chia lại khi hiển thị.
2. **Dùng thư viện BigInt**: Hỗ trợ có sẵn từ JS/TS. Nhược điểm: Không hỗ trợ phép chia lẻ hoặc các số mũ fractional một cách tự nhiên.
3. **Thư viện Number Custom (`decimal.js`)**: Nhẹ, cực mạnh, hỗ trợ hoàn hảo số lượng tuỳ ý, round modes chuẩn ISO. Thư viện này có đầy đủ các phép toán phức tạp như hàm mũ, logarit, cực kỳ phù hợp đễ biểu diễn phần trăm tăng trưởng hoặc lợi suất liên tục.
4. **Thư viện `big.js`**: Siêu nhẹ, phiên bản cut-down của `decimal.js`.

## Quyết định (Decision)
Dự án quyết định sử dụng **`decimal.js`** làm xương sống cho toàn bộ các phép tính toán nghiệp vụ tài chính.

Về cách áp dụng:
- Tại lõi **Domain Component (Engine)**: Tiền, Tỷ suất, Số lượng đều được parse sang `Decimal` trước khi tính. Hệ thống engine nội bộ chỉ "giao tiếp" với `Decimal`.
- Tại **Infra/DB Layer**: Lưu dưới dạng String (vd: Numeric column của Postgres).
- Tại **UI Boundary**: Trước khi gửi xuống giao diện frontend (React Props), kết quả Decimal sẽ được `.toNumber()` hoặc `.toString()` để giao diện chỉ phải format chuỗi.

## Tác động (Consequences)
- Lợi ích: Yên tâm 100% trong tất cả phép tính cộng, nhân, chia tỉ rẽ, thuế phí, xử lý FIFO. Codebiz (Logic) đáng tin cậy.
- Rủi ro nhỏ: Cần ép kiểu rõ ràng tại Controller (`toDecimal()`).
- Payload Serialization: Cần chú ý khi truyền qua ranh giới Client/Server Components trong NextJS, mọi object kiểu `Decimal` sẽ bị Next.js cảnh báo nếu không deserialize sang String trước.

## Triển khai (Implementation)

### Cấu trúc Files

```
src/
├── domain/portfolio/
│   ├── decimal.ts         # Core Decimal helpers (toDecimal, decimalSum, etc.)
│   ├── primitives.ts      # Boundary functions (toMoney, toQuantity, toPrice)
│   └── portfolioMetrics.ts # Engine - sử dụng Decimal nội bộ
├── lib/parsers/
│   └── BaseParser.ts      # Parser helpers với parseNumberToDecimal()
├── db/
│   └── index.ts           # Database serialization helpers
```

### Các hàm chính

1. **`parseNumberToDecimal(value)`** - Parse string sang Decimal để tránh mất precision
2. **`toMoney()`, `toQuantity()`, `toPrice()`** - Boundary functions chuyển Decimal sang number cho UI
3. **`toDbDecimal()`, `fromDbDecimal()`** - Helpers cho database serialization

### Ví dụ sử dụng

```typescript
// Parser - tránh mất precision ngay từ đầu
const price = parseNumberToDecimal('35000.123456');
const quantity = parseNumberToDecimal('100');
const total = price.times(quantity); // 3500012.3456 (không có lỗi floating point)

// Engine - tính toán với Decimal
const costBasis = quantity.times(averageCost);
const profit = sellPrice.times(quantity).minus(costBasis);

// Boundary - chuyển sang number cho UI
const uiValue = toMoney(profit);

// Database - lưu dưới dạng string
const dbValue = toDbDecimal(profit); // "500.12"
```

## Trạng thái (Status)
**Implemented** - Đã hoàn thành migration Decimal.js vào:
- [x] BaseParser với `parseNumberToDecimal()`
- [x] DnseTradeParser sử dụng Decimal cho tính toán
- [x] DnseCashParser sử dụng Decimal cho tính toán
- [x] primitives.ts với documentation
- [x] Database helpers trong `db/index.ts`
- [x] Edge case tests cho floating point precision
