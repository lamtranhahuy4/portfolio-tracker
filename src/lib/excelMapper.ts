import { parseImportFile } from '@/lib/importParser';

export async function parseExcelToTransactions(file: File) {
  return parseImportFile(file);
}

