export interface AudienceRecord {
  zip: string;
  audienceType: string;
  audienceCount: number;
}

export interface InvalidAudienceRow {
  row: number;
  reason: string;
}

export interface AudienceImportSummary {
  fileName: string;
  rowsProcessed: number;
  rowsImported: number;
  invalidRows: number;
  totalAudience: number;
  audienceTypes: string[];
  zips: string[];
  format: 'long' | 'wide';
  invalid: InvalidAudienceRow[];
}

const ZIP_HEADERS = ['zip code', 'zip', 'zips', 'zipcode', 'zcta', 'zcta5'];
const TYPE_HEADERS = ['audience type', 'audience', 'type', 'segment'];
const COUNT_HEADERS = ['audience count', 'count', 'audience_count', 'volume'];

const META_HEADERS = new Set([
  'state',
  'states',
  'county',
  'city',
  'radius',
  'market',
  'dma',
  'region',
  'fips',
]);

export function normalizeZip(raw: unknown): string | null {
  const s = String(raw ?? '').trim();
  const fiveDigit = s.match(/\d{5}/);
  if (fiveDigit) return fiveDigit[0];

  // Excel often stores ZIPs as numbers, dropping leading zeros (e.g. 7081 → 07081).
  const digitsOnly = s.replace(/\D/g, '');
  if (digitsOnly.length >= 1 && digitsOnly.length <= 5) {
    return digitsOnly.padStart(5, '0');
  }

  return null;
}

export function normalizeAudienceType(name: string): string {
  return name
    .replace(/^[\s•·\u2022]+/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findColumnKey(row: Record<string, string>, candidates: string[]): string | null {
  for (const key of Object.keys(row)) {
    if (candidates.includes(key.trim().toLowerCase())) return key;
  }
  return null;
}

function detectColumns(sample: Record<string, string>) {
  return {
    zipKey: findColumnKey(sample, ZIP_HEADERS),
    typeKey: findColumnKey(sample, TYPE_HEADERS),
    countKey: findColumnKey(sample, COUNT_HEADERS),
  };
}

function getWideAudienceColumns(row: Record<string, string>, zipKey: string): string[] {
  return Object.keys(row).filter(key => {
    if (key === zipKey) return false;
    if (META_HEADERS.has(key.trim().toLowerCase())) return false;
    return true;
  });
}

function parseCount(raw: unknown): number | null {
  if (raw === '' || raw === null || raw === undefined) return 0;
  const n = Number(String(raw).trim().replace(/,/g, ''));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function addRecord(
  aggregated: Map<string, AudienceRecord>,
  zip: string,
  audienceType: string,
  count: number
) {
  const key = `${zip}|${audienceType}`;
  const existing = aggregated.get(key);
  if (existing) {
    existing.audienceCount += count;
  } else {
    aggregated.set(key, { zip, audienceType, audienceCount: count });
  }
}

function buildSummary(
  fileName: string,
  rawRowCount: number,
  aggregated: Map<string, AudienceRecord>,
  invalid: InvalidAudienceRow[],
  format: 'long' | 'wide'
): AudienceImportSummary {
  const records = Array.from(aggregated.values());
  return {
    fileName,
    rowsProcessed: rawRowCount,
    rowsImported: records.length,
    invalidRows: invalid.length,
    totalAudience: records.reduce((s, r) => s + r.audienceCount, 0),
    audienceTypes: [...new Set(records.map(r => r.audienceType))].sort(),
    zips: [...new Set(records.map(r => r.zip))].sort(),
    format,
    invalid: invalid.slice(0, 50),
  };
}

function parseLongFormat(
  rawRows: Record<string, string>[],
  fileName: string,
  zipKey: string,
  typeKey: string,
  countKey: string
): { records: AudienceRecord[]; summary: AudienceImportSummary } {
  const invalid: InvalidAudienceRow[] = [];
  const aggregated = new Map<string, AudienceRecord>();

  rawRows.forEach((row, index) => {
    const rowNum = index + 2;
    const zip = normalizeZip(row[zipKey]);
    const audienceType = normalizeAudienceType(String(row[typeKey] ?? ''));
    const count = parseCount(row[countKey]);

    if (!zip) {
      invalid.push({ row: rowNum, reason: 'Invalid ZIP code' });
      return;
    }
    if (!audienceType) {
      invalid.push({ row: rowNum, reason: 'Audience type is required' });
      return;
    }
    if (count === null) {
      invalid.push({ row: rowNum, reason: 'Audience count must be a non-negative number' });
      return;
    }

    addRecord(aggregated, zip, audienceType, count);
  });

  const summary = buildSummary(fileName, rawRows.length, aggregated, invalid, 'long');
  return { records: Array.from(aggregated.values()), summary };
}

function parseWideFormat(
  rawRows: Record<string, string>[],
  fileName: string,
  zipKey: string
): { records: AudienceRecord[]; summary: AudienceImportSummary } {
  const invalid: InvalidAudienceRow[] = [];
  const aggregated = new Map<string, AudienceRecord>();
  const audienceColumns = getWideAudienceColumns(rawRows[0]!, zipKey);

  if (audienceColumns.length === 0) {
    return {
      records: [],
      summary: {
        fileName,
        rowsProcessed: rawRows.length,
        rowsImported: 0,
        invalidRows: rawRows.length,
        totalAudience: 0,
        audienceTypes: [],
        zips: [],
        format: 'wide',
        invalid: [{ row: 1, reason: 'No audience segment columns found' }],
      },
    };
  }

  rawRows.forEach((row, index) => {
    const rowNum = index + 2;
    const zip = normalizeZip(row[zipKey]);

    if (!zip) {
      invalid.push({ row: rowNum, reason: 'Invalid ZIP code' });
      return;
    }

    for (const col of audienceColumns) {
      const audienceType = normalizeAudienceType(col);
      if (!audienceType) continue;

      const count = parseCount(row[col]);
      if (count === null) {
        invalid.push({
          row: rowNum,
          reason: `Invalid count for "${audienceType}"`,
        });
        continue;
      }

      if (count > 0) {
        addRecord(aggregated, zip, audienceType, count);
      }
    }
  });

  const summary = buildSummary(fileName, rawRows.length, aggregated, invalid, 'wide');
  return { records: Array.from(aggregated.values()), summary };
}

export function validateAudienceRows(
  rawRows: Record<string, string>[],
  fileName: string
): { records: AudienceRecord[]; summary: AudienceImportSummary } {
  if (rawRows.length === 0) {
    return {
      records: [],
      summary: {
        fileName,
        rowsProcessed: 0,
        rowsImported: 0,
        invalidRows: 0,
        totalAudience: 0,
        audienceTypes: [],
        zips: [],
        format: 'long',
        invalid: [{ row: 0, reason: 'File is empty' }],
      },
    };
  }

  const { zipKey, typeKey, countKey } = detectColumns(rawRows[0]!);

  if (!zipKey) {
    return {
      records: [],
      summary: {
        fileName,
        rowsProcessed: rawRows.length,
        rowsImported: 0,
        invalidRows: rawRows.length,
        totalAudience: 0,
        audienceTypes: [],
        zips: [],
        format: 'long',
        invalid: [
          {
            row: 1,
            reason: 'Missing ZIP column (ZIP, ZIPS, or ZIP Code)',
          },
        ],
      },
    };
  }

  const isLong = Boolean(typeKey && countKey);
  if (isLong && typeKey && countKey) {
    return parseLongFormat(rawRows, fileName, zipKey, typeKey, countKey);
  }

  return parseWideFormat(rawRows, fileName, zipKey);
}
