import { prefersReducedMotion } from '@/core/motion';
import { getLocale, type Locale } from '@/i18n';
import type { VisualScene, VisualState } from '@/visual/types';
import { clamp01, easeOut, type ChapterScene } from './types';

type Layer = 'interface' | 'realtime' | 'data' | 'deploy';
type LocalizedText = Record<Locale, string>;

interface NodeDef {
  label: string;
  color: string;
  layer: Layer;
  mark: [number, number];
  projects: string[];
  primary?: boolean;
}

interface NodePosition {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  offsetX: number;
  offsetY: number;
  velocityX: number;
  velocityY: number;
  scale: number;
  alpha: number;
  reveal: number;
  magnet: number;
}

interface LabelPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

interface SceneBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

const COLORS: Record<Layer, string> = {
  interface: '#78a7ff',
  realtime: '#5de4f2',
  data: '#a27dff',
  deploy: '#ffb35f',
};

const LAYER_NAMES: Record<Layer, LocalizedText> = {
  interface: { fr: 'Interface & produit', en: 'Interface & product' },
  realtime: { fr: 'Temps réel & mouvement', en: 'Real-time & motion' },
  data: { fr: 'Données & services', en: 'Data & services' },
  deploy: { fr: 'Automatisation & livraison', en: 'Automation & delivery' },
};

const NODE_COPY: Record<string, LocalizedText> = {
  'JavaScript / ESBuild': {
    fr: 'Base d’exécution des modules et des builds rapides pour Galaxy et Ludora, adaptée aux itérations courtes.',
    en: 'Execution and build foundation for Galaxy and Ludora, designed for fast iteration.',
  },
  TypeScript: {
    fr: 'Typage partagé des interfaces, moteurs et contrats d’API pour réduire les régressions à mesure que les produits grandissent.',
    en: 'Shared typing for interfaces, engines and API contracts to reduce regressions as products grow.',
  },
  'React / Router': {
    fr: 'Compose les écrans de MagNotes en séparant navigation, état de vue et logique métier.',
    en: 'Composes MagNotes screens while separating navigation, view state and business logic.',
  },
  'Next.js / React 19': {
    fr: 'Cadre choisi pour les prototypes qui nécessitent rendu hybride, mutations serveur et frontières client explicites.',
    en: 'Chosen for prototypes requiring hybrid rendering, server mutations and explicit client boundaries.',
  },
  Vite: {
    fr: 'Outil de développement et de build du portfolio, de Galaxy et de Ludora, optimisé pour un retour immédiat.',
    en: 'Development and build tool for the portfolio, Galaxy and Ludora, optimized for immediate feedback.',
  },
  'Tailwind / Radix UI': {
    fr: 'Système de composants et de styles pour prototyper des interfaces cohérentes, accessibles et réutilisables.',
    en: 'Component and styling system for prototyping consistent, accessible and reusable interfaces.',
  },
  'HTML / CSS': {
    fr: 'Structure sémantique, hiérarchie visuelle et responsive : la base qui rend chaque interaction lisible.',
    en: 'Semantic structure, visual hierarchy and responsive behavior: the foundation of readable interactions.',
  },
  WebGL: {
    fr: 'Accélère le rendu de Galaxy pour afficher une scène astronomique interactive avec une navigation fluide.',
    en: 'Accelerates Galaxy rendering to deliver an interactive astronomical scene with fluid navigation.',
  },
  'Canvas 2D': {
    fr: 'Rendu des mini-jeux Ludora et des signaux animés, piloté par une boucle de rendu maîtrisée.',
    en: 'Renders Ludora mini-games and animated signals through a controlled rendering loop.',
  },
  'Three.js / Astronomy': {
    fr: 'Convertit les éphémérides et données astronomiques en scène 3D navigable dans Galaxy.',
    en: 'Turns ephemerides and astronomical data into a navigable 3D scene inside Galaxy.',
  },
  'GSAP / Lenis': {
    fr: 'Orchestre le scroll inertiel, les séquences et les transitions pour synchroniser narration et rendu.',
    en: 'Orchestrates inertial scrolling, sequences and transitions to synchronize narrative and rendering.',
  },
  'Nakama / WebSocket': {
    fr: 'Gère les sessions, scores et échanges temps réel de Ludora avec une couche multijoueur persistante.',
    en: 'Handles Ludora sessions, scores and real-time exchanges through a persistent multiplayer layer.',
  },
  'Node.js': {
    fr: 'Socle serveur des API, tâches asynchrones et services partagés utilisés par Ludora et MagNotes.',
    en: 'Server foundation for the APIs, asynchronous tasks and shared services used by Ludora and MagNotes.',
  },
  'Express / JWT': {
    fr: 'Structure les routes HTTP et l’authentification de MagNotes avec des contrats simples à tester.',
    en: 'Structures MagNotes HTTP routes and authentication with contracts that are easy to test.',
  },
  'MongoDB / Mongoose': {
    fr: 'Modélise et persiste notes, tableaux et relations de MagNotes avec des schémas maintenables.',
    en: 'Models and persists MagNotes notes, boards and relationships with maintainable schemas.',
  },
  'FastAPI / Uvicorn': {
    fr: 'Expose les pipelines locaux de génération via des services Python légers et observables.',
    en: 'Exposes local generation pipelines through lightweight and observable Python services.',
  },
  'Python / Pydantic': {
    fr: 'Valide les données des collecteurs et modèles avant leur traitement par les services.',
    en: 'Validates collector and model data before it reaches the services.',
  },
  PostgreSQL: {
    fr: 'Base relationnelle pour les données qui exigent transactions, contraintes et requêtes fiables.',
    en: 'Relational database for data that needs transactions, constraints and reliable queries.',
  },
  'Docker / Oracle Cloud': {
    fr: 'Reproduit les services et organise leur déploiement sur une infrastructure distante maîtrisée.',
    en: 'Reproduces services and organizes their deployment on controlled remote infrastructure.',
  },
  'PyTorch / CUDA / PEFT': {
    fr: 'Cadre les expérimentations de modèles autour de l’entraînement, de la VRAM et des contraintes GPU locales.',
    en: 'Frames model experiments around training, VRAM and local GPU constraints.',
  },
  'Diffusers / Transformers': {
    fr: 'Assemble les pipelines d’image en séparant modèles, mémoire GPU et paramètres d’inférence.',
    en: 'Assembles image pipelines while separating models, GPU memory and inference parameters.',
  },
  'GitHub Actions / CI': {
    fr: 'Rejoue formatage, lint, types, tests et build à chaque changement pour garder les dépôts livrables.',
    en: 'Replays formatting, lint, types, tests and build on every change to keep repositories shippable.',
  },
  'Firebase Hosting': {
    fr: 'Sert les interfaces statiques de Galaxy et MagNotes avec headers de sécurité et cache maîtrisés.',
    en: 'Serves the static Galaxy and MagNotes frontends with controlled security headers and caching.',
  },
  'Vitest / Playwright': {
    fr: 'Vérifie la logique par des tests unitaires et les parcours critiques par des tests de bout en bout.',
    en: 'Checks logic with unit tests and critical journeys with end-to-end tests.',
  },
};

