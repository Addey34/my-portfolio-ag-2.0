import { prefersReducedMotion } from '@/core/motion';

/**
 * Séquence des modules de Stacks : pendant que le cube s'assemble, le module
 * qui traverse le tiers central de l'écran s'allume et les autres s'estompent
 * légèrement (opacité seule). Le contenu reste entièrement lisible : la
 * séquence ne cache rien, ne force aucun défilement et fonctionne dans les deux
 * sens, au scroll rapide comme au toucher (IntersectionObserver, aucun écouteur
 * de défilement). Inactive en mouvement réduit et sur les écrans étroits, où les
 * modules s'empilent sous la sculpture.
 */
export function initSequenceFocus(): void {
  if (prefersReducedMotion()) return;
  const families = document.querySelectorAll<HTMLElement>(
    '#stack .stack-family'
  );
  if (families.length === 0) return;
  const wide = window.matchMedia('(min-width: 981px)');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle(
          'is-lit',
          wide.matches && entry.isIntersecting
        );
      });
    },
    { rootMargin: '-38% 0px -38% 0px', threshold: 0 }
  );
  families.forEach((family) => observer.observe(family));
}
