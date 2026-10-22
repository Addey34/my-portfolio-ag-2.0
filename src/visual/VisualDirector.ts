import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PROJECTS } from '@/content/projects';
import type { StoryWorld3D } from '@/visual/StoryWorld3D';
import type { VisualScene, VisualState } from '@/visual/types';

/** Durée d'un passage d'une forme à l'autre (ms), avec départ et arrivée adoucis. */
const TRANSITION_MS = 2600;

interface SceneTarget {
  selector: string;
  scene: VisualScene;
  accent: string;
  accentNext: string;
  energy: number;
}

/**
 * Direction artistique centrale. Elle ne dessine rien elle-mÃªme : elle traduit
 * le parcours de scroll en un Ã©tat visuel partagÃ© par le champ persistant et
 * les chapitres. Les univers gardent leur personnalitÃ©, mais battent sur la
 * mÃªme pulsation et partagent le mÃªme point d'attention.
 */
export class VisualDirector {
  private readonly triggers: ScrollTrigger[] = [];
  private readonly sceneListeners = new Set<(scene: VisualScene) => void>();
  private readonly state: VisualState;
  private targetEnergy = 0.42;
  private lastTime = 0;
  private transitionElapsed = TRANSITION_MS;
  private initialDeepLink: VisualScene | null = null;
  private readonly bootTime = performance.now();
  private field: StoryWorld3D | null = null;
  private clockAgTrigger: ScrollTrigger | null = null;
  private identityStackTrigger: ScrollTrigger | null = null;
  private readonly lampLab = { x: 0, y: 0, power: 1 };
  private paused = false;
  private interactive = true;
  private liteMode = false;
  private animated = true;

  constructor() {
    const pointer = { x: 0.72, y: 0.42 };
    this.state = {
      scene: 'identity',
      progress: 0,
      sceneProgress: 0,
      transition: 1,
      identityStackProgress: 0,
      clockAgProgress: 0,
      openingVariant: 'medallion',
      openingProgress: 0,
      stackSolutionsProgress: 0,
      solutionsSelectionProgress: 0,
      selectionGalaxyProgress: 0,
      galaxyLudoraProgress: 0,
      ludoraMagnotesProgress: 0,
      magnotesStudiesProgress: 0,
      studiesContactProgress: 0,
      pulse: 0.5,
      energy: this.targetEnergy,
      accent: '#6ea8ff',
      accentNext: '#8f7bff',
      pointer,
    };

    this.bindScroll();
  }

  attachField(field: StoryWorld3D): void {
    this.field = field;
    this.state.pointer = field.getPointer();
    field.setLiteMode(this.liteMode);
    field.setInteractive(this.interactive);
    field.setAnimated(this.animated);
    field.setVisualState(this.state);
    field.setLabLamp(this.lampLab);
    field.setPaused(this.paused);
  }

  getState(): VisualState {
    return this.state;
  }

  isLiteMode(): boolean {
    return this.liteMode;
  }

  getClockAgScrollRange(): { start: number; end: number } | null {
    const trigger = this.clockAgTrigger;
    return trigger ? { start: trigger.start, end: trigger.end } : null;
  }

  getOpeningScrollRange(): { start: number; end: number } | null {
    if (!this.clockAgTrigger || !this.identityStackTrigger) return null;
    return {
      start: this.clockAgTrigger.start,
      end: this.identityStackTrigger.end,
    };
  }

  setLabOpeningVariant(variant: 'medallion' | 'ag' | 'direct'): void {
    if (!import.meta.env.DEV) return;
    this.state.openingVariant = variant;
  }

  setLabLamp(settings: { x: number; y: number; power: number }): void {
    this.lampLab.x = settings.x;
    this.lampLab.y = settings.y;
    this.lampLab.power = settings.power;
    this.field?.setLabLamp(this.lampLab);
  }

  getRenderDiagnostics(): {
    calls: number;
    triangles: number;
    geometries: number;
    textures: number;
    pixelRatio: number;
  } | null {
    return this.field?.getRenderDiagnostics() ?? null;
  }

  onSceneChange(listener: (scene: VisualScene) => void): () => void {
    this.sceneListeners.add(listener);
    listener(this.state.scene);
    return () => this.sceneListeners.delete(listener);
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.field?.setPaused(paused);
  }

