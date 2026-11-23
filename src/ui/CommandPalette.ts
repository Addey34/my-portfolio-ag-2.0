import type { SmoothScroll } from '@/core/SmoothScroll';
import { CONTACT_EMAIL } from '@/content/contact';
import { CASE_STUDIES, PROJECTS } from '@/content/projects';
import { onLocaleChange, replaceStoryHash, t, toggleLocale } from '@/i18n';

/**
 * Command palette: keyboard navigation in a Raycast-like style.
 *
 * Opens with Ctrl/Cmd + K or the HUD button. It filters instantly, supports
 * arrows, Enter and Escape, restores focus on close, and refreshes labels when
 * the active language changes.
 */
interface Command {
  id: string;
  group: 'nav' | 'projects' | 'actions';
  label: () => string;
  run: () => void;
}

export class CommandPalette {
  private readonly root: HTMLDivElement;
  private readonly input: HTMLInputElement;
  private readonly list: HTMLUListElement;
  private readonly commands: Command[];
  private filtered: Command[] = [];
  private active = 0;
  private open = false;
  private lastFocused: HTMLElement | null = null;
  private readonly onDocumentKeydown = (event: KeyboardEvent): void => {
    if (!this.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable: HTMLElement[] = [
      this.input,
      ...Array.from(this.list.querySelectorAll<HTMLElement>('.palette__item')),
    ];
    const index = focusable.indexOf(document.activeElement as HTMLElement);
    const next = event.shiftKey
      ? index <= 0
        ? focusable.length - 1
        : index - 1
      : (index + 1) % focusable.length;
    event.preventDefault();
    focusable[next].focus();
  };

  constructor(private readonly scroll: SmoothScroll) {
    this.commands = this.buildCommands();
    this.root = this.buildDom();
    this.input = this.root.querySelector('.palette__input') as HTMLInputElement;
    this.list = this.root.querySelector('.palette__list') as HTMLUListElement;
    document.body.appendChild(this.root);
    this.bind();
    onLocaleChange(() => this.syncLocale());
    this.syncLocale();
  }

  private buildCommands(): Command[] {
    const nav: Command[] = [
      {
        id: 'top',
        group: 'nav',
        label: () => t('nav.hero'),
        run: () => this.go(0),
      },
      {
        id: 'intro',
        group: 'nav',
        label: () => t('nav.intro'),
        run: () => this.go('#intro'),
      },
      {
        id: 'freelance',
        group: 'nav',
        label: () => t('nav.freelance'),
        run: () => this.go('#freelance'),
      },
      {
        id: 'projects',
        group: 'nav',
        label: () => t('nav.projects'),
        run: () => this.go('#projects'),
      },
      {
        id: 'contact',
        group: 'nav',
        label: () => t('nav.contact'),
        run: () => this.go('#contact'),
      },
    ];

    const projects: Command[] = PROJECTS.map((p) => ({
      id: `project-${p.id}`,
      group: 'projects',
      label: () => p.name,
      run: () => this.go(`#${p.id}`),
    }));

    const studies: Command[] = CASE_STUDIES.map((study) => ({
      id: `study-${study.id}`,
      group: 'projects',
      label: () => study.name,
      run: () => this.go(`#${study.id}`),
    }));

    const actions: Command[] = [
      {
        id: 'lang',
        group: 'actions',
        label: () => t('action.lang'),
        run: toggleLocale,
      },
      {
        id: 'github',
        group: 'actions',
        label: () => t('action.github'),
        run: () =>
          window.open('https://github.com/Addey34', '_blank', 'noopener'),
      },
      {
        id: 'linkedin',
        group: 'actions',
        label: () => t('action.linkedin'),
        run: () =>
          window.open(
            'https://www.linkedin.com/in/adrianguichard/',
            '_blank',
            'noopener'
          ),
      },
      {
        id: 'email',
        group: 'actions',
        label: () => t('action.email'),
        run: () => (window.location.href = `mailto:${CONTACT_EMAIL}`),
      },
    ];

    return [...nav, ...projects, ...studies, ...actions];
  }

  private buildDom(): HTMLDivElement {
    const root = document.createElement('div');
    root.className = 'palette';
    root.hidden = true;
    root.innerHTML = `
      <div class="palette__backdrop" data-close></div>
      <div class="palette__panel" role="dialog" aria-modal="true">
        <input
          class="palette__input"
          type="text"
          autocomplete="off"
          spellcheck="false"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
        />
        <ul class="palette__list" id="palette-list" role="listbox"></ul>
      </div>`;
    return root;
  }

  private bind(): void {
    // Raccourci global d'ouverture.
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggle();
      }
    });
    document.addEventListener('keydown', this.onDocumentKeydown);

    this.root
      .querySelector('[data-close]')
      ?.addEventListener('click', () => this.close());

    this.input.addEventListener('input', () => {
      this.active = 0;
      this.filter();
    });

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') return this.close();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.move(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.move(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.runActive();
      }
    });
  }

  /**
   * Command palette: keyboard navigation in a Raycast-like style.
   *
   * Opens with Ctrl/Cmd + K or the HUD button. It filters instantly, supports
   * arrows, Enter and Escape, restores focus on close, and refreshes labels when
   * the active language changes.
   */
  attachTrigger(el: HTMLElement): void {
    el.addEventListener('click', () => this.toggle());
  }

  private toggle(): void {
    if (this.open) this.close();
    else this.show();
  }

  private show(): void {
    this.open = true;
    this.lastFocused = document.activeElement as HTMLElement | null;
    this.root.hidden = false;
    this.input.value = '';
    this.active = 0;
    this.filter();
    this.input.focus({ preventScroll: true });
  }

  private close(): void {
    if (!this.open) return;
    this.open = false;
    this.root.hidden = true;
    this.lastFocused?.focus();
  }

  private syncLocale(): void {
    const panel = this.root.querySelector<HTMLElement>('.palette__panel');
    panel?.setAttribute('aria-label', t('palette.hint'));
    this.input.placeholder = t('palette.placeholder');
    this.input.setAttribute('aria-label', t('palette.placeholder'));
    if (this.open) this.filter();
  }
  private filter(): void {
    const q = this.input.value.trim().toLowerCase();
    this.filtered = q
      ? this.commands.filter((c) => c.label().toLowerCase().includes(q))
      : this.commands;
    this.renderList();
  }

  private renderList(): void {
    const labels: Record<Command['group'], string> = {
      nav: t('palette.group.nav'),
      projects: t('palette.group.projects'),
      actions: t('palette.group.actions'),
    };

    if (this.filtered.length === 0) {
      this.input.removeAttribute('aria-activedescendant');
      this.list.innerHTML = `<li class="palette__empty">${t('palette.empty')}</li>`;
      return;
    }

    this.list.innerHTML = '';
    let lastGroup = '';
    this.filtered.forEach((cmd, i) => {
      if (cmd.group !== lastGroup) {
        lastGroup = cmd.group;
        const head = document.createElement('li');
        head.className = 'palette__group';
        head.textContent = labels[cmd.group];
        head.setAttribute('aria-hidden', 'true');
        this.list.appendChild(head);
      }
      const li = document.createElement('li');
      li.className = 'palette__item';
      li.id = 'palette-option-' + i;
      li.tabIndex = -1;
      li.textContent = cmd.label();
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === this.active));
      if (i === this.active) li.classList.add('is-active');
      li.addEventListener('mousemove', () => {
        this.active = i;
        this.syncActive();
      });
      li.addEventListener('click', () => {
        this.active = i;
        this.runActive();
      });
      this.list.appendChild(li);
    });
    this.syncActive();
  }

  private move(delta: number): void {
    const n = this.filtered.length;
    if (n === 0) return;
    this.active = (this.active + delta + n) % n;
    this.syncActive();
  }

  private syncActive(): void {
    const items = this.list.querySelectorAll<HTMLElement>('.palette__item');
    items.forEach((el, i) => {
      const on = i === this.active;
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-selected', String(on));
      if (on) {
        this.input.setAttribute('aria-activedescendant', el.id);
        el.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  private runActive(): void {
    const cmd = this.filtered[this.active];
    if (!cmd) return;
    this.close();
    cmd.run();
  }

  private go(target: string | number): void {
    this.scroll.scrollTo(target);
    if (typeof target === 'string' && target.startsWith('#'))
      replaceStoryHash(target);
  }
}