const NODES: NodeDef[] = [
  {
    label: 'JavaScript / ESBuild',
    color: COLORS.interface,
    layer: 'interface',
    mark: [0.08, 0.84],
    projects: ['Galaxy', 'Ludora'],
  },
  {
    label: 'TypeScript',
    color: COLORS.interface,
    layer: 'interface',
    mark: [0.13, 0.68],
    projects: ['Galaxy', 'Ludora', 'MagNotes'],
    primary: true,
  },
  {
    label: 'React / Router',
    color: COLORS.interface,
    layer: 'interface',
    mark: [0.18, 0.52],
    projects: ['MagNotes'],
    primary: true,
  },
  {
    label: 'Next.js / React 19',
    color: COLORS.interface,
    layer: 'interface',
    mark: [0.23, 0.35],
    projects: ['Autres projets'],
  },
  {
    label: 'Vite',
    color: COLORS.interface,
    layer: 'interface',
    mark: [0.28, 0.16],
    projects: ['Galaxy', 'Ludora', 'Portfolio AG'],
    primary: true,
  },
  {
    label: 'Tailwind / Radix UI',
    color: COLORS.interface,
    layer: 'interface',
    mark: [0.33, 0.35],
    projects: ['MagNotes', 'Autres projets'],
  },
  {
    label: 'HTML / CSS',
    color: COLORS.interface,
    layer: 'interface',
    mark: [0.38, 0.52],
    projects: ['Galaxy', 'Ludora', 'MagNotes'],
  },
  {
    label: 'WebGL',
    color: COLORS.interface,
    layer: 'interface',
    mark: [0.43, 0.68],
    projects: ['Galaxy'],
  },
  {
    label: 'Canvas 2D',
    color: COLORS.interface,
    layer: 'interface',
    mark: [0.48, 0.84],
    projects: ['Ludora', 'Portfolio AG'],
  },
  {
    label: 'Three.js / Astronomy',
    color: COLORS.realtime,
    layer: 'realtime',
    mark: [0.18, 0.58],
    projects: ['Galaxy'],
    primary: true,
  },
  {
    label: 'GSAP / Lenis',
    color: COLORS.realtime,
    layer: 'realtime',
    mark: [0.28, 0.58],
    projects: ['Portfolio AG'],
  },
  {
    label: 'Nakama / WebSocket',
    color: COLORS.realtime,
    layer: 'realtime',
    mark: [0.38, 0.58],
    projects: ['Ludora'],
    primary: true,
  },
  {
    label: 'Node.js',
    color: COLORS.data,
    layer: 'data',
    mark: [0.92, 0.24],
    projects: ['Ludora', 'MagNotes'],
    primary: true,
  },
  {
    label: 'Express / JWT',
    color: COLORS.data,
    layer: 'data',
    mark: [0.82, 0.16],
    projects: ['MagNotes'],
    primary: true,
  },
  {
    label: 'MongoDB / Mongoose',
    color: COLORS.data,
    layer: 'data',
    mark: [0.69, 0.19],
    projects: ['MagNotes'],
  },
  {
    label: 'FastAPI / Uvicorn',
    color: COLORS.data,
    layer: 'data',
    mark: [0.6, 0.32],
    projects: ['Autres projets'],
  },
  {
    label: 'Python / Pydantic',
    color: COLORS.data,
    layer: 'data',
    mark: [0.56, 0.49],
    projects: ['Autres projets'],
  },
  {
    label: 'PostgreSQL',
    color: COLORS.data,
    layer: 'data',
    mark: [0.59, 0.68],
    projects: ['Autres projets'],
  },
  {
    label: 'PyTorch / CUDA / PEFT',
    color: COLORS.deploy,
    layer: 'deploy',
    mark: [0.7, 0.82],
    projects: ['Autres projets'],
  },
  {
    label: 'Diffusers / Transformers',
    color: COLORS.deploy,
    layer: 'deploy',
    mark: [0.83, 0.84],
    projects: ['Autres projets'],
  },
  {
    label: 'GitHub Actions / CI',
    color: COLORS.deploy,
    layer: 'deploy',
    mark: [0.92, 0.72],
    projects: ['Ludora', 'Portfolio AG'],
  },
  {
    label: 'Docker / Oracle Cloud',
    color: COLORS.deploy,
    layer: 'deploy',
    mark: [0.92, 0.58],
    projects: ['MagNotes', 'Infrastructure'],
    primary: true,
  },
  {
    label: 'Firebase Hosting',
    color: COLORS.deploy,
    layer: 'deploy',
    mark: [0.79, 0.55],
    projects: ['Galaxy', 'MagNotes', 'Portfolio AG'],
    primary: true,
  },
  {
    label: 'Vitest / Playwright',
    color: COLORS.deploy,
    layer: 'deploy',
    mark: [0.89, 0.55],
    projects: ['MagNotes', 'Portfolio AG'],
    primary: true,
  },
];

const TAU = Math.PI * 2;

/**
 * Monogramme AG géométrique, en unités de dessin (hauteur des lettres = 140).
 * Le A est un triangle isocèle avec une barre ; le G est un arc de cercle
 * parfait (rayon 70) fermé par une barre centrale. Les 24 points suivent
 * l'ordre historique : 0-8 jambes du A, 9-11 barre du A, 12-21 arc du G,
 * 22-23 barre du G.
 */
const AG_HEIGHT = 140;
const AG_WIDTH = 290;
const AG_UNITS: [number, number][] = (() => {
  const points: [number, number][] = [];
  const apexX = 65;
  for (let k = 0; k <= 4; k += 1) {
    const t = k / 4;
    points.push([apexX * t, AG_HEIGHT - AG_HEIGHT * t]);
  }
  for (let k = 1; k <= 4; k += 1) {
    const u = k / 4;
    points.push([apexX + apexX * u, AG_HEIGHT * u]);
  }
  const barY = AG_HEIGHT * 0.64;
  const barT = (AG_HEIGHT - barY) / AG_HEIGHT;
  points.push([apexX * barT, barY], [apexX, barY], [130 - apexX * barT, barY]);
  const cx = 220;
  const cy = AG_HEIGHT / 2;
  const radius = AG_HEIGHT / 2;
  for (let k = 0; k <= 9; k += 1) {
    const angle = ((40 + (320 / 9) * k) * Math.PI) / 180;
    points.push([cx + Math.cos(angle) * radius, cy - Math.sin(angle) * radius]);
  }
  points.push([cx + radius * 0.5, cy], [cx, cy]);
  return points;
})();

/** Cadre du monogramme : échelle uniforme, centré dans les limites de la scène. */
function agFrame(
  left: number,
  top: number,
  width: number,
  height: number
): { left: number; top: number; scale: number; width: number; height: number } {
  const scale = Math.min(width / AG_WIDTH, height / AG_HEIGHT);
  const frameWidth = AG_WIDTH * scale;
  const frameHeight = AG_HEIGHT * scale;
  return {
    left: left + (width - frameWidth) / 2,
    top: top + (height - frameHeight) / 2,
    scale,
    width: frameWidth,
    height: frameHeight,
  };
}

interface PlanetDef {
  orbit: number;
  size: number;
  color: string;
  speed: number;
  phase: number;
}

interface MoonDef {
  planet: number;
  orbit: number;
  size: number;
  color: string;
  speed: number;
  phase: number;
}

// Les distances sont volontairement comprimées, mais les tailles et couleurs
// conservent la hiérarchie visuelle immédiatement reconnaissable du système.
const PLANETS: PlanetDef[] = [
  { orbit: 0, size: 9.2, color: '#ffd36a', speed: 0, phase: 0 },
  { orbit: 0.1, size: 2.1, color: '#a9a7a1', speed: 0.00034, phase: 0.3 },
  { orbit: 0.16, size: 3.7, color: '#e2b369', speed: 0.00026, phase: 1.5 },
  { orbit: 0.23, size: 3.9, color: '#5d9eff', speed: 0.00021, phase: 2.8 },
  { orbit: 0.29, size: 2.8, color: '#d76c4e', speed: 0.00018, phase: 4.1 },
  { orbit: 0.36, size: 7.5, color: '#d6a170', speed: 0.00012, phase: 5.4 },
  { orbit: 0.42, size: 6.7, color: '#e4c58d', speed: 0.00009, phase: 0.9 },
  { orbit: 0.47, size: 5.2, color: '#76d6db', speed: 0.000072, phase: 2.2 },
  { orbit: 0.5, size: 5, color: '#6688e8', speed: 0.000058, phase: 3.6 },
];

const MOONS: MoonDef[] = [
  {
    planet: 3,
    orbit: 0.035,
    size: 1.5,
    color: '#d8dde6',
    speed: 0.0011,
    phase: 0.2,
  },
  {
    planet: 4,
    orbit: 0.025,
    size: 1,
    color: '#c8b3a2',
    speed: 0.0016,
    phase: 1,
  },
  {
    planet: 4,
    orbit: 0.04,
    size: 0.9,
    color: '#a99486',
    speed: -0.0011,
    phase: 3,
  },
  {
    planet: 5,
    orbit: 0.035,
    size: 1.2,
    color: '#e4d4bc',
    speed: 0.0014,
    phase: 0,
  },
  {
    planet: 5,
    orbit: 0.052,
    size: 1.35,
    color: '#c6a97c',
    speed: -0.001,
    phase: 1.4,
  },
  {
    planet: 5,
    orbit: 0.068,
    size: 1.15,
    color: '#c7cbd2',
    speed: 0.00085,
    phase: 3.1,
  },
  {
    planet: 5,
    orbit: 0.082,
    size: 1.05,
    color: '#a19b91',
    speed: -0.00072,
    phase: 4.8,
  },
  {
    planet: 6,
    orbit: 0.042,
    size: 1.15,
    color: '#e6d8bd',
    speed: 0.0011,
    phase: 0.7,
  },
  {
    planet: 6,
    orbit: 0.06,
    size: 1.25,
    color: '#beb3a5',
    speed: -0.00082,
    phase: 2.4,
  },
  {
    planet: 6,
    orbit: 0.077,
    size: 1.05,
    color: '#d7c5a7',
    speed: 0.00064,
    phase: 4.2,
  },
  {
    planet: 7,
    orbit: 0.043,
    size: 1,
    color: '#bce7e5',
    speed: 0.00096,
    phase: 0.4,
  },
  {
    planet: 7,
    orbit: 0.064,
    size: 0.9,
    color: '#9ed3d5',
    speed: -0.0007,
    phase: 3.4,
  },
  {
    planet: 8,
    orbit: 0.045,
    size: 1.05,
    color: '#9ab4ed',
    speed: 0.0009,
    phase: 0.9,
  },
  {
    planet: 8,
    orbit: 0.064,
    size: 0.9,
    color: '#b6c7e8',
    speed: -0.00065,
    phase: 2.7,
  },
  {
    planet: 8,
    orbit: 0.08,
    size: 0.8,
    color: '#879ac6',
    speed: 0.00052,
    phase: 5.1,
  },
];

const THUMB_MARKS: [number, number][] = [
  [0.18, 0.43],
  [0.27, 0.43],
  [0.27, 0.76],
  [0.18, 0.76],
  [0.34, 0.44],
  [0.42, 0.36],
  [0.47, 0.17],
  [0.54, 0.12],
  [0.6, 0.18],
  [0.59, 0.34],
  [0.57, 0.43],
  [0.77, 0.43],
  [0.84, 0.48],
  [0.82, 0.56],
  [0.85, 0.62],
  [0.81, 0.69],
  [0.82, 0.76],
  [0.75, 0.82],
  [0.43, 0.82],
  [0.34, 0.75],
  [0.34, 0.66],
  [0.34, 0.58],
  [0.34, 0.5],
  [0.27, 0.59],
];

