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
  const streetName = [num, route].filter(Boolean).join(' ') || (json.results[0].formatted_address as string).split(',')[0];

  return { streetName, postcode };
}
