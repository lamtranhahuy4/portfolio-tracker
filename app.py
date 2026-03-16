import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px

st.set_page_config(page_title="My Streamlit App", page_icon="📈", layout="wide")

st.title("📈 Ứng dụng Quản lý Danh mục Đầu tư (Portfolio Tracker)")

import os
import io
import yfinance as yf

# --- CẤU HÌNH THƯ MỤC DATA ---
DATA_DIR = "data"
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)
    
TRANSACTIONS_FILE = os.path.join(DATA_DIR, "transactions.csv")
HOLDINGS_FILE = os.path.join(DATA_DIR, "holdings.csv")

# --- HÀM LƯU / TẢI DỮ LIỆU ---
def load_data():
    # Load transactions
    if os.path.exists(TRANSACTIONS_FILE):
        tx_df = pd.read_csv(TRANSACTIONS_FILE)
        tx_df['Date'] = pd.to_datetime(tx_df['Date'], errors='coerce', dayfirst=True)
        if 'Interest_Rate' not in tx_df.columns:
            tx_df['Interest_Rate'] = 0.0
    else:
        tx_df = pd.DataFrame(columns=['Date', 'Asset_Class', 'Ticker', 'Type', 'Quantity', 'Price', 'Interest_Rate', 'Total_Value'])
        
    # Load holdings
    if os.path.exists(HOLDINGS_FILE):
        h_df = pd.read_csv(HOLDINGS_FILE)
    else:
        h_df = pd.DataFrame(columns=['Asset_Class', 'Ticker', 'Total_Shares', 'Average_Cost', 'Current_Price', 'Market_Value'])
        
    return tx_df, h_df

def save_data():
    st.session_state['transactions_df'].to_csv(TRANSACTIONS_FILE, index=False)
    st.session_state['holdings_df'].to_csv(HOLDINGS_FILE, index=False)

# --- KHỞI TẠO SESSION STATE ---
if 'transactions_df' not in st.session_state or 'holdings_df' not in st.session_state:
    tx_df, h_df = load_data()
    st.session_state['transactions_df'] = tx_df
    st.session_state['holdings_df'] = h_df
else:
    if 'Interest_Rate' not in st.session_state['transactions_df'].columns:
        st.session_state['transactions_df']['Interest_Rate'] = 0.0

