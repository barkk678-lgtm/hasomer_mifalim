// Deterministic bus-assignment engine — the "compute" behind "חשב סידור אוטובוסים".
//
// Deliberately NOT an LLM call: this is a hard-constrained bin-packing + scheduling problem
// (never exceed a bus's capacity, compute exact pickup times), and a language model cannot
// guarantee either of those — it can miscount or invent travel times. Real travel data comes
// from Google Maps (see lib/server/googleMaps.js); the packing/scheduling below is plain,
// auditable arithmetic.
//
// Priorities, per spec: (1) minimize the number of buses used — fill each one as full as
// possible; prefer smaller/cheaper bus types when that doesn't cost an extra bus; (2) prefer a
// bus carrying a single pickup point (fewer stops = fewer costs/delays); (3) when a bus must
// combine pickup points, prefer geographically close ones (least added travel time); (4) split
// a single group across at most 2 buses, only as a last resort when it doesn't fit anywhere alone.

import { uid } from './busBoardHelpers';

const LOADING_BUFFER_MIN = 12; // ~10-15 min to board a group at a stop, per spec — midpoint.

function timeToMinutes(hhmm) {
  const [h, m] = (hhmm || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
// Pickup times round DOWN to the nearest 5 minutes (never later than the exact calculation) —
// a driver arriving a couple minutes early is fine, arriving late defeats the whole schedule.
function roundDownTo5(mins) { return Math.floor(mins / 5) * 5; }
function minutesToTime(mins) {
  const total = ((Math.round(mins) % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60), m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Splits any single group whose quantity exceeds every available bus's capacity into exactly 2
// pieces (never more, per spec) so the packer always has placeable items.
function splitOversizedGroups(groups, maxCapacity) {
  const items = [];
  for (const g of groups) {
    const qty = Number(g.quantity) || 0;
    if (maxCapacity > 0 && qty > maxCapacity) {
      const half1 = Math.ceil(qty / 2);
      const half2 = qty - half1;
      items.push({ groupId: g.id, group_name: g.group_name, pickup_point: g.pickup_point, quantity: half1, is_split: true, split_label: 'חלק א׳' });
      items.push({ groupId: g.id, group_name: g.group_name, pickup_point: g.pickup_point, quantity: half2, is_split: true, split_label: 'חלק ב׳' });
    } else {
      items.push({ groupId: g.id, group_name: g.group_name, pickup_point: g.pickup_point, quantity: qty, is_split: false, split_label: null });
    }
  }
  return items;
}

// Phase 1: homogeneous packing — every stop's items get bins of their own, cheapest type that
// covers what's left (or the largest type, filled fully, when the remainder needs more than one bus).
function packStopHomogeneous(items, sortedTypes) {
  const buses = []; // { type, items: [] }
  const remaining = [...items].sort((a, b) => b.quantity - a.quantity);
  while (remaining.length > 0) {
    const total = remaining.reduce((s, it) => s + it.quantity, 0);
    const fitsWhole = sortedTypes.find(t => t.capacity >= total);
    const type = fitsWhole || sortedTypes[sortedTypes.length - 1]; // largest available, filled as much as possible
    const bin = { type, items: [] };
    let space = type.capacity;
    for (let i = 0; i < remaining.length; ) {
      if (remaining[i].quantity <= space) {
        space -= remaining[i].quantity;
        bin.items.push(remaining[i]);
        remaining.splice(i, 1);
      } else {
        i++;
      }
    }
    if (bin.items.length === 0) { bin.items.push(remaining.shift()); } // pathological guard, shouldn't hit after pre-split
    buses.push(bin);
  }
  return buses;
}

// Phase 2: merge under-filled buses from different stops into one, to shave off bus count
// further. Per spec, minimizing bus count is priority #1 unconditionally — merging always
// happens whenever two buses fit together in one, with NO distance cutoff vetoing it (there's
// no "too far to bother" case: an extra bus costs more than a few extra minutes of driving).
// Geography (Phase 2's own name) only breaks ties between multiple equally-valid merges: at each
// step the CLOSEST compatible pair merges first — an unknown distance (failed geocoding) is
// deprioritized rather than treated as either "close" or "excluded", so it's picked only when no
// better-understood option exists.
const UNKNOWN_DIST_RANK = 1e9;
function mergeUnderfilledBuses(buses, sortedTypes, stopDistanceSec) {
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < buses.length && !merged; i++) {
      let bestJ = -1, bestRank = Infinity, bestType = null;
      for (let j = 0; j < buses.length; j++) {
        if (j === i) continue;
        const totalQty = buses[i].items.reduce((s, it) => s + it.quantity, 0) + buses[j].items.reduce((s, it) => s + it.quantity, 0);
        const combinedType = sortedTypes.find(t => t.capacity >= totalQty);
        if (!combinedType) continue; // doesn't fit together in any single bus type
        const dist = stopDistanceSec(buses[i].items[0].pickup_point, buses[j].items[0].pickup_point);
        const rank = dist == null ? UNKNOWN_DIST_RANK : dist;
        if (rank < bestRank) { bestRank = rank; bestJ = j; bestType = combinedType; }
      }
      if (bestJ !== -1) {
        const combinedItems = [...buses[i].items, ...buses[bestJ].items];
        const [lo, hi] = i < bestJ ? [i, bestJ] : [bestJ, i];
        buses.splice(hi, 1);
        buses[lo] = { type: bestType, items: combinedItems };
        merged = true;
      }
    }
  }
  return buses;
}

// destToSec(point) -> seconds to destination | null. stopDistanceSec(a,b) -> seconds | null.
export function computeBusAssignment({ groups, busTypes, arrivalTime, destToSec, stopDistanceSec }) {
  const warnings = [];
  const sortedTypes = [...busTypes].sort((a, b) => (Number(a.capacity) || 0) - (Number(b.capacity) || 0));
  const maxCapacity = sortedTypes.length ? Number(sortedTypes[sortedTypes.length - 1].capacity) || 0 : 0;

  const items = splitOversizedGroups(groups, maxCapacity);

  const byStop = new Map();
  for (const it of items) {
    if (!byStop.has(it.pickup_point)) byStop.set(it.pickup_point, []);
    byStop.get(it.pickup_point).push(it);
  }

  let bins = [];
  for (const [, stopItems] of byStop) bins.push(...packStopHomogeneous(stopItems, sortedTypes));
  bins = mergeUnderfilledBuses(bins, sortedTypes, stopDistanceSec);

  const arrivalMin = timeToMinutes(arrivalTime || '17:00');
  const buses = [];
  const pieces = [];

  bins.forEach((bin, idx) => {
    const stops = [...new Set(bin.items.map(it => it.pickup_point))];
    // Route order: farthest-from-destination first, so the bus heads toward the destination.
    stops.sort((a, b) => (destToSec(b) ?? 0) - (destToSec(a) ?? 0));

    const stopTimes = {};
    let nextPointMin = arrivalMin;
    for (let i = stops.length - 1; i >= 0; i--) {
      const to = i === stops.length - 1 ? null : stops[i + 1];
      const travelSec = to ? stopDistanceSec(stops[i], to) : destToSec(stops[i]);
      if (travelSec == null) warnings.push(`לא נמצא זמן נסיעה אמיתי עבור "${stops[i]}" — נעשה שימוש בהערכה של 20 דקות. כדאי לוודא את הכתובת/עיר.`);
      const travelMin = travelSec != null ? travelSec / 60 : 20;
      const pickupMin = roundDownTo5(nextPointMin - LOADING_BUFFER_MIN - travelMin);
      stopTimes[stops[i]] = minutesToTime(pickupMin);
      nextPointMin = pickupMin;
    }

    const busId = uid('bus');
    buses.push({
      id: busId, bus_number: idx + 1, bus_type: bin.type.label, capacity: Number(bin.type.capacity) || 0,
      coordinator: '', driver: '', stopOrder: stops, stopTimes,
    });
    bin.items.forEach(it => {
      pieces.push({
        id: uid('piece'), sourceGroupId: it.groupId, group_name: it.group_name, quantity: it.quantity,
        pickup_point: it.pickup_point, bus_id: busId, is_split: it.is_split, split_label: it.split_label,
      });
    });
  });

  return { board: { buses, pieces, notes: '' }, warnings };
}
