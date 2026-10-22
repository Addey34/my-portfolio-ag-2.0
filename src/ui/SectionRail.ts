import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PROJECTS } from '@/content/projects';
import { t, onLocaleChange } from '@/i18n';
import type { SmoothScroll } from '@/core/SmoothScroll';
import type { VisualDirector } from '@/visual/VisualDirector';
import type { VisualScene } from '@/visual/types';

/**
 * Navigation persistante par chapitres.
 *
 * Le point et son titre forment une seule cible. Le chapitre courant constitue
 * le foyer d'une molette ; les voisins décroissent avec la distance. Sur
 * desktop la molette est verticale (à gauche), sur mobile horizontale (en bas,
 * glisser vers la gauche avance). Un appui-glissé fait défiler les chapitres en
 * direct ; maintenir le geste répète le déplacement comme une molette de date.
 */
interface RailItem {
  id: string;
  label: () => string;
}

type RailAxis = 'x' | 'y';

const SCENE_TO_RAIL: Record<VisualScene, string> = {
  identity: 'top',
  stack: 'stack',
  solutions: 'freelance',
  selection: 'projects-intro',
  galaxy: 'galaxy',
  ludora: 'ludora',
  magnotes: 'magnotes',
  studies: 'studies',
  contact: 'contact',
};

interface RailDrag {
  pointerId: number;
  axis: RailAxis;
  startY: number;
  lastY: number;
  previewIndex: number;
  originWasSurface: boolean;
  moved: boolean;
  accumulatedY: number;
  direction: -1 | 0 | 1;
  holdStartedAt: number;
  lastStepAt: number;
}

export class SectionRail {
  private readonly nav: HTMLElement;
  private readonly links = new Map<string, HTMLAnchorElement>();
  private readonly unsubscribeScene: () => void;
  private readonly introTrigger: ScrollTrigger;
  private scene: VisualScene = 'identity';
  private introVisible = false;
  private readonly items: RailItem[];
  private activeId = 'top';
  private drag: RailDrag | null = null;
  private suppressClick = false;
  private readonly horizontalQuery = window.matchMedia('(max-width: 860px)');
  private readonly onPointerMove = (event: PointerEvent) => {
    this.updateProximity(event);
    this.updateDrag(event);
  };
  private readonly onPointerDown = (event: PointerEvent) =>
    this.startDrag(event);
  private readonly onPointerUp = (event: PointerEvent) =>
    this.finishDrag(event, true);
  private readonly onPointerCancel = (event: PointerEvent) =>
    this.finishDrag(event, false);
  private readonly onPointerLeave = () => {
    if (!this.drag) this.clearProximity();
  };
  private readonly onHoldTick = () => this.updateHold();
  private readonly onLayoutChange = () => this.renderFocus(this.activeId);

  constructor(
    private readonly scroll: SmoothScroll,
    visual: VisualDirector
  ) {
    this.items = [
      { id: 'top', label: () => t('nav.hero') },
      { id: 'intro', label: () => t('nav.intro') },
      { id: 'stack', label: () => t('rail.stack') },
      { id: 'freelance', label: () => t('nav.freelance') },
      { id: 'projects-intro', label: () => t('nav.projects') },
      ...PROJECTS.map((p) => ({ id: p.id, label: () => p.name })),
      { id: 'studies', label: () => t('studies.kicker') },
      { id: 'contact', label: () => t('nav.contact') },
    ];
    this.nav = this.build();
    document.body.appendChild(this.nav);
    // Le directeur partage les mêmes seuils de section avec le rail.
    this.unsubscribeScene = visual.onSceneChange((scene) => {
      this.scene = scene;
      this.syncActive();
    });
    // L'introduction partage la scène du héros : son étape suit sa propre position.
    this.introTrigger = ScrollTrigger.create({
      trigger: '#intro',
      start: 'top 62%',
      end: 'bottom 38%',
      onToggle: (self) => {
        this.introVisible = self.isActive;
        this.syncActive();
      },
    });
    this.nav.addEventListener('pointermove', this.onPointerMove, {
      passive: false,
    });
    this.nav.addEventListener('pointerdown', this.onPointerDown);
    this.nav.addEventListener('pointerup', this.onPointerUp);
    this.nav.addEventListener('pointercancel', this.onPointerCancel);
    this.nav.addEventListener('pointerleave', this.onPointerLeave, {
      passive: true,
    });
    gsap.ticker.add(this.onHoldTick);
    onLocaleChange(() => this.syncLabels());
    this.horizontalQuery.addEventListener('change', this.onLayoutChange);
  }

