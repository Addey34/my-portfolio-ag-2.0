import type { SculptureProjection } from './sculptureProjection';

export type VisualScene =
  | 'identity'
  | 'stack'
  | 'solutions'
  | 'selection'
  | 'galaxy'
  | 'ludora'
  | 'magnotes'
  | 'studies'
  | 'contact';

export interface VisualState {
  sculpture?: SculptureProjection;
  scene: VisualScene;
  /** Progression globale de la page. */
  progress: number;
  /** Progression 0→1 à l'intérieur de la section de l'univers actif. */
  sceneProgress: number;
  /** Progression amortie depuis le dernier changement d'univers. */
  transition: number;
  /** Déploiement de l'AG vers le système, lié directement au scroll. */
  identityStackProgress: number;
  /** Transformation des repères de l'horloge en monogramme AG. */
  clockAgProgress: number;
  /** Variante de comparaison réservée à l'atelier local. */
  openingVariant: 'medallion' | 'ag' | 'direct';
  /** Parcours entier de l'horloge au système. */
  openingProgress: number;
  /** Les trois voies du système deviennent des solutions. */
  stackSolutionsProgress: number;
  /** Les solutions s'ouvrent en trois choix de projets. */
  solutionsSelectionProgress: number;
  /** Déploiement des trois choix en orbites Galaxy. */
  selectionGalaxyProgress: number;
  /** Morphing orbital vers la grille, piloté par la frontière Galaxy/Ludora. */
  galaxyLudoraProgress: number;
  /** Dispersion de la grille en cartes, pilotée par la frontière Ludora/MagNotes. */
  ludoraMagnotesProgress: number;
  /** Les cartes se rassemblent en deux traces d'étude. */
  magnotesStudiesProgress: number;
  /** Les deux traces convergent vers la boucle de contact. */
  studiesContactProgress: number;
  /** Pulsation commune, toujours douce, dans l'intervalle 0..1. */
  pulse: number;
  /** Intensité générale du signal. */
  energy: number;
  /** Accent de l'univers actif. */
  accent: string;
  /** Accent de l'univers suivant — pour les échos de transition. */
  accentNext: string;
  /** Position normalisée et amortie du pointeur. */
  pointer: { x: number; y: number };
}
