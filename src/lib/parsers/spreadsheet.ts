import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export function parseSpreadsheetBuffer(buffer: Buffer, fileName: string): Record<string, string>[] {
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.csv')) {
    const text = buffer.toString('utf-8');
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim(),
    });
    if (result.errors.length > 0) {
      throw new Error(result.errors[0]?.message ?? 'CSV parse failed');
    }
    return result.data;
  }

  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    return rows.map(row =>
      Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k.trim(), String(v ?? '').trim()])
      )
    );
  }

  throw new Error('Unsupported file type. Use .csv or .xlsx');
}
