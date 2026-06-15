import type {
  DealershipImportSummary,
  DealershipRecord,
  DealershipRole,
  InvalidDealershipRow,
} from './types';

const NAME_HEADERS = ['dealership name', 'dealership', 'name', 'dealer name', 'store name'];
const BRAND_HEADERS = ['brand', 'make', 'oem'];
const ROLE_HEADERS = ['role', 'type', 'dealer type'];
const LAT_HEADERS = ['latitude', 'lat'];
const LNG_HEADERS = ['longitude', 'lng', 'long', 'lon'];
const ADDRESS_HEADERS = ['address', 'street address', 'street', 'location'];

function findColumnKey(row: Record<string, string>, candidates: string[]): string | null {
  for (const key of Object.keys(row)) {
    if (candidates.includes(key.trim().toLowerCase())) return key;
  }
  return null;
}

function normalizeRole(raw: unknown): DealershipRole | null {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (value === 'client' || value === 'dealer' || value === 'our dealer' || value === 'ours') {
    return 'client';
  }
  if (value === 'competitor' || value === 'comp' || value === 'competition') {
    return 'competitor';
  }
  return null;
}

function parseCoordinate(raw: unknown): number | null {
  if (raw === '' || raw === null || raw === undefined) return null;
  const n = Number(String(raw).trim().replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  return n;
}

function isValidLatLng(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function buildSummary(
  fileName: string,
  rawRowCount: number,
  records: DealershipRecord[],
  invalid: InvalidDealershipRow[]
): DealershipImportSummary {
  const mappable = records.filter(r => r.geocodeStatus === 'ok');
  return {
    fileName,
    rowsProcessed: rawRowCount,
    rowsImported: records.length,
    invalidRows: invalid.length,
    brands: [...new Set(records.map(r => r.brand))].sort(),
    clientCount: records.filter(r => r.role === 'client').length,
    competitorCount: records.filter(r => r.role === 'competitor').length,
    mappableCount: mappable.length,
    pendingGeocodeCount: records.filter(r => r.geocodeStatus === 'pending').length,
    invalid: invalid.slice(0, 50),
  };
}

export function validateDealershipRows(
  rawRows: Record<string, string>[],
  fileName: string
): { records: DealershipRecord[]; summary: DealershipImportSummary } {
  if (rawRows.length === 0) {
    return {
      records: [],
      summary: {
        fileName,
        rowsProcessed: 0,
        rowsImported: 0,
        invalidRows: 0,
        brands: [],
        clientCount: 0,
        competitorCount: 0,
        mappableCount: 0,
        pendingGeocodeCount: 0,
        invalid: [{ row: 0, reason: 'File is empty' }],
      },
    };
  }

  const sample = rawRows[0]!;
  const nameKey = findColumnKey(sample, NAME_HEADERS);
  const brandKey = findColumnKey(sample, BRAND_HEADERS);
  const roleKey = findColumnKey(sample, ROLE_HEADERS);
  const latKey = findColumnKey(sample, LAT_HEADERS);
  const lngKey = findColumnKey(sample, LNG_HEADERS);
  const addressKey = findColumnKey(sample, ADDRESS_HEADERS);

  if (!nameKey || !brandKey || !roleKey) {
    const missing = [
      !nameKey && 'Dealership Name',
      !brandKey && 'Brand',
      !roleKey && 'Role',
    ]
      .filter(Boolean)
      .join(', ');
    return {
      records: [],
      summary: {
        fileName,
        rowsProcessed: rawRows.length,
        rowsImported: 0,
        invalidRows: rawRows.length,
        brands: [],
        clientCount: 0,
        competitorCount: 0,
        mappableCount: 0,
        pendingGeocodeCount: 0,
        invalid: [{ row: 1, reason: `Missing required column(s): ${missing}` }],
      },
    };
  }

  const invalid: InvalidDealershipRow[] = [];
  const records: DealershipRecord[] = [];

  rawRows.forEach((row, index) => {
    const rowNum = index + 2;
    const name = String(row[nameKey] ?? '').trim();
    const brand = String(row[brandKey] ?? '').trim();
    const role = normalizeRole(row[roleKey]);
    const lat = latKey ? parseCoordinate(row[latKey]) : null;
    const lng = lngKey ? parseCoordinate(row[lngKey]) : null;
    const address = addressKey ? String(row[addressKey] ?? '').trim() : '';

    if (!name) {
      invalid.push({ row: rowNum, reason: 'Dealership name is required' });
      return;
    }
    if (!brand) {
      invalid.push({ row: rowNum, reason: 'Brand is required' });
      return;
    }
    if (!role) {
      invalid.push({ row: rowNum, reason: 'Role must be client or competitor' });
      return;
    }

    const hasCoords = lat != null && lng != null && isValidLatLng(lat, lng);
    const hasAddress = address.length > 0;

    if (hasCoords) {
      records.push({
        name,
        brand,
        role,
        latitude: lat,
        longitude: lng,
        address: hasAddress ? address : null,
        geocodeStatus: 'ok',
      });
      return;
    }

    if (hasAddress) {
      records.push({
        name,
        brand,
        role,
        latitude: null,
        longitude: null,
        address,
        geocodeStatus: 'pending',
      });
      return;
    }

    invalid.push({ row: rowNum, reason: 'Provide latitude/longitude or an address' });
  });

  return {
    records,
    summary: buildSummary(fileName, rawRows.length, records, invalid),
  };
}
