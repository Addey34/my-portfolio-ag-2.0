/**
 * Respect de `prefers-reduced-motion`. Toute animation non essentielle doit
 * passer par ce garde-fou : un portfolio « expert » n'impose jamais le mouvement.
 */
const query = window.matchMedia('(prefers-reduced-motion: reduce)');

export function prefersReducedMotion(): boolean {
  return query.matches;
}

/** S'abonner aux changements de préférence (utile si l'OS bascule en cours de session). */
export function onReducedMotionChange(cb: (reduced: boolean) => void): void {
  query.addEventListener('change', (e) => cb(e.matches));
}
