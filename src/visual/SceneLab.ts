import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { SmoothScroll } from '@/core/SmoothScroll';
import type { VisualDirector } from '@/visual/VisualDirector';

/** Atelier local : il pilote le vrai scroll, sans état visuel parallèle. */
export class SceneLab {
  private readonly root = document.createElement('aside');
  private readonly progress: HTMLInputElement;
  private readonly phase: HTMLOutputElement;
  private readonly opening: HTMLInputElement;
  private readonly openingPhase: HTMLOutputElement;
  private readonly metrics: HTMLOutputElement;
  private readonly samples: number[] = [];
  private lastFrame = 0;
  private lastRefresh = 0;

  constructor(
    private readonly scroll: SmoothScroll,
    private readonly visual: VisualDirector
  ) {
    this.root.className = 'scene-lab';
    this.root.setAttribute('aria-label', 'Atelier de la scène 3D');
    this.root.innerHTML = `
      <div class="scene-lab__head"><strong>Atelier 3D</strong><button id="scene-lab-collapse" type="button" aria-expanded="true">Réduire</button></div>
      <div class="scene-lab__steps" role="group" aria-label="Comparer les ouvertures">
        <button type="button" data-opening="medallion" aria-pressed="true">Médaillon</button>
        <button type="button" data-opening="ag" aria-pressed="false">Horloge → AG → Système</button>
        <button type="button" data-opening="direct" aria-pressed="false">Horloge → Système</button>
      </div>
      <label for="scene-lab-opening">Parcours complet <output id="scene-lab-opening-phase">0 %</output></label>
      <input id="scene-lab-opening" type="range" min="0" max="100" step="1" value="0" />
      <label for="scene-lab-progress">Horloge → AG <output id="scene-lab-phase">0 %</output></label>
      <input id="scene-lab-progress" type="range" min="0" max="100" step="1" value="0" />
      <div class="scene-lab__steps" aria-label="Repères de transition">
        <button type="button" data-phase="0">0</button>
        <button type="button" data-phase="25">25</button>
        <button type="button" data-phase="50">50</button>
        <button type="button" data-phase="75">75</button>
        <button type="button" data-phase="100">100</button>
      </div>
      <label for="scene-lab-x">Lampe X <output id="scene-lab-x-value">0</output></label>
      <input id="scene-lab-x" type="range" min="-1" max="1" step="0.02" value="0" />
      <label for="scene-lab-y">Lampe Y <output id="scene-lab-y-value">0</output></label>
      <input id="scene-lab-y" type="range" min="-1" max="1" step="0.02" value="0" />
      <label for="scene-lab-power">Lumière <output id="scene-lab-power-value">100 %</output></label>
      <input id="scene-lab-power" type="range" min="0.5" max="1.5" step="0.02" value="1" />
      <label class="scene-lab__quality"><input id="scene-lab-lite" type="checkbox" /> Mode léger</label>
      <output id="scene-lab-metrics" class="scene-lab__metrics">Chargement WebGL…</output>
    `;
    document.body.appendChild(this.root);
    this.progress = this.requireElement<HTMLInputElement>(
      '#scene-lab-progress'
    );
    this.phase = this.requireElement<HTMLOutputElement>('#scene-lab-phase');
    this.opening = this.requireElement<HTMLInputElement>('#scene-lab-opening');
    this.openingPhase = this.requireElement<HTMLOutputElement>(
      '#scene-lab-opening-phase'
    );
    this.metrics = this.requireElement<HTMLOutputElement>('#scene-lab-metrics');
    this.requireElement<HTMLInputElement>('#scene-lab-lite').checked =
      this.visual.isLiteMode();
    this.requireElement<HTMLButtonElement>(
      '#scene-lab-collapse'
    ).addEventListener('click', (event) => {
      const button = event.currentTarget;
      if (!(button instanceof HTMLButtonElement)) return;
      const collapsed = this.root.classList.toggle('scene-lab--collapsed');
      button.setAttribute('aria-expanded', String(!collapsed));
      button.textContent = collapsed ? 'Ouvrir' : 'Réduire';
    });

    this.progress.addEventListener('input', () =>
      this.setPercent(Number(this.progress.value))
    );
    this.opening.addEventListener('input', () =>
      this.setOpeningPercent(Number(this.opening.value))
    );
    this.root
      .querySelectorAll<HTMLButtonElement>('[data-opening]')
      .forEach((button) => {
        button.addEventListener('click', () => {
          const variant = button.dataset.opening;
          if (
            variant !== 'medallion' &&
            variant !== 'ag' &&
            variant !== 'direct'
          )
            return;
          this.visual.setLabOpeningVariant(variant);
          this.root
            .querySelectorAll<HTMLButtonElement>('[data-opening]')
            .forEach((choice) => {
              choice.setAttribute('aria-pressed', String(choice === button));
            });
        });
      });
    this.root
      .querySelectorAll<HTMLButtonElement>('[data-phase]')
      .forEach((button) => {
        button.addEventListener('click', () =>
          this.setPercent(Number(button.dataset.phase))
        );
      });
    for (const key of ['x', 'y', 'power'] as const) {
      this.requireElement<HTMLInputElement>(
        `#scene-lab-${key}`
      ).addEventListener('input', () => this.updateLamp());
    }
    this.requireElement<HTMLInputElement>('#scene-lab-lite').addEventListener(
      'change',
      (event) => {
        const input = event.currentTarget;
        if (!(input instanceof HTMLInputElement)) return;
        this.visual.setLiteMode(input.checked);
        document.documentElement.classList.toggle('lite-mode', input.checked);
      }
    );
  }

