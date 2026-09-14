import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';

// Header format mirrors the DNSE parser unit test (src/lib/parsers/__tests__/DnseTradeParser.test.ts).
const DNSE_TOP_HEADER = ['Ngày GD', 'Loại Lệnh', 'Mã', 'Chi tiết giao dịch', '', '', '', '', 'Thuế'];
const DNSE_BOTTOM_HEADER = ['', '', '', 'KHỐI LƯỢNG', 'GIÁ KHỚP', 'GIÁ TRỊ KHỚP', 'PHÍ TRẢ SỐ', 'PHÍ DNSE', ''];

// PNJ is deliberately absent from src/lib/mockData.ts so the assertion below
// can only be satisfied by THIS spec's imported file, never by demo data.
const IMPORT_TICKER = 'PNJ';

function createDnseTradeXlsx(): Buffer {
  const rows = [
    DNSE_TOP_HEADER,
    DNSE_BOTTOM_HEADER,
    ['15/05/2026', 'MUA', IMPORT_TICKER, '100', '28500', '28500000', '5000', '0', '0'],
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

  // A brand-new user hits the OnboardingWizard gate (DashboardClient renders
  // ONLY the wizard while transactions.length === 0 and no cutoff date).
  // The wizard has no file input - clear it via the demo-data shortcut, which
  // populates the store client-side (no DB write) so the dashboard mounts.
  const demoButton = page.getByRole('button', { name: 'Tải Dữ Liệu Demo' });
  await expect(demoButton).toBeVisible();
  await demoButton.click();

  // Full dashboard (with CsvUploaderServerImport) renders once the gate passes.
  await expect(page.getByText('.CSV, .XLSX, .XLS').first()).toBeVisible();
  const fileInput = page.locator('input[type="file"]');
  await expect(fileInput).toBeAttached();

  // Upload the DNSE trade xlsx fixture.
  await fileInput.setInputFiles({
    name: 'dnse-trade.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: createDnseTradeXlsx(),
  });

  // On success the uploader fires toast.success and persists the parsed
  // transaction in the portfolio store, which renders in the history table.
  await expect(page.locator('[data-sonner-toast]').first()).toBeVisible();
  await expect(page.getByText(IMPORT_TICKER).first()).toBeVisible();
});
