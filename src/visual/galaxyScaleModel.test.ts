import { describe, expect, it } from 'vitest';
import {
  displayedRadius,
  OUTER_DISTANCE_AU,
  SCALE_BODIES,
  scaleExponent,
} from './galaxyScaleModel';

describe('comparateur des distances Galaxy', () => {
  it('retrouve les rapports physiques à l’extrémité proportionnelle', () => {
    for (const body of SCALE_BODIES)
      expect(displayedRadius(body.distanceAU, 100)).toBeCloseTo(
        body.distanceAU / OUTER_DISTANCE_AU,
        10
      );
  });

  it('garde Soleil et Neptune fixes pour toute la manipulation', () => {
    for (const value of [0, 25, 50, 75, 100]) {
      expect(displayedRadius(0, value)).toBe(0);
      expect(displayedRadius(OUTER_DISTANCE_AU, value)).toBe(1);
    }
  });

  it('conserve l’ordre et rend la déformation visible sans inverser les distances', () => {
    let previousEarth = Infinity;
    for (let value = 0; value <= 100; value++) {
      const radii = SCALE_BODIES.map((body) =>
        displayedRadius(body.distanceAU, value)
      );
      expect(radii[0]).toBeLessThan(radii[1]);
      expect(radii[1]).toBeLessThan(radii[2]);
      expect(radii[0]).toBeLessThanOrEqual(previousEarth);
      previousEarth = radii[0];
    }
    expect(displayedRadius(1, 0)).toBeGreaterThan(displayedRadius(1, 100) * 12);
  });

  it('borne le curseur et refuse des distances non représentables', () => {
    expect(scaleExponent(-10)).toBe(0.25);
    expect(scaleExponent(150)).toBe(1);
    expect(scaleExponent(NaN)).toBe(0.25);
    expect(() => displayedRadius(-1, 50)).toThrow(RangeError);
    expect(() => displayedRadius(Infinity, 50)).toThrow(RangeError);
  });
});
