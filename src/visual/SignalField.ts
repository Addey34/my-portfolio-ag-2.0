import { prefersReducedMotion } from '@/core/motion';
import type { VisualScene, VisualState } from '@/visual/types';

type Point = { x: number; y: number };
type RGB = { r: number; g: number; b: number };

interface SignalProfile {
  curve: number;
  grid: number;
  orbit: number;
  links: number;
  convergence: number;
  flow: number;
}

const PROFILES: Record<VisualScene, SignalProfile> = {
  identity: {
    curve: 1,
    grid: 0,
    orbit: 0,
    links: 0,
    convergence: 0,
    flow: 0,
  },
  stack: {
    curve: 0.72,
    grid: 0.08,
    orbit: 0,
    links: 0.28,
    convergence: 0,
    flow: 0.16,
  },
  solutions: {
    curve: 0.58,
    grid: 0.12,
    orbit: 0.05,
    links: 0.38,
    convergence: 0.08,
    flow: 0.32,
  },
  selection: {
    curve: 0.32,
    grid: 0,
    orbit: 0.34,
    links: 0.44,
    convergence: 0.18,
    flow: 0.12,
  },
  galaxy: {
    curve: 0.22,
    grid: 0,
    orbit: 1,
    links: 0,
    convergence: 0,
    flow: 0,
  },
  ludora: {
    curve: 0.08,
    grid: 1,
    orbit: 0.08,
    links: 0.18,
    convergence: 0,
    flow: 0.25,
  },
  magnotes: {
    curve: 0.38,
    grid: 0.2,
    orbit: 0,
    links: 1,
    convergence: 0,
    flow: 0.42,
  },
  studies: {
    curve: 0.45,
    grid: 0.12,
    orbit: 0.2,
    links: 0.35,
    convergence: 0.18,
    flow: 0.12,
  },
  contact: {
    curve: 0.5,
    grid: 0,
    orbit: 0,
    links: 0.22,
    convergence: 1,
    flow: 0.12,
  },
};

const LINK_NODES: Point[] = [
  { x: 0.2, y: 0.22 },
  { x: 0.45, y: 0.34 },
  { x: 0.72, y: 0.2 },
  { x: 0.82, y: 0.58 },
  { x: 0.58, y: 0.76 },
  { x: 0.28, y: 0.68 },
];
const LINK_PAIRS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 0],
  [1, 4],
];

/**
 * Signature visuelle du portfolio : un champ de lignes topographiques qui
 * Ã©voque Ã  la fois une carte, un signal et des trajectoires de donnÃ©es.
 *
 * Le rendu reste volontairement calme : Canvas 2D, 30 fps maximum, aucune
 * allocation importante par frame et une rÃ©action amortie au pointeur. Comme
 * le reste du site, il est pilotÃ© par le ticker GSAP partagÃ© depuis main.ts.
 */
export class SignalField {
  private readonly context: CanvasRenderingContext2D | null;
  private readonly reduced = prefersReducedMotion();
  private readonly pointer: Point = { x: 0.72, y: 0.42 };
  private readonly target: Point = { x: 0.72, y: 0.42 };
  private readonly onResize = () => this.resize();
  private readonly onPointerMove = (event: PointerEvent) => {
    this.target.x = event.clientX / Math.max(window.innerWidth, 1);
    this.target.y = event.clientY / Math.max(window.innerHeight, 1);
  };
  private readonly onPointerLeave = () => {
    this.target.x = 0.72;
    this.target.y = 0.42;
  };
  private progress = 0;
  private lastFrame = 0;
  private paused = false;
  private liteMode = false;
  private interactive = false;
  private visualState: VisualState | null = null;
  private targetProfile: SignalProfile = PROFILES.identity;
  private readonly profile: SignalProfile = { ...PROFILES.identity };
  private readonly color: RGB = { r: 110, g: 168, b: 255 };
  private targetColor: RGB = { ...this.color };

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d', { alpha: true });
    if (!this.context) return;

    window.addEventListener('resize', this.onResize, { passive: true });
    this.resize();