# --- HÀM TÍNH TOÁN DANH MỤC ---
def update_holdings():
    # Lưu giá thị trường cũ (nếu có đoạn này để không bị reset)
    old_prices = {}
    if not st.session_state['holdings_df'].empty:
        old_prices = st.session_state['holdings_df'].set_index('Ticker')['Current_Price'].to_dict()

    # Khởi tạo dictionary để tính toán
    holdings_dict = {}
    total_cash = 0.0
    
    # Lấy dữ liệu giao dịch
    transactions = st.session_state['transactions_df']
    
    for index, row in transactions.iterrows():
        ticker = row['Ticker']
        txn_type = row['Type']
        qty = row['Quantity']
        price = row['Price']
        val = row['Total_Value']
        interest_rate = row.get('Interest_Rate', 0.0)
        
        # --- Logic Tiền mặt (CASH) ---
        if txn_type == 'DEPOSIT':
            total_cash += val
        elif txn_type == 'WITHDRAW':
            total_cash -= val
        elif txn_type == 'DIVIDEND':
            total_cash += val
        elif txn_type == 'BUY':
            total_cash -= val
        elif txn_type == 'SELL':
            total_cash += val
            
        # Bỏ qua nếu Ticker rỗng (ví dụ nạp/rút tiền mặt chung)
        if not ticker:
            continue
            
        # Khởi tạo Ticker nếu chưa có
        if ticker not in holdings_dict:
            holdings_dict[ticker] = {
                'Asset_Class': row.get('Asset_Class', ''), # Lấy Asset Class từ lịch sử giao dịch
                'Ticker': ticker,
                'Total_Shares': 0.0,
                'Average_Cost': 0.0,
                'Current_Price': 0.0, # Sẽ được điền lại sau
                'Market_Value': 0.0,
                'Total_Value_Invested': 0.0 # Bổ sung để lưu gốc Tiết kiệm
            }
            
        current = holdings_dict[ticker]
        
        if current['Asset_Class'] == 'Tiết kiệm':
            days_elapsed = (pd.Timestamp.today().normalize() - pd.to_datetime(row['Date']).normalize()).days
            if days_elapsed < 0: days_elapsed = 0
            accrued_interest = val * (interest_rate / 100.0) * (days_elapsed / 365.0)
            
            if txn_type in ['BUY', 'DEPOSIT']:
                current['Total_Shares'] += qty
                current['Total_Value_Invested'] += val
                current['Market_Value'] += val + accrued_interest
                current['Average_Cost'] = current['Total_Value_Invested']
                current['Current_Price'] = current['Market_Value'] / current['Total_Shares'] if current['Total_Shares'] > 0 else 0
            elif txn_type in ['SELL', 'WITHDRAW']:
                current['Total_Shares'] -= qty
                current['Total_Value_Invested'] -= val
                current['Market_Value'] -= (val + accrued_interest)
                current['Average_Cost'] = current['Total_Value_Invested']
                current['Current_Price'] = current['Market_Value'] / current['Total_Shares'] if current['Total_Shares'] > 0 else 0
                
            if current['Total_Shares'] <= 0:
                current['Total_Shares'] = 0.0
                current['Average_Cost'] = 0.0
                current['Market_Value'] = 0.0
                current['Current_Price'] = 0.0
        else:
            # --- Logic Cổ phiếu ---
            if txn_type == 'BUY':
                new_total_shares = current['Total_Shares'] + qty
                if new_total_shares > 0:
                    # Tính bình quân gia quyền
                    current['Average_Cost'] = ((current['Total_Shares'] * current['Average_Cost']) + val) / new_total_shares
                current['Total_Shares'] = new_total_shares
                
            elif txn_type == 'SELL':
                current['Total_Shares'] -= qty
                # Nếu hết cổ phiếu, reset cost về 0
                if current['Total_Shares'] <= 0:
                    current['Total_Shares'] = 0.0
                    current['Average_Cost'] = 0.0

    # Chuyển đổi từ Dict sang List các Record để tạo DataFrame
    holdings_list = []
    
    # Thêm dòng CASH đầu tiên
    holdings_list.append({
        'Asset_Class': 'Tiền mặt',
        'Ticker': 'CASH',
        'Total_Shares': total_cash,
        'Average_Cost': 1.0, # Giá trị 1 VND = 1 VND
        'Current_Price': 1.0,
        'Market_Value': total_cash
    })
    
    # Thêm các cổ phiếu có số lượng > 0
    for tck, data in holdings_dict.items():
        if data['Total_Shares'] > 0:
            if data['Asset_Class'] != 'Tiết kiệm':
                # Khôi phục giá cũ, hoặc dùng Average Cost nếu mã mới
                if tck in old_prices:
                    data['Current_Price'] = old_prices[tck]
                else:
                    data['Current_Price'] = data['Average_Cost']
                    
                data['Market_Value'] = data['Total_Shares'] * data['Current_Price']
                
            # Tạo dictionary gọn gàng trùng schema
            clean_data = {
                'Asset_Class': data['Asset_Class'],
                'Ticker': data['Ticker'],
                'Total_Shares': data['Total_Shares'],
                'Average_Cost': data['Average_Cost'],
                'Current_Price': data['Current_Price'],
                'Market_Value': data['Market_Value']
            }
            holdings_list.append(clean_data)
            
    # Xây dựng DataFrame mới
    if holdings_list:
        new_holdings_df = pd.DataFrame(holdings_list)
    else:
        new_holdings_df = pd.DataFrame(columns=[
            'Asset_Class', 'Ticker', 'Total_Shares', 'Average_Cost', 'Current_Price', 'Market_Value'
        ])
        
    st.session_state['holdings_df'] = new_holdings_df


# --- SIDEBAR: FORM NHẬP GIAO DỊCH ---
st.sidebar.header("Thêm Giao dịch Mới")

date = st.sidebar.date_input("Ngày Giao dịch")
txn_type = st.sidebar.selectbox("Loại Giao dịch", options=["BUY", "SELL", "DEPOSIT", "WITHDRAW", "DIVIDEND", "STOCK_DIVIDEND"])
asset_class = st.sidebar.selectbox("Lớp tài sản", options=["Tiền mặt", "Cổ phiếu", "Crypto", "Tiết kiệm", "Bất động sản"])
ticker = st.sidebar.text_input("Mã Ticker", placeholder="VD: VCB, FPT, HPG, SAVING1").upper()

if asset_class == "Tiết kiệm":
    quantity = 1.0
    price = st.sidebar.number_input("Số tiền gửi (VND)", min_value=0.0, step=1000.0, format="%.2f")
    interest_rate = st.sidebar.number_input("Lãi suất (%/năm)", min_value=0.0, step=0.1, format="%.2f")
else:
    quantity = st.sidebar.number_input("Số lượng", min_value=0.0, step=1.0, format="%.4f")
    if txn_type == "STOCK_DIVIDEND":
        st.sidebar.info("Cổ tức bằng cổ phiếu / Cổ phiếu thưởng sẽ có Giá vốn = 0 ₫")
        price = 0.0
    else:
        price = st.sidebar.number_input("Giá (VND)", min_value=0.0, step=1000.0, format="%.2f")
    interest_rate = 0.0
    
submit_button = st.sidebar.button(label="Thêm Giao dịch")

