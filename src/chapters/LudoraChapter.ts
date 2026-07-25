import { prefersReducedMotion } from '@/core/motion';
import type { VisualState } from '@/visual/types';
import {
  easeOut,
  window01,
  type ChapterFactory,
  type ChapterScene,
} from './types';

/**
 * Chapitre LUDORA — reconstitution du portail d'arcade.
 *
 * Fidèle à l'app réelle : le fond « portail » navy aux aurores cyan/indigo
 * (les tokens exacts de `variables.css`), et sa signature — la grille dense de
 * tuiles de jeux teintées, chacune dans SA couleur du design system
 * (`--color-snake`, `--color-tetris`, …), avec le badge ⚡ du jeu spotlight
 * du jour (la boucle quotidienne de l'app).
 *
 * Scroll : les tuiles arrivent en cascade (pop staggeré), comme le catalogue
 * qui se remplit. Temps : flottement d'inactivité très léger.
 */
const GAMES = [
  { label: 'Snake', color: '#16a34a', icon: '🐍' },
  { label: 'Tetris', color: '#0891b2', icon: '🧱' },
  { label: 'Pac-Man', color: '#eab308', icon: '👻' },
  { label: '2048', color: '#ea580c', icon: '🔢' },
  { label: 'Memory', color: '#dc2626', icon: '🃏' },
  { label: 'Breakout', color: '#db2777', icon: '🎯' },
  { label: 'Pong', color: '#14b8a6', icon: '🏓' },
  { label: 'Simon', color: '#9333ea', icon: '🎵' },
  { label: 'Motus', color: '#6aaa64', icon: '🔤' },
  { label: 'Ludo', color: '#4f46e5', icon: '🎲' },
  { label: 'Flappy', color: '#fbbf24', icon: '🐤' },
  { label: 'Asteroids', color: '#8b5cf6', icon: '🚀' },
];

const SPOTLIGHT_INDEX = 2; // le « jeu du jour » (⚡ ×2 LP dans l'app)

class LudoraChapter implements ChapterScene {
  private readonly grid: HTMLElement;
  private readonly tiles: HTMLElement[] = [];
  private readonly reduced = prefersReducedMotion();
  private visualState: VisualState | null = null;

  constructor(stage: HTMLElement) {
    stage.classList.add('stage--ludora');

    this.grid = document.createElement('div');
    this.grid.className = 'ld-grid';

    GAMES.forEach((game, i) => {
      const tile = document.createElement('div');
      tile.className = 'ld-tile';
      tile.style.setProperty('--tile', game.color);

      const icon = document.createElement('span');
      icon.className = 'ld-tile__icon';
      icon.textContent = game.icon;

      const label = document.createElement('span');
      label.className = 'ld-tile__label';
      label.textContent = game.label;

      tile.append(icon, label);
      if (i === SPOTLIGHT_INDEX) {
        const badge = document.createElement('span');
        badge.className = 'ld-tile__badge';
        badge.textContent = '⚡';
        tile.appendChild(badge);
      }
      this.grid.appendChild(tile);
      this.tiles.push(tile);
    });

    stage.appendChild(this.grid);
  }

  setVisualState(state: VisualState): void {
    this.visualState = state;
  }

  update(progress: number, time: number): void {
    // Cascade : chaque tuile a sa fenêtre de progression, décalée.
    const build = progress * 2.1; // le catalogue est complet à mi-traversée
    const t = this.reduced ? 0 : time * 0.001;
    const n = this.tiles.length;
    const energy = this.visualState?.energy ?? 0.5;
    const pulse = this.visualState?.pulse ?? 0.5;

    for (let i = 0; i < n; i++) {
      const local = easeOut(
        window01(build, (i / n) * 0.72, (i / n) * 0.72 + 0.28)
      );
      // Flottement d'inactivité, déphasé par tuile (transform only).
      const idle = this.reduced
        ? 0
        : Math.sin(t * 1.1 + i * 0.9) * (1.2 + energy * 2);
      const el = this.tiles[i];
      el.style.opacity = String(local);
      el.style.transform = `translate3d(0, ${(1 - local) * 26 + idle}px, 0) scale(${0.7 + 0.3 * local})`;
      if (i === SPOTLIGHT_INDEX) {
        el.style.filter = `brightness(${1 + pulse * 0.08})`;
      }
    }
  }

  resize(): void {
    /* grille fluide en CSS — rien à recalculer */
  }

  destroy(): void {
    this.grid.remove();
  }
}

export const create: ChapterFactory = (stage) => new LudoraChapter(stage);
