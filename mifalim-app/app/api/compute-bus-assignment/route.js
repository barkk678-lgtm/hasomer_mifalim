import { NextResponse } from 'next/server';
import { resolveLocation, distanceMatrix } from '../../../lib/server/googleMaps';
import { computeBusAssignment } from '../../../lib/busAssignmentEngine';

export async function POST(request) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'לא הוגדר מפתח Google Maps בשרת.' }, { status: 400 });

  const { groups, busTypes, destination, destinationPlaceId, arrivalTime, useTollRoads } = await request.json();
  if (!Array.isArray(groups) || groups.length === 0) return NextResponse.json({ error: 'אין קבוצות לשבץ.' }, { status: 400 });
  if (!destination?.trim()) return NextResponse.json({ error: 'חסר יעד סופי.' }, { status: 400 });

  const warnings = [];
  const stopKeys = [...new Set(groups.map(g => g.pickup_point).filter(Boolean))];
  // A pickup point picked from the autocomplete dropdown carries a place_id (exact, no
  // ambiguity); free-typed text without a selection has none and falls back to geocoding the
  // raw text. If the same pickup_point text appears on several rows, use whichever has a place_id.
  const stopPlaceIdByKey = {};
  groups.forEach(g => { if (g.pickup_point && g.place_id && !stopPlaceIdByKey[g.pickup_point]) stopPlaceIdByKey[g.pickup_point] = g.place_id; });

  // Index 0 is always the destination; the rest are pickup points, in stopKeys order.
  const points = [
    { text: destination, placeId: destinationPlaceId },
    ...stopKeys.map(k => ({ text: k, placeId: stopPlaceIdByKey[k] || null })),
  ];
  const geocoded = await Promise.all(points.map(p => resolveLocation(p)));

  // A system-level error (bad key, API not enabled, billing off, quota) shows up as the SAME
  // error string on every single call — surface it distinctly from "just couldn't find this one
  // address", since the fix (Google Cloud Console) is completely different from "add a city".
  const systemErrors = [...new Set(geocoded.map(g => g.error).filter(Boolean))];
  if (systemErrors.length > 0) warnings.push(`שגיאה מ-Google Maps: ${systemErrors.join(' | ')} — יש לבדוק ב-Google Cloud Console שה-API מופעל, שהחיוב פעיל, ושהמפתח לא מוגבל בטעות.`);

  const missing = [];
  stopKeys.forEach((k, i) => { if (!geocoded[i + 1].location) missing.push(k); });
  if (!geocoded[0].location) missing.push(`היעד (${destination})`);
  if (missing.length > 0 && systemErrors.length === 0) warnings.push(`לא הצלחנו לאתר את המיקום עבור: ${missing.join(', ')}. כדאי לבחור מתוך רשימת ההצעות שנפתחת בהקלדה (לא רק להקליד טקסט חופשי). זמני הנסיעה עבור אלה יהיו הערכה גסה בלבד.`);

  const validPoints = geocoded.map((g, i) => (g.location ? { i, ...g.location } : null)).filter(Boolean);
  const { matrix, error: matrixError } = validPoints.length >= 2
    ? await distanceMatrix(validPoints.map(p => ({ lat: p.lat, lng: p.lng })), { avoidTolls: !useTollRoads })
    : { matrix: null, error: null };
  if (matrixError) warnings.push(`שגיאת Distance Matrix מ-Google Maps: ${matrixError}`);
  else if (validPoints.length >= 2 && !matrix) warnings.push('לא הצלחנו לקבל זמני נסיעה מ-Google Maps כרגע — כל השעות להלן הן הערכה גסה. כדאי לנסות שוב מאוחר יותר.');

  // Map original point index -> row/col index within `matrix` (only geocoded points have one).
  const matrixIndexOf = {};
  validPoints.forEach((p, row) => { matrixIndexOf[p.i] = row; });

  function secBetween(origIndexA, origIndexB) {
    if (!matrix) return null;
    const a = matrixIndexOf[origIndexA], b = matrixIndexOf[origIndexB];
    if (a == null || b == null) return null;
    return matrix[a]?.[b] ?? null;
  }
  const destToSec = pickupPoint => {
    const idx = stopKeys.indexOf(pickupPoint);
    return idx === -1 ? null : secBetween(idx + 1, 0);
  };
  const stopDistanceSec = (a, b) => {
    const ia = stopKeys.indexOf(a), ib = stopKeys.indexOf(b);
    if (ia === -1 || ib === -1) return null;
    return secBetween(ia + 1, ib + 1);
  };

  const { board, warnings: engineWarnings } = computeBusAssignment({ groups, busTypes, arrivalTime, destToSec, stopDistanceSec });

  return NextResponse.json({ board, warnings: [...warnings, ...engineWarnings] });
}
