import { prefersReducedMotion } from '@/core/motion';
import type { VisualState } from '@/visual/types';
import {
  clamp01,
  easeOut,
  type ChapterFactory,
  type ChapterScene,
} from './types';

/**
 * Chapitre MAGNOTES — reconstitution du board de post-it.
 *
 * Fidèle à l'app réelle : le canvas sombre `#0d0f1d` à grille de points,
 * l'accent indigo `#6366f1`, des post-it colorés reliés entre eux. Et son
 * histoire produit racontée par le scroll : des notes ÉPARPILLÉES sur le
 * canvas infini qui S'ORGANISENT en trois colonnes Kanban (À faire / En
 * cours / Fait) à mesure qu'on avance — le chaos → la clarté, tout MagNotes.
 *
 * Contrat perf : positions posées en `transform: translate3d` calculées depuis
 * la taille du stage (cachée au resize) — jamais de left/top animés.
 */
interface NoteDef {
  text: string;
  paper: string;
  col: number; // colonne Kanban cible (0..2)
  row: number;
  sx: number; // position éparpillée (fraction du stage)
  sy: number;
  rot: number; // rotation éparpillée (deg)
}

const NOTES: NoteDef[] = [
  {
    text: 'Idée : mode agenda',
    paper: '#fde68a',
    col: 0,
    row: 0,
    sx: 0.42,
    sy: 0.16,
    rot: -7,
  },
  {
    text: 'Refonte du drag',
    paper: '#c7d2fe',
    col: 0,
    row: 1,
    sx: 0.78,
    sy: 0.1,
    rot: 5,
  },
  {
    text: 'Partage public',
    paper: '#fbcfe8',
    col: 0,
    row: 2,
    sx: 0.5,
    sy: 0.62,
    rot: 9,
  },
  {
    text: 'API connexions',
    paper: '#a7f3d0',
    col: 1,
    row: 0,
    sx: 0.88,
    sy: 0.4,
    rot: -4,
  },
  {
    text: 'Undo / Redo',
    paper: '#fde68a',
    col: 1,
    row: 1,
    sx: 0.6,
    sy: 0.36,
    rot: 12,
  },
  {
    text: 'Docker prod',
    paper: '#fca5a5',
    col: 2,
    row: 0,
    sx: 0.72,
    sy: 0.68,
    rot: -10,
  },
  {
    text: 'Palette Ctrl+K',
    paper: '#a7f3d0',
    col: 2,
    row: 1,
    sx: 0.36,
    sy: 0.42,
    rot: 6,
  },
  {
    text: 'Vue Kanban',
    paper: '#c7d2fe',
    col: 2,
    row: 2,
    sx: 0.82,
    sy: 0.78,
    rot: -5,
  },
];

/** Paires de notes reliées (les CardLinks de l'app), estompées à l'organisation. */
const LINKS: [number, number][] = [
  [0, 4],
  [1, 3],
  [4, 6],
  [3, 5],
];

const COLUMNS = ['À faire', 'En cours', 'Fait'];

class MagNotesChapter implements ChapterScene {
  private readonly board: HTMLElement;
  private readonly notes: HTMLElement[] = [];
  private readonly cols: HTMLElement[] = [];
  private readonly svg: SVGSVGElement;
  private readonly lines: SVGLineElement[] = [];
  private readonly reduced = prefersReducedMotion();
  private w = 1;
  private h = 1;
  private noteW = 132;
  private visualState: VisualState | null = null;

