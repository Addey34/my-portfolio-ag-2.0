import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '@/core/motion';

gsap.registerPlugin(ScrollTrigger);

/**
 * Transitions de scroll entre les actes de l'histoire.
 *
 * Chaque frontière (acte A → acte B) reçoit un style : la sortie de A et
 * l'entrée de B parlent le même langage. En mode « aléatoire », les styles sont
 * tirés au hasard à chaque chargement, sans répétition consécutive. Le visiteur
 * peut aussi en figer un dans le panneau de réglages.
 *
 * Invariants : uniquement `transform` et `opacity`, pilotés par ScrollTrigger
 * (scrub) donc par l'horloge unique ; aucun écouteur scroll ; rien en
 * `prefers-reduced-motion`.
 */
export type TransitionStyle =
  'rise' | 'slide' | 'depth' | 'tilt' | 'drift' | 'skew' | 'fade';

export type TransitionMode = TransitionStyle | 'random' | 'story';

export const TRANSITION_MODES: TransitionMode[] = [
  'story',
  'random',
  'rise',
  'slide',
  'depth',
  'tilt',
  'drift',
  'skew',
  'fade',
];

const STORAGE_KEY = 'ag-transition';

/**
 * Mode par défaut : une intention par frontière, dans l'ordre de l'histoire.
 * horloge → compétences : profondeur (le cadran s'ouvre) ; compétences →
 * solutions : bascule (une face se retourne) ; solutions → produits : montée
 * (le seuil se franchit) ; produits → Galaxy : profondeur (on entre dans un
 * monde) ; Galaxy → Ludora : glissé (l'orbite devient grille) ; Ludora →
 * MagNotes : dérive (les notes se détachent) ; sortie finale : montée.
 */
const STORY_STYLES: TransitionStyle[] = [
  'depth',
  'tilt',
  'rise',
  'depth',
  'slide',
  'drift',
  'rise',
];

/** Styles tirés au sort en mode aléatoire (le fondu simple reste un choix explicite). */
const RANDOM_POOL: TransitionStyle[] = [
  'rise',
  'slide',
  'depth',
  'tilt',
  'drift',
  'skew',
];

interface Pose extends gsap.TweenVars {
  opacity: number;
}

interface StyleDef {
  /** État de départ de l'entrée (l'arrivée est l'état neutre). */
  enter: (dir: 1 | -1, amp: number) => Pose;
  /** État d'arrivée de la sortie (le départ est l'état neutre). */
  exit: (dir: 1 | -1, amp: number) => Pose;
}

const STYLES: Record<TransitionStyle, StyleDef> = {
  rise: {
    enter: (_d, a) => ({ y: `${8 * a}vh`, opacity: 0 }),
    exit: (_d, a) => ({ y: `${-5 * a}vh`, opacity: 0 }),
  },
  slide: {
    enter: (d, a) => ({ x: `${d * 9 * a}vw`, opacity: 0 }),
    exit: (d, a) => ({ x: `${-d * 9 * a}vw`, opacity: 0 }),
  },
  depth: {
    enter: (_d, a) => ({ scale: 1 - 0.09 * a, opacity: 0 }),
    exit: (_d, a) => ({ scale: 1 + 0.1 * a, opacity: 0 }),
  },
  tilt: {
    enter: (_d, a) => ({
      rotationX: 14 * a,
      y: `${4 * a}vh`,
      transformPerspective: 900,
      transformOrigin: '50% 50%',
      opacity: 0,
    }),
    exit: (_d, a) => ({
      rotationX: -14 * a,
      y: `${-3 * a}vh`,
      transformPerspective: 900,
      transformOrigin: '50% 50%',
      opacity: 0,
    }),
  },
  drift: {
    enter: (d, a) => ({
      x: `${d * 4 * a}vw`,
      y: `${4 * a}vh`,
      rotation: d * 2.4 * a,
      scale: 1 - 0.03 * a,
      opacity: 0,
    }),
    exit: (d, a) => ({
      x: `${-d * 4 * a}vw`,
      y: `${-3 * a}vh`,
      rotation: -d * 2.4 * a,
      scale: 1 - 0.03 * a,
      opacity: 0,
    }),
  },
  skew: {
    enter: (d, a) => ({
      skewY: d * 5 * a,
      y: `${6 * a}vh`,
      opacity: 0,
    }),
    exit: (d, a) => ({
      skewY: -d * 5 * a,
      y: `${-4 * a}vh`,
      opacity: 0,
    }),
  },
  fade: {
    enter: () => ({ opacity: 0 }),
    exit: () => ({ opacity: 0 }),
  },
};

const NEUTRAL: gsap.TweenVars = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
  rotationX: 0,
  skewY: 0,
  opacity: 1,
};

