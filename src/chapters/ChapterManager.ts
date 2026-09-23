import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PROJECTS, type Project } from '@/content/projects';
import { prefersReducedMotion } from '@/core/motion';
import { PortfolioStoryScene } from './PortfolioStoryScene';
import { clamp01, type ChapterFactory, type ChapterScene } from './types';
import type { VisualState } from '@/visual/types';

gsap.registerPlugin(ScrollTrigger);

const LOADERS: Record<string, () => Promise<{ create: ChapterFactory }>> = {
  galaxy: () => import('@/chapters/GalaxyChapter'),
  ludora: () => import('@/chapters/LudoraChapter'),
  magnotes: () => import('@/chapters/MagNotesChapter'),
};

const FALLBACK = (): Promise<{ create: ChapterFactory }> =>
  import('@/chapters/GenericChapter');

interface Entry {
  section: HTMLElement;
  stage: HTMLElement;
  project: Project;
  visible: boolean;
  loading: boolean;
  scene: ChapterScene | null;
  progress: number;
  opacity: number;
  /** Dernière opacité réellement écrite dans le style (évite les écritures par frame). */
  applied: string;
  trigger: ScrollTrigger | null;
}

/**
 * Orchestrates one fixed visual background across the complete page.
 *
 * The identity board, technical graph and project worlds all live in the same
 * fixed compositor. ScrollTrigger only changes progress and layer opacity;
 * the GSAP ticker remains the single rendering clock.
 */
export class ChapterManager {
  private readonly entries: Entry[] = [];
  private readonly observer: IntersectionObserver;
  private readonly reduced = prefersReducedMotion();
  private readonly onResize = () => this.resize();
  private readonly storyLayer: HTMLElement;
  private readonly storyScene: PortfolioStoryScene;
  private readonly storyTrigger: ScrollTrigger | null;
  private storyProgress = 0;
  private storyOpacity = 1;
  private storyApplied = '';
  private animated = true;

  constructor(
    root: ParentNode = document,
    host: HTMLElement | null = document.getElementById('story-stage'),
    private readonly getVisualState?: () => VisualState
  ) {
    const compositor = host ?? document.body;
    this.storyLayer = this.createLayer(compositor, 'identity');
    this.storyScene = new PortfolioStoryScene(this.storyLayer);

    this.observer = new IntersectionObserver(
      (records) => this.onIntersect(records),
      { rootMargin: this.reduced ? '0px' : '120% 0px', threshold: 0 }
    );

    this.storyProgress = 0.5;
    this.storyOpacity = 1;
    this.storyTrigger = null;
    if (this.reduced) this.storyScene.update(this.storyProgress, 0);

    const byId = new Map<string, Project>(PROJECTS.map((p) => [p.id, p]));
    root.querySelectorAll<HTMLElement>('.chapter').forEach((section) => {
      const project = byId.get(section.id);
      if (!project) return;

      const stage = this.createLayer(compositor, project.id);
      const entry: Entry = {
        section,
        stage,
        project,
        visible: false,
        loading: false,
        scene: null,
        progress: 0,
        opacity: 0,
        applied: '',
        trigger: null,
      };

      if (!this.reduced) {
        entry.trigger = ScrollTrigger.create({
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          onUpdate: (self) => {
            entry.progress = self.progress;
            entry.opacity = this.layerEnvelope(self.progress);
          },
        });
      } else {
        entry.progress = 0.5;
        entry.opacity = 0;
      }

      this.entries.push(entry);
      this.observer.observe(section);
    });

    window.addEventListener('resize', this.onResize, { passive: true });
  }

  setAnimated(on: boolean): void {
    this.animated = on;
    if (!on) {
      this.storyScene.update(0.68, 0);
      for (const entry of this.entries) entry.scene?.update(0.5, 0);
    }
  }

  renderVisible(time: number): void {
    const storyOpacity = String(this.storyOpacity);
    if (storyOpacity !== this.storyApplied) {
      this.storyApplied = storyOpacity;
      this.storyLayer.style.opacity = storyOpacity;
    }
    const visualState = this.getVisualState?.();
    if (visualState) this.storyScene.setVisualState(visualState);
    if (this.animated && !this.reduced) {
      this.storyScene.update(this.storyProgress, time);
    }

    for (const entry of this.entries) {
      const opacity = String(entry.opacity);
      if (opacity !== entry.applied) {
        entry.applied = opacity;
        entry.stage.style.opacity = opacity;
        entry.stage.style.visibility =
          entry.opacity > 0.002 ? 'visible' : 'hidden';
      }
      if (
        this.animated &&
        !this.reduced &&
        entry.visible &&
        entry.scene &&
        entry.opacity > 0
      ) {
        if (visualState) entry.scene.setVisualState?.(visualState);
        entry.scene.update(entry.progress, time);
      }
    }
  }

  destroy(): void {
    this.observer.disconnect();
    window.removeEventListener('resize', this.onResize);
    this.storyTrigger?.kill();
    this.storyScene.destroy();
    this.storyLayer.remove();
    for (const entry of this.entries) {
      entry.trigger?.kill();
      entry.scene?.destroy();
      entry.stage.remove();
    }
  }

  private onIntersect(records: IntersectionObserverEntry[]): void {
    for (const record of records) {
      const entry = this.entries.find((item) => item.section === record.target);
      if (!entry) continue;
      entry.visible = record.isIntersecting;
      if (this.reduced) entry.opacity = record.isIntersecting ? 1 : 0;
      if (entry.visible && !entry.scene && !entry.loading) this.mount(entry);
    }
  }

  private mount(entry: Entry): void {
    entry.loading = true;
    const load = LOADERS[entry.project.chapter] ?? FALLBACK;
    load()
      .then((module) => {
        entry.scene = module.create(entry.stage, entry.project);
        entry.scene.resize();
        const visualState = this.getVisualState?.();
        if (visualState) entry.scene.setVisualState?.(visualState);
        if (this.reduced || !this.animated) entry.scene.update(0.5, 0);
      })
      .catch((error) => {
        console.error(`Chapitre "${entry.project.id}" : echec`, error);
      })
      .finally(() => {
        entry.loading = false;
      });
  }

  private resize(): void {
    this.storyScene.resize();
    for (const entry of this.entries) entry.scene?.resize();
  }

  private createLayer(host: HTMLElement, name: string): HTMLElement {
    const layer = document.createElement('div');
    layer.className = 'story__layer';
    layer.dataset.storyLayer = name;
    host.appendChild(layer);
    return layer;
  }

  private layerEnvelope(progress: number): number {
    const enter = clamp01((progress - 0.12) / 0.18);
    const leave = 1 - clamp01((progress - 0.72) / 0.18);
    return Math.min(enter, leave);
  }
}
