import { parseImportFile } from '@/lib/importParser';

export async function parseFileToTransactions(file: File) {
  return parseImportFile(file);
}

