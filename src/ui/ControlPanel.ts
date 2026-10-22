import { t } from '@/i18n';
import type { VisualDirector } from '@/visual/VisualDirector';
import {
  TRANSITION_MODES,
  type SectionTransitions,
  type TransitionMode,
} from '@/core/sectionTransitions';

/**
 * Panneau de réglages visuels (bouton ⚙ du HUD). Laisse l'utilisateur reprendre
 * la main sur le décor : afficher le monde 3D, régler sa réactivité
 * à la souris et son mouvement. L'état est persisté
 * (localStorage) et réappliqué au chargement.
 *
 * Les libellés portent `data-i18n` → ils suivent la langue automatiquement
 * (applyI18n balaie le document à chaque changement de langue).
 */
interface Deps {
  hero: VisualDirector;
  chapters: Pick<VisualDirector, 'setAnimated'>;
  transitions: SectionTransitions;
}

interface Toggle {
  key: 'bg' | 'mouse' | 'ambiance';
  i18n: string;
  apply: (on: boolean) => void;
}

const STORAGE_KEY = 'ag-controls';

export class ControlPanel {
  private readonly root: HTMLDivElement;
  private readonly toggles: Toggle[];
  private state: Record<string, boolean>;
  private open = false;
  private lastFocused: HTMLElement | null = null;

  constructor(private readonly deps: Deps) {
    this.state = this.load();
    this.toggles = [
      {
        key: 'bg',
        i18n: 'controls.bg',
        apply: (on) => this.deps.hero.setPaused(!on),
      },
      {
        key: 'mouse',
        i18n: 'controls.mouse',
        apply: (on) => this.deps.hero.setInteractive(on),
      },
      {
        key: 'ambiance',
        i18n: 'controls.ambiance',
        apply: (on) => this.deps.chapters.setAnimated(on),
      },
    ];
    this.root = this.build();
    document.body.appendChild(this.root);
    this.applyAll(); // pousse l'état persisté vers les systèmes au boot
    this.bindOutsideClose();
  }

  /** Bouton déclencheur du HUD. */
  attachTrigger(el: HTMLElement): void {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });
  }

  private toggle(): void {
    if (this.open) this.close();
    else this.show();
  }

  private show(): void {
    this.open = true;
    this.lastFocused = document.activeElement as HTMLElement | null;
    this.root.hidden = false;
    this.root
      .querySelector<HTMLElement>('.controls__switch')
      ?.focus({ preventScroll: true });
  }

  private close(): void {
    this.open = false;
    this.root.hidden = true;
    this.lastFocused?.focus({ preventScroll: true });
  }

  private build(): HTMLDivElement {
    const root = document.createElement('div');
    root.className = 'controls';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'controls-title');

    const title = document.createElement('p');
    title.className = 'controls__title';
    title.id = 'controls-title';
    title.dataset.i18n = 'controls.title';
    title.textContent = t('controls.title');
    root.appendChild(title);

    for (const tg of this.toggles) {
      const row = document.createElement('div');
      row.className = 'controls__row';

      const label = document.createElement('span');
      label.dataset.i18n = tg.i18n;
      label.textContent = t(tg.i18n);

      const sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'controls__switch';
      sw.setAttribute('role', 'switch');
      sw.setAttribute('aria-checked', String(this.state[tg.key]));
      sw.setAttribute('aria-label', t(tg.i18n));
      sw.dataset.i18nAria = tg.i18n;
      sw.addEventListener('click', () => {
        const next = !this.state[tg.key];
        this.state[tg.key] = next;
        sw.setAttribute('aria-checked', String(next));
        tg.apply(next);
        this.save();
      });

      row.append(label, sw);
      root.appendChild(row);
    }
    root.appendChild(this.buildTransitionRow());
    return root;
  }

  /** Choix du style de transition de scroll (aléatoire par défaut). */
  private buildTransitionRow(): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'controls__row controls__row--select';

    const id = 'controls-transition';
    const label = document.createElement('label');
    label.htmlFor = id;
    label.dataset.i18n = 'controls.transition';
    label.textContent = t('controls.transition');

    const select = document.createElement('select');
    select.id = id;
    select.className = 'controls__select';
    for (const mode of TRANSITION_MODES) {
      const option = document.createElement('option');
      option.value = mode;
      option.dataset.i18n = `controls.transition.${mode}`;
      option.textContent = t(`controls.transition.${mode}`);
      select.appendChild(option);
    }
    select.value = this.deps.transitions.getMode();
    select.addEventListener('change', () => {
      this.deps.transitions.setMode(select.value as TransitionMode);
    });

    row.append(label, select);
    return row;
  }

  private applyAll(): void {
    for (const tg of this.toggles) tg.apply(this.state[tg.key]);
  }

  private bindOutsideClose(): void {
    document.addEventListener('keydown', (e) => {
      if (this.open && e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    });
    document.addEventListener('click', (e) => {
      if (!this.open) return;
      const target = e.target as HTMLElement;
      if (this.root.contains(target) || target.closest('#controls-open'))
        return;
      this.close();
    });
  }

  private load(): Record<string, boolean> {
    const def = { bg: true, mouse: true, ambiance: true };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const value = parsed as Record<string, unknown>;
          return {
            bg: typeof value.bg === 'boolean' ? value.bg : def.bg,
            mouse: typeof value.mouse === 'boolean' ? value.mouse : def.mouse,
            ambiance:
              typeof value.ambiance === 'boolean'
                ? value.ambiance
                : def.ambiance,
          };
        }
      }
    } catch {
      /* stockage indisponible → valeurs par défaut */
    }
    return def;
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* stockage indisponible → on ignore */
    }
  }
}
