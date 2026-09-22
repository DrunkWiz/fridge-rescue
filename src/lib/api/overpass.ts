import { FALLBACK_DROP_OFFS } from '@/data/fallback-drop-offs';

export type LatLon = { lat: number; lon: number };

export type DropOff = {
  id: string;
  name: string;
  address?: string;
  openingHours?: string;
  distanceKm: number;
  location: LatLon;
  source: 'openstreetmap' | 'bundled';
};

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
export const SEARCH_RADIUS_KM = 15;
const MAX_RESULTS = 20;

/** Great-circle distance. Accurate enough for "which drop-off is closest". */
export function distanceKm(a: LatLon, b: LatLon): number {
  const R = 6371;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

type OverpassElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: LatLon;
  tags?: Record<string, string>;
};

function formatAddress(tags: Record<string, string>): string | undefined {
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const parts = [street, tags['addr:postcode'], tags['addr:city']].filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
}

/**
 * Food banks tagged in OpenStreetMap near a point. OSM tags them two ways, so
 * we query both. Coverage is patchy in places — callers merge in the bundled list.
 */
export async function fetchFoodBanks(origin: LatLon, radiusKm = SEARCH_RADIUS_KM): Promise<DropOff[]> {
  const around = `(around:${Math.round(radiusKm * 1000)},${origin.lat},${origin.lon})`;
  const query = `[out:json][timeout:20];
(
  nwr["social_facility"="food_bank"]${around};
  nwr["amenity"="food_bank"]${around};
);
out center tags;`;

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass returned ${res.status}`);
  const json = (await res.json()) as { elements: OverpassElement[] };

  return json.elements
    .map((el): DropOff | null => {
      const location = el.center ?? (el.lat != null && el.lon != null ? { lat: el.lat, lon: el.lon } : null);
      if (!location) return null;
      const tags = el.tags ?? {};
      return {
        id: `osm-${el.type}-${el.id}`,
        name: tags.name ?? tags.operator ?? 'Food bank',
        address: formatAddress(tags),
        openingHours: tags.opening_hours,
        distanceKm: distanceKm(origin, location),
        location,
        source: 'openstreetmap',
      };
    })
    .filter((d): d is DropOff => d !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_RESULTS);
}

/** Verified drop-off points shipped with the app, for areas OSM doesn't cover. */
export function bundledDropOffs(origin: LatLon, radiusKm = SEARCH_RADIUS_KM * 2): DropOff[] {
  return FALLBACK_DROP_OFFS.map((d) => ({ ...d, distanceKm: distanceKm(origin, d.location), source: 'bundled' as const }))
    .filter((d) => d.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/** OSM results first, then bundled points that OSM didn't already return. */
export async function findDropOffs(origin: LatLon): Promise<{ dropOffs: DropOff[]; osmFailed: boolean }> {
  const bundled = bundledDropOffs(origin);
  try {
    const osm = await fetchFoodBanks(origin);
    const extra = bundled.filter((b) => !osm.some((o) => distanceKm(o.location, b.location) < 0.1));
    return { dropOffs: [...osm, ...extra].sort((a, b) => a.distanceKm - b.distanceKm), osmFailed: false };
  } catch (error) {
    console.warn('Overpass lookup failed', error);
    return { dropOffs: bundled, osmFailed: true };
  }
}

/** Manual location entry: turn "Leeds" or a postcode into coordinates (keyless, OSM Nominatim). */
export async function geocode(place: string): Promise<(LatLon & { label: string }) | null> {
  const res = await fetch(`${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(place)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const [hit] = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  return hit ? { lat: Number(hit.lat), lon: Number(hit.lon), label: hit.display_name } : null;
}
