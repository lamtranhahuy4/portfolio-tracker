import pandas as pd
from vnstock import Vnstock

print("🚀 Bắt đầu dò quét Sự kiện quyền POW từ các nguồn MỚI NHẤT...")

# Thử nguồn 1: KBS (Chứng khoán KB)
print("\n--- 1. Thử nghiệm nguồn KBS ---")
try:
    pow_kbs = Vnstock().stock(symbol='POW', source='KBS')
    df_div_kbs = pow_kbs.company.dividends()
    print("Dữ liệu Cổ tức:")
    print(df_div_kbs.head())
    
    print("\nDữ liệu Sự kiện:")
    df_events_kbs = pow_kbs.company.events()
    print(df_events_kbs.head())
except Exception as e:
    print(f"❌ Nguồn KBS thất bại: {e}")

# Thử nguồn 2: VCI (Chứng khoán Vietcap)
print("\n--- 2. Thử nghiệm nguồn VCI ---")
try:
    pow_vci = Vnstock().stock(symbol='POW', source='VCI')
    df_div_vci = pow_vci.company.dividends()
    print("Dữ liệu Cổ tức:")
    print(df_div_vci.head())
    
    print("\nDữ liệu Sự kiện:")
    df_events_vci = pow_vci.company.events()
    print(df_events_vci.head())
except Exception as e:
    print(f"❌ Nguồn VCI thất bại: {e}")