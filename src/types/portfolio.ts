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
  tax: number;
  /** Tổng giá trị của giao dịch = (quantity * price) + fee (đối với mua) hoặc - fee (đối với bán) */
  totalValue: number;
  /** Ghi chú người dùng tự nhập (không bắt buộc) */
  notes?: string;
  source?: string;
}

export interface NormalizedTransaction extends Transaction {}

export interface ImportWarning {
  row: number;
  message: string;
  rawType?: string;
  rawTicker?: string;
  rawQuantity?: string;
  rawPrice?: string;
  rawDate?: string;
}

export interface ImportSummary {
  fileName: string;
  source: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
}

export interface ImportParseResult {
  transactions: NormalizedTransaction[];
  warnings: ImportWarning[];
  summary: ImportSummary;
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
  /** Giá vốn ròng trên mỗi cổ phiếu (gồm phí + thuế) */
  netAverageCost: number;
  /** Giá mua trung bình (chỉ tiền mua khớp lệnh) */
  grossAveragePrice: number;
  /** Giá thị trường hiện tại (lấy từ API hoặc tự cập nhật) */
  currentPrice: number;
  /** Tổng giá trị thị trường = totalShares * currentPrice */
  marketValue: number;
  /** Lợi nhuận đã chốt (từ các lệnh SELL) */
  averageCostRealizedPnL: number;
  fifoRealizedPnL: number;
  /** Lợi nhuận chưa chốt = marketValue - netCostBasis */
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

export interface NavPoint {
  date: string;
  netAssetValue: number;
  cashValue: number;
  cashValueSource?: 'derived' | 'ledger';
  investedMarketValue: number;
  netContributions: number;
  reconciled?: boolean;
}

export interface PortfolioMetrics {
  holdings: Holding[];
  totalMarketValue: number;
  currentCostBasis: number;
  averageCostRealizedPnL: number;
  fifoRealizedPnL: number;
  totalUnrealizedPnL: number;
  netContributions: number;
  returnVsCostBasis: number;
  navSeries: NavPoint[];
  calculationWarnings: string[];
  cashBalanceSource?: 'derived' | 'ledger';
  cashBalanceEOD?: number;
  cashLedgerCoverageStart?: string;
  cashLedgerCoverageEnd?: string;
}

export interface GroupedTransactionsByDay {
  dateKey: string;
  displayDate: string;
  items: Transaction[];
  count: number;
  dayGrossValue: number;
}

export type CashLedgerEventType =
  | 'OPENING_BALANCE'
  | 'TRADE_SETTLEMENT_BUY'
  | 'TRADE_SETTLEMENT_SELL'
  | 'TRADE_FEE'
  | 'EXCHANGE_FEE'
  | 'DEPOSITORY_FEE'
  | 'SELL_TAX'
  | 'INTEREST'
  | 'DEPOSIT'
  | 'WITHDRAW'
  | 'DIVIDEND_CASH'
  | 'SELL_ADVANCE'
  | 'SELL_ADVANCE_REPAYMENT'
  | 'BANK_TRANSFER_OUT'
  | 'OTHER_ADJUSTMENT';

export interface CashLedgerEvent {
  id: string;
  userId?: string;
  date: Date;
  direction: 'INFLOW' | 'OUTFLOW';
  amount: number;
  balanceAfter: number;
  eventType: CashLedgerEventType;
  description: string;
  source: string;
  referenceTicker?: string;
  referenceQuantity?: number;
  referenceTradeDate?: Date;
}

export interface CashLedgerSummary {
  fileName: string;
  source: string;
  totalEvents: number;
  unclassifiedEvents: number;
  coverageStart?: Date;
  coverageEnd?: Date;
}

export interface ImportCashParseResult {
  events: CashLedgerEvent[];
  summary: CashLedgerSummary;
}

export interface CashImportSummaryState extends CashLedgerSummary {
  importedAt: Date;
}
