import { NextResponse } from 'next/server';
import { resolveLocation, distanceMatrix } from '../../../lib/server/googleMaps';
import { scheduleStops } from '../../../lib/busAssignmentEngine';

// Recomputes just the pickup times for ONE bus's stops, in the order given — used after a
// manual drag-reorder on the board so times stay accurate without re-running the full
// bin-packing (which would risk reshuffling groups the user just placed on purpose).
export async function POST(request) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'לא הוגדר מפתח Google Maps בשרת.' }, { status: 400 });

  const { stops, destination, arrivalTime, useTollRoads } = await request.json();
  if (!Array.isArray(stops) || stops.length === 0) return NextResponse.json({ error: 'אין תחנות לתזמן.' }, { status: 400 });
  if (!destination?.trim()) return NextResponse.json({ error: 'חסר יעד סופי.' }, { status: 400 });

  const warnings = [];
  const points = [destination, ...stops];
  const geocoded = await Promise.all(points.map(text => resolveLocation({ text })));

  const systemErrors = [...new Set(geocoded.map(g => g.error).filter(Boolean))];
  if (systemErrors.length > 0) warnings.push(`שגיאה מ-Google Maps: ${systemErrors.join(' | ')}`);

  const validPoints = geocoded.map((g, i) => (g.location ? { i, ...g.location } : null)).filter(Boolean);
  const { matrix, error: matrixError } = validPoints.length >= 2
    ? await distanceMatrix(validPoints.map(p => ({ lat: p.lat, lng: p.lng })), { avoidTolls: !useTollRoads })
    : { matrix: null, error: null };
  if (matrixError) warnings.push(`שגיאת Distance Matrix מ-Google Maps: ${matrixError}`);

  const matrixIndexOf = {};
  validPoints.forEach((p, row) => { matrixIndexOf[p.i] = row; });
  function secBetween(a, b) {
    if (!matrix) return null;
    const ia = matrixIndexOf[a], ib = matrixIndexOf[b];
    if (ia == null || ib == null) return null;
    return matrix[ia]?.[ib] ?? null;
  }
  const destToSec = point => { const idx = stops.indexOf(point); return idx === -1 ? null : secBetween(idx + 1, 0); };
  const stopDistanceSec = (a, b) => { const ia = stops.indexOf(a), ib = stops.indexOf(b); return ia === -1 || ib === -1 ? null : secBetween(ia + 1, ib + 1); };

  const { stopTimes, warnings: scheduleWarnings } = scheduleStops(stops, arrivalTime, destToSec, stopDistanceSec);

  return NextResponse.json({ stopTimes, warnings: [...warnings, ...scheduleWarnings] });
}
