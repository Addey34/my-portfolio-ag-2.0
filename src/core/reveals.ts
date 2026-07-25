import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '@/core/motion';

/**
 * Animations « reveal » à l'entrée dans le viewport.
 *
 * Trois variantes selon l'attribut :
 * - `[data-reveal]`       → fade-up standard (stagger en batch).
 * - `.intro__title`       → blur-fade cinématique (ScrollTrigger individuel).
 * - `[data-reveal-panel]` → perspective 3D (slide + rotateX) pour les panneaux de chapitres.
 *
 * En reduced-motion : tout immédiatement visible, zéro animation.
 */
export function initReveals(): void {
  const reduced = prefersReducedMotion();

  // ── Titre intro : blur-fade individuel ──────────────────────────────────
  const introTitle = document.querySelector<HTMLElement>('.intro__title');
  if (introTitle) {
    if (reduced) {
      introTitle.style.opacity = '1';
      introTitle.style.filter = 'none';
    } else {
      ScrollTrigger.create({
        trigger: introTitle,
        start: 'top 82%',
        once: true,
        onEnter: () => {
          gsap.to(introTitle, {
            opacity: 1,
            filter: 'blur(0px)',
            y: 0,
            duration: 1.3,
            ease: 'power3.out',
            onComplete: () => {
              // On garde le filter inline (blur(0px)) : le remettre à '' ferait
              // ré-appliquer la règle CSS blur(6px) → le titre resterait flou.
              introTitle.style.willChange = 'auto';
            },
          });
        },
      });
    }
  }

  // ── Panneaux chapitres : perspective 3D ─────────────────────────────────
  const panels = gsap.utils.toArray<HTMLElement>('[data-reveal-panel]');
  if (panels.length > 0) {
    if (reduced) {
      panels.forEach((el) => {
        el.style.opacity = '1';
      });
    } else {
      gsap.set(panels, { y: 55, rotationX: -7, transformPerspective: 900 });
      ScrollTrigger.batch(panels, {
        start: 'top 82%',
        once: true,
        onEnter: (batch) => {
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            rotationX: 0,
            duration: 1.15,
            ease: 'power3.out',
            onComplete: () => {
              batch.forEach((el) => {
                (el as HTMLElement).style.willChange = 'auto';
              });
            },
          });
        },
      });
    }
  }

  // ── Éléments standard [data-reveal] ─────────────────────────────────────
  const targets = gsap.utils.toArray<HTMLElement>('[data-reveal]');
  if (targets.length === 0) return;

  if (reduced) {
    targets.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  ScrollTrigger.batch(targets, {
    start: 'top 85%',
    once: true,
    onEnter: (batch) => {
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.08,
        onComplete: () =>
          batch.forEach(
            (el) => ((el as HTMLElement).style.willChange = 'auto')
          ),
      });
      batch.forEach((el) => (el as HTMLElement).classList.add('is-revealed'));
    },
  });
}
