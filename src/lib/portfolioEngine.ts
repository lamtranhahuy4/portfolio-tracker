import { Transaction, Holding } from '../types/portfolio';

// Trạng thái giữ chỗ khi đang duyệt qua giao dịch
type HoldingState = Omit<Holding, 'currentPrice' | 'marketValue' | 'unrealizedPnL'>;

/**
 * Pure Function cốt lõi: Tính toán trạng thái danh mục đầu tư từ lịch sử giao dịch gốc.
 * (Core Engine giúp hệ thống giữ được Single Source of Truth)
 * 
 * @param transactions Lịch sử giao dịch (Yêu cầu phải được sort theo thời gian tăng dần)
 * @param currentPrices Dictionary (Record) giá mới nhất của các tài sản (VD: { 'FPT': 120000 })
 * @returns Mảng danh sách các tài sản (Holding) hiện tại.
 */
export function calculateHoldings(
  transactions: Transaction[],
  currentPrices: Record<string, number>
): Holding[] {
  const holdingsMap = new Map<string, HoldingState>();

  // Helper chức năng để lấy/khởi tạo ví tiền mặt mặc định
  const getCashHolding = (): HoldingState => {
    if (!holdingsMap.has('CASH_VND')) {
      holdingsMap.set('CASH_VND', {
        assetClass: 'CASH',
        ticker: 'CASH_VND',
        totalShares: 0,
        averageCost: 1, // Tiền mặt chuẩn thì giá trị chuyển đổi nội tại là 1
        realizedPnL: 0,
      });
    }
    return holdingsMap.get('CASH_VND')!;
  };

  // Helper chức năng để lấy/khởi tạo trạng thái cổ phiếu
  const getStockHolding = (ticker: string): HoldingState => {
    if (!holdingsMap.has(ticker)) {
      holdingsMap.set(ticker, {
        assetClass: 'STOCK',
        ticker,
        totalShares: 0,
        averageCost: 0,
        realizedPnL: 0,
      });
    }
    return holdingsMap.get(ticker)!;
  };

  // 1. Duyệt qua mảng giao dịch và tính toán số lượng/giá vốn
  for (const tx of transactions) {
    if (tx.assetClass === 'STOCK') {
      const stock = getStockHolding(tx.ticker);
      const cash = getCashHolding();

      switch (tx.type) {
        case 'BUY': {
          // Khi BUY: Tính trung bình giá mới (DCA) bao gồm cả phí giao dịch
          const oldTotalValue = stock.totalShares * stock.averageCost;

          // SỬA Ở ĐÂY: Dùng luôn tx.totalValue (đã bao gồm phí) làm giá trị vốn mới nạp vào
          stock.averageCost = (oldTotalValue + tx.totalValue) / (stock.totalShares + tx.quantity);
          stock.totalShares += tx.quantity;

          // Trừ vào quỹ tiền mặt 
          cash.totalShares -= tx.totalValue;
          break;
        }
        case 'SELL': {
          // Khi SELL: Giữ nguyên Average Cost. Cập nhật số lượng và Realized PnL.
          stock.totalShares -= tx.quantity;
          stock.realizedPnL += (tx.price - stock.averageCost) * tx.quantity - tx.fee;

          // Cộng lại vào quỹ tiền mặt
          cash.totalShares += tx.totalValue;
          break;
        }
        case 'STOCK_DIVIDEND': {
          // Khi nhận cổ tức bằng cổ phiếu: Giá vốn bị pha loãng (lượng CP tăng thêm, giá 0đ)
          const oldTotalValue = stock.totalShares * stock.averageCost;
          stock.totalShares += tx.quantity;

          if (stock.totalShares > 0) {
            stock.averageCost = oldTotalValue / stock.totalShares;
          }
          break;
        }
        case 'DIVIDEND': {
          // Nhận cổ tức bằng tiền mặt từ mã cổ phiếu
          cash.totalShares += tx.totalValue;
          break;
        }
      }
    } else {
      // Trường hợp các giao dịch liên quan cấu trúc tiền mặt (DEPOSIT/WITHDRAW) và sinh lời (INTEREST)
      const cash = getCashHolding();
      switch (tx.type) {
        case 'DEPOSIT':
        case 'INTEREST':
          // Nạp tiền hoặc nhận lãi suất sẽ tăng tiền mặt
          cash.totalShares += tx.totalValue;
          break;
        case 'WITHDRAW':
          // Rút khoản đầu tư
          cash.totalShares -= tx.totalValue;
          break;
      }
    }
  }

  // 2. Kết xuất dữ liệu sang mảng và tính tổng giá trị thị trường
  const result: Holding[] = [];

  for (const [ticker, state] of holdingsMap.entries()) {
    // Nếu là CASH thì giá lúc nào cũng là 1. Ngược lại lấy từ data tham chiếu mới nhất, hoặc Fallback về DCA.
    const currentPrice = ticker === 'CASH_VND'
      ? 1
      : (currentPrices[ticker] !== undefined ? currentPrices[ticker] : state.averageCost);

    const marketValue = state.totalShares * currentPrice;

    // CASH_VND không có Unrealized PnL
    const unrealizedPnL = ticker === 'CASH_VND'
      ? 0
      : marketValue - (state.totalShares * state.averageCost);

    // Filter: Chỉ kết xuất những Asset đang có số dư HOẶC đã có chốt lời/lỗ
    if (state.totalShares > 0 || state.realizedPnL !== 0) {
      result.push({
        ...state,
        currentPrice,
        marketValue,
        unrealizedPnL,
      });
    }
  }

  return result;
}
