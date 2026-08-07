import { NextResponse } from 'next/server';

// Proxies Google's Places API (New) Autocomplete so the API key stays server-side — the client
// only ever talks to this route, never to Google directly. Powers the pickup-point/destination
// "type and pick a real place" fields, replacing a free-text city field: picking a suggestion
// gives an exact place_id (no ambiguity), instead of relying on the user typing an exact address.
export async function POST(request) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return NextResponse.json({ suggestions: [], error: 'לא הוגדר מפתח Google Maps בשרת.' });

  const { input } = await request.json();
  if (!input?.trim()) return NextResponse.json({ suggestions: [] });

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey },
      body: JSON.stringify({ input, languageCode: 'he', regionCode: 'IL' }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ suggestions: [], error: data.error?.message || `שגיאה מ-Google Places (${res.status}).` });
    const suggestions = (data.suggestions || [])
      .filter(s => s.placePrediction)
      .map(s => ({
        description: s.placePrediction.text?.text || s.placePrediction.structuredFormat?.mainText?.text || '',
        placeId: s.placePrediction.placeId,
      }))
      .filter(s => s.description && s.placeId);
    return NextResponse.json({ suggestions });
  } catch (e) {
    return NextResponse.json({ suggestions: [], error: e.message || 'שגיאת רשת בפנייה ל-Google Maps.' });
  }
}
