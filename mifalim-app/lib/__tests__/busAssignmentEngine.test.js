import { describe, it, expect } from 'vitest';
import { scheduleStops, computeBusAssignment } from '../busAssignmentEngine';

describe('scheduleStops', () => {
  it('backward-computes pickup times from arrival time, rounded down to 5 minutes', () => {
    // destination is 20 min (1200s) from the only stop; loading buffer is 12 min.
    const destToSec = () => 1200;
    const stopDistanceSec = () => null;
    const { stopTimes, warnings } = scheduleStops(['תחנה א'], '17:00', destToSec, stopDistanceSec);
    // 17:00 - 20min travel - 12min buffer = 16:28 -> rounds down to 16:25.
    expect(stopTimes['תחנה א']).toBe('16:25');
    expect(warnings).toHaveLength(0);
  });

  it('chains multiple stops back-to-front using inter-stop distance', () => {
    const destToSec = () => 600; // last stop -> destination: 10 min
    const stopDistanceSec = () => 300; // between consecutive stops: 5 min
    const { stopTimes } = scheduleStops(['ראשונה', 'שנייה'], '10:00', destToSec, stopDistanceSec);
    // שנייה (last stop): 10:00 - 10min - 12min buffer = 09:38 -> 09:35
    expect(stopTimes['שנייה']).toBe('09:35');
    // ראשונה: 09:35 - 5min - 12min buffer = 09:18 -> 09:15
    expect(stopTimes['ראשונה']).toBe('09:15');
  });

  it('emits a warning and falls back to a 20-minute estimate when travel time is unknown', () => {
    const destToSec = () => null;
    const stopDistanceSec = () => null;
    const { stopTimes, warnings } = scheduleStops(['תחנה לא ידועה'], '12:00', destToSec, stopDistanceSec);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('תחנה לא ידועה');
    // 12:00 - 20min estimate - 12min buffer = 11:28 -> 11:25
    expect(stopTimes['תחנה לא ידועה']).toBe('11:25');
  });
});

describe('computeBusAssignment', () => {
  const noDistance = () => null;

  it('packs a single group that fits into one bus of the smallest sufficient type', () => {
    const groups = [{ id: 'g1', group_name: 'כיתה ז', pickup_point: 'תחנה א', quantity: 30 }];
    const busTypes = [{ label: 'קטן (30)', capacity: 30 }, { label: 'גדול (50)', capacity: 50 }];
    const { board, warnings } = computeBusAssignment({ groups, busTypes, arrivalTime: '17:00', destToSec: () => 600, stopDistanceSec: noDistance });
    expect(board.buses).toHaveLength(1);
    expect(board.buses[0].bus_type).toBe('קטן (30)');
    expect(board.pieces).toHaveLength(1);
    expect(board.pieces[0].quantity).toBe(30);
    expect(warnings).toHaveLength(0);
  });

  it('falls back to a default 50-seat bus type when the plan has none defined', () => {
    const groups = [{ id: 'g1', group_name: 'כיתה ח', pickup_point: 'תחנה א', quantity: 20 }];
    const { board } = computeBusAssignment({ groups, busTypes: [], arrivalTime: '17:00', destToSec: () => 600, stopDistanceSec: noDistance });
    expect(board.buses).toHaveLength(1);
    expect(board.buses[0].bus_type).toBe('רגיל (50)');
    expect(board.buses[0].capacity).toBe(50);
  });

  it('splits a group into exactly 2 pieces when it exceeds every available bus capacity', () => {
    const groups = [{ id: 'g1', group_name: 'קבוצה ענקית', pickup_point: 'תחנה א', quantity: 90 }];
    const busTypes = [{ label: 'רגיל (50)', capacity: 50 }];
    const { board } = computeBusAssignment({ groups, busTypes, arrivalTime: '17:00', destToSec: () => 600, stopDistanceSec: noDistance });
    const pieces = board.pieces.filter(p => p.sourceGroupId === 'g1');
    expect(pieces).toHaveLength(2);
    expect(pieces.reduce((s, p) => s + p.quantity, 0)).toBe(90);
    expect(pieces.every(p => p.is_split)).toBe(true);
  });

  it('always merges two under-filled buses from different stops when they fit together, regardless of distance', () => {
    // Regression test: a previous version vetoed merges more than 20 real-world minutes apart,
    // contradicting the spec's priority #1 (minimize bus count unconditionally). Two groups of 25
    // each fit in one 50-seat bus, but their stops are geocoded 22 minutes (1320s) apart — must
    // still merge into a single bus.
    const groups = [
      { id: 'g1', group_name: 'קצרין', pickup_point: 'קצרין', quantity: 25 },
      { id: 'g2', group_name: 'מעלה גמלא', pickup_point: 'מעלה גמלא', quantity: 25 },
    ];
    const busTypes = [{ label: 'רגיל (50)', capacity: 50 }];
    const stopDistanceSec = (a, b) => 1320; // 22 minutes apart, further than the old (removed) 20-min cutoff
    const { board } = computeBusAssignment({ groups, busTypes, arrivalTime: '17:00', destToSec: () => 1800, stopDistanceSec });
    expect(board.buses).toHaveLength(1);
    expect(board.pieces).toHaveLength(2);
  });

  it('does not merge buses that would exceed capacity together', () => {
    const groups = [
      { id: 'g1', group_name: 'קבוצה א', pickup_point: 'תחנה א', quantity: 40 },
      { id: 'g2', group_name: 'קבוצה ב', pickup_point: 'תחנה ב', quantity: 40 },
    ];
    const busTypes = [{ label: 'רגיל (50)', capacity: 50 }];
    const { board } = computeBusAssignment({ groups, busTypes, arrivalTime: '17:00', destToSec: () => 600, stopDistanceSec: () => 60 });
    expect(board.buses).toHaveLength(2);
  });

  it('prefers the geographically closest compatible pair when multiple merges are possible', () => {
    const groups = [
      { id: 'g1', group_name: 'א', pickup_point: 'תחנה א', quantity: 20 },
      { id: 'g2', group_name: 'ב', pickup_point: 'תחנה ב', quantity: 20 },
      { id: 'g3', group_name: 'ג', pickup_point: 'תחנה ג', quantity: 20 },
    ];
    // Each pair fits together (20+20=40 <= 50), but not all three (60 > 50).
    // א-ב are close (60s apart); א-ג and ב-ג are far (3000s apart) — א and ב should merge first.
    const busTypes = [{ label: 'רגיל (50)', capacity: 50 }];
    const dist = {
      'תחנה א|תחנה ב': 60, 'תחנה ב|תחנה א': 60,
      'תחנה א|תחנה ג': 3000, 'תחנה ג|תחנה א': 3000,
      'תחנה ב|תחנה ג': 3000, 'תחנה ג|תחנה ב': 3000,
    };
    const stopDistanceSec = (a, b) => dist[`${a}|${b}`] ?? null;
    const { board } = computeBusAssignment({ groups, busTypes, arrivalTime: '17:00', destToSec: () => 600, stopDistanceSec });
    expect(board.buses).toHaveLength(2);
    const mergedBus = board.buses.find(b => board.pieces.filter(p => p.bus_id === b.id).length === 2);
    const mergedStops = board.pieces.filter(p => p.bus_id === mergedBus.id).map(p => p.pickup_point).sort();
    expect(mergedStops).toEqual(['תחנה א', 'תחנה ב']);
  });
});
