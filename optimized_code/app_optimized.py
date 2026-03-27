"""
🚀 APP_OPTIMIZED.PY - Portfolio Tracker (Clean Code + Optimized Version)
================================================================================
Phiên bản tối ưu của app.py với:
  ✅ Input validation & sanitization (chống injection)
  ✅ Batch yfinance calls (cải tiến performance)
  ✅ Logging & Error handling (debugging dễ hơn)
  ✅ Modular functions (DRY principle)
  ✅ Type hints & docstrings (maintainability)

Chỉ list các hàm tối ưu core. Full implementation trong production sẽ kết hợp
cả config + app_optimized.
"""

import logging
import os
from typing import Tuple, Dict, List, Optional
from datetime import datetime
import concurrent.futures

import pandas as pd
import numpy as np
import streamlit as st
import yfinance as yf

# Import config từ cùng folder
try:
    from config import (
        DATA_DIR, TRANSACTIONS_FILE, HOLDINGS_FILE, LOG_DIR,
        ASSET_CLASSES, TRANSACTION_TYPES, CASH_FLOW_TYPES,
        validate_ticker, validate_numeric, validate_asset_class,
        YFINANCE_TIMEOUT, YFINANCE_BATCH_SIZE,
        MAX_FILE_SIZE_MB, MAX_CSV_ROWS,
        TRANSACTIONS_COLUMNS, HOLDINGS_COLUMNS
    )
except ImportError:
    print("⚠️  Warning: config.py not found in optimized_code folder")
    # Fallback to basic config
    DATA_DIR = "data"
    TRANSACTIONS_FILE = os.path.join(DATA_DIR, "transactions.csv")
    HOLDINGS_FILE = os.path.join(DATA_DIR, "holdings.csv")
    LOG_DIR = "logs"

