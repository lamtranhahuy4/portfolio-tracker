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
          
          const cleanStr = row.join(' ').replace(/[\r\n\s]+/g, ' ').toLowerCase();
          
          console.log("DEBUG ROW:", cleanStr); // Thêm theo yêu cầu để debug

          // Nhánh 1: Khớp lệnh (DNSE Form: Header 2 dòng)
          if (cleanStr.includes('chi tiết giao dịch') && cleanStr.includes('loại lệnh') && cleanStr.includes('mã')) {
            // Header phụ (chứa Khối lượng/Giá khớp) nằm ở dòng ngay dưới (i + 1). 
            // Đặt headerRowIndex = i + 1 để vòng lặp trích xuất chạy từ i + 2.
            headerRowIndex = i + 1;
            flowType = 'TRADE';
            
            // Gán cứng index các cột theo form chuẩn của DNSE
            colDate = 1;      // B - Ngày GD
            colType = 2;      // C - Loại lệnh
            colAsset = 3;     // D - Mã
            colAmount = 5;    // F - Khối lượng
            colPrice = 6;     // G - Giá khớp
            break;
          }

          // Nhánh 2: Lịch sử tiền
          const hasMoney = cleanStr.includes('số tiền');
          const hasDesc = cleanStr.includes('diễn giải') || cleanStr.includes('loại nghiệp vụ');
          const hasAssetStr = cleanStr.includes('mã');
          
          if (hasMoney && hasDesc && !hasAssetStr) { // Phải không có 'Mã CK' để tránh nhầm
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
