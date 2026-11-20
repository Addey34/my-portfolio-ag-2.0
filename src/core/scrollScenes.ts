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
 * nettes. Le monde 3D actif reçoit sa progression depuis VisualDirector.
 */
export function initScrollScenes(): void {
  initScrollProgress();
  initWordmarkReveal();
  initStoryProgress();
  initIntroExit();

  if (prefersReducedMotion()) return;

  const heroInner = document.querySelector<HTMLElement>('.hero__inner');
  if (heroInner) {
    gsap.matchMedia().add('(min-width: 861px), (min-height: 741px)', () => {
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
    });
  }
  // Entrées et sorties des autres actes : voir SectionTransitions.
}

/** Le texte de l'introduction libère le médaillon pendant son second pivot. */
function initIntroExit(): void {
  const intro = document.querySelector<HTMLElement>('#intro');
  if (!intro) return;
  const reduced = prefersReducedMotion();
  ScrollTrigger.create({
    trigger: '#stack',
    start: 'top 82%',
    end: 'top 55%',
    onUpdate: (self) => {
      const opacity = reduced ? Number(self.progress < 0.5) : 1 - self.progress;
      intro.style.setProperty('--intro-exit-opacity', opacity.toFixed(3));
    },
    onLeaveBack: () => intro.style.setProperty('--intro-exit-opacity', '1'),
    onLeave: () => intro.style.setProperty('--intro-exit-opacity', '0'),
  });
}

/** Une micro-ligne près du kicker rend la progression de chaque acte tangible. */
function initStoryProgress(): void {
  const sections = gsap.utils.toArray<HTMLElement>(
    '#intro, #stack, #freelance, #projects-intro, .chapter, #studies, #contact'
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