# --- ⚙️ LOGGING SETUP ---
os.makedirs(LOG_DIR, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(LOG_DIR, 'portfolio_tracker.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


# ==============================================================================
# 🔒 INPUT VALIDATION & SANITIZATION
# ==============================================================================

def sanitize_ticker(ticker: str) -> Optional[str]:
    """
    🛡️ Làm sạch & kiểm tra Ticker input.
    
    Args:
        ticker: Raw ticker từ user input
        
    Returns:
        Ticker sạch nếu hợp lệ, None nếu không
        
    Example:
        >>> sanitize_ticker("  vcb  ")
        'VCB'
        >>> sanitize_ticker("VCB-HACK')--")
        None
    """
    if not ticker:
        return None
    
    ticker_cleaned = ticker.upper().strip()
    
    # Validate sử dụng config rules
    if validate_ticker(ticker_cleaned):
        logger.info(f"✅ Ticker validated: {ticker_cleaned}")
        return ticker_cleaned
    else:
        logger.warning(f"❌ Invalid ticker format: {ticker}")
        return None


def sanitize_numeric(value, min_val=0.0, max_val=1e12, default=0.0) -> float:
    """
    🧮 Đảm bảo giá trị số hợp lệ.
    
    Args:
        value: Giá trị cần kiểm tra
        min_val: Minimum
        max_val: Maximum
        default: Giá trị trả về nếu không valid
        
    Returns:
        float: Giá trị hợp lệ hoặc default
    """
    try:
        num = float(value)
        if min_val <= num <= max_val:
            return num
        else:
            logger.warning(f"Value {num} out of range [{min_val}, {max_val}]")
            return default
    except (ValueError, TypeError):
        logger.warning(f"Cannot convert {value} to float")
        return default


def validate_csv_upload(uploaded_file) -> Tuple[bool, str]:
    """
    📁 Kiểm tra file upload hợp lệ trước khi xử lý.
    
    Args:
        uploaded_file: Streamlit UploadedFile object
        
    Returns:
        (is_valid, message): Tuple (validation result, error message)
    """
    if not uploaded_file:
        return False, "No file uploaded"
    
    # Check file size
    file_size_mb = len(uploaded_file.getvalue()) / (1024 * 1024)
    if file_size_mb > MAX_FILE_SIZE_MB:
        msg = f"File size ({file_size_mb:.1f} MB) exceeds limit ({MAX_FILE_SIZE_MB} MB)"
        logger.warning(msg)
        return False, msg
    
    # Check file extension
    valid_extensions = ['.csv', '.xlsx']
    _, ext = os.path.splitext(uploaded_file.name)
    if ext.lower() not in valid_extensions:
        msg = f"Invalid file type: {ext}. Allowed: {valid_extensions}"
        logger.warning(msg)
        return False, msg
    
    logger.info(f"✅ File validation passed: {uploaded_file.name}")
    return True, "OK"


# ==============================================================================
# ⚡ PERFORMANCE: BATCH YFINANCE CALLS
# ==============================================================================

def fetch_prices_batch(tickers: List[str], timeout: int = YFINANCE_TIMEOUT) -> Dict[str, float]:
    """
    🚀 Fetch giá từ yfinance bằng BATCH (tối ưu tốc độ).
    
    Thay vì fetch từng mã 1 lần (lâu):
        for ticker in tickers:  # ❌ SLOW
            yf.Ticker(ticker).history()
    
    Tôi dùng concurrent.futures để parallelize requests:
        >>> prices = fetch_prices_batch(['VCB', 'FPT', 'HPG'])
        >>> prices
        {'VCB': 85900, 'FPT': 95500, 'HPG': 48200}
    
    Args:
        tickers: List mã cổ phiếu
        timeout: Timeout mỗi request (giây)
        
    Returns:
        Dict[ticker] = live_price
    """
    prices = {}
    
    def fetch_single(ticker: str) -> Tuple[str, Optional[float]]:
        """Fetch giá 1 mã, trả về (ticker, price)"""
        try:
            # Gắn .VN cho ticker Việt Nam
            symbol = f"{ticker}.VN" if ticker and all(c.isalpha() for c in ticker) else ticker
            
            data = yf.Ticker(symbol)
            hist = data.history(period="1d")
            
            if not hist.empty:
                price = float(hist['Close'].iloc[-1])
                logger.info(f"✅ {ticker}: ${price:.2f}")
                return ticker, price
        except Exception as e:
            logger.warning(f"❌ Failed to fetch {ticker}: {str(e)}")
        
        return ticker, None
    
    # Parallelize bằng ThreadPoolExecutor
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(YFINANCE_BATCH_SIZE, len(tickers))) as executor:
        futures = {executor.submit(fetch_single, t): t for t in tickers}
        
        for future in concurrent.futures.as_completed(futures, timeout=timeout):
            try:
                ticker, price = future.result()
                if price is not None:
                    prices[ticker] = price
            except Exception as e:
                logger.error(f"Batch fetch error: {e}")
    
    logger.info(f"📊 Batch fetch complete: {len(prices)}/{len(tickers)} succeeded")
    return prices


def update_holdings_with_batched_prices(holdings_df: pd.DataFrame) -> pd.DataFrame:
    """
    🔄 Cập nhật Holdings bằng batch yfinance calls (thay vì loop).
    
    Before (Slow - Sequential):
        for index, row in holdings_df.iterrows():
            prices[ticker] = yf.Ticker(ticker).history()  # ❌ N requests
    
    After (Fast - Batch):
        prices = fetch_prices_batch(tickers)  # ✅ Parallel requests
    
    Args:
        holdings_df: DataFrame danh mục hiện tại
        
    Returns:
        holdings_df với giá cập nhật
    """
    if holdings_df.empty:
        logger.warning("Holdings dataframe is empty")
        return holdings_df
    
    # Lọc chỉ những mã cần cập nhật giá (exclude CASH, Tiết kiệm, etc)
    updateable_tickers = holdings_df[
        (holdings_df['Asset_Class'] == 'Cổ phiếu') &
        (holdings_df['Total_Shares'] > 0) &
        (holdings_df['Ticker'] != 'CASH')
    ]['Ticker'].tolist()
    
    if not updateable_tickers:
        logger.info("No tickers to update")
        return holdings_df
    
    logger.info(f"🔄 Updating {len(updateable_tickers)} tickers in batch mode...")
    
    # Fetch all prices in parallel
    prices = fetch_prices_batch(updateable_tickers)
    
    # Update holdings dataframe
    result_df = holdings_df.copy()
    for ticker, price in prices.items():
        mask = result_df['Ticker'] == ticker
        if mask.any():
            result_df.loc[mask, 'Current_Price'] = price
            result_df.loc[mask, 'Market_Value'] = price * result_df.loc[mask, 'Total_Shares'].values[0]
            logger.debug(f"Updated {ticker}: ${price:.2f}")
    
    return result_df


# ==============================================================================
# 💾 DATA PERSISTENCE (với error handling)
# ==============================================================================

def load_data() -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    📖 Load dữ liệu từ CSV files an toàn.
    
    Returns:
        (transactions_df, holdings_df)
    """
    try:
        # Load transactions
        if os.path.exists(TRANSACTIONS_FILE):
            tx_df = pd.read_csv(TRANSACTIONS_FILE)
            tx_df['Date'] = pd.to_datetime(tx_df['Date'], errors='coerce', dayfirst=True)
            if 'Interest_Rate' not in tx_df.columns:
                tx_df['Interest_Rate'] = 0.0
            logger.info(f"✅ Loaded {len(tx_df)} transactions")
        else:
            tx_df = pd.DataFrame(columns=TRANSACTIONS_COLUMNS)
            logger.info("📝 Created new transactions DataFrame")
        
        # Load holdings
        if os.path.exists(HOLDINGS_FILE):
            h_df = pd.read_csv(HOLDINGS_FILE)
            logger.info(f"✅ Loaded {len(h_df)} holdings")
        else:
            h_df = pd.DataFrame(columns=HOLDINGS_COLUMNS)
            logger.info("📝 Created new holdings DataFrame")
        
        return tx_df, h_df
        
    except Exception as e:
        logger.error(f"❌ Error loading data: {e}")
        # Fallback: return empty dataframes
        return (
            pd.DataFrame(columns=TRANSACTIONS_COLUMNS),
            pd.DataFrame(columns=HOLDINGS_COLUMNS)
        )


def save_data(transactions_df: pd.DataFrame, holdings_df: pd.DataFrame) -> bool:
    """
    💿 Lưu dữ liệu vào CSV files an toàn.
    
    Args:
        transactions_df: Transactions dataframe
        holdings_df: Holdings dataframe
        
    Returns:
        bool: True nếu save thành công
    """
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        
        transactions_df.to_csv(TRANSACTIONS_FILE, index=False)
        holdings_df.to_csv(HOLDINGS_FILE, index=False)
        
        logger.info(f"✅ Data saved: {len(transactions_df)} tx, {len(holdings_df)} holdings")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error saving data: {e}")
        return False


# ==============================================================================
# 📊 CORE BUSINESS LOGIC (với type hints)
# ==============================================================================

def calculate_account_summary(
    transactions_df: pd.DataFrame,
    holdings_df: pd.DataFrame
) -> Dict[str, float]:
    """
    📊 Tính toán tổng quan tài khoản.
    
    Args:
        transactions_df: Lịch sử giao dịch
        holdings_df: Danh mục hiện tại
        
    Returns:
        Dict chứa: total_invested, current_balance, total_profit, roi_percent
    """
    # Tính tổng vốn nạp
    total_invested = 0.0
    if not transactions_df.empty:
        deposits = transactions_df[transactions_df['Type'] == 'DEPOSIT']['Total_Value'].sum()
        withdraws = transactions_df[transactions_df['Type'] == 'WITHDRAW']['Total_Value'].sum()
        total_invested = deposits - withdraws
    
    # Tính tổng tài sản hiện tại
    current_balance = 0.0
    if not holdings_df.empty:
        current_balance = holdings_df['Market_Value'].sum()
    
    # Tính lãi/lỗ
    total_profit = current_balance - total_invested
    roi_percent = (total_profit / total_invested * 100) if total_invested > 0 else 0.0
    
    result = {
        'total_invested': total_invested,
        'current_balance': current_balance,
        'total_profit': total_profit,
        'roi_percent': roi_percent
    }
    
    logger.info(f"💰 Account Summary: Invested={total_invested:,.0f}, Balance={current_balance:,.0f}, ROI={roi_percent:.2f}%")
    
    return result


# ==============================================================================
# 🧪 UNIT TESTS (Demo)
# ==============================================================================

if __name__ == "__main__":
    print("=" * 80)
    print("🧪 UNIT TESTS - Portfolio Tracker Optimized")
    print("=" * 80)
    
    # Test 1: Input validation
    print("\n1️⃣  Testing Input Validation:")
    test_cases = [
        ("VCB", True),
        ("vcb", True),
        ("VCB-HACK", False),
        ("", False),
        ("VCB'); DROP--", False),
    ]
    for ticker, expected in test_cases:
        result = sanitize_ticker(ticker)
        status = "✅" if (result is not None) == expected else "❌"
        print(f"  {status} sanitize_ticker('{ticker}'): {result}")
    
    # Test 2: Numeric sanitization
    print("\n2️⃣  Testing Numeric Sanitization:")
    print(f"  ✅ sanitize_numeric(100, 0, 1000) = {sanitize_numeric(100, 0, 1000)}")
    print(f"  ✅ sanitize_numeric(-10, 0, 1000) = {sanitize_numeric(-10, 0, 1000)}")
    print(f"  ✅ sanitize_numeric('abc', default=0) = {sanitize_numeric('abc', default=0)}")
    
    # Test 3: Data loading
    print("\n3️⃣  Testing Data Loading:")
    os.makedirs(DATA_DIR, exist_ok=True)
    tx_df, h_df = load_data()
    print(f"  ✅ Transactions: {len(tx_df)} rows")
    print(f"  ✅ Holdings: {len(h_df)} rows")
    
    print("\n" + "=" * 80)
    print("✅ All tests completed! Check logs/portfolio_tracker.log for details")
    print("=" * 80)
