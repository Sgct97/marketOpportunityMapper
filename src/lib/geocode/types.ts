export interface GeocodedPlace {
  placeId: string;
  name: string;
  brand: string | null;
  address: string;
  latitude: number;
  longitude: number;
  website: string | null;
}

export interface CompetitorCandidate extends GeocodedPlace {
  distanceMiles: number;
}