    if (!this.reduced) this.setInteractive(true);
  }

  getPointer(): Point {
    return this.pointer;
  }

  setVisualState(state: VisualState): void {
    this.visualState = state;
    this.progress = state.progress;
  }

  /** PrÃ©pare le morphing vers le vocabulaire du prochain univers. */
  setScene(scene: VisualScene, accent: string): void {
    this.targetProfile = PROFILES[scene];
    this.targetColor = parseHex(accent);
  }

  /** Fige le champ dans son Ã©tat courant, sans le faire disparaÃ®tre. */
  setPaused(paused: boolean): void {
    this.paused = paused;
    if (!paused) this.lastFrame = 0;
  }

  /** Active la dÃ©formation douce des lignes autour du pointeur. */
  setLiteMode(on: boolean): void {
    this.liteMode = on;
    this.lastFrame = 0;
  }

  setInteractive(on: boolean): void {
    if (this.reduced || on === this.interactive) return;
    this.interactive = on;

    if (on) {
      window.addEventListener('pointermove', this.onPointerMove, {
        passive: true,
      });
      document.documentElement.addEventListener(
        'pointerleave',
        this.onPointerLeave,
        {
          passive: true,
        }
      );
    } else {
      window.removeEventListener('pointermove', this.onPointerMove);
      document.documentElement.removeEventListener(
        'pointerleave',
        this.onPointerLeave
      );
      this.onPointerLeave();
    }
  }

  /** AppelÃ© par le ticker partagÃ© ; le rendu est limitÃ© Ã  30 fps. */
  render(time = 0): void {
    if (!this.context || this.paused || this.reduced) return;
    const frameInterval = this.liteMode ? 1000 / 20 : 1000 / 30;
    if (time - this.lastFrame < frameInterval) return;

    const delta = this.lastFrame ? Math.min(time - this.lastFrame, 50) : 16;
    this.lastFrame = time;
    const pointerEase = 1 - Math.pow(0.88, delta / 16); // rÃ©actif
    const profileEase = 1 - Math.pow(0.86, delta / 16); // dÃ©libÃ©rÃ©
    this.pointer.x += (this.target.x - this.pointer.x) * pointerEase;
    this.pointer.y += (this.target.y - this.pointer.y) * pointerEase;
    this.approachProfile(profileEase);
    this.draw(time / 1000);
  }

  resize(): void {
    if (!this.context) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    this.canvas.width = Math.floor(width * ratio);
    this.canvas.height = Math.floor(height * ratio);
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.draw(0);
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize);
    this.setInteractive(false);
  }

  private draw(time: number): void {
    const ctx = this.context;
    if (!ctx) return;

    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const compact = width < 720;
    const lines = compact ? (this.liteMode ? 7 : 11) : this.liteMode ? 10 : 17;
    const samples = compact
      ? this.liteMode
        ? 24
        : 32
      : this.liteMode
        ? 32
        : 48;
    const focusX = this.pointer.x * width;
    const focusY = this.pointer.y * height;
    const drift = time * 0.16 + this.progress * Math.PI * 1.8;
    const energy = this.visualState?.energy ?? 0.42;
    const transition = this.visualState?.transition ?? 1;
    const fadeFactor = 0.72 + 0.28 * transition;
    const waveMod = 1;

    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let line = 0; line < lines; line++) {
      const t = line / Math.max(lines - 1, 1);
      const baseY = height * (0.08 + t * 0.84);
      const warm = line % 7 === 4;
      ctx.beginPath();

      for (let sample = 0; sample <= samples; sample++) {
        const x = (sample / samples) * width;
        const dx = (x - focusX) / Math.max(width * 0.34, 1);
        const distance = Math.exp(-dx * dx * 2.2);
        const verticalDistance = (baseY - focusY) / Math.max(height * 0.44, 1);
        const pointerBend =
          distance * verticalDistance * -height * 0.075 * this.profile.curve;
        const wave =
          (Math.sin(x * 0.006 + line * 0.72 + drift) * height * 0.007 +
            Math.sin(x * 0.0022 - line * 0.48 - drift * 0.7) * height * 0.012) *
          this.profile.curve *
          waveMod;
        const convergence =
          Math.exp(-Math.pow((x - focusX) / Math.max(width * 0.24, 1), 2)) *
          this.profile.convergence;
        const convergedY = focusY + (t - 0.5) * height * 0.16;
        const naturalY = baseY + wave + pointerBend;
        const y = naturalY + (convergedY - naturalY) * convergence;

        if (sample === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      const alpha =
        (0.055 + (1 - Math.abs(t - 0.5) * 2) * 0.07) *
        (0.65 + energy * 0.7) *
        fadeFactor;
      if (warm) {
        const wr = Math.round(255 * 0.65 + this.color.r * 0.35);
        const wg = Math.round(177 * 0.65 + this.color.g * 0.35);
        const wb = Math.round(92 * 0.65 + this.color.b * 0.35);
        ctx.strokeStyle = `rgba(${wr}, ${wg}, ${wb}, ${alpha * 0.72})`;
      } else {
        ctx.strokeStyle = rgba(this.color, alpha);
      }
      ctx.lineWidth = line % 5 === 0 ? 1.15 : 0.65;
      ctx.stroke();
    }

    this.drawGrid(ctx, width, height, fadeFactor);
    this.drawOrbits(ctx, focusX, focusY, width, height, time, fadeFactor);
    this.drawLinks(ctx, width, height, time, fadeFactor);
    this.drawFlow(ctx, width, height, time, fadeFactor);
  }

  /** Grille discrète issue du même champ de lignes que le reste du décor. */
  private drawGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    fadeFactor: number
  ): void {
    const alpha = this.profile.grid * 0.075 * fadeFactor;
    if (alpha < 0.002) return;
    const gap = width < 720 ? 52 : 68;
    ctx.strokeStyle = rgba(this.color, alpha);
    ctx.lineWidth = 0.65;
    for (let x = gap; x < width; x += gap) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  }

  private drawOrbits(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    time: number,
    fadeFactor: number
  ): void {
    const alpha = this.profile.orbit * 0.12 * fadeFactor;
    if (alpha < 0.002) return;
    ctx.strokeStyle = rgba(this.color, alpha);
    ctx.lineWidth = 0.7;
    const base = Math.min(width, height);
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.ellipse(
        x,
        y,
        base * (0.09 + i * 0.075),
        base * (0.026 + i * 0.024),
        Math.sin(time * 0.12) * 0.04,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
  }

  private drawLinks(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    fadeFactor: number
  ): void {
    const alpha = this.profile.links * 0.12 * fadeFactor;
    if (alpha < 0.002) return;
    ctx.strokeStyle = rgba(this.color, alpha);
    ctx.fillStyle = rgba(this.color, alpha * 2.5);
    ctx.lineWidth = 0.7;
    ctx.setLineDash([2, 10]);
    ctx.lineDashOffset = -time * 8;
    for (const [a, b] of LINK_PAIRS) {
      const from = LINK_NODES[a];
      const to = LINK_NODES[b];
      const x1 = from.x * width;
      const y1 = from.y * height;
      const x2 = to.x * width;
      const y2 = to.y * height;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(
        (x1 + x2) * 0.5,
        (y1 + y2) * 0.5 - height * 0.035,
        x2,
        y2
      );
      ctx.stroke();
    }
    ctx.setLineDash([]);
    for (let i = 0; i < LINK_NODES.length; i++) {
      const node = LINK_NODES[i];
      const size = i % 2 === 0 ? 2.5 : 1.8;
      ctx.fillRect(
        node.x * width - size / 2,
        node.y * height - size / 2,
        size,
        size
      );
    }
  }

  /** Flux de livraison continu pour la séquence Solutions. */
  private drawFlow(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    fadeFactor: number
  ): void {
    const alpha = this.profile.flow * 0.12 * fadeFactor;
    if (alpha < 0.002) return;
    ctx.save();
    ctx.strokeStyle = rgba(this.color, alpha);
    ctx.lineWidth = 0.8;
    ctx.setLineDash([3, 16]);
    ctx.lineDashOffset = -time * 18;
    for (let lane = 0; lane < 3; lane++) {
      const y = height * (0.29 + lane * 0.2);
      ctx.beginPath();
      ctx.moveTo(width * 0.08, y);
      ctx.bezierCurveTo(
        width * 0.32,
        y - height * 0.08,
        width * 0.7,
        y + height * 0.08,
        width * 0.92,
        y
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  private approachProfile(ease: number): void {
    const keys: (keyof SignalProfile)[] = [
      'curve',
      'grid',
      'orbit',
      'links',
      'convergence',
      'flow',
    ];
    for (const key of keys) {
      this.profile[key] += (this.targetProfile[key] - this.profile[key]) * ease;
    }
    this.color.r += (this.targetColor.r - this.color.r) * ease;
    this.color.g += (this.targetColor.g - this.color.g) * ease;
    this.color.b += (this.targetColor.b - this.color.b) * ease;
  }
}

function parseHex(value: string): RGB {
  const hex = value.replace('#', '');
  const full = hex.length === 3 ? hex.replace(/(.)/g, '$1$1') : hex;
  return {
    r: parseInt(full.slice(0, 2), 16) || 110,
    g: parseInt(full.slice(2, 4), 16) || 168,
    b: parseInt(full.slice(4, 6), 16) || 255,
  };
}

function rgba(color: RGB, alpha: number): string {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${alpha})`;
}
