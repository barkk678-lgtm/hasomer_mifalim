// Server-only Google Maps helpers (reads GOOGLE_MAPS_API_KEY — never import this from a 'use
// client' component). Used by /api/compute-bus-assignment to get real travel data instead of
// guessing: an LLM has no reliable knowledge of actual road distances/travel times, so the bus
// engine's geography comes from here, not from a model's imagination.

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const DISTANCE_MATRIX_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';

// address should include a city ("נקודת איסוף, עיר") — free-text place names alone are
// ambiguous (e.g. "כיכר העירייה" exists in many Israeli cities). region=il + language=he bias
// results toward Israel, matching the app's actual usage.
export async function geocodeAddress(address) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const trimmed = (address || '').trim();
  if (!apiKey || !trimmed) return null;
  const url = `${GEOCODE_URL}?address=${encodeURIComponent(trimmed)}&region=il&language=he&key=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const loc = data.results?.[0]?.geometry?.location;
    return loc ? { lat: loc.lat, lng: loc.lng } : null;
  } catch {
    return null;
  }
}

// Full pairwise travel-time matrix (seconds) between every point in `points` (order preserved).
// One request covers everything — Distance Matrix API accepts multiple origins/destinations at
// once, well within its 25x25 element limit for the handful of stops a bus plan realistically has.
export async function distanceMatrix(points) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || points.length === 0) return null;
  const coords = points.map(p => `${p.lat},${p.lng}`).join('|');
  const url = `${DISTANCE_MATRIX_URL}?origins=${encodeURIComponent(coords)}&destinations=${encodeURIComponent(coords)}&language=he&key=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 'OK') return null;
    return data.rows.map(row => row.elements.map(el => (el.status === 'OK' ? el.duration.value : null)));
  } catch {
    return null;
  }
}
