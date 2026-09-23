import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '@/core/motion';

gsap.registerPlugin(ScrollTrigger);

const CONFIG = {
  heroParallax: 20,
  heroFade: 0.18,
  copyDrift: 4,
};

/**
 * Montage global du scroll : progression lisible, profondeur douce et sorties
 * nettes. Les chapitres conservent leur moteur dédié dans ChapterManager.
 */
export function initScrollScenes(): void {
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

  gsap.utils
    .toArray<HTMLElement>('.section--offers .section-copy')
    .forEach((copy) => {
      gsap.to(copy, {
        yPercent: -CONFIG.copyDrift,
        ease: 'none',
        scrollTrigger: {
          trigger: copy.closest('.section'),
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.4,
        },
      });
    });

  const stackParts = document.querySelectorAll<HTMLElement>(
    '#stack .stack__copy, #stack .stack-viz'
  );
  if (stackParts.length > 0) {
    gsap.to(stackParts, {
      opacity: 0,
      yPercent: -2,
      ease: 'none',
      scrollTrigger: {
        trigger: '#stack',
        start: 'bottom 45%',
        end: 'bottom 15%',
        scrub: true,
      },
    });
  }

  gsap.utils.toArray<HTMLElement>('.chapter__panel-shell').forEach((shell) => {
    const chapter = shell.closest<HTMLElement>('.chapter');
    if (!chapter) return;
    gsap.to(shell, {
      opacity: 0,
      yPercent: -3,
      ease: 'none',
      scrollTrigger: {
        trigger: chapter,
        start: 'bottom 72%',
        end: 'bottom 42%',
        scrub: true,
      },
    });
  });
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
