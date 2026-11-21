import type { VisualScene } from './types';

/** Le registre reste aligné pendant la sortie vers les études, y compris au retour. */
export function magnotesOrganization(
  scene: VisualScene | undefined,
  progress: number,
  reduced: boolean
): number {
  if (reduced || scene === 'studies' || scene === 'contact') return 1;
  if (scene !== 'magnotes') return 0;
  const value = Math.max(0, Math.min(1, (progress - 0.18) / 0.52));
  return value * value * (3 - 2 * value);
}