# --- XỬ LÝ SỰ KIỆN THÊM GIAO DỊCH ---
if submit_button:
    # Quyết định Loại Mapped Type đẩy vào hệ thống
    mapped_type = 'BUY' if txn_type == 'STOCK_DIVIDEND' else txn_type

    if ticker or mapped_type in ["DEPOSIT", "WITHDRAW"]: # Ticker can be empty if it's a deposit/withdraw cash flow
        if mapped_type in ["DEPOSIT", "WITHDRAW", "DIVIDEND"]:
            total_value = price # Đối với loại giao dịch này lượng tiền = Price nhập vào, không nhân theo Quantity
        else:
            total_value = quantity * price
        
        # Tạo bản ghi mới
        new_transaction = {
            'Date': pd.to_datetime(date),
            'Asset_Class': asset_class,
            'Ticker': ticker,
            'Type': mapped_type,
            'Quantity': quantity,
            'Price': price,
            'Interest_Rate': interest_rate,
            'Total_Value': total_value
        }
        
        # Thêm vào transactions_df
        new_df = pd.DataFrame([new_transaction])
        st.session_state['transactions_df'] = pd.concat([st.session_state['transactions_df'], new_df], ignore_index=True)
        
        # Tính toán lại Danh mục khi có dữ liệu mới
        update_holdings()
        
        # Lưu dữ liệu xuống file
        save_data()
        
        st.sidebar.success("Thêm giao dịch thành công!")
    else:
        st.sidebar.error("Vui lòng nhập Mã Ticker!")

