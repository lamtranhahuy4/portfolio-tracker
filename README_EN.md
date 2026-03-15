*[🇻🇳 Tiếng Việt](README.md) | **🇬🇧 English***

# 📈 Portfolio Tracker Application

## 📌 Introduction

**Portfolio Tracker** is an intuitive web dashboard application built entirely with **Python Streamlit**. It solves the problem of managing multi-asset portfolios (Stocks, Cash, Crypto, ETFs, Savings, Real Estate, etc.) for retail investors.

The system automatically calculates Average Cost, manages CASH Flow, updates Mark-to-Market valuation in real-time, handles Accrued Interest for Savings accounts, and visualizes personal investment cash flows with a beautiful step-line chart.

---

## ✨ Key Features

1. **Smart Multi-Asset Management**: Supports multiple asset classes. Notably, the **Savings** module has its own logic to calculate `Accrued Interest` automatically based on `days_elapsed`, without being affected by the average cost formula used for stocks.
2. **Cumulative Cash Flow Chart (Step-line Area Chart)**: Visualizes the net deposit/withdrawal process over time as an eye-catching green step-line area chart (`hv`). The chart includes an "anchor time" algorithm to ensure a perfect horizontal line to the present day even if there is only 1 single deposit transaction.
3. **Smart Data Editor / Mark-to-Market**: A holdings table integrated with an Inline-Editor allows "Live" modification of current market prices. The "Memory" mechanism prevents price resets upon new transactions. For `CASH` and `Savings`, the system implements a filter to lock overriding, protecting the automated yield calculations.
4. **Bulk Import**: Supports importing `.csv` and `.xlsx` files. A "Confirm" button helps to completely resolve Streamlit form's Double-Import issue.
5. **Data Persistence**: System files are immediately backed up to the `/data/` partition. Reloading the browser restores the exact portfolio state.
6. **Account Summary Dashboard**: Calculates Net Profit/Loss, Total Balance, Total Invested, and ROI (%). Accompanied by a Donut Chart depicting risk allocation across the portfolio.
7. **Automated Market Data (Live Price API)**: Integrates the `yfinance` library, allowing you to update the latest closing prices of Stocks, ETFs (supporting the VN market via the `.VN` suffix) and Crypto (via the `-USD` suffix) with just one click. The system automatically categorizes and **ignores** unlisted assets (Cash, Savings) to preserve internal valuation.

---

## 💾 Data Schema

The application operates based on a Session State mechanism piped into Pandas DataFrames.

### 1. Transaction History Table (`transactions_df`)
* `Date`: Date of the transaction execution.
* `Asset_Class`: Categorized asset class (Stocks, Savings, Cash...).
* `Ticker`: Trading symbol of the asset.
* `Type`: Classification of cash flow (BUY / SELL / DEPOSIT / WITHDRAW / DIVIDEND).
* `Quantity` & `Price`: Amount and Price. (For Savings accounts, flexibly transforms into Deposit Amount boosted into `Total_Value`).
* `Interest_Rate`: Annual Interest Rate % attribute (Exclusively serves the Savings class).
* `Total_Value`: Net cash flow amount.

### 2. Current Holdings Table (`holdings_df`)
* `Total_Shares`: Total quantity held or Balance.
* `Average_Cost`: Average cost basis (Weighted Average) or Principal investment amount (for Savings).
* `Current_Price`: Live market price currently trading.
* `Market_Value`: Total current asset valuation. Stores and immediately reflects the compounding accrued interest of Savings up to the current day.

### 3. Sample Import File Format (CSV/Excel)
To use the Bulk Import feature, your file must have a Header row with exactly these 6 basic columns (The Interest_Rate column is auto-generated):

| Date       | Asset_Class  | Ticker   | Type    | Quantity | Price    |
|------------|--------------|----------|---------|----------|----------|
| 2026-03-01 | Tiền mặt     | CASH     | DEPOSIT | 0        | 50000000 |
| 2026-03-02 | Cổ phiếu     | FPT      | BUY     | 500      | 100000   |
| 2026-03-15 | Tiết kiệm    | VCB_6T   | BUY     | 1        | 20000000 |

*(Note: Date format should ideally be YYYY-MM-DD).*

---
## 🗺️ Development Roadmap
- [x] Phase 1-7: Build Data Core, DCA, Compound Interest, and Visualization.
- [ ] Phase 8: Integrate APIs (VNStock / yfinance) for automated real-time Market Price (Live Price) updates.
- [ ] Phase 9: Diversify advanced Performance Analysis Charts.
- [x] Version 1.0: Complete Data Core, Import Portal, DCA & Compound Interest Management, Cash Flow Visualization (Step-line Area Chart), and Market Price API Integration (Live Price).
- [ ] Version 2.0 (Planned): Improve performance charts per asset ticker and Integrate Database (SQLite/PostgreSQL) for multi-user support.

---

## 🚀 Installation & Startup Guide

### Install Dependencies
```bash
pip install streamlit pandas numpy plotly openpyxl yfinance
```

### Run the Application
Open a Terminal / Command Prompt in the project folder and execute the following command:
```bash
streamlit run app.py
```
Open a browser at `http://localhost:8502` to enjoy the Ultimate Financial Management system!