  setInteractive(on: boolean): void {
    this.interactive = on;
    this.field?.setInteractive(on);
  }

  setLiteMode(on: boolean): void {
    this.liteMode = on;
    this.field?.setLiteMode(on);
  }

  setAnimated(on: boolean): void {
    this.animated = on;
    this.field?.setAnimated(on);
  }

  render(time: number): void {
    if (time - this.bootTime > 12000) this.initialDeepLink = null;
    const delta = this.lastTime ? Math.min(time - this.lastTime, 50) : 16;
    this.lastTime = time;
    const ease = 1 - Math.pow(0.91, delta / 16);
    // Le passage d'une forme à l'autre est chronométré (smoothstep sur
    // TRANSITION_MS) pour laisser lire le mouvement des points ; l'énergie,
    // elle, reste plus réactive.
    this.transitionElapsed = Math.min(
      TRANSITION_MS,
      this.transitionElapsed + delta
    );
    const k = this.transitionElapsed / TRANSITION_MS;
    this.state.transition = k * k * (3 - 2 * k);
    this.state.energy += (this.targetEnergy - this.state.energy) * ease;
    this.state.pulse = Math.sin(time * 0.00085) * 0.5 + 0.5;
    const opening = this.getOpeningScrollRange();
    if (opening) {
      this.state.openingProgress = Math.max(
        0,
        Math.min(
          1,
          (window.scrollY - opening.start) / (opening.end - opening.start)
        )
      );
    }
    this.field?.setVisualState(this.state);
    this.field?.render(time);
  }

  resize(): void {
    this.field?.resize();
  }

  destroy(): void {
    for (const trigger of this.triggers) trigger.kill();
    this.sceneListeners.clear();
    this.field?.destroy();
  }

