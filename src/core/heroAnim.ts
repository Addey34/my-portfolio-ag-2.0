import { gsap } from 'gsap';
import { prefersReducedMotion } from '@/core/motion';
import type { SmoothScroll } from '@/core/SmoothScroll';

/**
 * Animation inaugurale du héros.
 *
 * Les mots du titre sont découpés lettre par lettre au runtime : chaque lettre
 * vit dans un outer span (overflow:hidden = masque) et un inner span animé par
 * GSAP. L'effet « line reveal » (slide-up depuis le bas de la ligne) est celui
 * des studios haut de gamme — sans librairie SplitText.
 *
 * Séquence : badges → prénom lettre à lettre → nom lettre à lettre → lead
 * → CTAs → indicateur de scroll. Chaque élément arrive avant que le précédent
 * soit fini → fluidité, pas d'attente.
 *
 * En reduced-motion : tout visible immédiatement, zéro animation.
 */
export function initHero(scroll: SmoothScroll): void {
  // Les CTAs ancres + le wordmark utilisent scrollTo de Lenis pour un défilement lissé.
  document
    .querySelectorAll<HTMLAnchorElement>('.hero__cta[href^="#"]')
    .forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        scroll.scrollTo(a.getAttribute('href')!);
      });
    });

  const wordmark = document.querySelector<HTMLAnchorElement>('.wordmark');
  if (wordmark) {
    wordmark.addEventListener('click', (e) => {
      e.preventDefault();
      scroll.scrollTo(0);
    });
  }

  if (prefersReducedMotion()) {
    document
      .querySelectorAll<HTMLElement>('.hero__tag, .hero__lead, .hero__ctas')
      .forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
    return;
  }

  // --- Découpe du titre en lettres ---
  const letterGroups: HTMLElement[][] = [];

  document.querySelectorAll<HTMLElement>('.hero__word').forEach((word) => {
    const text = word.textContent ?? '';
    word.innerHTML = '';
    // Le titre reste lisible par les SR grâce à aria-label="Adrian Guichard" sur le h1.
    word.setAttribute('aria-hidden', 'true');

    const inners: HTMLElement[] = [];
    for (const char of text) {
      // Outer : le masque (overflow:hidden). Line-height 1.05 laisse place aux lettres.
      const outer = document.createElement('span');
      outer.style.cssText =
        'display:inline-block;overflow:hidden;line-height:1.05;vertical-align:top;';

      // Inner : la lettre animée.
      const inner = document.createElement('span');
      inner.textContent = char;
      inner.style.display = 'inline-block';

      outer.appendChild(inner);
      word.appendChild(outer);
      inners.push(inner);
    }

    // GSAP prend ownership du transform dès le début → pas de conflit CSS.
    gsap.set(inners, { y: '112%' });
    letterGroups.push(inners);
  });

  // --- Références aux autres éléments ---
  const tags = gsap.utils.toArray<HTMLElement>('.hero__tag');
  const lead = document.querySelector<HTMLElement>('.hero__lead');
  const ctas = document.querySelector<HTMLElement>('.hero__ctas');

  // --- Timeline principale ---
  const tl = gsap.timeline({ delay: 0.1 });

  // 1. Badges identity → arrivent en stagger léger
  tl.fromTo(
    tags,
    { opacity: 0, y: 16 },
    { opacity: 1, y: 0, duration: 0.44, stagger: 0.07, ease: 'power2.out' }
  );

  // 2. « Adrian » lettre par lettre (démarre avant la fin des badges)
  if (letterGroups[0]) {
    tl.to(
      letterGroups[0],
      { y: 0, duration: 0.62, stagger: 0.03, ease: 'power3.out' },
      '-=0.2'
    );
  }

  // 3. « Guichard » — démarre avant la fin du prénom pour un enchaînement fluide
  if (letterGroups[1]) {
    tl.to(
      letterGroups[1],
      { y: 0, duration: 0.62, stagger: 0.028, ease: 'power3.out' },
      '-=0.58'
    );
  }

  // 4. Lead — fade up
  if (lead) {
    tl.fromTo(
      lead,
      { opacity: 0, y: 22 },
      { opacity: 1, y: 0, duration: 0.58, ease: 'power2.out' },
      '-=0.1'
    );
  }

  // 5. CTAs (légèrement en retard sur le lead pour hiérarchie visuelle)
  if (ctas) {
    tl.fromTo(
      ctas,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
      '-=0.5'
    );
  }
}
