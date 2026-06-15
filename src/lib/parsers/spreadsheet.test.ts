import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseSpreadsheetBuffer } from './spreadsheet';

describe('parseSpreadsheetBuffer — CSV', () => {
  it('parses header row and trims keys', () => {
    const buffer = Buffer.from('ZIP Code,Audience Count\n75067,100\n', 'utf-8');
    const rows = parseSpreadsheetBuffer(buffer, 'test.csv');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ 'ZIP Code': '75067', 'Audience Count': '100' });
  });

  it('skips empty lines', () => {
    const buffer = Buffer.from('ZIP,Count\n75067,10\n\n75068,20\n', 'utf-8');
    const rows = parseSpreadsheetBuffer(buffer, 'test.csv');
    expect(rows).toHaveLength(2);
  });

  it('rejects unsupported extensions', () => {
    const buffer = Buffer.from('data', 'utf-8');
    expect(() => parseSpreadsheetBuffer(buffer, 'file.txt')).toThrow(/Unsupported file type/);
  });
});

describe('parseSpreadsheetBuffer — XLSX', () => {
  it('reads first sheet with trimmed headers', () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ['  ZIP  ', ' Count '],
      ['90632', 42],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Data');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    const rows = parseSpreadsheetBuffer(buffer, 'export.xlsx');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.ZIP).toBe('90632');
    expect(rows[0]?.Count).toBe('42');
  });

  it('returns empty array when first sheet has no data rows', () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([['ZIP', 'Count']]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Data');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    expect(parseSpreadsheetBuffer(buffer, 'headers-only.xlsx')).toEqual([]);
  });
});
