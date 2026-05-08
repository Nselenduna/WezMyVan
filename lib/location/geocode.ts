// ─── Reverse geocoding (lat/lng → address) ───────────────────────────────────
// Used by the map-based route planner when the operator drops or drags a pin.

const GEOCODE_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';

export interface GeocodedAddress {
  streetName: string;
  postcode: string;
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodedAddress> {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const res = await fetch(`${GEOCODE_BASE}?latlng=${lat},${lng}&key=${key}`);
  const json = await res.json();

  if (json.status !== 'OK' || !json.results?.length) {
    return { streetName: '', postcode: '' };
  }

  const components = json.results[0].address_components as Array<{
    long_name: string;
    types: string[];
  }>;

  const num = components.find(c => c.types.includes('street_number'))?.long_name ?? '';
  const route = components.find(c => c.types.includes('route'))?.long_name ?? '';
  const postcode = components.find(c => c.types.includes('postal_code'))?.long_name ?? '';
  const streetName =
    [num, route].filter(Boolean).join(' ') ||
    (json.results[0].formatted_address as string).split(',')[0];

  return { streetName, postcode };
}

// ─── Forward geocoding (postcode → lat/lng) ───────────────────────────────────
// FIX #5: UK postcode validation + 600ms debounce + in-memory cache
// Prevents wasted Google Maps API quota on partial input or rapid tab-outs.

const UK_POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}$/i;

export interface GeocodeResult {
  lat: number;
  lng: number;
}

const _geocodeCache = new Map<string, GeocodeResult>();
const _debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function isValidUKPostcode(postcode: string): boolean {
  return UK_POSTCODE_REGEX.test(postcode.trim());
}

/**
 * Forward-geocode a UK postcode.
 * Returns null immediately for invalid postcodes (no API call).
 * Returns cached result immediately for previously geocoded postcodes.
 */
export async function geocodePostcode(postcode: string): Promise<GeocodeResult | null> {
  const normalised = postcode.trim().toUpperCase();

  if (!isValidUKPostcode(normalised)) return null;

  if (_geocodeCache.has(normalised)) return _geocodeCache.get(normalised)!;

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('Google Maps API key is not configured');

  const url = `${GEOCODE_BASE}?address=${encodeURIComponent(normalised)}&key=${apiKey}&components=country:GB`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Geocoding request failed: ${response.status}`);

  const json = await response.json();
  if (json.status !== 'OK' || !json.results?.length) return null;

  const { lat, lng } = json.results[0].geometry.location;
  const result: GeocodeResult = { lat, lng };
  _geocodeCache.set(normalised, result);
  return result;
}

/**
 * Debounced wrapper for geocodePostcode.
 * Use on onBlur/onChange instead of calling geocodePostcode directly.
 *
 * @param key     Unique key per input field (e.g. `stop-${index}`)
 * @param delayMs Debounce delay in ms (default 600ms)
 */
export function geocodePostcodeDebounced(
  postcode: string,
  key: string,
  onResult: (result: GeocodeResult | null) => void,
  onError: (message: string) => void,
  delayMs = 600,
): void {
  const existing = _debounceTimers.get(key);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(async () => {
    _debounceTimers.delete(key);
    try {
      const result = await geocodePostcode(postcode);
      onResult(result);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Geocoding failed. Please try again.');
    }
  }, delayMs);

  _debounceTimers.set(key, timer);
}
