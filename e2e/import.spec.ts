import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';

// Header format mirrors the DNSE parser unit test (src/lib/parsers/__tests__/DnseTradeParser.test.ts).
const DNSE_TOP_HEADER = ['Ngày GD', 'Loại Lệnh', 'Mã', 'Chi tiết giao dịch', '', '', '', '', 'Thuế'];
const DNSE_BOTTOM_HEADER = ['', '', '', 'KHỐI LƯỢNG', 'GIÁ KHỚP', 'GIÁ TRỊ KHỚP', 'PHÍ TRẢ SỐ', 'PHÍ DNSE', ''];

function createDnseTradeXlsx(): Buffer {
  const rows = [
    DNSE_TOP_HEADER,
    DNSE_BOTTOM_HEADER,
    ['15/05/2026', 'MUA', 'HPG', '100', '28500', '28500000', '5000', '0', '0'],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

test('Authenticated user imports a DNSE trade file end-to-end', async ({ page }) => {
  await page.goto('/');

  // AuthPanel renders by default in 'signin' mode - toggle to sign-up first.
  await page.getByRole('button', { name: 'Chưa có tài khoản? Tạo mới' }).click();

  await page.locator('input[name="email"]').fill('e2e-import@example.com');
  await page.locator('input[name="password"]').fill('e2e-import-password-123!');
  await page.locator('input[name="confirmPassword"]').fill('e2e-import-password-123!');
  await page.locator('button[type="submit"]').click();

  // After sign-up, router.refresh() re-renders the page with DashboardClient,
  // which mounts CsvUploaderServerImport (file input becomes visible).
  const fileInput = page.locator('input[type="file"]');
  await expect(fileInput).toBeVisible();

  // Upload the DNSE trade xlsx fixture.
  await fileInput.setInputFiles({
    name: 'dnse-trade.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: createDnseTradeXlsx(),
  });

  // On success the uploader fires toast.success and persists the parsed transaction
  // in the portfolio store, which renders in GroupedTransactionHistoryTable.
  await expect(page.locator('[data-sonner-toast]')).toBeVisible();
  await expect(page.getByText('HPG')).toBeVisible();
});
