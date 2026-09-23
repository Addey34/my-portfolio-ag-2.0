import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PROJECTS } from '@/content/projects';
import type { SignalField } from '@/visual/SignalField';
import type { VisualScene, VisualState } from '@/visual/types';

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
  private readonly state: VisualState;
  private targetEnergy = 0.42;
  private lastTime = 0;

  constructor(private readonly field: SignalField | null) {
    const pointer = field?.getPointer() ?? { x: 0.72, y: 0.42 };
    this.state = {
      scene: 'identity',
      progress: 0,
      sceneProgress: 0,
      transition: 1,
      pulse: 0.5,
      energy: this.targetEnergy,
      accent: '#6ea8ff',
      accentNext: '#8f7bff',
      pointer,
    };

    this.bindScroll();
    this.field?.setVisualState(this.state);
  }

  getState(): VisualState {
    return this.state;
  }

  setPaused(paused: boolean): void {
    this.field?.setPaused(paused);
  }

  setInteractive(on: boolean): void {
    this.field?.setInteractive(on);
  }

  setLiteMode(on: boolean): void {
    this.field?.setLiteMode(on);
  }

  render(time: number): void {
    const delta = this.lastTime ? Math.min(time - this.lastTime, 50) : 16;
    this.lastTime = time;
    const ease = 1 - Math.pow(0.91, delta / 16);
    this.state.transition += (1 - this.state.transition) * ease;
    this.state.energy += (this.targetEnergy - this.state.energy) * ease;
    this.state.pulse = Math.sin(time * 0.00085) * 0.5 + 0.5;
    this.field?.setVisualState(this.state);
    this.field?.render(time);
  }

  resize(): void {
    this.field?.resize();
  }

  destroy(): void {
    for (const trigger of this.triggers) trigger.kill();
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
    this.state.scene = target.scene;
    this.state.sceneProgress = 0;
    this.state.accent = target.accent;
    this.state.accentNext = target.accentNext;
    this.state.transition = 0;
    this.targetEnergy = target.energy;
    this.field?.setScene(target.scene, target.accent);
  }
}
