// Server-only Google Maps helpers (reads GOOGLE_MAPS_API_KEY — never import this from a 'use
// client' component). Used by /api/compute-bus-assignment to get real travel data instead of
// guessing: an LLM has no reliable knowledge of actual road distances/travel times, so the bus
// engine's geography comes from here, not from a model's imagination.

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const DISTANCE_MATRIX_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';

// Returns { location: {lat,lng}|null, error: string|null }. `error` carries Google's own reason
// (status + error_message, e.g. "REQUEST_DENIED: This API project is not authorized to use this
// API") whenever the call didn't cleanly succeed — silently returning null for every failure mode
// makes an API-key/billing/enablement problem indistinguishable from a genuinely bad address.
export async function geocodeAddress(address) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const trimmed = (address || '').trim();
  if (!apiKey) return { location: null, error: 'לא הוגדר מפתח Google Maps בשרת.' };
  if (!trimmed) return { location: null, error: null };
  const url = `${GEOCODE_URL}?address=${encodeURIComponent(trimmed)}&region=il&language=he&key=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'OK') {
      const loc = data.results?.[0]?.geometry?.location;
      return loc ? { location: { lat: loc.lat, lng: loc.lng }, error: null } : { location: null, error: null };
    }
    if (data.status === 'ZERO_RESULTS') return { location: null, error: null }; // genuinely just not found — not a system problem
    return { location: null, error: `${data.status}${data.error_message ? `: ${data.error_message}` : ''}` };
  } catch (e) {
    return { location: null, error: e.message || 'שגיאת רשת בפנייה ל-Google Maps.' };
  }
}

// Full pairwise travel-time matrix (seconds) between every point in `points` (order preserved).
// One request covers everything — Distance Matrix API accepts multiple origins/destinations at
// once, well within its 25x25 element limit for the handful of stops a bus plan realistically has.
// Returns { matrix: number[][]|null, error: string|null }, same reasoning as geocodeAddress above.
export async function distanceMatrix(points) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return { matrix: null, error: 'לא הוגדר מפתח Google Maps בשרת.' };
  if (points.length === 0) return { matrix: null, error: null };
  const coords = points.map(p => `${p.lat},${p.lng}`).join('|');
  const url = `${DISTANCE_MATRIX_URL}?origins=${encodeURIComponent(coords)}&destinations=${encodeURIComponent(coords)}&language=he&key=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK') return { matrix: null, error: `${data.status}${data.error_message ? `: ${data.error_message}` : ''}` };
    return { matrix: data.rows.map(row => row.elements.map(el => (el.status === 'OK' ? el.duration.value : null))), error: null };
  } catch (e) {
    return { matrix: null, error: e.message || 'שגיאת רשת בפנייה ל-Google Maps.' };
  }
}
