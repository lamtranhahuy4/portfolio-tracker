import * as XLSX from 'xlsx';

export async function parseExcelToTransactions(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Đọc nguyên bản bằng mảng 2 chiều
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }) as string[][];

        const result: any[] = [];
        let headerRowIndex = -1;
        let flowType: 'TRADE' | 'CASH' | null = null;
        
        let colAsset = -1, colAmount = -1, colPrice = -1, colType = -1, colDate = -1;
        let colMoney = -1, colDesc = -1;

        // Dò mìn Header từ trên xuống
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          
          const rowStr = row.join(' ').toLowerCase();
          
          console.log("DEBUG ROW:", rowStr); // Thêm theo yêu cầu để debug

          // Nhánh 1: Khớp lệnh
          const hasAsset = rowStr.includes('mã');
          const hasVol = rowStr.includes('lượng') || rowStr.includes('kl');
          const hasPrice = rowStr.includes('giá');

          if (hasAsset && hasVol && hasPrice) {
            headerRowIndex = i;
            flowType = 'TRADE';
            
            row.forEach((cell: string, colIdx: number) => {
              const val = String(cell).toLowerCase();
              if (val.includes('mã')) colAsset = colIdx;
              else if (val.includes('lượng') || val.includes('kl')) colAmount = colIdx;
              else if (val.includes('giá')) colPrice = colIdx;
              else if (val.includes('mua') || val.includes('bán') || val.includes('loại') || val.includes('gd')) colType = colIdx;
              else if (val.includes('ngày')) colDate = colIdx;
            });
            break;
          }

          // Nhánh 2: Lịch sử tiền
          const hasMoney = rowStr.includes('số tiền');
          const hasDesc = rowStr.includes('diễn giải') || rowStr.includes('loại nghiệp vụ');
          
          if (hasMoney && hasDesc && !hasAsset) { // Phải không có 'Mã CK' để tránh nhầm
            headerRowIndex = i;
            flowType = 'CASH';
            
            row.forEach((cell: string, colIdx: number) => {
              const val = String(cell).toLowerCase();
              if (val.includes('số tiền')) colMoney = colIdx;
              else if (val.includes('diễn giải') || val.includes('loại nghiệp vụ')) colDesc = colIdx;
              else if (val.includes('ngày')) colDate = colIdx;
            });
            break;
          }
        }

        if (headerRowIndex === -1 || !flowType) {
          reject(new Error('Không tìm thấy dòng Header. Phải có: Mã CK, Khối lượng, Giá khớp (Hoặc Số tiền, Diễn giải).'));
          return;
        }

        // Helper: Hàm làm sạch số (xóa dấu phẩy, chấm ngàn)
        const sanitizeNum = (val: any) => {
          if (!val) return 0;
          const cleaned = String(val).replace(/[,.]/g, '').trim();
          return Number(cleaned) || 0;
        };

        // Trích xuất & Làm sạch Dữ liệu
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          // Bỏ qua dòng trống hoàn toàn
          if (!row || row.length === 0 || row.every(cell => !cell.trim())) continue;

          let dateStr = new Date().toISOString();
          if (colDate > -1 && row[colDate]) {
            const rawDate = String(row[colDate]).trim();
            // Parse chuỗi ngày chuẩn DD/MM/YYYY sang ISO
            const parts = rawDate.split(/[-/]/);
            if (parts.length >= 3) {
              const iso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T12:00:00.000Z`;
              if (!isNaN(Date.parse(iso))) dateStr = iso;
            }
          }

          if (flowType === 'TRADE') {
            const asset = row[colAsset]?.trim() || '';
            const rawType = row[colType]?.toLowerCase() || '';
            const amount = sanitizeNum(row[colAmount]);
            const price = sanitizeNum(row[colPrice]);

            // Bỏ qua nếu ko có đủ dữ liệu cần thiết
            if (!asset || amount <= 0 || price <= 0) continue; 

            let type = 'BUY'; // mặc định fallback
            if (rawType.includes('bán') || rawType === 's') type = 'SELL';
            else if (rawType.includes('mua') || rawType === 'b') type = 'BUY';
            
            result.push({ asset, type, amount, price, date: dateStr });
          } else if (flowType === 'CASH') {
            const amount = sanitizeNum(row[colMoney]);
            const rawDesc = row[colDesc]?.toLowerCase() || '';

            if (amount <= 0) continue;

            let type = 'DEPOSIT';
            if (rawDesc.includes('rút') || rawDesc.includes('phí')) type = 'WITHDRAW';
            else if (rawDesc.includes('nộp') || rawDesc.includes('chuyển khoản đến')) type = 'DEPOSIT';

            result.push({ asset: 'VND', type, amount, price: 1, date: dateStr });
          }
        }

        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Lỗi khi đọc file bằng FileReader.'));
    reader.readAsArrayBuffer(file);
  });
}
