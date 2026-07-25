import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PROJECTS } from '@/content/projects';
import { t, onLocaleChange } from '@/i18n';
import type { SmoothScroll } from '@/core/SmoothScroll';

/**
 * Fil de progression vertical (desktop uniquement, masqué sous 860px : la
 * palette couvre la navigation mobile).
 *
 * Un point par étape du récit — accueil, système, chaque projet, contact. Le
 * point actif suit la section centrée via `ScrollTrigger` (donc cadencé par le
 * ticker unique — AUCUN écouteur scroll propre, on respecte l'invariant). Un
 * clic défile en douceur via Lenis. Les libellés suivent la langue courante.
 */
interface RailItem {
  id: string;
  label: () => string;
}

export class SectionRail {
  private readonly nav: HTMLElement;
  private readonly links = new Map<string, HTMLAnchorElement>();
  private readonly triggers: ScrollTrigger[] = [];
  private readonly items: RailItem[];

  constructor(private readonly scroll: SmoothScroll) {
    this.items = [
      { id: 'top', label: () => t('nav.hero') },
      { id: 'stack', label: () => t('rail.stack') },
      ...PROJECTS.map((p) => ({ id: p.id, label: () => p.name })),
      { id: 'contact', label: () => t('nav.contact') },
    ];
    this.nav = this.build();
    document.body.appendChild(this.nav);
    this.bindScroll();
    onLocaleChange(() => this.syncLabels());
  }

  private build(): HTMLElement {
    const nav = document.createElement('nav');
    nav.className = 'rail';
    nav.setAttribute('aria-label', t('rail.aria'));

    this.items.forEach((item) => {
      const link = document.createElement('a');
      link.className = 'rail__dot';
      link.href = `#${item.id}`;
      link.dataset.rail = item.id;
      link.setAttribute('aria-label', item.label());

      const label = document.createElement('span');
      label.className = 'rail__label';
      label.textContent = item.label();
      link.appendChild(label);

      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.scroll.scrollTo(item.id === 'top' ? 0 : `#${item.id}`);
      });

      this.links.set(item.id, link);
      nav.appendChild(link);
    });
    return nav;
  }

  private bindScroll(): void {
    // onEnter / onEnterBack : exactement le pattern de VisualDirector — un seul
    // point actif à la fois, jamais de zone morte entre deux sections.
    this.items.forEach((item) => {
      const target = document.getElementById(item.id);
      if (!target) return;
      this.triggers.push(
        ScrollTrigger.create({
          trigger: target,
          start: 'top center',
          end: 'bottom center',
          onEnter: () => this.setActive(item.id),
          onEnterBack: () => this.setActive(item.id),
        })
      );
    });
  }

  private setActive(id: string): void {
    this.links.forEach((link, key) => {
      const on = key === id;
      link.classList.toggle('is-active', on);
      if (on) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }

  private syncLabels(): void {
    this.items.forEach((item) => {
      const link = this.links.get(item.id);
      if (!link) return;
      const text = item.label();
      link.setAttribute('aria-label', text);
      const label = link.querySelector('.rail__label');
      if (label) label.textContent = text;
    });
    this.nav.setAttribute('aria-label', t('rail.aria'));
  }

  destroy(): void {
    this.triggers.forEach((trigger) => trigger.kill());
    this.nav.remove();
  }
}