# --- SIDEBAR: NHẬP DỮ LIỆU TỪ FILE (UNIVERSAL DATA MAPPER) ---
st.sidebar.markdown("---")
with st.sidebar.expander("📁 Trình Ánh xạ Dữ liệu (Universal Mapper)"):
    st.write("Hỗ trợ đọc Trực tiếp File Sao kê (.csv/.xlsx) tải từ mọi công ty chứng khoán (VPS, SSI, TCBS...).")
    uploaded_file = st.file_uploader("Tải lên file Sao kê giao dịch", type=["csv", "xlsx"])
    
    if uploaded_file is not None:
        st.write("**Bước 1: Lọc Dữ Liệu Rác (Header Detection)**")
        st.caption("Tăng số dòng bỏ qua (Skiprows) nếu file bị dính logo hoặc thông tin tài khoản ở đầu.")
        col_s1, col_s2 = st.columns([1, 1])
        with col_s1:
            skiprows = st.number_input("Bỏ qua X dòng đầu tiên", min_value=0, value=0, step=1)
        with col_s2:
            use_multi_header = st.checkbox("Tiêu đề 2 dòng (Merged Headers)", help="Bật nếu tiêu đề cột bị chia làm 2 dòng (VD: dòng 14-15), App sẽ gộp tên cả 2 dòng lại.")
        
        try:
            # Dời Uploaded Stream về vị trí 0 sau mỗi lần thay đổi Input
            uploaded_file.seek(0)
            header_logic = [0, 1] if use_multi_header else 0
            
            if uploaded_file.name.endswith('.csv'):
                df_raw = pd.read_csv(uploaded_file, skiprows=skiprows, header=header_logic)
            else:
                df_raw = pd.read_excel(uploaded_file, skiprows=skiprows, header=header_logic)
            
            # Xử lý làm phẳng MultiIndex nếu dùng Multi-Header
            if use_multi_header and isinstance(df_raw.columns, pd.MultiIndex):
                new_cols = []
                for col in df_raw.columns:
                    top = str(col[0]) if not pd.isna(col[0]) and 'Unnamed' not in str(col[0]) else ""
                    bottom = str(col[1]) if not pd.isna(col[1]) and 'Unnamed' not in str(col[1]) else ""
                    
                    if top and bottom:
                        combined = f"{top} - {bottom}"
                    else:
                        combined = top or bottom or "Column"
                    new_cols.append(combined)
                df_raw.columns = new_cols
                
            st.write("Bản xem trước (3 dòng đầu):")
            st.dataframe(df_raw.head(3), use_container_width=True)
            
            if not df_raw.empty:
                st.write("**Bước 2: Ánh Xạ Cột (Column Mapping)**")
                columns_list = df_raw.columns.astype(str).tolist()
                
                # Tùy chọn loại báo cáo
                file_type_sel = st.radio("Loại Báo cáo:", options=["Khớp lệnh (Cổ phiếu/Tài sản)", "Sao kê Tiền (Nạp/Rút/Cổ tức)"], horizontal=True)
                
                with st.form("mapping_form"):
                    if file_type_sel == "Khớp lệnh (Cổ phiếu/Tài sản)":
                        # Logic cũ cho khớp lệnh
                        default_date_idx = next((i for i, v in enumerate(columns_list) if any(kw in v.lower() for kw in ['ngày', 'date', 'thời gian', 'time'])), 0)
                        default_ticker_idx = next((i for i, v in enumerate(columns_list) if any(kw in v.lower() for kw in ['mã', 'ticker', 'chứng khoán'])), 0)
                        
                        map_date = st.selectbox("Cột Ngày Giao dịch (Date)", options=columns_list, index=default_date_idx)
                        map_ticker = st.selectbox("Cột Mã Ticker", options=columns_list, index=default_ticker_idx)
                        map_type = st.selectbox("Cột Loại Lệnh (Type | Mua, bán, nộp...)", options=columns_list)
                        map_quantity = st.selectbox("Cột Khối lượng (Quantity)", options=columns_list)
                        map_price = st.selectbox("Cột Đơn Giá / Số Tiền (Price / Amount)", options=columns_list)
                    else:
                        # Logic mới cho sao kê tiền
                        map_date = st.selectbox("Cột Ngày Giao dịch (Date)", options=columns_list)
                        map_desc = st.selectbox("Cột Diễn giải / Mô tả giao dịch", options=columns_list)
                        map_inc = st.selectbox("Cột Phát sinh Tăng (Tiền vào)", options=columns_list)
                        map_dec = st.selectbox("Cột Phát sinh Giảm (Tiền ra)", options=columns_list)
                    
                    st.markdown("---")
                    use_multiline_merge = st.checkbox("Chế độ File Đa Dòng (Merge multi-line rows)", help="Bật nếu file có cấu trúc 'bậc thang': dòng trên chứa Mã, dòng dưới chứa số liệu.")
                    
                    submit_mapping = st.form_submit_button("Xác nhận Import & Chuẩn hóa")
                    
                    if submit_mapping:
                        st.spinner("Đang chuẩn hóa dữ liệu...")
                        
                        if file_type_sel == "Khớp lệnh (Cổ phiếu/Tài sản)":
                            # --- LOGIC IMPORT KHỚP LỆNH (CŨ) ---
                            mapped_df = df_raw[[map_date, map_ticker, map_type, map_quantity, map_price]].copy()
                            mapped_df.columns = ['Date', 'Ticker', 'Type', 'Quantity', 'Price']
                            
                            if use_multiline_merge:
                                mapped_df[['Date', 'Ticker', 'Type']] = mapped_df[['Date', 'Ticker', 'Type']].ffill()
                            
                            mapped_df['Date'] = pd.to_datetime(mapped_df['Date'], dayfirst=True, errors='coerce')
                            
                            def parse_type(text):
                                if pd.isna(text): return 'UNKNOWN'
                                t = str(text).lower()
                                if 'mua' in t: return 'BUY'
                                if 'bán' in t or 'ban' in t: return 'SELL'
                                if any(k in t for k in ['nạp', 'nộp', 'nhận', 'tăng', 'cộng', 'vào', 'thu', 'deposit']): return 'DEPOSIT'
                                if any(k in t for k in ['rút', 'giảm', 'trừ', 'ra', 'chi', 'withdraw']): return 'WITHDRAW'
                                if 'cổ tức' in t or 'dividend' in t: return 'DIVIDEND'
                                return 'UNKNOWN'
                            
                            mapped_df['Type'] = mapped_df['Type'].apply(parse_type)
                            mapped_df = mapped_df[mapped_df['Type'] != 'UNKNOWN']
                            
                            def parse_asset_and_ticker(row):
                                t = str(row['Type']).upper()
                                orig_type_text = str(df_raw.loc[row.name, map_type]).lower()
                                tk = str(row['Ticker']).upper().strip() if (pd.notna(row['Ticker']) and str(row['Ticker']).strip() != '') else ''
                                if any(kw in orig_type_text for kw in ['tiết kiệm', 'tết kiệm', 'saving', 'sổ']):
                                    return 'Tiết kiệm', (tk or 'SAVING_ACC')
                                if t in ['DEPOSIT', 'WITHDRAW', 'DIVIDEND']:
                                    return 'Tiền mặt', (tk or 'CASH')
                                return 'Cổ phiếu', (tk or 'UNK')
                            
                            mapped_df[['Asset_Class', 'Ticker']] = mapped_df.apply(parse_asset_and_ticker, axis=1, result_type='expand')
                            
                            def clean_numeric(val):
                                if pd.isna(val) or val == '': return 0.0
                                s = str(val).replace(',', '').replace('. ', '').strip()
                                try: return float(s)
                                except: return 0.0

                            mapped_df['Quantity'] = mapped_df['Quantity'].apply(clean_numeric)
                            mapped_df['Price'] = mapped_df['Price'].apply(clean_numeric)
                            if use_multiline_merge:
                                mapped_df = mapped_df[(mapped_df['Quantity'] > 0) | (mapped_df['Price'] > 0)]
                            
                            def calculate_mapped_total(r):
                                if r['Type'] in ['DEPOSIT', 'WITHDRAW', 'DIVIDEND']:
                                    return max(r['Price'], r['Quantity'])
                                return r['Quantity'] * r['Price']
                                
                            mapped_df['Total_Value'] = mapped_df.apply(calculate_mapped_total, axis=1)
                            mapped_df['Interest_Rate'] = 0.0
                            
                        else:
                            # --- LOGIC IMPORT SAO KÊ TIỀN (MỚI) ---
                            mapped_df = df_raw[[map_date, map_desc, map_inc, map_dec]].copy()
                            mapped_df.columns = ['Date', 'Desc', 'Inc', 'Dec']
                            
                            if use_multiline_merge:
                                mapped_df[['Date', 'Desc']] = mapped_df[['Date', 'Desc']].ffill()
                                
                            mapped_df['Date'] = pd.to_datetime(mapped_df['Date'], dayfirst=True, errors='coerce')
                            
                            def normalize_cash_type(text):
                                if pd.isna(text): return 'IGNORE'
                                t = str(text).lower()
                                if any(kw in t for kw in ["nạp", "nộp", "nhận chuyển tiền", "lãi tiền gửi"]):
                                    return 'DEPOSIT'
                                if any(kw in t for kw in ["rút", "chuyển ra"]):
                                    return 'WITHDRAW'
                                if "cổ tức" in t:
                                    return 'DIVIDEND'
                                return 'IGNORE'
                                
                            mapped_df['Type'] = mapped_df['Desc'].apply(normalize_cash_type)
                            mapped_df = mapped_df[mapped_df['Type'] != 'IGNORE']
                            
                            def clean_numeric(val):
                                if pd.isna(val) or val == '': return 0.0
                                s = str(val).replace(',', '').replace('. ', '').strip()
                                try: return float(s)
                                except: return 0.0
                                
                            mapped_df['Inc'] = mapped_df['Inc'].apply(clean_numeric)
                            mapped_df['Dec'] = mapped_df['Dec'].apply(clean_numeric)
                            
                            def calc_cash_total(r):
                                if r['Type'] in ['DEPOSIT', 'DIVIDEND']:
                                    return r['Inc']
                                if r['Type'] == 'WITHDRAW':
                                    return abs(r['Dec'])
                                return 0.0
                                
                            mapped_df['Total_Value'] = mapped_df.apply(calc_cash_total, axis=1)
                            
                            # Gán cứng các cột chuẩn
                            mapped_df['Asset_Class'] = 'Tiền mặt'
                            mapped_df['Ticker'] = 'CASH'
                            mapped_df['Quantity'] = 0.0
                            mapped_df['Price'] = mapped_df['Total_Value']
                            mapped_df['Interest_Rate'] = 0.0
                            
                            # Loại bỏ các cột phụ
                            mapped_df = mapped_df[['Date', 'Asset_Class', 'Ticker', 'Type', 'Quantity', 'Price', 'Total_Value', 'Interest_Rate']]
                        
                        # Kết nối và Lưu dữ liệu
                        if not mapped_df.empty:
                            # Chỉ lấy 8 cột chuẩn để tránh lỗi concat
                            final_cols = ['Date', 'Asset_Class', 'Ticker', 'Type', 'Quantity', 'Price', 'Total_Value', 'Interest_Rate']
                            mapped_df_final = mapped_df[final_cols].copy()
                            
                            st.session_state['transactions_df'] = pd.concat([st.session_state['transactions_df'], mapped_df_final], ignore_index=True)
                            
                            update_holdings()
                            save_data()
                            
                            st.success(f"Nạp thành công {len(mapped_df_final)} dòng dữ liệu!")
                            if hasattr(st, 'rerun'): st.rerun()
                            else: st.experimental_rerun()
                        else:
                            st.warning("Không có dữ liệu hợp lệ sau khi xử lý.")

                            
        except Exception as e:
            st.error(f"Lỗi đọc File hoặc Mapping: {e}")

