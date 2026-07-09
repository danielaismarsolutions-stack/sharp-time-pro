import { describe, it, expect } from 'vitest';
import { yToStartTime, yToEndTime, END_OF_DAY } from './slotTimeUtils';

const HOUR_HEIGHT = 60; // 1px per minute

describe('yToStartTime', () => {
  it('snaps to the nearest 15-minute slot', () => {
    expect(yToStartTime(0, HOUR_HEIGHT)).toBe('00:00');
    expect(yToStartTime(9 * 60 + 10, HOUR_HEIGHT)).toBe('09:15');
    expect(yToStartTime(9 * 60 + 20, HOUR_HEIGHT)).toBe('09:15');
  });

  it('respects the startHour offset', () => {
    expect(yToStartTime(60, HOUR_HEIGHT, 8)).toBe('09:00');
  });

  it('clamps negative positions to 00:00', () => {
    expect(yToStartTime(-30, HOUR_HEIGHT)).toBe('00:00');
  });

  it('clamps positions at or past the bottom of the grid to 23:45', () => {
    expect(yToStartTime(24 * 60, HOUR_HEIGHT)).toBe('23:45');
    expect(yToStartTime(23 * 60 + 55, HOUR_HEIGHT)).toBe('23:45');
  });

  it('does not wrap past midnight when rounding up the last hour', () => {
    // 23:53 rounds to 24:00 → must clamp to 23:45, never wrap to 23:00 or 00:00
    expect(yToStartTime(23 * 60 + 53, HOUR_HEIGHT)).toBe('23:45');
  });
});

describe('yToEndTime', () => {
  it('snaps to the nearest 15-minute slot', () => {
    expect(yToEndTime(10 * 60 + 40, HOUR_HEIGHT)).toBe('10:45');
  });

  it('maps the bottom of the grid (midnight) to 23:59', () => {
    expect(yToEndTime(24 * 60, HOUR_HEIGHT)).toBe(END_OF_DAY);
  });

  it('maps positions that round to midnight to 23:59', () => {
    expect(yToEndTime(23 * 60 + 55, HOUR_HEIGHT)).toBe(END_OF_DAY);
  });

  it('keeps regular late-night slots untouched', () => {
    expect(yToEndTime(23 * 60 + 45, HOUR_HEIGHT)).toBe('23:45');
  });

  it('clamps negative positions to 00:00', () => {
    expect(yToEndTime(-10, HOUR_HEIGHT)).toBe('00:00');
  });
});
