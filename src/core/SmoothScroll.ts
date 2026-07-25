import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '@/core/motion';

gsap.registerPlugin(ScrollTrigger);

/**
 * SmoothScroll — le cœur anti-jank du site.
 *
 * Principe : on ne lie JAMAIS une animation à l'événement `scroll` (irrégulier,
 * en retard, deltas énormes en scroll rapide). À la place :
 *
 *   1. Lenis intercepte le scroll et le LISSE (lerp par frame). Un coup de molette
 *      brutal devient une interpolation douce → plus de saccade.
 *   2. UNE SEULE horloge — le ticker GSAP — pilote tout : elle avance Lenis, qui
 *      notifie ScrollTrigger. Les rendus Canvas s'abonnent à ce même ticker (voir main.ts).
 *      Un seul requestAnimationFrame pour scroll + animations + 3D = zéro contention.
 *   3. En `prefers-reduced-motion`, on n'active pas Lenis : scroll natif, instantané.
 *
 * C'est le pattern de référence des portfolios primés (Awwwards) fait proprement.
 */
export class SmoothScroll {
  readonly lenis: Lenis | null;
  private readonly tick: (time: number) => void;

  constructor() {
    if (prefersReducedMotion()) {
      // Pas de smooth-scroll imposé : on laisse le navigateur gérer.
      this.lenis = null;
      this.tick = () => {};
      // ScrollTrigger doit tout de même suivre le scroll natif.
      ScrollTrigger.refresh();
      return;
    }

    this.lenis = new Lenis({
      // Durée du lerp : plus haut = plus « lourd »/cinématique, plus bas = réactif.
      lerp: 0.1,
      wheelMultiplier: 1,
      smoothWheel: true,
    });

    // Chaque déplacement lissé de Lenis met à jour les ScrollTrigger — synchro parfaite.
    this.lenis.on('scroll', ScrollTrigger.update);

    // Le ticker GSAP devient la boucle maîtresse. lagSmoothing(0) évite les sauts
    // après un onglet en arrière-plan. `time` est en secondes → Lenis attend des ms.
    this.tick = (time: number) => this.lenis?.raf(time * 1000);
    gsap.ticker.add(this.tick);
    gsap.ticker.lagSmoothing(0);
  }

  /**
   * Défilement vers une cible (sélecteur, offset numérique ou élément).
   * Avec Lenis : animé et lissé. En reduced-motion (Lenis absent) : saut natif
   * instantané via `scrollIntoView`/`scrollTo` — la navigation reste fonctionnelle.
   */
  scrollTo(target: string | number | HTMLElement, offset = 0): void {
    if (this.lenis) {
      this.lenis.scrollTo(target, { offset });
      return;
    }
    if (typeof target === 'number') {
      window.scrollTo({ top: target });
      return;
    }
    const el =
      typeof target === 'string' ? document.querySelector(target) : target;
    if (el instanceof HTMLElement) el.scrollIntoView({ block: 'start' });
  }

  destroy(): void {
    gsap.ticker.remove(this.tick);
    this.lenis?.destroy();
  }
}