# --- SIDEBAR: CÀI ĐẶT & RESET DỮ LIỆU ---
st.sidebar.markdown("---")
with st.sidebar.expander("⚙️ Cài đặt & Quản lý Dữ liệu"):
    st.write("Dữ liệu của bạn được tự động lưu trữ trên máy tính.")
    if st.button("🗑️ Xóa toàn bộ dữ liệu", help="Hành động này không thể hoàn tác!"):
        # Xóa file vật lý
        if os.path.exists(TRANSACTIONS_FILE):
            os.remove(TRANSACTIONS_FILE)
        if os.path.exists(HOLDINGS_FILE):
            os.remove(HOLDINGS_FILE)
            
        # Reset Session State
        st.session_state['transactions_df'] = pd.DataFrame(columns=['Date', 'Asset_Class', 'Ticker', 'Type', 'Quantity', 'Price', 'Interest_Rate', 'Total_Value'])
        st.session_state['holdings_df'] = pd.DataFrame(columns=['Asset_Class', 'Ticker', 'Total_Shares', 'Average_Cost', 'Current_Price', 'Market_Value'])
        
        st.success("Đã xóa toàn bộ dữ liệu!")
        
        # Tự động tải lại trang
        if hasattr(st, 'rerun'):
            st.rerun()
        else:
            st.experimental_rerun()

# --- XỬ LÝ DỮ LIỆU BẢNG DANH MỤC (DATA EDITOR) ---
st.header("💼 Danh mục Hiện tại (Holdings)")

col_header, col_btn = st.columns([2, 1])
with col_btn:
    update_price_btn = st.button("🔄 Cập nhật Giá (Live yfinance)", use_container_width=True)