  update(time: number): void {
    if (this.lastFrame > 0) {
      this.samples.push(time - this.lastFrame);
      if (this.samples.length > 120) this.samples.shift();
    }
    this.lastFrame = time;
    if (time - this.lastRefresh < 250) return;
    this.lastRefresh = time;

    const percent = Math.round(this.visual.getState().clockAgProgress * 100);
    this.progress.value = String(percent);
    this.phase.value = `${percent} %`;
    const openingPercent = Math.round(
      this.visual.getState().openingProgress * 100
    );
    this.opening.value = String(openingPercent);
    this.openingPhase.value = `${openingPercent} %`;
    const diagnostics = this.visual.getRenderDiagnostics();
    if (!diagnostics) return;
    const sorted = [...this.samples].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
    this.metrics.value =
      `Cadence JS ${median.toFixed(1)} / ${p95.toFixed(1)} ms (méd./P95) · ` +
      `${diagnostics.calls} appels · ${diagnostics.triangles.toLocaleString('fr-FR')} triangles · ` +
      `${diagnostics.geometries} géométries · ${diagnostics.textures} textures · DPR ${diagnostics.pixelRatio.toFixed(2)}`;
  }

  destroy(): void {
    this.root.remove();
  }

  private setPercent(percent: number): void {
    const range = this.visual.getClockAgScrollRange();
    if (!range) return;
    const progress = Math.max(0, Math.min(100, percent)) / 100;
    this.scroll.scrollTo(
      range.start + (range.end - range.start) * progress,
      0,
      {
        immediate: true,
      }
    );
    ScrollTrigger.update();
    this.progress.value = String(Math.round(progress * 100));
    this.phase.value = `${Math.round(progress * 100)} %`;
  }

  private setOpeningPercent(percent: number): void {
    const range = this.visual.getOpeningScrollRange();
    if (!range) return;
    const progress = Math.max(0, Math.min(100, percent)) / 100;
    this.scroll.scrollTo(
      range.start + (range.end - range.start) * progress,
      0,
      {
        immediate: true,
      }
    );
    ScrollTrigger.update();
    this.opening.value = String(Math.round(progress * 100));
    this.openingPhase.value = `${Math.round(progress * 100)} %`;
  }

  private updateLamp(): void {
    const x = Number(
      this.requireElement<HTMLInputElement>('#scene-lab-x').value
    );
    const y = Number(
      this.requireElement<HTMLInputElement>('#scene-lab-y').value
    );
    const power = Number(
      this.requireElement<HTMLInputElement>('#scene-lab-power').value
    );
    this.requireElement<HTMLOutputElement>('#scene-lab-x-value').value =
      x.toFixed(2);
    this.requireElement<HTMLOutputElement>('#scene-lab-y-value').value =
      y.toFixed(2);
    this.requireElement<HTMLOutputElement>('#scene-lab-power-value').value =
      `${Math.round(power * 100)} %`;
    this.visual.setLabLamp({ x, y, power });
  }

  private requireElement<T extends Element>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Atelier 3D incomplet : ${selector}`);
    return element;
  }
}
