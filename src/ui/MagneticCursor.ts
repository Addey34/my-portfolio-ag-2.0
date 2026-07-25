import { prefersReducedMotion } from '@/core/motion';
import type { VisualState } from '@/visual/types';

/**
 * Curseur « comète » — la petite sœur du PhantomOrb.
 *
 * Un cœur lumineux colle au pointeur ; un halo doux le suit avec du retard et
 * S'ÉTIRE dans le sens du mouvement (squash & stretch), comme une traînée de
 * comète. Sa teinte suit l'accent de l'univers actif (lu dans le VisualState
 * partagé) : le curseur appartient à la même matière que l'orbe et le décor.
 *
 * Sur les éléments `[data-magnetic]`, le halo s'aimante à leur centre, gonfle
 * et se recompacte (l'étirement se calme : on est « posé »), et l'élément est
 * légèrement tiré vers le pointeur.
 *
 * Tout le lissage passe par `update()`, appelée depuis le ticker GSAP unique
 * (voir main.ts) — pas de rAF parallèle. Ne s'active QUE sur pointeur fin +
 * survol possible, et jamais en reduced-motion.
 */
export class MagneticCursor {
  static isSupported(): boolean {
    return (
      !prefersReducedMotion() &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches
    );
  }

  private readonly dot: HTMLDivElement;
  private readonly halo: HTMLDivElement;
  private px = window.innerWidth / 2;
  private py = window.innerHeight / 2;
  private cx = this.px;
  private cy = this.py;
  private rx = this.px;
  private ry = this.py;
  // Vélocité lissée du halo → orientation et étirement de la comète.
  private hvx = 0;
  private hvy = 0;
  private stretch = 1;
  private scale = 1;
  private accent = '';
  private magnet: HTMLElement | null = null;
  private magnetCx = 0;
  private magnetCy = 0;

  private readonly onMove = (e: PointerEvent) => this.handleMove(e);
  private readonly onOver = (e: PointerEvent) => this.handleOver(e);
  private readonly onOut = (e: PointerEvent) => this.handleOut(e);

  constructor(private readonly getState?: () => VisualState) {
    this.dot = this.make('cursor__dot');
    this.halo = this.make('cursor__halo');
    document.body.append(this.halo, this.dot);
    document.documentElement.classList.add('has-cursor');

    window.addEventListener('pointermove', this.onMove, { passive: true });
    window.addEventListener('pointerover', this.onOver, { passive: true });
    window.addEventListener('pointerout', this.onOut, { passive: true });
  }

  private make(cls: string): HTMLDivElement {
    const el = document.createElement('div');
    el.className = cls;
    el.setAttribute('aria-hidden', 'true');
    return el;
  }

  private handleMove(e: PointerEvent): void {
    this.px = e.clientX;
    this.py = e.clientY;
    if (this.magnet) {
      const r = this.magnet.getBoundingClientRect();
      this.magnetCx = r.left + r.width / 2;
      this.magnetCy = r.top + r.height / 2;
    }
  }

  private handleOver(e: PointerEvent): void {
    const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(
      '[data-magnetic]'
    );
    if (el) {
      this.magnet = el;
      const r = el.getBoundingClientRect();
      this.magnetCx = r.left + r.width / 2;
      this.magnetCy = r.top + r.height / 2;
    }
  }

  private handleOut(e: PointerEvent): void {
    const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(
      '[data-magnetic]'
    );
    if (el && el === this.magnet) {
      el.style.transform = '';
      this.magnet = null;
    }
  }

  /** Appelé une fois par frame par la boucle maîtresse (ticker GSAP). */
  update(): void {
    // Teinte : l'accent de l'univers actif (changement rare → écriture rare).
    const state = this.getState?.();
    if (state && state.accent !== this.accent) {
      this.accent = state.accent;
      this.dot.style.setProperty('--cursor-accent', state.accent);
      this.halo.style.setProperty('--cursor-accent', state.accent);
    }

    // Le cœur colle au pointeur ; le halo traîne (lerp plus lent).
    this.cx += (this.px - this.cx) * 0.35;
    this.cy += (this.py - this.cy) * 0.35;

    const targetX = this.magnet ? this.magnetCx : this.px;
    const targetY = this.magnet ? this.magnetCy : this.py;
    const prevRx = this.rx;
    const prevRy = this.ry;
    this.rx += (targetX - this.rx) * 0.18;
    this.ry += (targetY - this.ry) * 0.18;

    // Comète : vélocité lissée → angle + étirement (calmé sur un aimant).
    this.hvx += (this.rx - prevRx - this.hvx) * 0.2;
    this.hvy += (this.ry - prevRy - this.hvy) * 0.2;
    const speed = Math.hypot(this.hvx, this.hvy);
    const targetStretch = this.magnet ? 1 : 1 + Math.min(speed * 0.045, 0.7);
    this.stretch += (targetStretch - this.stretch) * 0.16;
    const angle = Math.atan2(this.hvy, this.hvx);

    const targetScale = this.magnet ? 1.8 : 1;
    this.scale += (targetScale - this.scale) * 0.15;

    this.dot.style.transform = `translate3d(${this.cx}px, ${this.cy}px, 0) translate(-50%, -50%)`;
    this.halo.style.transform =
      `translate3d(${this.rx}px, ${this.ry}px, 0) translate(-50%, -50%) ` +
      `rotate(${angle}rad) scale(${this.scale * this.stretch}, ${this.scale / Math.sqrt(this.stretch)})`;

    // L'élément aimanté est légèrement tiré vers le pointeur.
    if (this.magnet) {
      const dx = (this.px - this.magnetCx) * 0.25;
      const dy = (this.py - this.magnetCy) * 0.25;
      this.magnet.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  }

  destroy(): void {
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerover', this.onOver);
    window.removeEventListener('pointerout', this.onOut);
    document.documentElement.classList.remove('has-cursor');
    if (this.magnet) this.magnet.style.transform = '';
    this.dot.remove();
    this.halo.remove();
  }
}