interface Act {
  trigger: HTMLElement;
  targets: HTMLElement[];
}

/** Les actes concernés, dans l'ordre de l'histoire (le héros garde sa parallaxe). */
function collectActs(): Act[] {
  const acts: Act[] = [];
  const push = (trigger: Element | null, selector: string): void => {
    if (!(trigger instanceof HTMLElement)) return;
    const targets = [...trigger.querySelectorAll<HTMLElement>(selector)];
    if (targets.length > 0) acts.push({ trigger, targets });
  };
  push(document.getElementById('stack'), '.stack__copy, .stack-viz');
  push(document.getElementById('freelance'), '.section-copy, .offer-grid');
  push(document.getElementById('projects-intro'), '.project-threshold__inner');
  document
    .querySelectorAll('.chapter')
    .forEach((chapter) => push(chapter, '.chapter__panel-shell'));
  return acts;
}

function readStoredMode(): TransitionMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && (TRANSITION_MODES as string[]).includes(raw)) {
      return raw as TransitionMode;
    }
  } catch {
    /* stockage indisponible → montée stable */
  }
  return 'story';
}

/** Tire `count` styles au hasard, sans deux fois le même d'affilée. */
function drawStyles(count: number): TransitionStyle[] {
  const result: TransitionStyle[] = [];
  let previous: TransitionStyle | null = null;
  for (let i = 0; i < count; i += 1) {
    const options = RANDOM_POOL.filter((style) => style !== previous);
    const next = options[Math.floor(Math.random() * options.length)];
    result.push(next);
    previous = next;
  }
  return result;
}

export class SectionTransitions {
  private mode: TransitionMode;
  private context: gsap.Context | null = null;
  private drawn: TransitionStyle[] = [];

  constructor() {
    this.mode = readStoredMode();
    if (prefersReducedMotion()) return;
    this.build();
  }

  getMode(): TransitionMode {
    return this.mode;
  }

  setMode(mode: TransitionMode): void {
    this.mode = mode;
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* stockage indisponible → on ignore */
    }
    if (prefersReducedMotion()) return;
    this.build();
  }

  /** Style retenu pour chaque frontière, utile au diagnostic. */
  getStyles(): TransitionStyle[] {
    return [...this.drawn];
  }

  destroy(): void {
    this.context?.revert();
    this.context = null;
  }

  private build(): void {
    this.context?.revert();
    const acts = collectActs();
    // Frontière i : entrée de l'acte i et sortie de l'acte i - 1 ; la dernière
    // sert à la sortie du dernier acte vers le contact.
    this.drawn =
      this.mode === 'random'
        ? drawStyles(acts.length + 1)
        : this.mode === 'story'
          ? Array.from(
              { length: acts.length + 1 },
              (_, i) => STORY_STYLES[Math.min(i, STORY_STYLES.length - 1)]
            )
          : Array.from(
              { length: acts.length + 1 },
              () => this.mode as TransitionStyle
            );
    const amp = window.innerWidth < 860 ? 0.6 : 1;

    this.context = gsap.context(() => {
      acts.forEach((act, index) => {
        const enterStyle = STYLES[this.drawn[index]];
        const exitStyle = STYLES[this.drawn[index + 1]];
        // Le glissé garde un sens constant (carrousel) ; les autres alternent.
        const directionAt = (boundary: number): 1 | -1 =>
          this.drawn[boundary] === 'slide' || boundary % 2 === 0 ? 1 : -1;
        const enterDir = directionAt(index);
        const exitDir = directionAt(index + 1);

        gsap.fromTo(act.targets, enterStyle.enter(enterDir, amp), {
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          rotationX: 0,
          skewY: 0,
          opacity: 1,
          ease: 'none',
          immediateRender: false,
          scrollTrigger: {
            trigger: act.trigger,
            start: 'top 92%',
            end: 'top 46%',
            scrub: true,
          },
        });

        // Départ neutre explicite : la sortie ne doit pas lire l'état laissé
        // par l'entrée sur les mêmes éléments.
        gsap.fromTo(act.targets, NEUTRAL, {
          ...exitStyle.exit(exitDir, amp),
          ease: 'none',
          immediateRender: false,
          scrollTrigger: {
            trigger: act.trigger,
            // Dossier produit : la fiche est longue, ses liens en bas restent
            // pleinement lisibles jusqu'à ce qu'elle quitte vraiment l'écran.
            start: act.trigger.classList.contains('chapter')
              ? 'bottom 38%'
              : 'bottom 72%',
            end: act.trigger.classList.contains('chapter')
              ? 'bottom -5%'
              : 'bottom 40%',
            scrub: true,
          },
        });
      });
    });
  }
}