const SCENE_ORDER: VisualScene[] = [
  'identity',
  'stack',
  'solutions',
  'selection',
  'galaxy',
  'ludora',
  'magnotes',
  'contact',
];

export class PortfolioStoryScene implements ChapterScene {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly contactDisclosure: HTMLDetailsElement | null;
  private readonly contactForm: HTMLFormElement | null;
  private readonly reduced = prefersReducedMotion();
  private readonly finePointer = window.matchMedia(
    '(hover: hover) and (pointer: fine)'
  ).matches;
  private readonly positions: NodePosition[] = NODES.map(() => ({
    x: 0,
    y: 0,
    baseX: 0,
    baseY: 0,
    offsetX: 0,
    offsetY: 0,
    velocityX: 0,
    velocityY: 0,
    scale: 1,
    alpha: 1,
    reveal: 0,
    magnet: 0,
  }));
  private readonly pointer = { x: -1000, y: -1000, active: false };
  private readonly clockReaction = {
    x: 0,
    y: 0,
    velocityX: 0,
    velocityY: 0,
    engagement: 0,
    angle: -Math.PI / 2,
  };
  private readonly onPointerMove = (event: PointerEvent) => {
    this.pointer.x = event.clientX;
    this.pointer.y = event.clientY;
    this.pointer.active = true;
  };
  private readonly onPointerLeave = () => {
    this.pointer.active = false;
  };
  private visualState: VisualState | null = null;
  private activeScene: VisualScene = 'identity';
  private previousScene: VisualScene = 'identity';
  private w = 1;
  private h = 1;
  private dpr = 1;
  private topInset = 84;
  private bottomInset = 28;
  private lastTime = 0;
  private hoveredIndex = -1;
  private transitionOrigins: [number, number][] = [];
  private targetOriginMap = NODES.map((_, index) => index);
  private transitionMapDirty = true;

  constructor(private readonly stage: HTMLElement) {
    stage.classList.add('stage--portfolio-story');
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'story-board';
    this.ctx = this.canvas.getContext('2d')!;
    this.contactDisclosure = document.querySelector<HTMLDetailsElement>(
      '.contact__disclosure'
    );
    this.contactForm = document.querySelector<HTMLFormElement>('#contact-form');
    stage.appendChild(this.canvas);
    if (this.finePointer && !this.reduced) {
      window.addEventListener('pointermove', this.onPointerMove, {
        passive: true,
      });
      document.documentElement.addEventListener(
        'pointerleave',
        this.onPointerLeave,
        { passive: true }
      );
    }
    this.resize();
  }

  setVisualState(state: VisualState): void {
    if (state.scene !== this.activeScene) {
      this.transitionOrigins = this.positions.map((position) => [
        position.x,
        position.y,
      ]);
      this.transitionMapDirty = true;
      this.previousScene = this.activeScene;
      this.activeScene = state.scene;
    }
    this.visualState = state;
  }

  update(progress: number, time: number): void {
    const compact = this.w < 760;
    const usableHeight = Math.max(
      260,
      this.h - this.topInset - this.bottomInset
    );
    const sceneProgress = this.visualState?.sceneProgress ?? progress;
    const form = this.sceneForm(sceneProgress);
    const transition = this.visualState?.transition ?? 1;
    const transfer = clamp01(transition * 1.18);
    const delta = this.lastTime
      ? Math.min(Math.max((time - this.lastTime) / 1000, 1 / 120), 1 / 24)
      : 1 / 60;
    this.lastTime = time;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.placeNodes(form, delta, compact, time, transfer);
    this.drawTransitionStreams(this.ctx, transfer, compact);

    const clockOpacity =
      this.activeScene === 'identity'
        ? this.previousScene === 'identity'
          ? 1
          : transfer
        : this.previousScene === 'identity'
          ? 1 - transfer
          : 0;
    if (clockOpacity > 0.01) {
      this.drawClockSystem(
        this.ctx,
        clockOpacity,
        usableHeight,
        compact,
        delta,
        time
      );
    }
    const stackOpacity =
      this.activeScene === 'stack'
        ? form * (this.previousScene === 'stack' ? 1 : transfer)
        : this.previousScene === 'stack'
          ? 1 - transfer
          : 0;
    if (stackOpacity > 0.01) {
      this.drawStructure(this.ctx, stackOpacity, time);
      this.drawAGSignature(this.ctx, stackOpacity, compact);
      this.drawStackLabels(this.ctx, sceneProgress, compact, stackOpacity);
    }
    this.drawSceneChoreography(this.ctx, form, compact, time);
    NODES.forEach((node, index) =>
      this.drawNode(this.ctx, this.positions[index], node, index, form)
    );
    if (this.activeScene === 'stack' && stackOpacity > 0.64) {
      this.drawTooltip(this.ctx, form, compact);
    }
  }

  resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = this.stage.clientWidth || 1;
    this.h = this.stage.clientHeight || 1;
    const hudBottom =
      document.querySelector<HTMLElement>('.hud')?.getBoundingClientRect()
        .bottom ?? 0;
    const markBottom =
      document.querySelector<HTMLElement>('.wordmark')?.getBoundingClientRect()
        .bottom ?? 0;
    this.topInset = Math.max(
      72,
      Math.ceil(Math.max(hudBottom, markBottom) + 24)
    );
    this.bottomInset = this.w < 760 ? 20 : 32;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
  }

  destroy(): void {
    window.removeEventListener('pointermove', this.onPointerMove);
    document.documentElement.removeEventListener(
      'pointerleave',
      this.onPointerLeave
    );
    this.canvas.remove();
  }

  private placeNodes(
    form: number,
    delta: number,
    compact: boolean,
    time: number,
    transition: number
  ): void {
    const targets = NODES.map((_, index) =>
      this.scenePoint(this.activeScene, index, compact, false, time)
    );

    if (this.transitionMapDirty) {
      const hasOrigins = this.transitionOrigins.some(
        ([x, y]) => Math.abs(x) > 0.01 || Math.abs(y) > 0.01
      );
      if (!hasOrigins) {
        this.transitionOrigins = NODES.map((_, index) =>
          this.scenePoint(this.previousScene, index, compact, false, time)
        );
      }
      this.targetOriginMap = this.optimalPointAssignment(
        this.transitionOrigins,
        targets
      );
      this.transitionMapDirty = false;
    }

    NODES.forEach((_node, index) => {
      const originIndex = this.targetOriginMap[index] ?? index;
      const origin = this.transitionOrigins[originIndex] ?? targets[index];
      const target = targets[index];
      const [targetX, targetY] = this.hourglassPoint(
        origin,
        target,
        transition,
        index,
        compact
      );
      const pos = this.positions[index];
      pos.baseX = targetX;
      pos.baseY = targetY;
      pos.reveal = 1;
    });

    this.hoveredIndex = -1;
    let nearest = 30;

    this.positions.forEach((pos, index) => {
      const dx = this.pointer.x - pos.baseX;
      const dy = this.pointer.y - pos.baseY;
      const distance = Math.hypot(dx, dy);
      const proximity =
        this.pointer.active && this.finePointer
          ? clamp01(1 - distance / 180)
          : 0;
      const attraction = proximity * form * 0.72;
      const repel =
        proximity * (1 - form) * (compact ? 13 : 24) +
        Math.sin(Math.PI * clamp01(transition)) *
          proximity *
          (compact ? 6 : 14);
      const inverseDistance = distance > 0 ? 1 / distance : 0;
      const targetX = dx * attraction * 0.065 - dx * inverseDistance * repel;
      const targetY = dy * attraction * 0.065 - dy * inverseDistance * repel;
      if (!this.reduced) {
        pos.velocityX += (targetX - pos.offsetX) * 36 * delta;
        pos.velocityY += (targetY - pos.offsetY) * 36 * delta;
        const damping = Math.exp(-7.4 * delta);
        pos.velocityX *= damping;
        pos.velocityY *= damping;
        pos.offsetX += pos.velocityX * delta;
        pos.offsetY += pos.velocityY * delta;
      }
      pos.magnet = clamp01(proximity + (1 - form) * 0.18);
      const targetScale =
        1 + pos.magnet * 0.42 + (this.hoveredIndex === index ? 0.32 : 0);
      pos.scale += (targetScale - pos.scale) * (1 - Math.exp(-12 * delta));
      pos.x = pos.baseX + pos.offsetX;
      pos.y = pos.baseY + pos.offsetY;
      pos.alpha = Math.max(0.3, pos.reveal * 0.98);
      if (pos.reveal >= 0.4 && distance < nearest) {
        nearest = distance;
        this.hoveredIndex = index;
      }
    });
  }

  /** Associe chaque cible au point affiché qui minimise le trajet global. */
  private optimalPointAssignment(
    origins: [number, number][],
    targets: [number, number][]
  ): number[] {
    const count = Math.min(origins.length, targets.length);
    const potentialRows = new Array<number>(count + 1).fill(0);
    const potentialColumns = new Array<number>(count + 1).fill(0);
    const matchedRow = new Array<number>(count + 1).fill(0);
    const previousColumn = new Array<number>(count + 1).fill(0);

    for (let row = 1; row <= count; row += 1) {
      matchedRow[0] = row;
      const minimum = new Array<number>(count + 1).fill(
        Number.POSITIVE_INFINITY
      );
      const used = new Array<boolean>(count + 1).fill(false);
      let column = 0;

      do {
        used[column] = true;
        const activeRow = matchedRow[column];
        let delta = Number.POSITIVE_INFINITY;
        let nextColumn = 0;

        for (let candidate = 1; candidate <= count; candidate += 1) {
          if (used[candidate]) continue;
          const origin = origins[activeRow - 1];
          const target = targets[candidate - 1];
          const dx = origin[0] - target[0];
          const dy = origin[1] - target[1];
          const cost =
            dx * dx +
            dy * dy -
            potentialRows[activeRow] -
            potentialColumns[candidate];
          if (cost < minimum[candidate]) {
            minimum[candidate] = cost;
            previousColumn[candidate] = column;
          }
          if (minimum[candidate] < delta) {
            delta = minimum[candidate];
            nextColumn = candidate;
          }
        }

        for (let candidate = 0; candidate <= count; candidate += 1) {
          if (used[candidate]) {
            potentialRows[matchedRow[candidate]] += delta;
            potentialColumns[candidate] -= delta;
          } else {
            minimum[candidate] -= delta;
          }
        }
        column = nextColumn;
      } while (matchedRow[column] !== 0);

      do {
        const nextColumn = previousColumn[column];
        matchedRow[column] = matchedRow[nextColumn];
        column = nextColumn;
      } while (column !== 0);
    }

    const targetToOrigin = NODES.map((_, index) => index);
    for (let column = 1; column <= count; column += 1) {
      targetToOrigin[column - 1] = matchedRow[column] - 1;
    }
    return targetToOrigin;
  }

  /** Deux segments droits convergent vers le col avant de reformer la cible. */
  private hourglassPoint(
    origin: [number, number],
    target: [number, number],
    progress: number,
    index: number,
    compact: boolean
  ): [number, number] {
    if (this.reduced || progress >= 0.999) return target;
    const eased = progress * progress * (3 - 2 * progress);
    const center = this.scenePoint(this.activeScene, 0, compact, true);
    const direction =
      SCENE_ORDER.indexOf(this.activeScene) >=
      SCENE_ORDER.indexOf(this.previousScene)
        ? 1
        : -1;
    const neck: [number, number] = [
      center[0] + ((index % 6) - 2.5) * (compact ? 3.2 : 6.5),
      center[1] + direction * (compact ? 10 : 24),
    ];
    const split = 0.46;
    const flowProgress =
      eased < split ? eased / split : (eased - split) / (1 - split);
    const from = eased < split ? origin : neck;
    const to = eased < split ? neck : target;
    const flowX = from[0] + (to[0] - from[0]) * flowProgress;
    const flowY = from[1] + (to[1] - from[1]) * flowProgress;
    const directX = origin[0] + (target[0] - origin[0]) * eased;
    const directY = origin[1] + (target[1] - origin[1]) * eased;
    const funnel = Math.sin(Math.PI * eased) * 0.76;
    return [
      directX + (flowX - directX) * funnel,
      directY + (flowY - directY) * funnel,
    ];
  }

  /** Les traînées verticales donnent à la matière une chute nette et continue. */
  private drawTransitionStreams(
    ctx: CanvasRenderingContext2D,
    progress: number,
    compact: boolean
  ): void {
    if (
      this.reduced ||
      progress >= 0.995 ||
      this.previousScene === this.activeScene
    ) {
      return;
    }
    const direction =
      SCENE_ORDER.indexOf(this.activeScene) >=
      SCENE_ORDER.indexOf(this.previousScene)
        ? 1
        : -1;
    const intensity = Math.sin(Math.PI * progress);
    const length = intensity * (compact ? 32 : 62);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.setLineDash([1, compact ? 4 : 6]);
    this.positions.forEach((position, index) => {
      ctx.globalAlpha = intensity * (index % 4 === 0 ? 0.56 : 0.3);
      ctx.strokeStyle = NODES[index].color;
      ctx.lineWidth = index % 4 === 0 ? 0.9 : 0.6;
      ctx.beginPath();
      ctx.moveTo(position.x, position.y - direction * length);
      ctx.lineTo(position.x, position.y);
      ctx.stroke();
    });
    ctx.restore();
  }

  private sceneForm(progress: number): number {
    void progress;
    return 1;
  }

  private scenePoint(
    scene: VisualScene,
    index: number,
    compact: boolean,
    centerOnly = false,
    time = 0
  ): [number, number] {
    const { left, top, width, height } = this.sceneBounds(scene, compact);
    const cx = left + width * 0.5;
    const cy = top + height * 0.5;
    if (centerOnly) return [cx, cy];

    if (scene === 'identity') {
      const radius = compact
        ? Math.min(width * 0.3, 64)
        : Math.min(width * 0.34, 170);
      const angle = -Math.PI / 2 + (index / NODES.length) * TAU;
      return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
    }
    if (scene === 'stack') {
      const frame = agFrame(left, top, width, height);
      return [
        frame.left + AG_UNITS[index][0] * frame.scale,
        frame.top + AG_UNITS[index][1] * frame.scale,
      ];
    }
    if (scene === 'solutions') {
      const strand = index % 2;
      const step = Math.floor(index / 2) / 11;
      const phase = step * TAU * 1.35;
      const separation = Math.sin(phase) * 0.23;
      return [
        left + width * (0.08 + step * 0.84),
        top + height * (0.5 + (strand === 0 ? separation : -separation)),
      ];
    }
    if (scene === 'selection') {
      const rotation = this.reduced ? 0 : time * 0.00016;
      if (index < 16) {
        const angle = -Math.PI / 2 + (index / 16) * TAU + rotation;
        const tooth = index % 2 === 0 ? 1 : 0.83;
        return [
          cx + Math.cos(angle) * width * 0.42 * tooth,
          cy + Math.sin(angle) * height * 0.4 * tooth,
        ];
      }
      const angle = -Math.PI / 2 + ((index - 16) / 8) * TAU - rotation * 1.7;
      return [
        cx + Math.cos(angle) * width * 0.135,
        cy + Math.sin(angle) * height * 0.13,
      ];
    }
    if (scene === 'galaxy') {
      return this.galaxyPoint(index, { left, top, width, height }, time);
    }
    if (scene === 'ludora') {
      return this.pongPoint(index, { left, top, width, height }, time);
    }
    if (scene === 'magnotes') {
      const card = Math.floor(index / 4);
      const corner = index % 4;
      const cards: [number, number][] = [
        [0.16, 0.2],
        [0.45, 0.14],
        [0.78, 0.25],
        [0.25, 0.56],
        [0.58, 0.48],
        [0.8, 0.73],
      ];
      const corners: [number, number][] = [
        [-0.5, -0.5],
        [0.5, -0.5],
        [0.5, 0.5],
        [-0.5, 0.5],
      ];
      const drift = this.reduced ? 0 : Math.sin(time * 0.00023 + card * 1.71);
      const rotation = (card - 2) * 0.09 + drift * 0.035;
      const [cornerX, cornerY] = corners[corner];
      const rotatedX =
        cornerX * Math.cos(rotation) - cornerY * Math.sin(rotation);
      const rotatedY =
        cornerX * Math.sin(rotation) + cornerY * Math.cos(rotation);
      return [
        left +
          width * (cards[card][0] + drift * 0.012) +
          rotatedX * width * 0.16,
        top +
          height * (cards[card][1] + Math.cos(time * 0.00019 + card) * 0.01) +
          rotatedY * height * 0.105,
      ];
    }
    if (scene === 'contact') {
      const heartAngle = (index / NODES.length) * TAU;
      const heartX = 16 * Math.sin(heartAngle) ** 3;
      const heartY =
        13 * Math.cos(heartAngle) -
        5 * Math.cos(2 * heartAngle) -
        2 * Math.cos(3 * heartAngle) -
        Math.cos(4 * heartAngle);
      const heart: [number, number] = [0.5 + heartX / 42, 0.4 - heartY / 38];
      const cycle = this.reduced ? 0 : (time % 12000) / 12000;
      const phase =
        cycle < 0.35
          ? 0
          : cycle < 0.5
            ? (cycle - 0.35) / 0.15
            : cycle < 0.85
              ? 1
              : 1 - (cycle - 0.85) / 0.15;
      const morph = phase * phase * (3 - 2 * phase);
      return [
        left + width * (heart[0] + (THUMB_MARKS[index][0] - heart[0]) * morph),
        top + height * (heart[1] + (THUMB_MARKS[index][1] - heart[1]) * morph),
      ];
    }
    const field = Math.floor(index / 8);
    const fieldStep = (index % 8) / 7;
    return [
      left +
        width * (0.08 + fieldStep * 0.84) +
        Math.sin(fieldStep * Math.PI) * width * (field === 1 ? 0.045 : -0.02),
      top +
        height * (0.2 + field * 0.29) +
        Math.cos(fieldStep * TAU + field) * height * 0.018,
    ];
  }

  private galaxyPoint(
    index: number,
    bounds: SceneBounds,
    time: number
  ): [number, number] {
    const { left, top, width, height } = bounds;
    const centerX = left + width * 0.5;
    const centerY = top + height * 0.5;
    if (index < PLANETS.length) {
      const planet = PLANETS[index];
      if (index === 0) return [centerX, centerY];
      const angle = planet.phase + time * planet.speed;
      const breath = this.reduced
        ? 1
        : 1 + Math.sin(time * 0.00035 + index) * 0.018;
      return [
        centerX + Math.cos(angle) * width * planet.orbit * 0.82 * breath,
        centerY + Math.sin(angle) * height * planet.orbit * 0.62 * breath,
      ];
    }
    const moon = MOONS[index - PLANETS.length];
    const planetPosition = this.galaxyPoint(moon.planet, bounds, time);
    const angle = moon.phase + time * moon.speed;
    return [
      planetPosition[0] + Math.cos(angle) * width * moon.orbit,
      planetPosition[1] + Math.sin(angle) * height * moon.orbit * 0.72,
    ];
  }

  private pongBall(bounds: SceneBounds, time: number): [number, number] {
    const { left, top, width, height } = bounds;
    const phase = (((time % 8200) + 8200) % 8200) / 8200;
    const travel = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
    const x = 0.1 + travel * 0.8;
    const y = Math.max(
      0.16,
      Math.min(
        0.84,
        0.5 +
          Math.sin(time * 0.00137) * 0.25 +
          Math.sin(time * 0.00047 + 1.3) * 0.09
      )
    );
    return [left + width * x, top + height * y];
  }

  private pongPoint(
    index: number,
    bounds: SceneBounds,
    time: number
  ): [number, number] {
    const { left, top, width, height } = bounds;
    const field: [number, number][] = [
      [0.06, 0.1],
      [0.94, 0.1],
      [0.94, 0.9],
      [0.06, 0.9],
    ];
    if (index < 4) {
      return [left + width * field[index][0], top + height * field[index][1]];
    }
    if (index < 12) {
      const right = index >= 8;
      const local = index - (right ? 8 : 4);
      const tracked = this.pongBall(bounds, time + (right ? 360 : -420))[1];
      const center = (tracked - top) / height;
      const y = Math.max(0.2, Math.min(0.8, center)) + (local - 1.5) * 0.055;
      return [left + width * (right ? 0.9 : 0.1), top + height * y];
    }
    if (index === 12) return this.pongBall(bounds, time);
    if (index < 18) return this.pongBall(bounds, time - (index - 12) * 86);
    const netStep = (index - 18) / 5;
    return [left + width * 0.5, top + height * (0.18 + netStep * 0.64)];
  }

  /** Réserve une zone graphique distincte du texte sur petit écran. */
  private sceneBounds(scene: VisualScene, compact: boolean): SceneBounds {
    const usableHeight = Math.max(
      260,
      this.h - this.topInset - this.bottomInset
    );
    if (!compact) {
      if (scene === 'contact') {
        const width = Math.min(this.w * 0.24, 340);
        return {
          left: this.w * 0.5 - width * 0.5,
          top: this.topInset + usableHeight * 0.045,
          width,
          height: usableHeight * 0.2,
        };
      }
      // Zone réservée à la matière de points : jamais sous les colonnes de texte
      // (voir --copy-left et les largeurs de texte dans style.css).
      const width = Math.min(this.w * 0.36, 620);
      return {
        left: this.w * 0.6,
        top: this.topInset + usableHeight * 0.1,
        width,
        height: Math.min(usableHeight * 0.78, width * 1.45),
      };
    }

    const width = this.w * 0.82;
    if (scene === 'identity') {
      return {
        left: this.w * 0.09,
        top: this.topInset + usableHeight * 0.01,
        width,
        height: usableHeight * 0.2,
      };
    }
    if (scene === 'stack') {
      return {
        left: this.w * 0.09,
        top: this.topInset + usableHeight * 0.44,
        width,
        height: usableHeight * 0.46,
      };
    }
    if (scene === 'solutions') {
      return {
        left: this.w * 0.09,
        top: this.topInset + usableHeight * 0.28,
        width,
        height: usableHeight * 0.36,
      };
    }
    if (scene === 'selection') {
      return {
        left: this.w * 0.09,
        top: this.topInset + usableHeight * 0.69,
        width,
        height: usableHeight * 0.22,
      };
    }
    if (scene === 'galaxy' || scene === 'ludora' || scene === 'magnotes') {
      return {
        left: this.w * 0.09,
        top: this.topInset + usableHeight * 0.22,
        width,
        height: usableHeight * 0.34,
      };
    }
    if (scene === 'contact') {
      return {
        left: this.w * 0.22,
        top: this.topInset + usableHeight * 0.055,
        width: this.w * 0.56,
        height: usableHeight * 0.18,
      };
    }
    return {
      left: this.w * 0.09,
      top: this.topInset + usableHeight * 0.54,
      width,
      height: usableHeight * 0.3,
    };
  }

  private sceneEdges(scene: VisualScene): [number, number][] {
    const edges: [number, number][] = [];
    const addPath = (path: number[], close = false) => {
      for (let index = 1; index < path.length; index += 1) {
        edges.push([path[index - 1], path[index]]);
      }
      if (close) edges.push([path[path.length - 1], path[0]]);
    };

    if (scene === 'solutions') {
      addPath([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]);
      addPath([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23]);
      for (let index = 0; index < NODES.length; index += 2) {
        edges.push([index, index + 1]);
      }
    } else if (scene === 'selection') {
      addPath(
        Array.from({ length: 16 }, (_, index) => index),
        true
      );
      addPath(
        Array.from({ length: 8 }, (_, index) => index + 16),
        true
      );
      for (let index = 0; index < 8; index += 1) {
        edges.push([index * 2, index + 16]);
      }
    } else if (scene === 'galaxy') {
      return edges;
    } else if (scene === 'ludora') {
      addPath([0, 1, 2, 3], true);
      addPath([4, 5, 6, 7]);
      addPath([8, 9, 10, 11]);
      addPath([12, 13, 14, 15, 16, 17]);
    } else if (scene === 'magnotes') {
      for (let card = 0; card < 6; card += 1) {
        const start = card * 4;
        addPath([start, start + 1, start + 2, start + 3], true);
      }
      edges.push([1, 4], [5, 8], [9, 12], [3, 7], [7, 11], [14, 16], [18, 20]);
    } else if (scene === 'contact') {
      addPath(
        Array.from({ length: NODES.length }, (_, index) => index),
        true
      );
    } else {
      addPath([0, 1, 2, 3, 4, 5, 6, 7]);
      addPath([8, 9, 10, 11, 12, 13, 14, 15]);
      addPath([16, 17, 18, 19, 20, 21, 22, 23]);
      edges.push([3, 8], [11, 16], [5, 12], [14, 20]);
    }
    return edges;
  }

  private drawSceneChoreography(
    ctx: CanvasRenderingContext2D,
    form: number,
    compact: boolean,
    time: number
  ): void {
    if (this.activeScene === 'identity' || this.activeScene === 'stack') return;

    const edges = this.sceneEdges(this.activeScene);
    const transitionOpacity =
      this.previousScene === this.activeScene
        ? 1
        : Math.max(0.12, this.visualState?.transition ?? 1);
    const alpha =
      (0.2 + form * (compact ? 0.54 : 0.48)) *
      (this.reduced ? 0.72 : 1) *
      transitionOpacity;
    const dashOffset = this.reduced ? 0 : -time * 0.018;

    if (this.activeScene === 'galaxy') {
      this.drawGalaxySystem(ctx, form * transitionOpacity, compact, time);
    } else if (this.activeScene === 'magnotes') {
      this.drawMagNotesContent(ctx, form * transitionOpacity, time);
    } else if (this.activeScene === 'contact') {
      this.drawContactFrame(ctx, form * transitionOpacity, compact, time);
    }

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([2, compact ? 7 : 11]);
    ctx.lineDashOffset = dashOffset;
    edges.forEach(([from, to], edgeIndex) => {
      const previous = this.positions[from];
      const current = this.positions[to];
      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      const distance = Math.max(Math.hypot(dx, dy), 1);
      const normalX = -dy / distance;
      const normalY = dx / distance;
      const bend = Math.sin(edgeIndex * 1.71 + to * 0.3) * (compact ? 4 : 13);
      ctx.globalAlpha = alpha * Math.min(previous.reveal, current.reveal);
      ctx.strokeStyle = NODES[to].color;
      ctx.lineWidth =
        edgeIndex % 5 === 0 || this.activeScene === 'magnotes' ? 1.18 : 0.82;
      ctx.beginPath();
      ctx.moveTo(previous.x, previous.y);
      ctx.quadraticCurveTo(
        (previous.x + current.x) * 0.5 + normalX * bend,
        (previous.y + current.y) * 0.5 + normalY * bend,
        current.x,
        current.y
      );
      ctx.stroke();
    });
    ctx.setLineDash([]);

    if (form > 0.24) {
      const center = this.scenePoint(this.activeScene, 0, compact, true);
      const labels: Partial<Record<VisualScene, string>> = {
        solutions: 'IDEA / PROTOTYPE / PRODUCT',
        selection: 'SELECTED / SYSTEMS',
        galaxy: 'SOL / 08 ORBITS',
        ludora: 'PONG / AUTO',
        magnotes: 'LIVE NOTES / LOOP',
        contact: 'HEART / LIKE',
      };
      const label = labels[this.activeScene];
      if (label && !(compact && this.activeScene === 'contact')) {
        ctx.globalAlpha = alpha * easeOut(form);
        ctx.fillStyle = NODES[Math.floor(NODES.length * 0.5)].color;
        ctx.font = `${compact ? 8 : 11}px ui-monospace, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const labelY =
          this.activeScene === 'contact'
            ? center[1] +
              (compact
                ? 96
                : this.sceneBounds('contact', compact).height * 0.54)
            : center[1];
        ctx.fillText(label, center[0], labelY);
      }
    }
    ctx.restore();
  }

  private drawGalaxySystem(
    ctx: CanvasRenderingContext2D,
    opacity: number,
    compact: boolean,
    time: number
  ): void {
    const bounds = this.sceneBounds('galaxy', compact);
    const center = this.galaxyPoint(0, bounds, time);
    const alpha = easeOut(clamp01(opacity));
    ctx.save();
    ctx.lineCap = 'round';
    ctx.setLineDash([1.5, compact ? 4 : 7]);
    ctx.lineDashOffset = this.reduced ? 0 : -time * 0.008;
    for (let index = 1; index < PLANETS.length; index += 1) {
      const planet = PLANETS[index];
      ctx.globalAlpha = alpha * (index < 5 ? 0.3 : 0.2);
      ctx.strokeStyle = planet.color;
      ctx.lineWidth = index === 3 ? 0.95 : 0.62;
      ctx.beginPath();
      ctx.ellipse(
        center[0],
        center[1],
        bounds.width * planet.orbit * 0.82,
        bounds.height * planet.orbit * 0.62,
        0,
        0,
        TAU
      );
      ctx.stroke();
    }

    MOONS.forEach((moon, moonIndex) => {
      const planetPosition = this.galaxyPoint(moon.planet, bounds, time);
      ctx.globalAlpha = alpha * 0.18;
      ctx.strokeStyle = moon.color;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.ellipse(
        planetPosition[0],
        planetPosition[1],
        bounds.width * moon.orbit,
        bounds.height * moon.orbit * 0.72,
        moonIndex % 2 === 0 ? 0.12 : -0.08,
        0,
        TAU
      );
      ctx.stroke();
    });

    const saturn = this.galaxyPoint(6, bounds, time);
    ctx.setLineDash([]);
    ctx.globalAlpha = alpha * 0.72;
    ctx.strokeStyle = PLANETS[6].color;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.ellipse(
      saturn[0],
      saturn[1],
      compact ? 8 : 15,
      compact ? 2.2 : 4,
      -0.22,
      0,
      TAU
    );
    ctx.stroke();
    ctx.restore();
  }

  private drawMagNotesContent(
    ctx: CanvasRenderingContext2D,
    opacity: number,
    time: number
  ): void {
    const alpha = easeOut(clamp01(opacity));
    ctx.save();
    ctx.lineCap = 'round';
    for (let card = 0; card < 6; card += 1) {
      const topLeft = this.positions[card * 4];
      const topRight = this.positions[card * 4 + 1];
      const bottomRight = this.positions[card * 4 + 2];
      const bottomLeft = this.positions[card * 4 + 3];
      for (let line = 0; line < 3; line += 1) {
        const vertical = 0.27 + line * 0.22;
        const startX = topLeft.x + (bottomLeft.x - topLeft.x) * vertical;
        const startY = topLeft.y + (bottomLeft.y - topLeft.y) * vertical;
        const fullX = topRight.x + (bottomRight.x - topRight.x) * vertical;
        const fullY = topRight.y + (bottomRight.y - topRight.y) * vertical;
        const phase =
          time * (0.00014 + card * 0.000006) + card * 1.37 + line * 0.81;
        const written =
          0.16 + (Math.sin(phase) + 1) * 0.5 * (line === 0 ? 0.68 : 0.5);
        const endX = startX + (fullX - startX) * written;
        const endY = startY + (fullY - startY) * written;
        ctx.globalAlpha = alpha * (0.24 + line * 0.08);
        ctx.strokeStyle = line === 0 ? COLORS.data : COLORS.interface;
        ctx.lineWidth = line === 0 ? 1 : 0.7;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = line === 0 ? COLORS.data : COLORS.realtime;
        ctx.beginPath();
        ctx.arc(endX, endY, line === 0 ? 1.5 : 1.05, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawContactFrame(
    ctx: CanvasRenderingContext2D,
    opacity: number,
    compact: boolean,
    time: number
  ): void {
    const bounds = this.sceneBounds('contact', compact);
    const centerX = bounds.left + bounds.width * 0.5;
    const centerY = bounds.top + bounds.height * 0.5;
    const alpha = easeOut(clamp01(opacity));
    const orbit = this.reduced ? 0 : time * 0.00022;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.setLineDash([2, compact ? 5 : 8]);
    ctx.lineDashOffset = this.reduced ? 0 : -time * 0.01;
    [0, 1].forEach((ring) => {
      ctx.globalAlpha = alpha * (ring === 0 ? 0.32 : 0.18);
      ctx.strokeStyle = ring === 0 ? COLORS.deploy : COLORS.realtime;
      ctx.lineWidth = ring === 0 ? 0.85 : 0.55;
      ctx.beginPath();
      ctx.ellipse(
        centerX,
        centerY,
        bounds.width * (0.54 + ring * 0.12),
        bounds.height * (0.58 + ring * 0.12),
        ring === 0 ? -0.08 : 0.14,
        orbit + ring * 0.7,
        orbit + Math.PI * (1.5 + ring * 0.2)
      );
      ctx.stroke();
    });
    ctx.setLineDash([]);

    for (let index = 0; index < 12; index += 1) {
      const angle = orbit + (index / 12) * TAU;
      const radiusX = bounds.width * (index % 3 === 0 ? 0.66 : 0.54);
      const radiusY = bounds.height * (index % 3 === 0 ? 0.7 : 0.58);
      ctx.globalAlpha = alpha * (index % 3 === 0 ? 0.72 : 0.34);
      ctx.fillStyle = index % 2 === 0 ? COLORS.deploy : COLORS.realtime;
      ctx.beginPath();
      ctx.arc(
        centerX + Math.cos(angle) * radiusX,
        centerY + Math.sin(angle) * radiusY,
        index % 3 === 0 ? 1.9 : 1.1,
        0,
        TAU
      );
      ctx.fill();
    }

    if (this.contactDisclosure?.open && this.contactForm) {
      const rect = this.contactForm.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < this.h) {
        const left = rect.left - (compact ? 8 : 16);
        const top = rect.top - (compact ? 8 : 14);
        const width = rect.width + (compact ? 16 : 32);
        const height = rect.height + (compact ? 16 : 28);
        ctx.globalAlpha = alpha * 0.38;
        ctx.strokeStyle = COLORS.deploy;
        ctx.lineWidth = 0.8;
        ctx.setLineDash([2, compact ? 6 : 9]);
        ctx.lineDashOffset = this.reduced ? 0 : -time * 0.012;
        ctx.beginPath();
        ctx.roundRect(left, top, width, height, 18);
        ctx.stroke();
        ctx.setLineDash([]);

        for (let index = 0; index < 20; index += 1) {
          const perimeter = index / 20;
          const edge = perimeter * 4;
          const side = Math.floor(edge);
          const step = edge - side;
          const x =
            side === 0
              ? left + width * step
              : side === 1
                ? left + width
                : side === 2
                  ? left + width * (1 - step)
                  : left;
          const y =
            side === 0
              ? top
              : side === 1
                ? top + height * step
                : side === 2
                  ? top + height
                  : top + height * (1 - step);
          ctx.globalAlpha = alpha * (index % 4 === 0 ? 0.76 : 0.32);
          ctx.fillStyle = index % 2 === 0 ? COLORS.deploy : COLORS.realtime;
          ctx.beginPath();
          ctx.arc(x, y, index % 4 === 0 ? 2 : 1.05, 0, TAU);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  private drawClockSystem(
    ctx: CanvasRenderingContext2D,
    opacity: number,
    usableHeight: number,
    compact: boolean,
    delta: number,
    time: number
  ): void {
    const alpha = clamp01(opacity);
    if (alpha <= 0.005) return;
    const center = this.scenePoint('identity', 0, compact, true);
    const source = this.scenePoint('identity', 0, compact);
    const radius = Math.hypot(source[0] - center[0], source[1] - center[1]);
    void usableHeight;
    this.updateClockReaction(center[0], center[1], radius, 1 - alpha, delta);
    this.drawClockFace(ctx, alpha, compact, time);
  }

  private updateClockReaction(
    x: number,
    y: number,
    radius: number,
    morph: number,
    delta: number
  ): void {
    const dx = this.pointer.x - x;
    const dy = this.pointer.y - y;
    const distance = Math.hypot(dx, dy);
    const engagement =
      this.pointer.active && this.finePointer && morph < 0.52 && !this.reduced
        ? clamp01(1 - distance / (radius * 2.15)) * (1 - morph)
        : 0;
    const inverseDistance = distance > 0 ? 1 / distance : 0;
    const targetX = dx * inverseDistance * radius * 0.055 * engagement;
    const targetY = dy * inverseDistance * radius * 0.055 * engagement;
    this.clockReaction.velocityX +=
      (targetX - this.clockReaction.x) * 52 * delta;
    this.clockReaction.velocityY +=
      (targetY - this.clockReaction.y) * 52 * delta;
    const damping = Math.exp(-7.4 * delta);
    this.clockReaction.velocityX *= damping;
    this.clockReaction.velocityY *= damping;
    this.clockReaction.x += this.clockReaction.velocityX * delta;
    this.clockReaction.y += this.clockReaction.velocityY * delta;
    this.clockReaction.engagement +=
      (engagement - this.clockReaction.engagement) *
      (1 - Math.exp(-10 * delta));
    if (distance > 0) this.clockReaction.angle = Math.atan2(dy, dx);
  }

  private drawClockFace(
    ctx: CanvasRenderingContext2D,
    alpha: number,
    compact: boolean,
    time: number
  ): void {
    const center = this.scenePoint('identity', 0, compact, true);
    const clockAlpha = this.reduced ? Math.min(alpha, 0.62) : alpha;
    const source = this.scenePoint('identity', 0, compact);
    const radius = Math.hypot(source[0] - center[0], source[1] - center[1]);
    const date = new Date();
    const seconds = date.getSeconds() + date.getMilliseconds() / 1000;
    const minutes = date.getMinutes() + seconds / 60;
    const hours = (date.getHours() % 12) + minutes / 60;
    const handIndexes = [
      {
        phase: (hours / 12) * TAU - Math.PI / 2,
        length: 0.48,
        color: COLORS.deploy,
        width: 1.25,
      },
      {
        phase: (minutes / 60) * TAU - Math.PI / 2,
        length: 0.72,
        color: COLORS.data,
        width: 1,
      },
      {
        phase: (seconds / 60) * TAU - Math.PI / 2,
        length: 0.86,
        color: COLORS.realtime,
        width: 0.75,
      },
    ];

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([1.5, compact ? 6 : 9]);
    ctx.lineDashOffset = -time * 0.018;

    for (let index = 1; index <= NODES.length; index += 1) {
      const previous = this.positions[index - 1];
      const current = this.positions[index % NODES.length];
      ctx.globalAlpha = clockAlpha * 0.3;
      ctx.strokeStyle = NODES[index % NODES.length].color;
      ctx.lineWidth = 0.72;
      ctx.beginPath();
      ctx.moveTo(previous.x, previous.y);
      ctx.lineTo(current.x, current.y);
      ctx.stroke();
    }

    handIndexes.forEach(({ phase, length, color, width }) => {
      const point = {
        x: center[0] + Math.cos(phase) * radius * length,
        y: center[1] + Math.sin(phase) * radius * length,
      };
      const bend = Math.sin(phase) * (compact ? 8 : 18);
      ctx.globalAlpha =
        clockAlpha * (0.58 + this.clockReaction.engagement * 0.25);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash([2, compact ? 7 : 11]);
      ctx.beginPath();
      ctx.moveTo(center[0], center[1]);
      ctx.quadraticCurveTo(
        (center[0] + point.x) * 0.5 + bend,
        (center[1] + point.y) * 0.5 - bend * 0.4,
        point.x,
        point.y
      );
      ctx.stroke();
      ctx.globalAlpha = clockAlpha * 0.9;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, compact ? 2 : 3, 0, TAU);
      ctx.fill();
    });

    ctx.setLineDash([]);
    ctx.globalAlpha = clockAlpha * 0.9;
    ctx.fillStyle = COLORS.interface;
    ctx.beginPath();
    ctx.arc(center[0], center[1], compact ? 2.4 : 3.4, 0, TAU);
    ctx.fill();

    // Légende : l'horloge affiche l'heure du visiteur, il faut le dire.
    // Sur mobile, la place manque sous l'horloge : pas de légende.
    if (!compact) {
      const pad = (value: number): string => String(value).padStart(2, '0');
      const caption = `${
        getLocale() === 'fr' ? 'VOTRE HEURE LOCALE' : 'YOUR LOCAL TIME'
      } · ${pad(date.getHours())}:${pad(date.getMinutes())}`;
      ctx.globalAlpha = clamp01((clockAlpha - 0.5) / 0.5) * 0.85;
      ctx.fillStyle = COLORS.interface;
      ctx.font = `${compact ? 10 : 12}px ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        caption,
        center[0],
        center[1] + radius * 1.22 + (compact ? 10 : 16)
      );
    }
    ctx.restore();
  }

  private drawStructure(
    ctx: CanvasRenderingContext2D,
    morph: number,
    time: number
  ): void {
    const alpha = easeOut(clamp01((morph - 0.08) / 0.58));
    if (alpha <= 0.01) return;
    const rails: { indices: number[]; color: string }[] = [
      { indices: [0, 1, 2, 3, 4], color: COLORS.interface },
      { indices: [4, 5, 6, 7, 8], color: COLORS.interface },
      { indices: [9, 10, 11], color: COLORS.realtime },
      { indices: [12, 13, 14, 15, 16, 17, 18, 19, 20], color: COLORS.data },
      { indices: [20, 21, 22, 23], color: COLORS.deploy },
    ];
    const motion = this.reduced ? 0 : Math.sin(time * 0.0018) * 0.04;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    rails.forEach((rail, railIndex) => {
      const points = rail.indices.map((index) => this.positions[index]);
      for (let i = 1; i < points.length; i += 1) {
        const previous = points[i - 1];
        const current = points[i];
        const segmentReveal = Math.min(previous.reveal, current.reveal);
        if (segmentReveal <= 0.01) continue;
        // Spline de Catmull-Rom : le G reste un arc lisse, les jambes du A
        // (points alignés) restent droites.
        const before = points[i - 2] ?? previous;
        const after = points[i + 1] ?? current;
        const railMagnet = Math.max(previous.magnet, current.magnet);
        ctx.globalAlpha =
          alpha * segmentReveal * (0.22 + motion + railMagnet * 0.36);
        ctx.strokeStyle = rail.color;
        ctx.shadowColor = rail.color;
        ctx.shadowBlur = 4 + railMagnet * 8;
        ctx.lineWidth = railIndex === 2 ? 0.9 : 1.1;
        ctx.beginPath();
        ctx.moveTo(previous.x, previous.y);
        ctx.bezierCurveTo(
          previous.x + (current.x - before.x) / 6,
          previous.y + (current.y - before.y) / 6,
          current.x - (after.x - previous.x) / 6,
          current.y - (after.y - previous.y) / 6,
          current.x,
          current.y
        );
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  private drawAGSignature(
    ctx: CanvasRenderingContext2D,
    opacity: number,
    compact: boolean
  ): void {
    const bounds = this.sceneBounds('stack', compact);
    const frame = agFrame(bounds.left, bounds.top, bounds.width, bounds.height);
    const alpha = easeOut(clamp01((opacity - 0.35) / 0.55));
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = alpha * 0.85;
    ctx.fillStyle = COLORS.interface;
    ctx.font = `${compact ? 9 : 12}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      compact
        ? 'AG / DIGITAL SYSTEMS'
        : 'AG / ADRIAN GUICHARD — DIGITAL SYSTEMS',
      frame.left + frame.width * 0.5,
      frame.top + frame.height + (compact ? 22 : 34)
    );
    ctx.restore();
  }

  private drawNode(
    ctx: CanvasRenderingContext2D,
    pos: NodePosition,
    node: NodeDef,
    index: number,
    morph: number
  ): void {
    if (pos.reveal <= 0.01 && morph > 0.18) return;
    const routeAnchor =
      (this.activeScene === 'ludora' && (index === 12 || index < 4)) ||
      (this.activeScene === 'solutions' &&
        (index < 2 || index >= 22 || index === 10));
    let color = node.color;
    let sceneSize = 0;
    if (this.activeScene === 'galaxy') {
      const body =
        index < PLANETS.length ? PLANETS[index] : MOONS[index - PLANETS.length];
      color = body.color;
      sceneSize = body.size * (this.w < 760 ? 0.72 : 1);
    } else if (this.activeScene === 'ludora') {
      color =
        index === 12
          ? '#f7fbff'
          : index < 8
            ? COLORS.realtime
            : index < 12
              ? COLORS.data
              : index < 18
                ? '#9ec9ff'
                : '#5d789b';
      sceneSize =
        index === 12
          ? this.w < 760
            ? 4.2
            : 5.2
          : index >= 13 && index < 18
            ? Math.max(1, 3.2 - (index - 13) * 0.42)
            : index >= 18
              ? 1.45
              : 2.65;
    } else if (this.activeScene === 'selection') {
      color =
        index < 16
          ? index % 2 === 0
            ? COLORS.deploy
            : COLORS.interface
          : COLORS.realtime;
      sceneSize = index < 16 && index % 2 === 0 ? 3.5 : 2.4;
    } else if (this.activeScene === 'magnotes') {
      const palette = [
        COLORS.data,
        COLORS.interface,
        COLORS.realtime,
        COLORS.deploy,
      ];
      color = palette[Math.floor(index / 4) % palette.length];
      sceneSize = index % 4 === 0 ? 3.3 : 2.25;
    } else if (this.activeScene === 'contact') {
      color = index % 3 === 0 ? '#ff758f' : COLORS.deploy;
      sceneSize = index % 4 === 0 ? 3.6 : 2.45;
    }
    const baseSize =
      sceneSize ||
      (node.primary || routeAnchor
        ? this.w < 760
          ? 4.1
          : 3.8
        : this.w < 760
          ? 2.8
          : 2.45);
    const size = baseSize * pos.scale;
    const hovered = index === this.hoveredIndex;
    const secondary = !node.primary;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    const secondaryAlpha = this.activeScene === 'stack' ? 0.52 : 0.72;
    ctx.globalAlpha = pos.alpha * (secondary && !hovered ? secondaryAlpha : 1);
    ctx.shadowColor = color;
    ctx.shadowBlur = hovered
      ? 13
      : node.primary
        ? 7 + pos.magnet * 8
        : 2 + pos.magnet * 5;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, TAU);
    ctx.fill();
    if (pos.magnet > 0.08) {
      ctx.globalAlpha = pos.alpha * (0.3 + pos.magnet * 0.5);
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.7 + pos.magnet * 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, size + 3 + pos.magnet * 4, 0, TAU);
      ctx.stroke();
    }
    if (
      hovered ||
      (this.activeScene !== 'stack' && node.primary && morph > 0.55)
    ) {
      ctx.shadowBlur = 0;
      ctx.globalAlpha = pos.alpha * 0.9;
      ctx.strokeStyle = 'rgba(244, 246, 251, 0.72)';
      ctx.lineWidth = hovered ? 1.1 : 0.55;
      ctx.beginPath();
      ctx.arc(0, 0, size + (hovered ? 4 : 2.5), 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  private layoutStackLabels(
    ctx: CanvasRenderingContext2D,
    compact: boolean,
    agLeft: number,
    agTop: number,
    agWidth: number,
    agHeight: number
  ): LabelPlacement[] {
    const labelHeight = compact ? 17 : 28;
    const fontSize = compact ? 7 : 11.5;
    const pad = compact ? 4 : 11;
    const labelGap = compact ? 2 : 7;
    const centerX = agLeft + agWidth * 0.5;
    const clampPosition = (value: number, min: number, max: number): number =>
      Math.max(min, Math.min(max, value));

    ctx.save();
    ctx.font = '600 ' + fontSize + 'px ui-monospace, monospace';
    const placements = NODES.map((node, index): LabelPlacement => {
      const point = this.positions[index];
      const visible = !compact && index === this.hoveredIndex;
      const textWidth = ctx.measureText(node.label).width;
      const width = visible
        ? Math.min(agWidth - pad * 2, textWidth + (compact ? 16 : 28))
        : 0;
      const height = visible ? labelHeight : 0;
      const preferredX =
        point.x <= centerX ? point.x + 13 : point.x - width - 13;
      const preferredY = point.y - height * 0.5;
      return {
        x: clampPosition(
          preferredX,
          agLeft + pad,
          agLeft + agWidth - width - pad
        ),
        y: clampPosition(
          preferredY,
          agTop + pad,
          agTop + agHeight - height - pad
        ),
        width,
        height,
        anchorX: point.x,
        anchorY: point.y,
      };
    });
    ctx.restore();

    const desired = placements.map((placement) => ({
      x: placement.x,
      y: placement.y,
    }));

    for (let iteration = 0; iteration < 110; iteration += 1) {
      if (iteration < 24) {
        placements.forEach((placement, index) => {
          placement.x += (desired[index].x - placement.x) * 0.022;
          placement.y += (desired[index].y - placement.y) * 0.022;
        });
      }

      for (let first = 0; first < placements.length; first += 1) {
        for (let second = first + 1; second < placements.length; second += 1) {
          const a = placements[first];
          const b = placements[second];
          const overlapX =
            Math.min(a.x + a.width + labelGap, b.x + b.width + labelGap) -
            Math.max(a.x - labelGap, b.x - labelGap);
          const overlapY =
            Math.min(a.y + a.height + labelGap, b.y + b.height + labelGap) -
            Math.max(a.y - labelGap, b.y - labelGap);
          if (overlapX <= 0 || overlapY <= 0) continue;

          if (overlapX < overlapY) {
            const push = overlapX * 0.52 + 0.4;
            if (a.x <= b.x) {
              a.x -= push;
              b.x += push;
            } else {
              a.x += push;
              b.x -= push;
            }
          } else {
            const push = overlapY * 0.52 + 0.4;
            if (a.y <= b.y) {
              a.y -= push;
              b.y += push;
            } else {
              a.y += push;
              b.y -= push;
            }
          }
        }
      }

      placements.forEach((placement) => {
        placement.x = clampPosition(
          placement.x,
          agLeft + pad,
          agLeft + agWidth - placement.width - pad
        );
        placement.y = clampPosition(
          placement.y,
          agTop + pad,
          agTop + agHeight - placement.height - pad
        );
      });
    }

    placements.forEach((placement, index) => {
      const point = this.positions[index];
      placement.anchorX = Math.max(
        placement.x + 4,
        Math.min(placement.x + placement.width - 4, point.x)
      );
      placement.anchorY = Math.max(
        placement.y + 3,
        Math.min(placement.y + placement.height - 3, point.y)
      );
    });

    return placements;
  }

  private drawStackLabels(
    ctx: CanvasRenderingContext2D,
    progress: number,
    compact: boolean,
    opacity: number
  ): void {
    void progress;
    if (compact || this.hoveredIndex < 0) return;
    const bounds = this.sceneBounds('stack', compact);
    const agLeft = bounds.left;
    const agTop = bounds.top;
    const agWidth = bounds.width;
    const agHeight = bounds.height;
    const placements = this.layoutStackLabels(
      ctx,
      compact,
      agLeft,
      agTop,
      agWidth,
      agHeight
    );

    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.lineCap = 'round';
    ctx.setLineDash([1, 3]);

    NODES.forEach((node, index) => {
      const reveal = this.positions[index].reveal;
      if (reveal <= 0.015) return;
      if (index !== this.hoveredIndex) return;
      const placement = placements[index];
      const point = this.positions[index];

      ctx.globalAlpha = reveal * opacity * 0.2;
      ctx.strokeStyle = node.color;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.quadraticCurveTo(
        point.x + (placement.anchorX - point.x) * 0.45,
        point.y + (placement.anchorY - point.y) * 0.45,
        placement.anchorX,
        placement.anchorY
      );
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.globalAlpha = reveal * opacity * 0.94;
      ctx.fillStyle = node.color;
      ctx.beginPath();
      ctx.arc(
        placement.x + 3,
        placement.y + placement.height / 2,
        compact ? 1.6 : 2.2,
        0,
        TAU
      );
      ctx.fill();
      ctx.fillStyle = 'rgba(235, 240, 249, 0.96)';
      ctx.font =
        (compact ? '600 7px' : '600 11.5px') + ' ui-monospace, monospace';
      ctx.fillText(
        node.label,
        placement.x + 11,
        placement.y + placement.height / 2 + 0.3
      );
      ctx.setLineDash([1, 3]);
    });

    ctx.setLineDash([]);
    ctx.restore();
  }

  private drawTooltip(
    ctx: CanvasRenderingContext2D,
    morph: number,
    compact: boolean
  ): void {
    if (this.hoveredIndex < 0 || morph < 0.64 || compact) return;
    const node = NODES[this.hoveredIndex];
    const pos = this.positions[this.hoveredIndex];
    const locale = getLocale();
    const width = 284;
    const height = 132;
    const proposedX =
      pos.x + 22 + width < this.w - 18 ? pos.x + 22 : pos.x - 22 - width;
    const x = Math.max(18, Math.min(this.w - width - 18, proposedX));
    const y = Math.max(
      this.topInset + 8,
      Math.min(this.h - this.bottomInset - height - 8, pos.y - height * 0.5)
    );
    const detail = NODE_COPY[node.label][locale];
    const projectLabel = locale === 'fr' ? 'UTILISÉ DANS' : 'USED IN';
    ctx.save();
    ctx.globalAlpha = 0.97;
    ctx.fillStyle = 'rgba(5, 7, 14, 0.94)';
    ctx.strokeStyle = `${node.color}99`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = node.color;
    ctx.fillRect(x, y, 3, height);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '650 12px Inter, sans-serif';
    ctx.fillStyle = '#f4f6fb';
    ctx.fillText(node.label, x + 16, y + 23);
    ctx.font = '600 8px ui-monospace, monospace';
    ctx.fillStyle = node.color;
    ctx.fillText(LAYER_NAMES[node.layer][locale].toUpperCase(), x + 16, y + 39);
    ctx.font = '500 10px Inter, sans-serif';
    ctx.fillStyle = 'rgba(183, 192, 208, 0.9)';
    this.drawWrappedText(ctx, detail, x + 16, y + 58, width - 32, 14, 3);
    ctx.font = '600 8px ui-monospace, monospace';
    ctx.fillStyle = 'rgba(183, 192, 208, 0.64)';
    ctx.fillText(
      `${projectLabel}  ·  ${node.projects.join('  /  ')}`,
      x + 16,
      y + 116
    );
    ctx.restore();
  }

  private drawWrappedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number
  ): void {
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = word;
        if (lines.length === maxLines - 1) break;
      } else {
        line = candidate;
      }
    }
    if (line && lines.length < maxLines) lines.push(line);
    lines.forEach((value, index) =>
      ctx.fillText(value, x, y + index * lineHeight)
    );
  }
}