if update_price_btn and not st.session_state['holdings_df'].empty:
    with st.spinner("Đang tải dữ liệu giá từ thị trường..."):
        df_temp = st.session_state['holdings_df'].copy()
        updated_count = 0
        
        for index, row in df_temp.iterrows():
            if row['Asset_Class'] == 'Cổ phiếu' and row['Total_Shares'] > 0:
                ticker = row['Ticker']
                try:
                    # Gắn đuôi .VN cho chứng khoán Việt Nam
                    symbol = f"{ticker}.VN"
                    ticker_data = yf.Ticker(symbol)
                    hist = ticker_data.history(period="1d")
                    
                    if not hist.empty:
                        live_price = float(hist['Close'].iloc[-1])
                        # Cập nhật giá và tính lại Market Value
                        df_temp.at[index, 'Current_Price'] = live_price
                        df_temp.at[index, 'Market_Value'] = live_price * row['Total_Shares']
                        updated_count += 1
                except Exception as e:
                    pass # Bỏ qua nếu lỗi mạng hoặc mã không tồn tại trên yfinance
                    
        if updated_count > 0:
            st.session_state['holdings_df'] = df_temp
            save_data()
            st.success(f"Đã cập nhật giá Live cho {updated_count} mã cổ phiếu!")
        else:
            st.warning("Không thể lấy giá lúc này hoặc không có mã cổ phiếu hợp lệ.")

if not st.session_state['holdings_df'].empty:
    display_df = st.session_state['holdings_df'].copy()
    
    # Tính toán ROI để tạo cột hiển thị '% Lãi/Lỗ'
    def calc_roi(row):
        if row['Ticker'] == 'CASH' or row['Average_Cost'] == 0:
            return 0.0
        if row['Asset_Class'] == 'Tiết kiệm':
            return ((row['Market_Value'] - row['Average_Cost']) / row['Average_Cost']) * 100.0
        return ((row['Current_Price'] - row['Average_Cost']) / row['Average_Cost']) * 100.0
        
    display_df['% Lãi/Lỗ'] = display_df.apply(calc_roi, axis=1)
    
    # Hàm gán màu theo tỷ suất sinh lời
    def color_profit_loss(row):
        roi = row['% Lãi/Lỗ']
        if roi > 0:
            return ['color: #00C853'] * len(row)  # Xanh lá cây
        elif roi < 0:
            return ['color: #FF1744'] * len(row)  # Đỏ
        else:
            return [''] * len(row)
            
    # Áp dụng Style lên DataFrame
    styled_df = display_df.style.apply(color_profit_loss, axis=1)
    
    edited_df = st.data_editor(
        styled_df,
        disabled=['Asset_Class', 'Ticker', 'Total_Shares', 'Average_Cost', 'Market_Value', '% Lãi/Lỗ'],
        column_config={
            "Total_Shares": st.column_config.NumberColumn(format="%.4f"),
            "Average_Cost": st.column_config.NumberColumn(format="%.2f"),
            "Current_Price": st.column_config.NumberColumn(format="%.2f", min_value=0.0),
            "Market_Value": st.column_config.NumberColumn(format="%.2f"),
            "% Lãi/Lỗ": st.column_config.NumberColumn(format="%.2f%%")
        },
        use_container_width=True,
        hide_index=True,
        key="portfolio_editor"
    )
    
    # Loại bỏ cột phụ trợ trước khi so sánh tránh sửa đổi Schema gốc
    edited_core_df = edited_df.drop(columns=['% Lãi/Lỗ'])
    
    # So sánh để tìm sự thay đổi
    if not edited_core_df.equals(st.session_state['holdings_df']):
        def recalc_market_value(row):
            if row['Ticker'] == 'CASH':
                return row['Total_Shares']
            elif row['Asset_Class'] == 'Tiết kiệm':
                df_temp = st.session_state['holdings_df']
                orig_rows = df_temp[df_temp['Ticker'] == row['Ticker']]
                if orig_rows.empty: return 0.0
                return orig_rows.iloc[0]['Market_Value']
            else:
                return row['Total_Shares'] * row['Current_Price']
                
        def recalc_current_price(row):
            if row['Ticker'] == 'CASH':
                return 1.0
            elif row['Asset_Class'] == 'Tiết kiệm':
                df_temp = st.session_state['holdings_df']
                orig_rows = df_temp[df_temp['Ticker'] == row['Ticker']]
                if orig_rows.empty: return 0.0
                return orig_rows.iloc[0]['Current_Price']
            else:
                return row['Current_Price']

        edited_core_df['Current_Price'] = edited_core_df.apply(recalc_current_price, axis=1)
        edited_core_df['Market_Value'] = edited_core_df.apply(recalc_market_value, axis=1)
        
        # Ghi đè lại session state, Account Summary phía dưới sẽ tự động lấy data mới nhất để render
        st.session_state['holdings_df'] = edited_core_df
        
        # Lưu Backup state
        save_data()
        
        # Ép tải lại trang để Account Summary và Biểu đồ cập nhật số mới
        if hasattr(st, 'rerun'):
            st.rerun()
        else:
            st.experimental_rerun()
else:
    st.info("Danh mục hiện đang trống.")

st.markdown("---")

