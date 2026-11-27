/**
 * Demi-grands axes J2000 arrondis, table 1 JPL (1800–2050).
 * Terre ≈ barycentre Terre–Lune. Aucune position orbitale n'est calculée.
 * https://ssd.jpl.nasa.gov/planets/approx_pos.html
 */
export const SCALE_BODIES = [
  { id: 'earth', distanceAU: 1, color: '#7dd3fc' },
  { id: 'jupiter', distanceAU: 5.203, color: '#e7b95c' },
  { id: 'neptune', distanceAU: 30.07, color: '#c4b5fd' },
] as const;

export const SCALE_SOURCE = 'https://ssd.jpl.nasa.gov/planets/approx_pos.html';
export const OUTER_DISTANCE_AU = 30.07;

/** 0 : lecture comprimée ; 100 : distances proportionnelles. */
export function scaleExponent(value: number): number {
  const bounded = Number.isFinite(value)
    ? Math.max(0, Math.min(100, value))
    : 0;
  return 0.25 + (0.75 * bounded) / 100;
}

/** Rayon affiché normalisé : Neptune reste fixe pour comparer les rapports. */
export function displayedRadius(distanceAU: number, value: number): number {
  if (
    !Number.isFinite(distanceAU) ||
    distanceAU < 0 ||
    distanceAU > OUTER_DISTANCE_AU
  )
    throw new RangeError('Distance hors du domaine pédagogique.');
  return (distanceAU / OUTER_DISTANCE_AU) ** scaleExponent(value);
}