  private build(): HTMLElement {
    const nav = document.createElement('nav');
    nav.className = 'rail';
    nav.setAttribute('aria-label', t('rail.aria'));

    this.items.forEach((item) => {
      const link = document.createElement('a');
      link.className = 'rail__dot';
      link.href = `#${item.id}`;
      link.draggable = false;
      link.dataset.rail = item.id;
      link.setAttribute('aria-label', item.label());

      const marker = document.createElement('span');
      marker.className = 'rail__marker';
      marker.setAttribute('aria-hidden', 'true');

      const label = document.createElement('span');
      label.className = 'rail__label';
      label.textContent = item.label();
      link.append(marker, label);

      link.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.suppressClick) {
          this.suppressClick = false;
          return;
        }
        this.navigate(item);
      });

      this.links.set(item.id, link);
      nav.appendChild(link);
    });
    return nav;
  }

  private syncActive(): void {
    this.setActive(
      this.scene === 'identity' && this.introVisible
        ? 'intro'
        : SCENE_TO_RAIL[this.scene]
    );
  }

  private setActive(id: string): void {
    this.activeId = id;
    this.links.forEach((link, key) => {
      const on = key === id;
      link.classList.toggle('is-active', on);
      if (on) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
    if (!this.drag) this.renderFocus(id);
  }

  /** Met à jour la profondeur visuelle autour du chapitre focalisé. */
  private renderFocus(id: string): void {
    const focusIndex = Math.max(
      0,
      this.items.findIndex((item) => item.id === id)
    );
    this.links.forEach((link, key) => {
      const index = this.items.findIndex((item) => item.id === key);
      const distance = Math.abs(index - focusIndex);
      const depth = Math.pow(0.4, distance);
      link.classList.toggle('is-current', key === id);
      // Molette horizontale : les points hors écran ne reçoivent pas le focus.
      link.tabIndex = this.horizontalQuery.matches && distance > 4 ? -1 : 0;
      link.style.setProperty('--rail-distance', String(distance));
      link.style.setProperty('--rail-depth', depth.toFixed(3));
      link.style.setProperty(
        '--rail-offset',
        `${((index - focusIndex) * 2.31).toFixed(2)}rem`
      );
    });
    this.nav.dataset.focus = id;
  }

  private navigate(item: RailItem): void {
    this.setActive(item.id);
    this.scroll.scrollTo(item.id === 'top' ? 0 : `#${item.id}`);
    this.updateHash(item);
  }

  private updateHash(item: RailItem): void {
    const hash = `#${item.id}`;
    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', hash);
    }
  }

  /** Démarre la molette sans perturber les clics courts. */
  private nearestIndex(coordinate: number, axis: RailAxis): number {
    let nearest = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    this.items.forEach((item, index) => {
      const link = this.links.get(item.id);
      if (!link) return;
      const rect = link.getBoundingClientRect();
      const center =
        axis === 'x' ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
      const distance = Math.abs(coordinate - center);
      if (distance < nearestDistance) {
        nearest = index;
        nearestDistance = distance;
      }
    });
    return nearest;
  }

  private startDrag(event: PointerEvent): void {
    if (event.button !== 0) return;
    this.suppressClick = false;
    const axis: RailAxis = this.horizontalQuery.matches ? 'x' : 'y';
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
      '.rail__dot'
    );
    const targetId = target?.dataset.rail;
    const startIndex = targetId
      ? Math.max(
          0,
          this.items.findIndex((item) => item.id === targetId)
        )
      : this.nearestIndex(axis === 'x' ? event.clientX : event.clientY, axis);
    this.navigate(this.items[startIndex]);
    const now = performance.now();
    const coordinate = axis === 'x' ? -event.clientX : event.clientY;
    this.drag = {
      pointerId: event.pointerId,
      axis,
      startY: coordinate,
      lastY: coordinate,
      previewIndex: startIndex,
      originWasSurface: !target,
      moved: false,
      accumulatedY: 0,
      direction: 0,
      holdStartedAt: now,
      lastStepAt: now,
    };
    this.nav.style.setProperty('--rail-drag-shift', '0px');
    this.nav.classList.add('is-pressed');
    this.nav.setPointerCapture(event.pointerId);
  }

  private updateDrag(event: PointerEvent): void {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    const drag = this.drag;
    // Sur l'axe horizontal, glisser vers la gauche avance : on inverse X pour
    // que « positif » signifie toujours « chapitre suivant ».
    const coordinate = drag.axis === 'x' ? -event.clientX : event.clientY;
    const displacement = coordinate - drag.startY;
    const incrementalDelta = coordinate - drag.lastY;
    drag.lastY = coordinate;
    drag.accumulatedY += incrementalDelta;

    const direction: -1 | 0 | 1 =
      displacement > 12 ? 1 : displacement < -12 ? -1 : 0;
    if (direction !== drag.direction) {
      const now = performance.now();
      const hadDirection = drag.direction !== 0;
      drag.direction = direction;
      drag.holdStartedAt = now;
      drag.lastStepAt = now;
      if (hadDirection) drag.accumulatedY = 0;
    }

    if (Math.abs(displacement) < 7 && !drag.moved) return;
    event.preventDefault();
    drag.moved = true;
    this.nav.classList.add('is-dragging');

    while (Math.abs(drag.accumulatedY) >= 36) {
      const stepDirection = drag.accumulatedY > 0 ? 1 : -1;
      if (!this.stepDrag(stepDirection)) {
        drag.accumulatedY = 0;
        break;
      }
      drag.accumulatedY -= stepDirection * 36;
    }
    const shift = drag.axis === 'x' ? -drag.accumulatedY : drag.accumulatedY;
    this.nav.style.setProperty('--rail-drag-shift', `${shift.toFixed(2)}px`);
  }

  /** Répète le pas lorsque le pointeur reste maintenu dans une direction. */
  private updateHold(): void {
    const drag = this.drag;
    if (!drag?.moved || drag.direction === 0) return;
    const now = performance.now();
    if (now - drag.holdStartedAt < 420 || now - drag.lastStepAt < 230) return;
    this.stepDrag(drag.direction);
  }

  /** Change de chapitre et entraîne immédiatement le scroll et le Canvas. */
  private stepDrag(direction: -1 | 1): boolean {
    const drag = this.drag;
    if (!drag) return false;
    const nextIndex = Math.max(
      0,
      Math.min(this.items.length - 1, drag.previewIndex + direction)
    );
    drag.lastStepAt = performance.now();
    if (nextIndex === drag.previewIndex) return false;
    drag.previewIndex = nextIndex;
    const item = this.items[nextIndex];
    this.renderFocus(item.id);
    this.scroll.scrollTo(item.id === 'top' ? 0 : `#${item.id}`, 0, {
      duration: 0.18,
    });
    this.updateHash(item);
    return true;
  }

  private finishDrag(event: PointerEvent, commit: boolean): void {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    const drag = this.drag;
    this.drag = null;
    this.nav.style.removeProperty('--rail-drag-shift');
    this.nav.classList.remove('is-pressed', 'is-dragging');
    if (this.nav.hasPointerCapture(event.pointerId)) {
      this.nav.releasePointerCapture(event.pointerId);
    }
    if (commit && drag.moved) {
      this.suppressClick = true;
      this.navigate(this.items[drag.previewIndex]);
      window.setTimeout(() => {
        this.suppressClick = false;
      }, 1200);
    } else {
      this.renderFocus(this.activeId);
    }
  }

  /** Rend la proximité lisible sans transformer chaque point en bouton criard. */
  private updateProximity(event: PointerEvent): void {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
      '.rail__dot'
    );
    const links = [...this.links.values()];

    links.forEach((link) => {
      const rect = link.getBoundingClientRect();
      const step = Math.max(rect.height + 6, 1);
      const center = rect.top + rect.height / 2;
      const distance = Math.abs(event.clientY - center);
      const proximity = Math.max(0, 1 - distance / (step * 2.4));
      link.style.setProperty('--rail-proximity', proximity.toFixed(3));
      link.classList.toggle('is-near', proximity > 0.05);
      link.classList.toggle('is-pointer', link === target);
    });
  }

  private clearProximity(): void {
    this.links.forEach((link) => {
      link.style.removeProperty('--rail-proximity');
      link.classList.remove('is-near', 'is-pointer');
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
    this.unsubscribeScene();
    this.introTrigger.kill();
    this.nav.removeEventListener('pointermove', this.onPointerMove);
    this.nav.removeEventListener('pointerdown', this.onPointerDown);
    this.nav.removeEventListener('pointerup', this.onPointerUp);
    this.nav.removeEventListener('pointercancel', this.onPointerCancel);
    this.nav.removeEventListener('pointerleave', this.onPointerLeave);
    gsap.ticker.remove(this.onHoldTick);
    this.horizontalQuery.removeEventListener('change', this.onLayoutChange);
    this.nav.remove();
  }
}
