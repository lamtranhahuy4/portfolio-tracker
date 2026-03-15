import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px

st.set_page_config(page_title="My Streamlit App", page_icon="📈", layout="wide")

st.title("📈 Ứng dụng Quản lý Danh mục Đầu tư (Portfolio Tracker)")

import os

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
        tx_df['Date'] = pd.to_datetime(tx_df['Date'])
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
txn_type = st.sidebar.selectbox("Loại Giao dịch", options=["BUY", "SELL", "DEPOSIT", "WITHDRAW", "DIVIDEND"])
asset_class = st.sidebar.selectbox("Lớp tài sản", options=["Tiền mặt", "Cổ phiếu", "Crypto", "Tiết kiệm", "Bất động sản"])
ticker = st.sidebar.text_input("Mã Ticker", placeholder="VD: VCB, FPT, HPG, SAVING1").upper()

if asset_class == "Tiết kiệm":
    quantity = 1.0
    price = st.sidebar.number_input("Số tiền gửi (VND)", min_value=0.0, step=1000.0, format="%.2f")
    interest_rate = st.sidebar.number_input("Lãi suất (%/năm)", min_value=0.0, step=0.1, format="%.2f")
else:
    quantity = st.sidebar.number_input("Số lượng", min_value=0.0, step=1.0, format="%.4f")
    price = st.sidebar.number_input("Giá (VND)", min_value=0.0, step=1000.0, format="%.2f")
    interest_rate = 0.0
    
submit_button = st.sidebar.button(label="Thêm Giao dịch")

# --- XỬ LÝ SỰ KIỆN THÊM GIAO DỊCH ---
if submit_button:
    if ticker or txn_type in ["DEPOSIT", "WITHDRAW"]: # Ticker can be empty if it's a deposit/withdraw cash flow
        if txn_type in ["DEPOSIT", "WITHDRAW", "DIVIDEND"]:
            total_value = price # Đối với loại giao dịch này lượng tiền = Price nhập vào, không nhân theo Quantity
        else:
            total_value = quantity * price
        
        # Tạo bản ghi mới
        new_transaction = {
            'Date': pd.to_datetime(date),
            'Asset_Class': asset_class,
            'Ticker': ticker,
            'Type': txn_type,
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

# --- SIDEBAR: NHẬP DỮ LIỆU TỪ FILE ---
st.sidebar.markdown("---")
with st.sidebar.expander("📁 Nhập dữ liệu từ file (CSV/Excel)"):
    uploaded_file = st.file_uploader("Chọn file dữ liệu giao dịch", type=["csv", "xlsx"])
    if uploaded_file is not None:
        if st.button("Xác nhận Import File"):
            try:
                # Đọc file bằng pandas
                if uploaded_file.name.endswith('.csv'):
                    df_import = pd.read_csv(uploaded_file)
                else:
                    df_import = pd.read_excel(uploaded_file)
                    
                # Kiểm tra các cột chuẩn
                required_cols = ['Date', 'Asset_Class', 'Ticker', 'Type', 'Quantity', 'Price']
                if not all(col in df_import.columns for col in required_cols):
                    st.error(f"File không đúng định dạng. Cần đủ 6 cột: {', '.join(required_cols)}")
                else:
                    # Ép kiểu datetime
                    df_import['Date'] = pd.to_datetime(df_import['Date'])
                    
                    # Tính toán Total_Value
                    def calculate_total_value(row):
                        if row['Type'] in ['DEPOSIT', 'WITHDRAW', 'DIVIDEND']:
                            return row['Price']
                        else:
                            return row['Quantity'] * row['Price']
                            
                    df_import['Total_Value'] = df_import.apply(calculate_total_value, axis=1)
                    
                    # Loại bỏ các cột thừa nếu có
                    final_cols = ['Date', 'Asset_Class', 'Ticker', 'Type', 'Quantity', 'Price', 'Total_Value']
                    df_import = df_import[final_cols]
                    
                    # Nối vào transactions_df
                    st.session_state['transactions_df'] = pd.concat([st.session_state['transactions_df'], df_import], ignore_index=True)
                    
                    # Tính lại danh mục
                    update_holdings()
                    
                    # Lưu toàn bộ data
                    save_data()
                    
                    st.success(f"Đã import thành công {len(df_import)} giao dịch!")
                    
                    # Làm mới giao diện
                    if hasattr(st, 'rerun'):
                        st.rerun()
                    else:
                        st.experimental_rerun()
            except Exception as e:
                st.error(f"Đã xảy ra lỗi khi đọc file: {e}")

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
if not st.session_state['holdings_df'].empty:
    edited_df = st.data_editor(
        st.session_state['holdings_df'],
        disabled=['Asset_Class', 'Ticker', 'Total_Shares', 'Average_Cost', 'Market_Value'],
        column_config={
            "Total_Shares": st.column_config.NumberColumn(format="%.4f"),
            "Average_Cost": st.column_config.NumberColumn(format="%.2f"),
            "Current_Price": st.column_config.NumberColumn(format="%.2f", min_value=0.0),
            "Market_Value": st.column_config.NumberColumn(format="%.2f")
        },
        use_container_width=True,
        hide_index=True,
        key="portfolio_editor" # Thêm key để quản lý state tốt hơn
    )
    
    # So sánh để tìm sự thay đổi
    if not edited_df.equals(st.session_state['holdings_df']):
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

        edited_df['Current_Price'] = edited_df.apply(recalc_current_price, axis=1)
        edited_df['Market_Value'] = edited_df.apply(recalc_market_value, axis=1)
        
        # Ghi đè lại session state, Account Summary phía dưới sẽ tự động lấy data mới nhất để render
        st.session_state['holdings_df'] = edited_df
        
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
        col_chart, col_empty = st.columns([1, 1]) # Chia cột để biểu đồ không quá to
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
    else:
        st.info("Chưa có tài sản nào để hiển thị biểu đồ.")
else:
    st.info("Chưa có tài sản nào để hiển thị biểu đồ.")

st.markdown("---")
st.subheader("📋 Lịch sử Giao dịch (Transactions)")
st.dataframe(
    st.session_state['transactions_df'].style.format({
        'Date': lambda t: t.strftime('%Y-%m-%d') if pd.notnull(t) else '',
        'Quantity': '{:,.4f}',
        'Price': '{:,.2f}',
        'Total_Value': '{:,.2f}'
    }), 
    use_container_width=True
)


