/**
 * importParser.ts — Public Facade
 *
 * This module re-exports the public API from the individual parser modules
 * in `./parsers/`. Existing consumers (actions, tests, services) that import
 * from this path continue to work without any changes.
 *
 * Parser responsibilities:
 *  - CsvParser         → generic CSV trade file (PapaParese)
 *  - DnseTradeParser   → DNSE broker Excel trade report (.xlsx/.xls)
 *  - DnseCashParser    → DNSE broker Excel cash ledger report (.xlsx/.xls)
 *  - BaseParser        → shared text/number utils (not exported here — internal)
 */

export { parseCsv } from './parsers/CsvParser';
export { parseDnseExcel } from './parsers/DnseTradeParser';
export { parseDnseCashRows, parseDnseCashExcel } from './parsers/DnseCashParser';

import { parseCsv } from './parsers/CsvParser';
import { parseDnseExcel } from './parsers/DnseTradeParser';
import { parseDnseCashExcel } from './parsers/DnseCashParser';
import type { ImportCashParseResult, ImportParseResult } from '@/types/portfolio';

/**
 * Auto-detects format and delegates to the correct trade parser.
 * CSV → CsvParser, Excel (.xlsx/.xls) → DnseTradeParser.
 */
export async function parseImportFile(file: File): Promise<ImportParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') {
    return parseDnseExcel(file);
  }
  return parseCsv(file);
}

/**
 * Parses a DNSE cash ledger Excel file.
 * Validates extension before parsing.
 */
export async function parseImportCashFile(file: File): Promise<ImportCashParseResult> {
  return parseDnseCashExcel(file);
}
