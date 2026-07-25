import { prefersReducedMotion } from '@/core/motion';
import type { VisualState } from '@/visual/types';
import {
  clamp01,
  easeOut,
  type ChapterFactory,
  type ChapterScene,
} from './types';

/**
 * Chapitre GÉNÉRIQUE — le filet de sécurité évolutif.
 *
 * Tout projet ajouté à `content/projects.ts` SANS chapitre dédié reçoit ce
 * décor : un motif d'orbes flottants teintés de son accent, qui arrive au
 * scroll. Propre, cohérent, zéro code à écrire — on peut publier un nouveau
 * projet en 2 minutes puis lui offrir un chapitre sur mesure plus tard.
 */
const ORB_COUNT = 6;

class GenericChapter implements ChapterScene {
  private readonly orbs: HTMLElement[] = [];
  private readonly host: HTMLElement;
  private readonly reduced = prefersReducedMotion();
  private visualState: VisualState | null = null;

  constructor(stage: HTMLElement, accent: string) {
    stage.classList.add('stage--generic');
    stage.style.setProperty('--chapter-accent', accent);

    this.host = document.createElement('div');
    this.host.className = 'gn-orbs';
    for (let i = 0; i < ORB_COUNT; i++) {
      const orb = document.createElement('div');
      orb.className = 'gn-orb';
      orb.style.setProperty('--i', String(i));
      orb.style.left = `${18 + ((i * 37) % 70)}%`;
      orb.style.top = `${12 + ((i * 53) % 68)}%`;
      this.host.appendChild(orb);
      this.orbs.push(orb);
    }
    stage.appendChild(this.host);
  }

  setVisualState(state: VisualState): void {
    this.visualState = state;
  }

  update(progress: number, time: number): void {
    const build = easeOut(clamp01(progress * 2));
    const t = this.reduced ? 0 : time * 0.001;
    const energy = this.visualState?.energy ?? 0.5;
    for (let i = 0; i < this.orbs.length; i++) {
      const idleX = Math.sin(t * 0.5 + i * 1.7) * (5 + energy * 10);
      const idleY = Math.cos(t * 0.4 + i * 1.1) * (6 + energy * 12);
      this.orbs[i].style.opacity = String(build * 0.85);
      this.orbs[i].style.transform =
        `translate3d(${idleX}px, ${(1 - build) * 40 + idleY}px, 0) scale(${0.6 + 0.4 * build})`;
    }
  }

  resize(): void {
    /* positions en % — rien à recalculer */
  }

  destroy(): void {
    this.host.remove();
  }
}

export const create: ChapterFactory = (stage, project) =>
  new GenericChapter(stage, project.accent);
