import { describe, expect, it } from 'vitest';
import { clamp01, easeOut, window01 } from './types';

describe('chapter helpers', () => {
  it('clamps values to the 0..1 interval', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(0.42)).toBe(0.42);
    expect(clamp01(2)).toBe(1);
  });

  it('maps a value into a bounded window', () => {
    expect(window01(0, 0.2, 0.8)).toBe(0);
    expect(window01(0.5, 0.2, 0.8)).toBeCloseTo(0.5);
    expect(window01(1, 0.2, 0.8)).toBe(1);
  });

  it('starts and ends the easing curve at the expected values', () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
    expect(easeOut(0.5)).toBeGreaterThan(0.5);
  });
});
