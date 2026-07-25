import { prefersReducedMotion } from '@/core/motion';
import type { VisualScene, VisualState } from '@/visual/types';

type RGB = { r: number; g: number; b: number };

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

/**
 * Orbe fantomatique — un PEINTRE de décor, pas un projecteur.
 *
 * Le vrai fond animé (SignalField + scènes de chapitres) existe déjà dans le
 * compositeur fixe, mais il « n'existe pas » tant que l'orbe n'est pas passée :
 * un voile sombre couvre tout, et l'orbe le dissout là où elle voyage. Sa
 * peinture PERSISTE (buffer de couverture offscreen) — on voit littéralement
 * le décor se construire dans son sillage.
 *
 * Chaque visite est unique : un seed de session (crypto) tire la trajectoire,
 * les gestes et les étincelles. Garde-fous :
 *  - Garantie narrative : quel que soit le chemin de l'orbe, le voile est
 *    entièrement levé aux deux tiers de chaque section (plancher lié à
 *    `sceneProgress`) — le décor complet est toujours vu.
 *  - Le texte vit dans #scroll-root, AU-DESSUS du voile : la lisibilité ne
 *    dépend jamais de l'orbe.
 *  - Le seed est loggé en dev pour rejouer une visite exacte.
 *
 * Au changement d'univers, la peinture se dissout doucement pendant que
 * l'orbe repeint le nouveau décor, et sa teinte glisse vers l'accent du
 * chapitre suivant en fin de section (écho de ce qui arrive).
 *
 * Respect des invariants :
 *  - Pas d'horloge propre : `update(time)` vient du ticker GSAP unique.
 *  - Pas d'écouteur scroll : tout dérive de `VisualState`.
 *  - Canvas 2D maison, zéro bibliothèque de rendu.
 *  - Perf : voile en DPR 1, couverture en 1/6 de résolution, 30 fps max,
 *    aucun rendu quand le voile est entièrement levé.
 *  - En reduced-motion : aucun voile — le décor figé reste entièrement visible.
 */
const FPS = 30;
const POINTER_PULL = 0.06; // très faible : l'orbe reste insaisissable
const POS_EASE = 0.05; // lerp lent → « impossible à cibler »
const VEIL_ALPHA = 0.94; // opacité du voile là où rien n'est peint
const COVER_SCALE = 1 / 6; // résolution du buffer de couverture
const DISSOLVE_MS = 1200; // durée de dissolution après changement d'univers
const MAX_SPARKS = 24;

export class PhantomOrb {
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly cover = document.createElement('canvas');
  private readonly cctx = this.cover.getContext('2d');
  private readonly reduced = prefersReducedMotion();
  private readonly onResize = () => this.resize();
  private readonly rng: () => number;
  private readonly sparks: Spark[] = [];

  // Traits de personnalité tirés du seed — fixes pour toute la visite.
  private readonly ampX: number;
  private readonly freqX: number;
  private readonly phase1: number;
  private readonly phase2: number;
  private readonly phase3: number;
  private readonly wobble: number;
  private readonly sparkRate: number;

  private w = 0;
  private h = 0;
  private lastFrame = 0;
  private paused = false;
  private scene: VisualScene | null = null;
  private dissolveUntil = 0;
  private floor = -1; // plancher de révélation amorti (-1 = non initialisé)

  // Position normalisée (0..1) : cible dérivée du scroll, puis position amortie.
  private tx = 0.5;
  private ty = 0.2;
  private x = 0.5;
  private y = 0.2;