  private bindScroll(): void {
    const targets: SceneTarget[] = [
      {
        selector: '#top',
        scene: 'identity',
        accent: '#6ea8ff',
        accentNext: '#6ea8ff',
        energy: 0.42,
      },
      {
        selector: '#stack',
        scene: 'stack',
        accent: '#8f7bff',
        accentNext: '#8f7bff',
        energy: 0.5,
      },
      {
        selector: '#freelance',
        scene: 'solutions',
        accent: '#7dd3fc',
        accentNext: '#8f7bff',
        energy: 0.54,
      },
      {
        selector: '#projects-intro',
        scene: 'selection',
        accent: '#ffb35f',
        accentNext: PROJECTS[0]?.accent ?? '#4a8fff',
        energy: 0.48,
      },
      ...PROJECTS.map((project) => ({
        selector: `#${project.id}`,
        scene: project.id as VisualScene,
        accent: project.accent,
        accentNext: project.accent,
        energy: project.id === 'ludora' ? 0.72 : 0.58,
      })),
      {
        selector: '#studies',
        scene: 'studies',
        accent: '#bda3ff',
        accentNext: '#ffb15c',
        energy: 0.44,
      },
      {
        selector: '#contact',
        scene: 'contact',
        accent: '#ffb15c',
        accentNext: '#ffb15c',
        energy: 0.36,
      },
    ];

    // Chaque univers connait l'accent du suivant pour annoncer la transition.
    for (let i = 0; i < targets.length - 1; i++) {
      targets[i].accentNext = targets[i + 1].accent;
    }

    // Un lien profond ouvre directement la bonne sculpture, sans morphing depuis le héros.
    const initialHash =
      window.location.hash === '#projects'
        ? '#projects-intro'
        : window.location.hash;
    const initialTarget = targets.find(
      (target) => target.selector === initialHash
    );
    if (initialTarget) {
      this.initialDeepLink = initialTarget.scene;
      this.state.scene = initialTarget.scene;
      this.state.sceneProgress = 0.15;
      if (initialTarget.scene === 'stack') this.state.identityStackProgress = 1;
      if (initialTarget.scene !== 'identity') this.state.clockAgProgress = 1;
      if (initialTarget.scene === 'solutions')
        this.state.stackSolutionsProgress = 1;
      if (initialTarget.scene === 'selection')
        this.state.solutionsSelectionProgress = 1;
      if (initialTarget.scene === 'galaxy')
        this.state.selectionGalaxyProgress = 1;
      if (initialTarget.scene === 'ludora') this.state.galaxyLudoraProgress = 1;
      if (initialTarget.scene === 'magnotes')
        this.state.ludoraMagnotesProgress = 1;
      if (initialTarget.scene === 'studies')
        this.state.magnotesStudiesProgress = 1;
      if (initialTarget.scene === 'contact')
        this.state.studiesContactProgress = 1;
      this.state.accent = initialTarget.accent;
      this.state.accentNext = initialTarget.accentNext;
      this.targetEnergy = initialTarget.energy;
      this.state.energy = initialTarget.energy;
    }

    for (const target of targets) {
      this.triggers.push(
        ScrollTrigger.create({
          trigger: target.selector,
          start: 'top center',
          end: 'bottom center',
          onEnter: () => this.activate(target),
          onEnterBack: () => this.activate(target),
          onUpdate: (self) => {
            if (this.state.scene === target.scene) {
              this.state.sceneProgress = self.progress;
            }
          },
        })
      );
    }

    // Les mêmes repères quittent l'horloge et dessinent l'AG dans les deux sens.
    this.clockAgTrigger = ScrollTrigger.create({
      trigger: '#intro',
      start: 'top 92%',
      end: 'top 32%',
      onUpdate: (self) => {
        this.state.clockAgProgress = self.progress;
      },
    });
    this.triggers.push(this.clockAgTrigger);

    // AG cède la place aux quatre couches du système ; la molette inverse le pivot.
    this.identityStackTrigger = ScrollTrigger.create({
      trigger: '#stack',
      start: 'top 82%',
      end: 'top 18%',
      onUpdate: (self) => {
        this.state.identityStackProgress = self.progress;
      },
    });
    this.triggers.push(this.identityStackTrigger);

    for (const [selector, stateKey] of [
      ['#freelance', 'stackSolutionsProgress'],
      ['#projects-intro', 'solutionsSelectionProgress'],
      ['#studies', 'magnotesStudiesProgress'],
      ['#contact', 'studiesContactProgress'],
    ] as const) {
      this.triggers.push(
        ScrollTrigger.create({
          trigger: selector,
          start: 'top 82%',
          end: 'top 18%',
          onUpdate: (self) => {
            this.state[stateKey] = self.progress;
          },
        })
      );
    }

    // Le passage commence avant le changement de chapitre et se termine après.
    // La même fenêtre de scroll déroule la grille dans les deux sens.
    this.triggers.push(
      ScrollTrigger.create({
        trigger: '#galaxy',
        // Les sceaux de Sélection restent lisibles avant de s'ouvrir en astrolabe.
        start: 'top 60%',
        end: 'top 18%',
        onUpdate: (self) => {
          this.state.selectionGalaxyProgress = self.progress;
        },
      })
    );

    this.triggers.push(
      ScrollTrigger.create({
        trigger: '#ludora',
        start: 'top 82%',
        end: 'top 18%',
        onUpdate: (self) => {
          this.state.galaxyLudoraProgress = self.progress;
        },
      })
    );

    // Les mêmes cellules quittent la grille et deviennent des notes dans les deux sens.
    this.triggers.push(
      ScrollTrigger.create({
        trigger: '#magnotes',
        start: 'top 82%',
        end: 'top 18%',
        onUpdate: (self) => {
          this.state.ludoraMagnotesProgress = self.progress;
        },
      })
    );

    this.triggers.push(
      ScrollTrigger.create({
        trigger: '#scroll-root',
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          this.state.progress = self.progress;
        },
      })
    );
  }

  private activate(target: SceneTarget): void {
    if (this.state.scene === target.scene) return;
    const immediate = target.scene === this.initialDeepLink;
    if (immediate) this.initialDeepLink = null;
    this.state.scene = target.scene;
    this.state.sceneProgress = 0;
    this.transitionElapsed = immediate ? TRANSITION_MS : 0;
    this.state.accent = target.accent;
    this.state.accentNext = target.accentNext;
    this.state.transition = immediate ? 1 : 0;
    this.targetEnergy = target.energy;
    this.field?.setScene(target.scene, target.accent);
    this.sceneListeners.forEach((listener) => listener(target.scene));
  }
}
