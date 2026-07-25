import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '@/core/motion';

gsap.registerPlugin(ScrollTrigger);

/**
 * Animations globales pilotées par le scroll (`scrub`).
 *
 * Le héros part en parallaxe et s'estompe en défilant. Les chapitres projet
 * ont leur PROPRE moteur d'animation au scroll (chapters/ChapterManager.ts) —
 * rien à faire ici pour eux.
 *
 * Tout est en transform/opacity (composité GPU), cadencé par ScrollTrigger
 * synchronisé Lenis. En reduced-motion : aucune animation posée.
 * Le « feeling » se règle dans CONFIG, sans toucher à la logique.
 */
const CONFIG = {
  heroParallax: 24, // % de translation verticale du bloc titre héros
  heroFade: 0.2, // opacité résiduelle du héros en fin de course
};

export function initScrollScenes(): void {
  initWordmarkReveal();

  if (prefersReducedMotion()) return;

  const heroInner = document.querySelector<HTMLElement>('.hero__inner');
  if (heroInner) {
    gsap.to(heroInner, {
      yPercent: -CONFIG.heroParallax,
      opacity: CONFIG.heroFade,
      ease: 'none',
      scrollTrigger: {
        trigger: '#top',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    });
  }

  // La section stack s'efface en quittant l'écran : sa légende ne traîne pas
  // en haut du viewport pendant l'entrée dans le premier chapitre.
  const stackParts = document.querySelectorAll<HTMLElement>(
    '#stack .stack__copy, #stack .stack-viz'
  );
  if (stackParts.length > 0) {
    gsap.to(stackParts, {
      opacity: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: '#stack',
        start: 'bottom 45%',
        end: 'bottom 15%',
        scrub: true,
      },
    });
  }
}

/**
 * Le wordmark `AG` se dévoile une fois le héros dépassé — comme une navbar qui
 * apparaît au scroll, plus intentionnel qu'un logo fixe en permanence. En
 * reduced-motion, le CSS le montre d'emblée : ici, on ne câble rien.
 */
function initWordmarkReveal(): void {
  const wordmark = document.querySelector<HTMLElement>('.wordmark');
  if (!wordmark || prefersReducedMotion()) return;

  ScrollTrigger.create({
    trigger: '#top',
    start: 'bottom 60%',
    onEnter: () => wordmark.classList.add('is-visible'),
    onLeaveBack: () => wordmark.classList.remove('is-visible'),
  });
}
