import type { Project } from '@/content/projects';
import type { VisualState } from '@/visual/types';

/**
 * Contrat des « chapitres » — la pièce maîtresse du portfolio.
 *
 * Chaque projet est mis en scène par un chapitre : une section plein écran dont
 * le décor RECONSTITUE l'univers réel de l'app (ses couleurs, ses composants,
 * ses codes visuels), animée par la progression du scroll. Voir
 * `chapters/ChapterManager.ts` pour le cycle de vie (lazy-mount, scrub, pause).
 *
 * ÉVOLUTIF PAR CONSTRUCTION : ajouter un projet = une entrée dans
 * `content/projects.ts`. S'il n'a pas (encore) de chapitre dédié, le
 * `GenericChapter` lui fabrique un décor propre à partir de son accent.
 * Un chapitre dédié = un fichier ici qui exporte `create: ChapterFactory`,
 * enregistré dans `ChapterManager.LOADERS`.
 */
export interface ChapterScene {
  /** État artistique commun : accent, pulsation et point d'attention. */
  setVisualState?(state: VisualState): void;
  /**
   * Une frame. `progress` ∈ [0,1] = traversée de la section dans le viewport
   * (piloté par ScrollTrigger, donc synchronisé Lenis). `time` = performance.now().
   * Contrat perf : transform/opacity uniquement, zéro allocation par frame.
   */
  update(progress: number, time: number): void;
  /** Recalage sur la taille courante de la scène. */
  resize(): void;
  /** Libère tout (listeners, timers, canvases). */
  destroy(): void;
}

/** Factory exportée par chaque module de chapitre. Monte son décor dans `stage`. */
export type ChapterFactory = (
  stage: HTMLElement,
  project: Project
) => ChapterScene;

/** clamp + easing partagés par les chapitres (petit, pas de dépendance). */
export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** easeOutCubic — le « feel » standard des arrivées d'éléments. */
export function easeOut(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}

/** Progression locale : re-mappe `p` sur la fenêtre [start, end]. */
export function window01(p: number, start: number, end: number): number {
  return clamp01((p - start) / (end - start));
}
