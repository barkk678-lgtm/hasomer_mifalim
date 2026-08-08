import { describe, it, expect } from 'vitest';
import { mergeSplitGroupsIfComplete, uid } from '../busBoardHelpers';

describe('uid', () => {
  it('generates unique ids with the given prefix', () => {
    const a = uid('bus');
    const b = uid('bus');
    expect(a).not.toBe(b);
    expect(a.startsWith('bus_')).toBe(true);
  });
});

describe('mergeSplitGroupsIfComplete', () => {
  it('recombines a split group once both fragments land back on the same bus', () => {
    const pieces = [
      { id: 'p1', sourceGroupId: 'g1', group_name: 'קבוצה גדולה', quantity: 40, pickup_point: 'תחנה א', bus_id: 'bus1', is_split: true, split_label: 'חלק א׳' },
      { id: 'p2', sourceGroupId: 'g1', group_name: 'קבוצה גדולה', quantity: 30, pickup_point: 'תחנה א', bus_id: 'bus1', is_split: true, split_label: 'חלק ב׳' },
    ];
    const result = mergeSplitGroupsIfComplete(pieces);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(70);
    expect(result[0].is_split).toBe(false);
  });

  it('leaves fragments unmerged while they sit on different buses', () => {
    const pieces = [
      { id: 'p1', sourceGroupId: 'g1', group_name: 'קבוצה גדולה', quantity: 40, pickup_point: 'תחנה א', bus_id: 'bus1', is_split: true, split_label: 'חלק א׳' },
      { id: 'p2', sourceGroupId: 'g1', group_name: 'קבוצה גדולה', quantity: 30, pickup_point: 'תחנה א', bus_id: 'bus2', is_split: true, split_label: 'חלק ב׳' },
    ];
    const result = mergeSplitGroupsIfComplete(pieces);
    expect(result).toHaveLength(2);
  });

  it('leaves non-split pieces untouched', () => {
    const pieces = [
      { id: 'p1', sourceGroupId: null, group_name: 'קבוצה רגילה', quantity: 20, pickup_point: 'תחנה א', bus_id: 'bus1', is_split: false, split_label: null },
    ];
    const result = mergeSplitGroupsIfComplete(pieces);
    expect(result).toEqual(pieces);
  });
});
