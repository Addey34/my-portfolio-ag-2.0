import { prefersReducedMotion } from '@/core/motion';
import type { SmoothScroll } from '@/core/SmoothScroll';

/**
 * Scroll « intelligent » : l'effet diaporama sans hijack.
 *
 * Principe : chaque chapitre a un point d'accroche (sa section centrée dans le
 * viewport). Quand le défilement S'ARRÊTE À PROXIMITÉ d'un point (zone de
 * ~22 % du viewport), la page glisse doucement pour caler le chapitre — comme
 * une diapositive qui clique en place. Hors zone : scroll totalement libre.
 *
 * Garde-fous délibérés :
 *  - On n'aimante JAMAIS pendant que l'utilisateur bouge : uniquement une fois
 *    le scroll posé (~150 ms d'immobilité). Un coup de molette pendant la
 *    glissade la reprend immédiatement (comportement natif de Lenis).
 *  - Glissade courte (≤ 0,75 s) et cooldown : pas de ping-pong, pas de lutte.
 *  - En `prefers-reduced-motion` (Lenis absent) : rien n'est installé.
 *
 * Invariants : `update(time)` est appelé par la boucle maîtresse (ticker GSAP
 * unique) — aucun écouteur scroll, aucune horloge propre.
 */
const ZONE = 0.22; // fraction du viewport autour d'un point d'accroche
const SETTLE_MS = 150; // immobilité requise avant d'aimanter
const COOLDOWN_MS = 1000; // délai minimal entre deux glissades
const MIN_DIST = 8; // px — déjà calé, on ne bouge pas
const EASE = (t: number): number => 1 - Math.pow(1 - t, 3);

export class ScrollChoreographer {
  private readonly onResize = () => {
    this.dirty = true;
  };
  private targets: number[] = [];
  private dirty = true;
  private docHeight = 0;
  private lastScroll = -1;
  private settleAt = 0;
  private lastSnapAt = 0;
  private evaluated = false;

  constructor(private readonly scroll: SmoothScroll) {
    if (!this.scroll.lenis || prefersReducedMotion()) return;
    window.addEventListener('resize', this.onResize, { passive: true });
  }

  /** Appelé une fois par frame par la boucle maîtresse (ticker GSAP). */
  update(time: number): void {
    const lenis = this.scroll.lenis;
    if (!lenis) return;

    // En mouvement : on n'évalue RIEN (aucune lecture de layout par frame —
    // `scrollHeight` après les écritures de styles forcerait un reflow).
    const y = lenis.scroll;
    if (Math.abs(y - this.lastScroll) > 0.4) {
      this.lastScroll = y;
      this.settleAt = time;
      this.evaluated = false;
      return;
    }
    if (this.evaluated) return;
    if (time - this.settleAt < SETTLE_MS) return;
    this.evaluated = true; // une seule décision par arrêt de scroll
    if (time - this.lastSnapAt < COOLDOWN_MS) return;

    // Un changement de hauteur du document (fonts, i18n…) invalide les points.
    const docHeight = document.documentElement.scrollHeight;
    if (this.dirty || docHeight !== this.docHeight) {
      this.docHeight = docHeight;
      this.collect();
    }
    if (this.targets.length === 0) return;

    let best = -1;
    let bestDist = Infinity;
    for (const target of this.targets) {
      const dist = Math.abs(target - y);
      if (dist < bestDist) {
        bestDist = dist;
        best = target;
      }
    }
    if (best < 0 || bestDist < MIN_DIST || bestDist > window.innerHeight * ZONE)
      return;

    this.lastSnapAt = time;
    lenis.scrollTo(best, { duration: 0.75, easing: EASE });
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize);
  }

  /** Points d'accroche : chaque chapitre centré dans le viewport. */
  private collect(): void {
    this.dirty = false;
    const scrollY = window.scrollY;
    const viewport = window.innerHeight;
    const max = this.docHeight - viewport;
    this.targets = [];
    document.querySelectorAll<HTMLElement>('.chapter').forEach((section) => {
      const rect = section.getBoundingClientRect();
      const top = rect.top + scrollY;
      const centered = top + (rect.height - viewport) / 2;
      this.targets.push(Math.min(Math.max(centered, 0), Math.max(max, 0)));
    });
  }
}
