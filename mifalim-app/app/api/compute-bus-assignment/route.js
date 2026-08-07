import { NextResponse } from 'next/server';
import { geocodeAddress, distanceMatrix } from '../../../lib/server/googleMaps';
import { computeBusAssignment } from '../../../lib/busAssignmentEngine';

function fullAddress(place, city) {
  const parts = [place, city].map(s => (s || '').trim()).filter(Boolean);
  return parts.join(', ');
}

export async function POST(request) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'לא הוגדר מפתח Google Maps בשרת.' }, { status: 400 });

  const { groups, busTypes, destination, destinationCity, arrivalTime } = await request.json();
  if (!Array.isArray(groups) || groups.length === 0) return NextResponse.json({ error: 'אין קבוצות לשבץ.' }, { status: 400 });
  if (!Array.isArray(busTypes) || busTypes.length === 0) return NextResponse.json({ error: 'אין סוגי אוטובוסים מוגדרים.' }, { status: 400 });
  if (!destination?.trim()) return NextResponse.json({ error: 'חסר יעד סופי.' }, { status: 400 });

  const warnings = [];
  const stopKeys = [...new Set(groups.map(g => g.pickup_point).filter(Boolean))];
  const stopCityByKey = {};
  groups.forEach(g => { if (g.pickup_point && g.city) stopCityByKey[g.pickup_point] = g.city; });

  // Index 0 is always the destination; the rest are pickup points, in stopKeys order.
  const addresses = [fullAddress(destination, destinationCity), ...stopKeys.map(k => fullAddress(k, stopCityByKey[k]))];
  const geocoded = await Promise.all(addresses.map(a => geocodeAddress(a)));

  const missing = [];
  stopKeys.forEach((k, i) => { if (!geocoded[i + 1]) missing.push(k); });
  if (!geocoded[0]) missing.push(`היעד (${destination})`);
  if (missing.length > 0) warnings.push(`לא הצלחנו לאתר את המיקום עבור: ${missing.join(', ')}. יש לוודא שם מקום + עיר מדויקים. זמני הנסיעה עבור אלה יהיו הערכה גסה בלבד.`);

  const validPoints = geocoded.map((g, i) => (g ? { i, ...g } : null)).filter(Boolean);
  const matrix = validPoints.length >= 2 ? await distanceMatrix(validPoints.map(p => ({ lat: p.lat, lng: p.lng }))) : null;
  if (validPoints.length >= 2 && !matrix) warnings.push('לא הצלחנו לקבל זמני נסיעה מ-Google Maps כרגע — כל השעות להלן הן הערכה גסה. כדאי לנסות שוב מאוחר יותר.');

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
