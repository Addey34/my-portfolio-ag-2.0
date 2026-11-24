import { t } from '@/i18n';
import type { VisualDirector } from '@/visual/VisualDirector';
import type { VisualScene } from '@/visual/types';

/** Les trois produits portent le numéro de leur étude de cas ; les autres pièces n'en ont pas. */
const PRODUCT_NUMBER: Partial<Record<VisualScene, string>> = {
  galaxy: '01',
  ludora: '02',
  magnotes: '03',
};

/**
 * Cartel de l'objet exposé : nom et intention de la sculpture visible.
 *
 * Il suit la scène du VisualDirector (aucune horloge propre) et ne change que
 * `data-i18n` et le texte : la bascule FR/EN réutilise la mécanique existante.
 */
export function initExhibitPlaque(visual: VisualDirector): () => void {
  const plaque = document.querySelector<HTMLElement>('.exhibit-plaque');
  const no = plaque?.querySelector<HTMLElement>('.exhibit-plaque__no');
  const name = plaque?.querySelector<HTMLElement>('.exhibit-plaque__name');
  const note = plaque?.querySelector<HTMLElement>('.exhibit-plaque__note');
  if (!plaque || !no || !name || !note) return () => undefined;

  const show = (scene: VisualScene): void => {
    plaque.dataset.scene = scene;
    no.textContent = PRODUCT_NUMBER[scene] ?? '';
    name.dataset.i18n = `plaque.${scene}.name`;
    name.textContent = t(`plaque.${scene}.name`);
    note.dataset.i18n = `plaque.${scene}.note`;
    note.textContent = t(`plaque.${scene}.note`);
  };
  return visual.onSceneChange(show);
}