  private readonly color: RGB = { r: 110, g: 168, b: 255 };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly getState: () => VisualState
  ) {
    this.ctx = canvas.getContext('2d', { alpha: true });

    const seed = makeSeed();
    if (import.meta.env.DEV) console.info('[PhantomOrb] seed', seed);
    this.rng = mulberry32(seed);
    this.ampX = 0.2 + this.rng() * 0.16;
    this.freqX = 2.2 + this.rng() * 2.2;
    this.phase1 = this.rng() * Math.PI * 2;
    this.phase2 = this.rng() * Math.PI * 2;
    this.phase3 = this.rng() * Math.PI * 2;
    this.wobble = 0.05 + this.rng() * 0.08;
    this.sparkRate = 0.12 + this.rng() * 0.14;

    window.addEventListener('resize', this.onResize, { passive: true });
    this.resize();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (!paused) {
      this.lastFrame = 0;
      return;
    }
    // Fond figé demandé : on lève le voile pour que le décor statique reste lisible.
    this.ctx?.clearRect(0, 0, this.w, this.h);
  }

  /** Appelé une fois par frame par la boucle maîtresse (ticker GSAP). */
  update(time: number): void {
    if (!this.ctx || !this.cctx || this.paused || this.reduced) return;
    if (time - this.lastFrame < 1000 / FPS) return;
    const delta = this.lastFrame ? Math.min(time - this.lastFrame, 50) : 33;
    this.lastFrame = time;

    const state = this.getState();
    const t = time / 1000;

    // 0. Changement d'univers : l'ancienne peinture se dissout, l'orbe repeint.
    if (state.scene !== this.scene) {
      this.scene = state.scene;
      this.dissolveUntil = time + DISSOLVE_MS;
    }

    // 1. Garantie narrative : plancher de révélation lié à la progression de
    //    la section. À ~2/3 du chapitre, tout le décor est visible, quel que
    //    soit le chemin réel de l'orbe. Amorti pour éviter tout saut de voile.
    const targetFloor = smoothstep((state.sceneProgress - 0.16) / 0.5);
    if (this.floor < 0) this.floor = targetFloor;
    this.floor += (targetFloor - this.floor) * (1 - Math.pow(0.94, delta / 16));

    // 2. Trajectoire : dérive pilotée par le scroll, harmoniques seedées.
    const p = state.progress;
    this.tx =
      0.5 +
      Math.sin(p * Math.PI * this.freqX + t * this.wobble + this.phase1) *
        this.ampX +
      Math.sin(p * Math.PI * 7 + this.phase2) * 0.06;
    this.ty = 0.16 + p * 0.68 + Math.sin(t * 0.1 + p * 6 + this.phase3) * 0.05;
    // Le pointeur ne fait que teinter la trajectoire (jamais de verrouillage).
    this.tx += (state.pointer.x - this.tx) * POINTER_PULL;
    this.ty += (state.pointer.y - this.ty) * POINTER_PULL;
    this.x += (this.tx - this.x) * POS_EASE;
    this.y += (this.ty - this.y) * POS_EASE;

    // 3. Teinte : accent de l'univers, avec écho du suivant en fin de section.
    const echo = smoothstep((state.sceneProgress - 0.82) / 0.18);
    const acc = mixRGB(
      parseHex(state.accent),
      parseHex(state.accentNext),
      echo
    );
    const cease = 1 - Math.pow(0.9, delta / 16);
    this.color.r += (acc.r - this.color.r) * cease;
    this.color.g += (acc.g - this.color.g) * cease;
    this.color.b += (acc.b - this.color.b) * cease;

    this.paint(time, state.energy);
    this.render(t, state.energy, state.pulse, delta);
  }

  resize(): void {
    if (!this.ctx || !this.cctx) return;
    // Voile en DPR 1 : gradients doux, la résolution rétina n'apporte rien.
    this.w = Math.max(1, this.canvas.clientWidth);
    this.h = Math.max(1, this.canvas.clientHeight);
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.cover.width = Math.max(1, Math.round(this.w * COVER_SCALE));
    this.cover.height = Math.max(1, Math.round(this.h * COVER_SCALE));
    // En reduced-motion le canvas reste vierge : aucun voile, décor visible.
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize);
  }

  /** Dépose la peinture de l'orbe sur le buffer de couverture (persistant). */
  private paint(time: number, energy: number): void {
    const ctx = this.cctx;
    if (!ctx) return;
    const bw = this.cover.width;
    const bh = this.cover.height;

    // Dissolution douce de l'univers précédent.
    if (time < this.dissolveUntil) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.07)';
      ctx.fillRect(0, 0, bw, bh);
    }

    ctx.globalCompositeOperation = 'source-over';
    const cx = this.x * bw;
    const cy = this.y * bh;
    const radius = Math.min(bw, bh) * (0.24 + energy * 0.1);
    this.stamp(ctx, cx, cy, radius, 0.5);

    // Gestes seedés : l'orbe « projette » parfois un éclat de décor à côté.
    if (this.rng() < this.sparkRate) {
      const angle = this.rng() * Math.PI * 2;
      const dist = radius * (0.9 + this.rng() * 1.4);
      this.stamp(
        ctx,
        cx + Math.cos(angle) * dist,
        cy + Math.sin(angle) * dist,
        radius * (0.3 + this.rng() * 0.35),
        0.4
      );
      this.spawnSpark(angle);
    }
  }

  private stamp(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    alpha: number
  ): void {
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
    grad.addColorStop(0.6, `rgba(0, 0, 0, ${alpha * 0.5})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  }

  /** Voile modulé par le plancher → percé par la peinture → lueur + étincelles. */
  private render(
    t: number,
    energy: number,
    pulse: number,
    delta: number
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const cx = this.x * this.w;
    const cy = this.y * this.h;

    ctx.clearRect(0, 0, this.w, this.h);

    // 1. Voile sombre, levé par la garantie narrative (plancher).
    const veil = VEIL_ALPHA * (1 - this.floor);
    if (veil > 0.004) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(2, 3, 8, ${veil})`;
      ctx.fillRect(0, 0, this.w, this.h);

      // 2. La peinture accumulée perce le voile (upscale doux du buffer).
      ctx.globalCompositeOperation = 'destination-out';
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.cover, 0, 0, this.w, this.h);
    }

    // 3. Lueur de l'orbe + étincelles, en additif.
    ctx.globalCompositeOperation = 'lighter';
    this.drawGlow(ctx, cx, cy, energy, pulse, t);
    this.drawSparks(ctx, delta);
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawGlow(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    energy: number,
    pulse: number,
    t: number
  ): void {
    const glow = Math.min(this.w, this.h) * (0.2 + energy * 0.06);
    const halo = 0.28 + pulse * 0.1;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glow);
    grad.addColorStop(0, rgba(this.color, halo));
    grad.addColorStop(0.35, rgba(this.color, halo * 0.4));
    grad.addColorStop(1, rgba(this.color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, glow, 0, Math.PI * 2);
    ctx.fill();

    // Cœur lumineux, léger battement.
    const core = 3 + Math.sin(t * 1.6) * 0.8;
    ctx.beginPath();
    ctx.fillStyle = `rgba(246, 248, 252, ${0.6 * halo + 0.2})`;
    ctx.arc(cx, cy, core, 0, Math.PI * 2);
    ctx.fill();
  }

  private spawnSpark(angle: number): void {
    if (this.sparks.length >= MAX_SPARKS) this.sparks.shift();
    const speed = 0.02 + this.rng() * 0.05;
    this.sparks.push({
      x: this.x,
      y: this.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
    });
  }

  private drawSparks(ctx: CanvasRenderingContext2D, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx * dt * 10;
      s.y += s.vy * dt * 10;
      s.life -= dt * 1.4;
      if (s.life <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }
      ctx.beginPath();
      ctx.fillStyle = rgba(this.color, s.life * 0.55);
      ctx.arc(s.x * this.w, s.y * this.h, 1.1 + s.life * 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Seed de session : chaque navigation a sa propre orbe. */
function makeSeed(): number {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0];
  }
  return Math.floor(Math.random() * 0xffffffff);
}

/** PRNG déterministe (mulberry32) — rejouable depuis le seed loggé en dev. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(value: number): number {
  const v = Math.min(1, Math.max(0, value));
  return v * v * (3 - 2 * v);
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

function mixRGB(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

function rgba(c: RGB, alpha: number): string {
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${alpha})`;
}
