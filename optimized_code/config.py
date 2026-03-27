"""
📋 CONFIG.PY - Portfolio Tracker Configuration & Constants
================================================================================
Tập trung hóa cấu hình, constants, và validation rules.
Giúp tái sử dụng, dễ bảo trì, và giảm magic strings.
"""

import os
import re
from typing import Set, Pattern

# --- 📁 THƯ MỤC & FILE PATHS ---
DATA_DIR = "data"
TRANSACTIONS_FILE = os.path.join(DATA_DIR, "transactions.csv")
HOLDINGS_FILE = os.path.join(DATA_DIR, "holdings.csv")
LOG_DIR = "logs"

# Tạo thư mục nếu chưa tồn tại
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(LOG_DIR, exist_ok=True)

# --- 🏷️ DANH SÁCH ENUM & HẰNG SỐ ---
ASSET_CLASSES: Set[str] = {"Tiền mặt", "Cổ phiếu", "Crypto", "Tiết kiệm", "Bất động sản"}
TRANSACTION_TYPES: Set[str] = {"BUY", "SELL", "DEPOSIT", "WITHDRAW", "DIVIDEND", "STOCK_DIVIDEND"}
CASH_FLOW_TYPES: Set[str] = {"DEPOSIT", "WITHDRAW", "DIVIDEND"}

# --- ✅ VALIDATION PATTERNS (Regex) ---
# Ticker: Chỉ cho phép chữ cái, số, dấu gạch dưới, tối đa 20 ký tự
TICKER_PATTERN: Pattern = re.compile(r"^[A-Z0-9_]{1,20}$")

# Email: Chuẩn RFC 5322 đơn giản
EMAIL_PATTERN: Pattern = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

# --- 🔒 VALIDATION CONSTRAINTS ---
MAX_TICKER_LENGTH = 20
MAX_QUANTITY_VALUE = 1e12  # Tối đa 1 triệu tỷ cổ phiếu (ngăn chặn overflow)
MAX_PRICE_VALUE = 1e10     # Tối đa 10 tỷ VND/cái (hợp lý cho VN market)
MAX_FILE_SIZE_MB = 50      # Giới hạn upload file
MAX_CSV_ROWS = 10000       # Giới hạn dòng CSV import

MIN_INTEREST_RATE = 0.0
MAX_INTEREST_RATE = 100.0  # 100% lãi suất/năm (hợp lý)

# --- 💰 ĐỊNH DẠNG HIỂN THỊ ---
CURRENCY_FORMAT = "{:,.0f} ₫"
PERCENTAGE_FORMAT = "{:.2f}%"
DECIMAL_PLACES_PRICE = 2
DECIMAL_PLACES_QUANTITY = 4

# --- 🎨 MÀU SẮC ---
COLOR_PROFIT = "#00C853"   # Xanh (lãi)
COLOR_LOSS = "#FF1744"     # Đỏ (lỗ)
COLOR_NEUTRAL = "#757575"  # Xám (hòa)

# --- ⏳ YFINANCE SETTINGS ---
YFINANCE_TIMEOUT = 10      # Timeout 10 giây cho mỗi request
YFINANCE_BATCH_SIZE = 10   # Batch 10 tickers/lần để tránh quá tải

# --- 📊 DATAFRAME SCHEMAS (Column Definitions) ---
TRANSACTIONS_COLUMNS = [
    'Date', 'Asset_Class', 'Ticker', 'Type',
    'Quantity', 'Price', 'Interest_Rate', 'Total_Value'
]

HOLDINGS_COLUMNS = [
    'Asset_Class', 'Ticker', 'Total_Shares',
    'Average_Cost', 'Current_Price', 'Market_Value'
]


def validate_ticker(ticker: str) -> bool:
    """
    🔍 Kiểm tra Ticker có hợp lệ không.
    
    Args:
        ticker (str): Mã Ticker cần kiểm tra
        
    Returns:
        bool: True nếu hợp lệ, False nếu không
        
    Example:
        >>> validate_ticker("VCB")
        True
        >>> validate_ticker("VCB-MALICIOUS')--")
        False
    """
    if not ticker or not isinstance(ticker, str):
        return False
    
    ticker_clean = ticker.upper().strip()
    return bool(TICKER_PATTERN.match(ticker_clean)) and len(ticker_clean) <= MAX_TICKER_LENGTH


def validate_numeric(value, min_val=0, max_val=1e12, name="value") -> bool:
    """
    📐 Kiểm tra giá trị số nằm trong khoảng hợp lệ.
    
    Args:
        value: Giá trị cần kiểm tra
        min_val: Giá trị tối thiểu
        max_val: Giá trị tối đa
        name: Tên biến (cho error message)
        
    Returns:
        bool: True nếu hợp lệ
    """
    try:
        num = float(value)
        return min_val <= num <= max_val
    except (ValueError, TypeError):
        return False


def validate_asset_class(asset_class: str) -> bool:
    """
    🏷️ Kiểm tra Asset Class có trong danh sách cho phép không.
    """
    return asset_class in ASSET_CLASSES


def validate_transaction_type(txn_type: str) -> bool:
    """
    💳 Kiểm tra Transaction Type có hợp lệ không.
    """
    return txn_type in TRANSACTION_TYPES


if __name__ == "__main__":
    # Test validation functions
    print("✅ Testing validate_ticker:")
    print(f"  VCB: {validate_ticker('VCB')}")
    print(f"  vcb: {validate_ticker('vcb')}")
    print(f"  VCB-HACK: {validate_ticker('VCB-HACK')}")
    print(f"  Empty: {validate_ticker('')}")
    
    print("\n✅ Testing validate_numeric:")
    print(f"  100 (0-1000): {validate_numeric(100, 0, 1000)}")
    print(f"  -10 (0-1000): {validate_numeric(-10, 0, 1000)}")
