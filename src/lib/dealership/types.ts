export type DealershipRole = 'client' | 'competitor';
export type GeocodeStatus = 'ok' | 'pending' | 'failed';

export interface DealershipRecord {
  name: string;
  brand: string;
  role: DealershipRole;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  geocodeStatus: GeocodeStatus;
}

export interface DealershipRow {
  id: string;
  name: string;
  brand: string;
  role: DealershipRole;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  geocode_status: GeocodeStatus | null;
}

export interface InvalidDealershipRow {
  row: number;
  reason: string;
}

export interface DealershipImportSummary {
  fileName: string;
  rowsProcessed: number;
  rowsImported: number;
  invalidRows: number;
  brands: string[];
  clientCount: number;
  competitorCount: number;
  mappableCount: number;
  pendingGeocodeCount: number;
  invalid: InvalidDealershipRow[];
}
