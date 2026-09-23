export type VisualScene =
  | 'identity'
  | 'stack'
  | 'solutions'
  | 'selection'
  | 'galaxy'
  | 'ludora'
  | 'magnotes'
  | 'contact';

export interface VisualState {
  scene: VisualScene;
  /** Progression globale de la page. */
  progress: number;
  /** Progression 0→1 à l'intérieur de la section de l'univers actif. */
  sceneProgress: number;
  /** Progression amortie depuis le dernier changement d'univers. */
  transition: number;
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
