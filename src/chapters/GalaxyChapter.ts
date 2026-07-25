import { prefersReducedMotion } from '@/core/motion';
import type { VisualState } from '@/visual/types';
import {
  clamp01,
  easeOut,
  type ChapterFactory,
  type ChapterScene,
} from './types';

/**
 * Chapitre GALAXY — reconstitution du visualisateur SolarSystem3D.
 *
 * Fidèle à l'app réelle : espace noir profond, champ d'étoiles, soleil,
 * lignes d'orbites, planètes aux teintes réelles… et sa signature UI — la
 * barre de navigation planètes (pilules sombres translucides dont l'active
 * s'illumine d'un halo de SA couleur, cf. `Galaxy/src/styles.css`).
 *
 * Scroll : la caméra « plonge » vers le système (zoom + inclinaison) pendant
 * que les orbites se dessinent. Temps : les planètes orbitent en continu et la
 * navigation cycle d'une planète à l'autre, comme si quelqu'un explorait.
 */
const PLANETS = [
  {
    name: 'Mercure',
    color: '#9aa0a6',
    rgb: '154, 160, 166',
    r: 0.16,
    size: 2.4,
    speed: 0.9,
  },
  {
    name: 'Vénus',
    color: '#e8c07d',
    rgb: '232, 192, 125',
    r: 0.24,
    size: 3.6,
    speed: 0.62,
  },
  {
    name: 'Terre',
    color: '#4a8fff',
    rgb: '74, 143, 255',
    r: 0.33,
    size: 3.8,
    speed: 0.45,
  },
  {
    name: 'Mars',
    color: '#ff6b4a',
    rgb: '255, 107, 74',
    r: 0.42,
    size: 3.0,
    speed: 0.34,
  },
];

const STAR_COUNT = 160;
const TILT = 0.38; // écrasement des orbites (perspective inclinée de l'app)
const NAV_CYCLE_MS = 2600;

class GalaxyChapter implements ChapterScene {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly nav: HTMLElement;
  private readonly navBtns: HTMLElement[] = [];
  private readonly stars: { x: number; y: number; s: number; a: number }[] = [];
  private readonly reduced = prefersReducedMotion();
  private w = 1;
  private h = 1;
  private dpr = 1;
  private activeNav = 2; // Terre d'abord — le point de départ de l'app
  private lastCycle = 0;
  private visualState: VisualState | null = null;

  constructor(private readonly stage: HTMLElement) {
    stage.classList.add('stage--galaxy');

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'gx-canvas';
    stage.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;

    // La barre de navigation planètes — l'élément le plus reconnaissable de l'app.
    this.nav = document.createElement('div');
    this.nav.className = 'gx-nav';
    for (const p of PLANETS) {
      const btn = document.createElement('span');
      btn.className = 'gx-btn';
      btn.style.setProperty('--planet-rgb', p.rgb);
      btn.textContent = p.name;
      this.nav.appendChild(btn);
      this.navBtns.push(btn);
    }
    stage.appendChild(this.nav);

    // Champ d'étoiles précalculé (positions normalisées).
    for (let i = 0; i < STAR_COUNT; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        s: 0.5 + Math.random() * 1.3,
        a: 0.25 + Math.random() * 0.65,
      });
    }

    this.resize();
    this.syncNav();
  }

  setVisualState(state: VisualState): void {
    this.visualState = state;
  }

  update(progress: number, time: number): void {
    // La partie « construction » se joue sur la première moitié de la traversée.
    const build = easeOut(clamp01(progress * 2.2));
    const t = this.reduced ? 0 : time * 0.001;

    // Cycle de navigation (désactivé en reduced-motion).
    if (!this.reduced && time - this.lastCycle > NAV_CYCLE_MS) {
      this.lastCycle = time;
      this.activeNav = (this.activeNav + 1) % PLANETS.length;
      this.syncNav();
    }

    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Étoiles : elles scintillent à peine (amplitude faible = pas de strobe).
    ctx.fillStyle = '#ffffff';
    for (const s of this.stars) {
      ctx.globalAlpha =
        s.a * (0.8 + 0.2 * Math.sin(t * 1.4 + s.x * 40)) * build;
      ctx.fillRect(s.x * w, s.y * h, s.s, s.s);
    }
    ctx.globalAlpha = 1;

    // Système centré à droite (le panneau texte occupe la gauche).
    const pointer = this.visualState?.pointer;
    const sharedPulse = this.visualState?.pulse ?? 0.5;
    const cx = w * 0.64 + ((pointer?.x ?? 0.5) - 0.5) * 12;
    const cy = h * 0.52 + ((pointer?.y ?? 0.5) - 0.5) * 8;
    const zoom = (0.8 + 0.3 * build) * Math.min(w, h * 1.4);

    // Soleil : cœur chaud + halo.
    const sunR = zoom * 0.045 * (0.985 + sharedPulse * 0.03);
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, sunR * 5);
    glow.addColorStop(0, 'rgba(255, 210, 125, 0.9)');
    glow.addColorStop(0.25, 'rgba(255, 177, 92, 0.35)');
    glow.addColorStop(1, 'rgba(255, 177, 92, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, sunR * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd27d';
    ctx.beginPath();
    ctx.arc(cx, cy, sunR, 0, Math.PI * 2);
    ctx.fill();

    // Orbites + planètes.
    for (let i = 0; i < PLANETS.length; i++) {
      const p = PLANETS[i];
      const orbitR = p.r * zoom;

      // L'orbite se « dessine » avec le scroll (arc partiel → complet).
      const sweep = Math.PI * 2 * build;
      ctx.strokeStyle =
        i === this.activeNav
          ? `rgba(${p.rgb}, 0.55)`
          : 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(
        cx,
        cy,
        orbitR,
        orbitR * TILT,
        0,
        -Math.PI / 2,
        -Math.PI / 2 + sweep
      );
      ctx.stroke();

      // Position orbitale (temps réel, comme l'app).
      const a = t * p.speed + i * 1.7;
      const px = cx + Math.cos(a) * orbitR;
      const py = cy + Math.sin(a) * orbitR * TILT;

      // Halo de la planète active (écho au bouton actif).
      if (i === this.activeNav) {
        const halo = ctx.createRadialGradient(px, py, 0, px, py, p.size * 5);
        halo.addColorStop(0, `rgba(${p.rgb}, 0.5)`);
        halo.addColorStop(1, `rgba(${p.rgb}, 0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(px, py, p.size * 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = build;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  resize(): void {
    // DPR plafonné à 1.5 comme partout ailleurs (SignalField, orbe) : au-delà,
    // le coût de remplissage plein écran ne se voit pas mais se paie.
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.w = this.stage.clientWidth || 1;
    this.h = this.stage.clientHeight || 1;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
  }

  destroy(): void {
    this.canvas.remove();
    this.nav.remove();
  }

  private syncNav(): void {
    this.navBtns.forEach((b, i) =>
      b.classList.toggle('is-active', i === this.activeNav)
    );
  }
}

export const create: ChapterFactory = (stage) => new GalaxyChapter(stage);