# --- TÍNH TOÁN TỔNG QUAN TÀI KHOẢN ---
def calculate_account_summary():
    transactions = st.session_state['transactions_df']
    holdings = st.session_state['holdings_df']
    
    # Tính Vốn Nạp
    total_invested = 0.0
    if not transactions.empty:
        deposits = transactions[transactions['Type'] == 'DEPOSIT']['Total_Value'].sum()
        withdraws = transactions[transactions['Type'] == 'WITHDRAW']['Total_Value'].sum()
        total_invested = deposits - withdraws
        
    # Tính Tổng Tài Sản Hiện Tại
    current_balance = 0.0
    if not holdings.empty:
        current_balance = holdings['Market_Value'].sum()
        
    # Tính Lãi/Lỗ và ROI
    total_profit = current_balance - total_invested
    
    roi_percent = 0.0
    if total_invested > 0:
        roi_percent = (total_profit / total_invested) * 100
        
    return total_invested, current_balance, total_profit, roi_percent

# --- HIỂN THỊ MAIN PAGE --- 
st.header("📊 Tổng quan Tài khoản (Account Summary)")

total_invested, current_balance, total_profit, roi = calculate_account_summary()

col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric(label="Tổng Vốn Đầu Tư", value=f"{total_invested:,.0f} ₫")
    
with col2:
    st.metric(label="Tổng Tài Sản Hiện Tại", value=f"{current_balance:,.0f} ₫")
    
with col3:
    st.metric(label="Lãi / Lỗ Ròng", value=f"{total_profit:,.0f} ₫", delta=f"{total_profit:,.0f} ₫")

with col4:
    st.metric(label="Tỷ suất Sinh lời (ROI)", value=f"{roi:,.2f}%", delta=f"{roi:,.2f}%")

st.markdown("---")

# --- BIỂU ĐỒ DÒNG VỐN ĐẦU TƯ TÍCH LŨY ---
st.subheader("📈 Hành trình Vốn Đầu tư Tích lũy (Cumulative Capital)")

transactions_history = st.session_state['transactions_df']
cash_flows = transactions_history[transactions_history['Type'].isin(['DEPOSIT', 'WITHDRAW', 'DIVIDEND'])].copy()

if not cash_flows.empty:
    def get_net_cash(row):
        if row['Type'] in ['DEPOSIT', 'DIVIDEND']:
            return row['Total_Value']
        elif row['Type'] == 'WITHDRAW':
            return -row['Total_Value']
        return 0
        
    cash_flows['Net_Cash'] = cash_flows.apply(get_net_cash, axis=1)
    
    # Nhóm theo ngày và tính tổng
    daily_cash_flow = cash_flows.groupby(cash_flows['Date'].dt.date)['Net_Cash'].sum().reset_index()
    daily_cash_flow = daily_cash_flow.sort_values(by='Date')
    
    # Tính cộng dồn
    daily_cash_flow['Cumulative_Capital'] = daily_cash_flow['Net_Cash'].cumsum()
    
    # Bổ sung điểm neo cho đến Ngày Hiện Tại (nếu cần thiết kéo dài đường ngang đồ thị)
    if not daily_cash_flow.empty:
        last_date = daily_cash_flow.iloc[-1]['Date']
        today_date = pd.Timestamp.today().date()
        
        if last_date < today_date:
            last_capital = daily_cash_flow.iloc[-1]['Cumulative_Capital']
            anchor_row = pd.DataFrame({
                'Date': [today_date],
                'Net_Cash': [0.0],
                'Cumulative_Capital': [last_capital]
            })
            daily_cash_flow = pd.concat([daily_cash_flow, anchor_row], ignore_index=True)
    
    # Vẽ biểu đồ
    fig_area = px.area(
        daily_cash_flow,
        x='Date',
        y='Cumulative_Capital',
        title="Biểu đồ Vốn Đầu tư Tích lũy theo thời gian",
        color_discrete_sequence=['#00C853'], # Xanh lá tăng trưởng
        line_shape='hv'
    )
    
    # Tùy chỉnh hover và trục X
    fig_area.update_layout(
        hovermode="x unified",
        xaxis_tickformat="%d/%m/%Y"
    )
    
    st.plotly_chart(fig_area, use_container_width=True)
else:
    st.info("Chưa có dữ liệu dòng vốn nạp/rút.")
    
st.markdown("---")

# --- BIỂU ĐỒ PHÂN BỔ TÀI SẢN ---
st.subheader("🍩 Cơ cấu Tài sản (Asset Allocation)")

