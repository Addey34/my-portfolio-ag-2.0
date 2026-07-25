/**
 * Compteur FPS overlay — visible en dev uniquement (import.meta.env.DEV).
 * Sert de sonde « comportement suspect » : si le scrollytelling fait chuter les
 * FPS, on le voit immédiatement pendant le développement.
 */
export class FPSCounter {
  private frames = 0;
  private last = performance.now();

  constructor(private readonly el: HTMLElement) {
    if (!import.meta.env.DEV) {
      el.style.display = 'none';
    }
  }

  /** À appeler une fois par frame (depuis le ticker GSAP). */
  tick(now: number): void {
    if (!import.meta.env.DEV) return;
    this.frames++;
    if (now - this.last >= 500) {
      const fps = Math.round((this.frames * 1000) / (now - this.last));
      this.el.textContent = `${fps} FPS`;
      this.frames = 0;
      this.last = now;
    }
  }
}
