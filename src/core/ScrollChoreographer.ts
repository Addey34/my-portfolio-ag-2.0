import { prefersReducedMotion } from '@/core/motion';
import type { SmoothScroll } from '@/core/SmoothScroll';

/**
 * Scroll Â« intelligent Â» : l'effet diaporama sans hijack.
 *
 * Principe : chaque chapitre a un point d'accroche (sa section centrÃ©e dans le
 * viewport). Quand le dÃ©filement S'ARRÃŠTE Ã€ PROXIMITÃ‰ d'un point (zone de
 * ~22 % du viewport), la page glisse doucement pour caler le chapitre â€” comme
 * une diapositive qui clique en place. Hors zone : scroll totalement libre.
 *
 * Garde-fous dÃ©libÃ©rÃ©s :
 *  - On n'aimante JAMAIS pendant que l'utilisateur bouge : uniquement une fois
 *    le scroll posÃ© (~150 ms d'immobilitÃ©). Un coup de molette pendant la
 *    glissade la reprend immÃ©diatement (comportement natif de Lenis).
 *  - Glissade courte (â‰¤ 0,75 s) et cooldown : pas de ping-pong, pas de lutte.
 *  - En `prefers-reduced-motion` (Lenis absent) : rien n'est installÃ©.
 *
 * Invariants : `update(time)` est appelÃ© par la boucle maÃ®tresse (ticker GSAP
 * unique) â€” aucun Ã©couteur scroll, aucune horloge propre.
 */
const ZONE = 0.22; // fraction du viewport autour d'un point d'accroche
const SETTLE_MS = 180; // immobilitÃ© requise avant d'aimanter
const MOBILE_ZONE = 0.32;
const COOLDOWN_MS = 760; // dÃ©lai minimal entre deux glissades
const MIN_DIST = 8; // px â€” dÃ©jÃ  calÃ©, on ne bouge pas
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

  /** AppelÃ© une fois par frame par la boucle maÃ®tresse (ticker GSAP). */
  update(time: number): void {
    const lenis = this.scroll.lenis;
    if (!lenis) return;

    // En mouvement : on n'Ã©value RIEN (aucune lecture de layout par frame â€”
    // `scrollHeight` aprÃ¨s les Ã©critures de styles forcerait un reflow).
    const y = lenis.scroll;
    if (Math.abs(y - this.lastScroll) > 0.4) {
      this.lastScroll = y;
      this.settleAt = time;
      this.evaluated = false;
      return;
    }
    if (this.evaluated) return;
    if (time - this.settleAt < SETTLE_MS) return;
    this.evaluated = true; // une seule dÃ©cision par arrÃªt de scroll
    if (time - this.lastSnapAt < COOLDOWN_MS) return;

    // Un changement de hauteur du document (fonts, i18nâ€¦) invalide les points.
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
    const zone = window.innerWidth <= 860 ? MOBILE_ZONE : ZONE;
    if (
      best < 0 ||
      bestDist < MIN_DIST ||
      bestDist > window.innerHeight * zone
    ) {
      return;
    }

    this.lastSnapAt = time;
    lenis.scrollTo(best, { duration: 0.68, easing: EASE });
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize);
  }

  /** Points d'accroche : chaque chapitre centrÃ© dans le viewport. */
  private collect(): void {
    this.dirty = false;
    const scrollY = window.scrollY;
    const viewport = window.innerHeight;
    const max = this.docHeight - viewport;
    this.targets = [];
    document
      .querySelectorAll<HTMLElement>(
        '#intro, #stack, #freelance, #projects-intro, .chapter, .chapter__beat--outcome, #studies, #contact'
      )
      .forEach((section) => {
        const rect = section.getBoundingClientRect();
        const top = rect.top + scrollY;
        let target = top + (rect.height - viewport) / 2;
        // Section plus haute que l'écran : centrer masquerait ses deux bouts (les
        // preuves en bas). On n'aimante que près de son début ; le reste se lit
        // en défilement libre, sans être ramené en arrière.
        if (rect.height > viewport) target = top;

        if (section.id === 'projects-intro' || section.id === 'studies') {
          target = top;
        } else if (window.innerWidth <= 860 && section.id === 'contact') {
          // Sur mobile, l'objet 3D occupe le haut : le texte reste sous la zone réservée.
          target = top;
        } else if (window.innerWidth <= 860 && section.id === 'freelance') {
          // Garder le titre lisible sans masquer la pièce 3D au début de Solutions.
          if (window.innerWidth <= 600) {
            target = top - viewport * 0.18;
          } else {
            const padding = parseFloat(getComputedStyle(section).paddingTop);
            target =
              top +
              Math.min(
                (rect.height - viewport) * 0.3,
                Math.max(0, padding - 76)
              );
          }
        } else if (section.classList.contains('chapter__beat--outcome')) {
          if (window.innerWidth > 860) return;
          target = top - Math.max(72, viewport * 0.08);
        } else if (
          window.innerWidth <= 860 &&
          section.classList.contains('chapter')
        ) {
          const panel = section.querySelector<HTMLElement>('.chapter__panel');
          if (panel) {
            const panelTop = panel.getBoundingClientRect().top + scrollY;
            target = panelTop - Math.max(72, viewport * 0.08);
          }
        }

        this.targets.push(Math.min(Math.max(target, 0), Math.max(max, 0)));
      });
  }
}