if not st.session_state['holdings_df'].empty:
    # Lọc các tài sản có Market_Value > 0 để vẽ biểu đồ
    df_chart = st.session_state['holdings_df'][st.session_state['holdings_df']['Market_Value'] > 0]
    
    if not df_chart.empty:
        col_chart, col_perf = st.columns([1, 1]) # Chia cột để hiển thị 2 biểu đồ
        with col_chart:
            # Vẽ biểu đồ Donut
            fig = px.pie(
                df_chart, 
                names='Asset_Class', 
                values='Market_Value', 
                hole=0.4,
                title="Cơ cấu Lớp Tài sản"
            )
            # Tùy chỉnh hover
            fig.update_traces(textposition='inside', textinfo='percent+label')
            st.plotly_chart(fig, use_container_width=True)
            
        with col_perf:
            # Vẽ biểu đồ Hiệu suất Sinh lời
            perf_df = st.session_state['holdings_df'].copy()
            perf_df = perf_df[perf_df['Ticker'] != 'CASH']
            
            if not perf_df.empty:
                # Tính Lãi/Lỗ ròng
                perf_df['Profit_Loss'] = perf_df['Market_Value'] - (perf_df['Total_Shares'] * perf_df['Average_Cost'])
                perf_df = perf_df.sort_values(by='Profit_Loss', ascending=True)
                
                # Tạo màu phân biệt Lãi/Lỗ
                perf_df['Color'] = perf_df['Profit_Loss'].apply(lambda x: '#00C853' if x >= 0 else '#FF1744')
                
                fig_bar = px.bar(
                    perf_df,
                    x='Profit_Loss',
                    y='Ticker',
                    orientation='h',
                    title="Hiệu suất Lãi/Lỗ theo Tài sản"
                )
                
                # Gán trực tiếp màu
                fig_bar.update_traces(marker_color=perf_df['Color'])
                st.plotly_chart(fig_bar, use_container_width=True)
            else:
                st.info("Chưa có hiệu suất tài sản chi tiết.")
    else:
        st.info("Chưa có tài sản nào để hiển thị biểu đồ.")
else:
    st.info("Chưa có tài sản nào để hiển thị biểu đồ.")

st.markdown("---")
# --- PHÂN TÍCH CHI TIẾT TỪNG TÀI SẢN (DRILL-DOWN) ---
st.header("🔍 Phân tích Chi tiết Tài sản")

if not st.session_state['holdings_df'].empty:
    # Lấy danh sách Ticker duy nhất (trừ CASH nếu muốn tập trung vào tài sản đầu tư)
    available_tickers = st.session_state['holdings_df'][st.session_state['holdings_df']['Ticker'] != 'CASH']['Ticker'].unique().tolist()
    
    if available_tickers:
        selected_ticker = st.selectbox("Chọn Mã Tài sản để xem chi tiết:", options=available_tickers)
        
        if selected_ticker:
            # 1. Lấy thông tin từ Danh mục
            asset_info = st.session_state['holdings_df'][st.session_state['holdings_df']['Ticker'] == selected_ticker].iloc[0]
            
            # 2. Lọc lịch sử giao dịch riêng mã này
            asset_tx = st.session_state['transactions_df'][st.session_state['transactions_df']['Ticker'] == selected_ticker].sort_values(by='Date', ascending=False)
            
            # 3. Tính toán một số chỉ số nhanh
            total_qty_bought = st.session_state['transactions_df'][(st.session_state['transactions_df']['Ticker'] == selected_ticker) & (st.session_state['transactions_df']['Type'] == 'BUY')]['Quantity'].sum()
            total_qty_sold = st.session_state['transactions_df'][(st.session_state['transactions_df']['Ticker'] == selected_ticker) & (st.session_state['transactions_df']['Type'] == 'SELL')]['Quantity'].sum()
            
            unrealized_pl = asset_info['Market_Value'] - (asset_info['Total_Shares'] * asset_info['Average_Cost'])
            roi_detail = (unrealized_pl / (asset_info['Total_Shares'] * asset_info['Average_Cost']) * 100) if (asset_info['Total_Shares'] * asset_info['Average_Cost']) > 0 else 0
            
            # Hiển thị Metrics
            m_col1, m_col2, m_col3, m_col4 = st.columns(4)
            with m_col1:
                st.metric("Số lượng hiện nắm giữ", f"{asset_info['Total_Shares']:.4f}")
            with m_col2:
                st.metric("Giá vốn Trung bình", f"{asset_info['Average_Cost']:,.2f} ₫")
            with m_col3:
                st.metric("Lãi/Lỗ tạm tính (Unrealized)", f"{unrealized_pl:,.0f} ₫", delta=f"{roi_detail:.2f}%")
            with m_col4:
                st.metric("Tổng Mua / Tổng Bán", f"{total_qty_bought:.2f} / {total_qty_sold:.2f}")
            
            # Hiển thị bảng giao dịch riêng
            st.subheader(f"📜 Lịch sử Giao dịch: {selected_ticker}")
            st.dataframe(
                asset_tx.style.format({
                    'Date': lambda t: t.strftime('%Y-%m-%d') if pd.notnull(t) else '',
                    'Quantity': '{:,.4f}',
                    'Price': '{:,.2f}',
                    'Total_Value': '{:,.2f}'
                }),
                use_container_width=True,
                hide_index=True
            )
    else:
        st.info("Chưa có mã tài sản đầu tư nào trong danh mục.")
else:
    st.info("Danh mục hiện đang trống.")

st.markdown("---")
st.subheader("📋 Lịch sử Giao dịch Chung (All Transactions)")
st.dataframe(
    st.session_state['transactions_df'].sort_values(by='Date', ascending=False).style.format({
        'Date': lambda t: t.strftime('%Y-%m-%d') if pd.notnull(t) else '',
        'Quantity': '{:,.4f}',
        'Price': '{:,.2f}',
        'Total_Value': '{:,.2f}'
    }), 
    use_container_width=True,
    hide_index=True
)



