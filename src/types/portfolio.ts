/**
 * Lớp tài sản cơ bản trong hệ thống
 */
export type AssetClass = 'STOCK' | 'CASH' | 'SAVING';

/**
 * Loại giao dịch xác định hành động đối với tài sản
 */
export type TransactionType = 
  | 'BUY' 
  | 'SELL' 
  | 'DEPOSIT' 
  | 'WITHDRAW' 
  | 'DIVIDEND' 
  | 'STOCK_DIVIDEND' 
  | 'INTEREST';

/**
 * Giao dịch gốc (Single Source of Truth)
 * Mọi trạng thái tài khoản đều được tính toán từ mảng các transaction này.
 */
export interface Transaction {
  /** Mã định danh duy nhất của giao dịch */
  id: string;
  /** Ngày giờ thực hiện giao dịch */
  date: Date;
  /** Phân loại tài sản (ví dụ: Cổ phiếu, Tiền mặt) */
  assetClass: AssetClass;
  /** Mã tài sản (vd: VND, HPG, FPT) */
  ticker: string;
  /** Loại giao dịch (Mua, Bán, Nạp, Rút...) */
  type: TransactionType;
  /** Khối lượng thẻ/cổ phiếu/tiền trong giao dịch */
  quantity: number;
  /** Giá trị trên một đơn vị khối lượng */
  price: number;
  /** Phí giao dịch (thuế, phí sàn...) */
  fee: number;
  /** Tổng giá trị của giao dịch = (quantity * price) + fee (đối với mua) hoặc - fee (đối với bán) */
  totalValue: number;
  /** Ghi chú người dùng tự nhập (không bắt buộc) */
  notes?: string;
}

/**
 * Thông tin tổng hợp về một tài sản đang nắm giữ.
 * LƯU Ý: Đây là kết quả được tính toán từ các Transaction, KHÔNG lưu trực tiếp vào CSDL.
 */
export interface Holding {
  /** Phân loại tài sản */
  assetClass: AssetClass;
  /** Mã tài sản */
  ticker: string;
  /** Tổng số lượng đang nắm giữ (đã trừ đi số lượng bán) */
  totalShares: number;
  /** Giá vốn trung bình (DCA) */
  averageCost: number;
  /** Giá thị trường hiện tại (lấy từ API hoặc tự cập nhật) */
  currentPrice: number;
  /** Tổng giá trị thị trường = totalShares * currentPrice */
  marketValue: number;
  /** Lợi nhuận đã chốt (từ các lệnh SELL) */
  realizedPnL: number;
  /** Lợi nhuận chưa chốt = marketValue - (totalShares * averageCost) */
  unrealizedPnL: number;
}
