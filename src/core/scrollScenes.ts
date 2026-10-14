import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '@/core/motion';

gsap.registerPlugin(ScrollTrigger);

const CONFIG = {
  heroParallax: 20,
  heroFade: 0.18,
};

/**
 * Montage global du scroll : progression lisible, profondeur douce et sorties
 * nettes. Les chapitres conservent leur moteur dédié dans ChapterManager.
 */
export function initScrollScenes(): void {
  initScrollProgress();
  initWordmarkReveal();
  initStoryProgress();

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
  // Entrées et sorties des autres actes : voir SectionTransitions.
}

/** Une micro-ligne près du kicker rend la progression de chaque acte tangible. */
function initStoryProgress(): void {
  const sections = gsap.utils.toArray<HTMLElement>(
    '#intro, #stack, #freelance, #projects-intro, .chapter, #contact'
  );
  const reduced = prefersReducedMotion();

  sections.forEach((section) => {
    section.dataset.storySequence = '';
    if (reduced) {
      section.style.setProperty('--story-progress', '1');
      return;
    }

    ScrollTrigger.create({
      trigger: section,
      start: 'top 72%',
      end: 'bottom 28%',
      onToggle: (self) =>
        section.classList.toggle('is-story-active', self.isActive),
      onUpdate: (self) =>
        section.style.setProperty('--story-progress', self.progress.toFixed(3)),
    });
  });
}

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

/** Barre de progression du bas de page : `transform` seul, piloté par ScrollTrigger. */
function initScrollProgress(): void {
  const bar = document.querySelector<HTMLElement>('.scroll-progress__bar');
  if (!bar) return;
  ScrollTrigger.create({
    trigger: '#scroll-root',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      bar.style.transform = `scaleX(${self.progress.toFixed(4)})`;
    },
  });
}
