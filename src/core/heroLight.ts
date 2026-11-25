import { gsap } from 'gsap';
import { prefersReducedMotion } from '@/core/motion';

/**
 * Lumière du héros : un halo chaud suit doucement le pointeur, comme la lampe
 * de l'atelier que l'on incline. Le halo est un pseudo-élément déplacé par
 * `transform` (aucune peinture) ; l'interpolation passe par le ticker GSAP
 * unique et s'arrête dès que le héros quitte l'écran ou que le pointeur est
 * immobile. Inactif au toucher et en mouvement réduit.
 */
export function initHeroLight(): void {
  const hero = document.getElementById('top');
  if (!hero || prefersReducedMotion()) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  let visible = true;
  let tx = 0;
  let ty = 0;
  let x = 0;
  let y = 0;
  new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
    },
    { threshold: 0 }
  ).observe(hero);

  hero.addEventListener(
    'pointermove',
    (event) => {
      const rect = hero.getBoundingClientRect();
      // Décalage borné : le halo reste proche de sa position de repos.
      tx = ((event.clientX - rect.left) / rect.width - 0.5) * 90;
      ty = ((event.clientY - rect.top) / rect.height - 0.5) * 60;
    },
    { passive: true }
  );

  gsap.ticker.add(() => {
    if (!visible) return;
    const dx = tx - x;
    const dy = ty - y;
    if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) return;
    x += dx * 0.07;
    y += dy * 0.07;
    hero.style.setProperty('--hx', `${x.toFixed(2)}px`);
    hero.style.setProperty('--hy', `${y.toFixed(2)}px`);
  });
}
