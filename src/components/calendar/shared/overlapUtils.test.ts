import { describe, it, expect } from 'vitest';
import { computeOverlapLayout } from './overlapUtils';

interface Item {
  id: string;
  start_time: string;
  end_time: string;
  barber?: string | null;
}

const item = (id: string, start: string, end: string, barber?: string): Item => ({
  id,
  start_time: `${start}:00`,
  end_time: `${end}:00`,
  barber,
});

// Two items in the same column must never overlap in time.
const assertNoColumnOverlap = (items: Item[]) => {
  const layout = computeOverlapLayout(items);
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      const la = layout.get(a.id)!;
      const lb = layout.get(b.id)!;
      const overlap =
        toMin(a.start_time) < toMin(b.end_time) &&
        toMin(a.end_time) > toMin(b.start_time);
      if (overlap && la.index === lb.index) {
        throw new Error(`Items ${a.id} and ${b.id} overlap but share column ${la.index}`);
      }
    }
  }
};

describe('computeOverlapLayout', () => {
  it('gives a single full-width column to a non-overlapping item', () => {
    const items = [item('a', '10:00', '11:00')];
    const layout = computeOverlapLayout(items);
    expect(layout.get('a')).toEqual({ total: 1, index: 0 });
  });

  it('keeps separate clusters independent (no shared width)', () => {
    const items = [item('a', '10:00', '11:00'), item('b', '12:00', '13:00')];
    const layout = computeOverlapLayout(items);
    expect(layout.get('a')).toEqual({ total: 1, index: 0 });
    expect(layout.get('b')).toEqual({ total: 1, index: 0 });
  });

  it('splits two simple overlapping items into two columns', () => {
    const items = [item('a', '10:00', '11:00'), item('b', '10:30', '11:30')];
    const layout = computeOverlapLayout(items);
    expect(layout.get('a')!.total).toBe(2);
    expect(layout.get('b')!.total).toBe(2);
    expect(layout.get('a')!.index).not.toBe(layout.get('b')!.index);
    assertNoColumnOverlap(items);
  });

  it('handles a transitive chain (A-B overlap, B-C overlap, A-C do not) with consistent widths and no overlap', () => {
    // This is the case the old per-item algorithm got wrong.
    const items = [
      item('a', '10:00', '11:00'),
      item('b', '10:30', '11:30'),
      item('c', '11:00', '12:00'),
    ];
    const layout = computeOverlapLayout(items);
    // All belong to the same overlap cluster -> same total column count
    expect(layout.get('a')!.total).toBe(2);
    expect(layout.get('b')!.total).toBe(2);
    expect(layout.get('c')!.total).toBe(2);
    // A and C do not overlap so they can reuse the same column
    expect(layout.get('a')!.index).toBe(layout.get('c')!.index);
    expect(layout.get('b')!.index).not.toBe(layout.get('a')!.index);
    assertNoColumnOverlap(items);
  });

  it('never assigns overlapping items to the same column for many barbers at once', () => {
    const items = [
      item('a', '10:00', '10:40', 'Badr'),
      item('b', '10:00', '10:40', 'Francis'),
      item('c', '10:00', '10:45', 'Ivancito'),
      item('d', '10:00', '10:45', 'Luis'),
      item('e', '10:00', '10:30', 'Rioja'),
    ];
    const layout = computeOverlapLayout(items);
    const totals = items.map((i) => layout.get(i.id)!.total);
    expect(new Set(totals).size).toBe(1); // consistent width
    expect(totals[0]).toBe(5);
    assertNoColumnOverlap(items);
  });

  it('keeps non-overlapping appointments of the same barber in one column', () => {
    const items = [
      item('a1', '10:00', '11:00', 'Badr'),
      item('a2', '11:00', '12:00', 'Badr'),
      item('b1', '10:30', '11:30', 'Francis'),
    ];
    const layout = computeOverlapLayout(items);
    // Badr's two non-overlapping appointments should align in the same column
    expect(layout.get('a1')!.index).toBe(layout.get('a2')!.index);
    expect(layout.get('b1')!.index).not.toBe(layout.get('a1')!.index);
    assertNoColumnOverlap(items);
  });
});
