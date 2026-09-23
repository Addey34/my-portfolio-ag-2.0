import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '@/core/motion';

gsap.registerPlugin(ScrollTrigger);

const SEQUENCE_SELECTORS = [
  '#stack',
  '#freelance',
  '#projects-intro',
  '#contact',
];

/**
 * Révélations structurées par séquence narrative.
 *
 * Chaque section déroule son kicker, son idée puis ses preuves dans un rythme
 * commun. Les chapitres gardent leur entrée en perspective. Toutes les
 * animations restent limitées à transform/opacity et utilisent l’horloge GSAP.
 */
export function initReveals(): void {
  const reduced = prefersReducedMotion();
  const handled = new Set<HTMLElement>();

  initIntroTitle(reduced);
  initChapterPanels(reduced);

  for (const selector of SEQUENCE_SELECTORS) {
    const section = document.querySelector<HTMLElement>(selector);
    if (!section) continue;
    const items = Array.from(
      section.querySelectorAll<HTMLElement>('[data-reveal]')
    ).filter((item) => !item.matches('[data-reveal-panel]'));
    items.forEach((item) => handled.add(item));
    revealSequence(section, items, reduced);
  }

  const remaining = gsap.utils
    .toArray<HTMLElement>('[data-reveal]')
    .filter((item) => !handled.has(item));
  revealRemaining(remaining, reduced);
}

function initIntroTitle(reduced: boolean): void {
  const title = document.querySelector<HTMLElement>('.intro__title');
  if (!title) return;
  if (reduced) {
    gsap.set(title, { opacity: 1, y: 0, scale: 1 });
    return;
  }

  ScrollTrigger.create({
    trigger: title,
    start: 'top 82%',
    once: true,
    onEnter: () => {
      gsap.to(title, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 1.15,
        ease: 'power3.out',
        onComplete: () => {
          title.style.willChange = 'auto';
        },
      });
    },
  });
}

function initChapterPanels(reduced: boolean): void {
  const panels = gsap.utils.toArray<HTMLElement>('[data-reveal-panel]');
  if (panels.length === 0) return;
  if (reduced) {
    panels.forEach((panel) => gsap.set(panel, { opacity: 1 }));
    return;
  }

  gsap.set(panels, { y: 48, rotationX: -5, transformPerspective: 1000 });
  ScrollTrigger.batch(panels, {
    start: 'top 82%',
    once: true,
    onEnter: (batch) => {
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        rotationX: 0,
        duration: 1.05,
        ease: 'power3.out',
        onComplete: () => {
          batch.forEach((item) => {
            (item as HTMLElement).style.willChange = 'auto';
          });
        },
      });
    },
  });
}

function revealSequence(
  section: HTMLElement,
  items: HTMLElement[],
  reduced: boolean
): void {
  if (items.length === 0) return;
  if (reduced) {
    items.forEach(showImmediately);
    return;
  }

  gsap.set(items, { opacity: 0, y: 30, scale: 0.988 });
  ScrollTrigger.create({
    trigger: section,
    start: 'top 76%',
    once: true,
    onEnter: () => {
      gsap.to(items, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.95,
        ease: 'power3.out',
        stagger: 0.1,
        onComplete: () => items.forEach(finishReveal),
      });
    },
  });
}

function revealRemaining(items: HTMLElement[], reduced: boolean): void {
  if (items.length === 0) return;
  if (reduced) {
    items.forEach(showImmediately);
    return;
  }

  ScrollTrigger.batch(items, {
    start: 'top 85%',
    once: true,
    onEnter: (batch) => {
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.85,
        ease: 'power3.out',
        stagger: 0.07,
        onComplete: () =>
          batch.forEach((item) => finishReveal(item as HTMLElement)),
      });
    },
  });
}

function showImmediately(item: HTMLElement): void {
  item.classList.add('is-revealed');
  item.style.opacity = '1';
  item.style.transform = 'none';
  item.style.willChange = 'auto';
}

function finishReveal(item: HTMLElement): void {
  item.classList.add('is-revealed');
  item.style.willChange = 'auto';
}