  constructor(private readonly stage: HTMLElement) {
    stage.classList.add('stage--magnotes');

    this.board = document.createElement('div');
    this.board.className = 'mg-board';

    // Lignes de connexion (SVG plein cadre, sous les notes).
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'mg-links');
    for (let i = 0; i < LINKS.length; i++) {
      const line = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'line'
      );
      this.svg.appendChild(line);
      this.lines.push(line);
    }
    this.board.appendChild(this.svg);

    // En-têtes de colonnes Kanban (apparaissent avec l'organisation).
    COLUMNS.forEach((name) => {
      const col = document.createElement('div');
      col.className = 'mg-col';
      col.textContent = name;
      this.board.appendChild(col);
      this.cols.push(col);
    });

    // Les post-it.
    NOTES.forEach((def) => {
      const note = document.createElement('div');
      note.className = 'mg-note';
      note.style.setProperty('--paper', def.paper);
      note.textContent = def.text;
      this.board.appendChild(note);
      this.notes.push(note);
    });

    stage.appendChild(this.board);
    this.resize();
  }

  setVisualState(state: VisualState): void {
    this.visualState = state;
  }

  update(progress: number, time: number): void {
    // Organisation : le rangement se joue entre 15% et 70% de la traversée.
    const p = easeOut(clamp01((progress - 0.12) / 0.55));
    const t = this.reduced ? 0 : time * 0.001;
    const pulse = this.visualState?.pulse ?? 0.5;
    const energy = this.visualState?.energy ?? 0.5;

    // Colonnes : en-têtes fondus avec le rangement.
    const colW = this.w / 3;
    this.cols.forEach((col, i) => {
      col.style.opacity = String(clamp01((p - 0.45) / 0.4));
      col.style.transform = `translate3d(${i * colW + colW / 2 - 60}px, ${this.h * 0.1}px, 0)`;
    });

    // Notes : lerp éparpillé → colonne cible + dérive d'inactivité quand libres.
    for (let i = 0; i < NOTES.length; i++) {
      const def = NOTES[i];
      const drift = (1 - p) * (this.reduced ? 0 : 0.7 + energy * 0.6);
      const scatX = def.sx * this.w + Math.sin(t * 0.7 + i * 1.3) * 8 * drift;
      const scatY = def.sy * this.h + Math.cos(t * 0.6 + i * 0.9) * 8 * drift;

      const targetX = def.col * colW + colW / 2 - this.noteW / 2;
      const targetY = this.h * 0.2 + def.row * 74;

      const x = scatX + (targetX - scatX) * p;
      const y = scatY + (targetY - scatY) * p;
      const rot = def.rot * (1 - p);

      this.notes[i].style.transform =
        `translate3d(${x}px, ${y}px, 0) rotate(${rot}deg)`;
    }

    // Connexions : suivent les notes, s'estompent quand tout est rangé.
    const linkAlpha = (0.48 + pulse * 0.1) * (1 - p);
    for (let i = 0; i < LINKS.length; i++) {
      const [a, b] = LINKS[i];
      const na = this.noteCenter(a, p, t);
      const nb = this.noteCenter(b, p, t);
      const line = this.lines[i];
      line.setAttribute('x1', String(na.x));
      line.setAttribute('y1', String(na.y));
      line.setAttribute('x2', String(nb.x));
      line.setAttribute('y2', String(nb.y));
      line.style.opacity = String(linkAlpha);
    }
  }

  resize(): void {
    this.w = this.stage.clientWidth || 1;
    this.h = this.stage.clientHeight || 1;
    this.noteW = this.w < 720 ? 104 : 132;
    this.svg.setAttribute('viewBox', `0 0 ${this.w} ${this.h}`);
  }

  destroy(): void {
    this.board.remove();
  }

  /** Centre approximatif d'une note (même calcul que update, sans relire le DOM). */
  private noteCenter(
    i: number,
    p: number,
    t: number
  ): { x: number; y: number } {
    const def = NOTES[i];
    const energy = this.visualState?.energy ?? 0.5;
    const drift = (1 - p) * (this.reduced ? 0 : 0.7 + energy * 0.6);
    const colW = this.w / 3;
    const scatX = def.sx * this.w + Math.sin(t * 0.7 + i * 1.3) * 8 * drift;
    const scatY = def.sy * this.h + Math.cos(t * 0.6 + i * 0.9) * 8 * drift;
    const targetX = def.col * colW + colW / 2 - this.noteW / 2;
    const targetY = this.h * 0.2 + def.row * 74;
    return {
      x: scatX + (targetX - scatX) * p + this.noteW / 2,
      y: scatY + (targetY - scatY) * p + 28,
    };
  }
}

export const create: ChapterFactory = (stage) => new MagNotesChapter(stage);
