import { getLocale, onLocaleChange, t } from '@/i18n';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { publishSculpture } from './sculptureProjection';
import {
  displayedRadius,
  SCALE_BODIES,
  SCALE_SOURCE,
  scaleExponent,
} from './galaxyScaleModel';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Instrument indépendant, purement événementiel : aucun renderer ni ticker. */
export function mountGalaxyObservatory(mount: HTMLElement): void {
  const root = document.createElement('div');
  root.className = 'observatory__instrument';
  const copy: Array<[HTMLElement, string]> = [];
  const text = (tag: string, className: string, key: string): HTMLElement => {
    const node = document.createElement(tag);
    node.className = className;
    copy.push([node, key]);
    return node;
  };

  const intro = text('p', 'observatory__intro', 'observatory.intro');
  intro.id = 'galaxy-observatory-intro';
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('observatory__sky');
  svg.setAttribute('viewBox', '0 0 640 220');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  const shape = (tag: string, attrs: Record<string, string>): SVGElement => {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs))
      node.setAttribute(key, value);
    return node;
  };
  // Une règle de mesure, pas une vue orbitale : les diamètres restent symboliques.
  for (let tick = 0; tick <= 10; tick++) {
    const x = String(36 + tick * 54);
    svg.append(
      shape('line', {
        x1: x,
        x2: x,
        y1: '56',
        y2: '164',
        class: 'observatory__grid',
      })
    );
  }
  svg.append(
    shape('line', {
      x1: '36',
      x2: '576',
      y1: '110',
      y2: '110',
      class: 'observatory__axis',
    }),
    shape('circle', {
      cx: '36',
      cy: '110',
      r: '18',
      class: 'observatory__sun-ring',
    }),
    shape('circle', { cx: '36', cy: '110', r: '9', class: 'observatory__sun' }),
    shape('line', {
      x1: String(36 + 540 / 30.07),
      x2: String(36 + 540 / 30.07),
      y1: '76',
      y2: '148',
      class: 'observatory__reference',
    })
  );
  const markers = SCALE_BODIES.map((body, index) => {
    const marker = shape('g', { 'data-body': body.id });
    marker.append(
      shape('line', {
        x1: '0',
        x2: '0',
        y1: '78',
        y2: '142',
        stroke: body.color,
        'stroke-opacity': '0.5',
      }),
      shape('circle', {
        cx: '0',
        cy: '110',
        r: String(index === 1 ? 8 : 5),
        fill: body.color,
      }),
      shape('circle', {
        cx: '0',
        cy: '110',
        r: String(index === 1 ? 14 : 11),
        fill: 'none',
        stroke: body.color,
        'stroke-opacity': '0.4',
      })
    );
    svg.append(marker);
    return marker;
  });

  const equation = document.createElement('output');
  equation.className = 'observatory__equation';
  equation.setAttribute('for', 'galaxy-observatory-scale');
  equation.setAttribute('aria-live', 'off');
  const label = text('label', 'observatory__label', 'observatory.control');
  label.setAttribute('for', 'galaxy-observatory-scale');
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.id = 'galaxy-observatory-scale';
  slider.min = '0';
  slider.max = '100';
  slider.step = '1';
  slider.value = '0';
  slider.setAttribute('aria-describedby', intro.id);

  const presets = document.createElement('div');
  presets.className = 'observatory__presets';
  for (const [value, key] of [
    [0, 'observatory.compressed'],
    [100, 'observatory.proportional'],
  ] as const) {
    const button = text('button', '', key) as HTMLButtonElement;
    button.type = 'button';
    button.dataset.scale = String(value);
    button.addEventListener('click', () => {
      slider.value = String(value);
      update();
    });
    presets.append(button);
  }

  const table = document.createElement('table');
  table.className = 'observatory__table';
  const caption = text('caption', '', 'observatory.table');
  const head = document.createElement('thead');
  const row = document.createElement('tr');
  for (const key of [
    'observatory.body',
    'observatory.distance',
    'observatory.display',
  ]) {
    const cell = text('th', '', key);
    cell.setAttribute('scope', 'col');
    row.append(cell);
  }
  head.append(row);
  const tbody = document.createElement('tbody');
  const readings = SCALE_BODIES.map((body) => {
    const line = document.createElement('tr');
    const name = text('th', 'observatory__body', 'observatory.' + body.id);
    name.setAttribute('scope', 'row');
    name.style.setProperty('--body-color', body.color);
    const distance = document.createElement('td');
    const display = document.createElement('td');
    line.append(name, distance, display);
    tbody.append(line);
    return { distance, display };
  });
  table.append(caption, head, tbody);

  const reading = document.createElement('p');
  reading.className = 'observatory__reading';
  const note = text('p', 'observatory__note', 'observatory.note');
  const source = text(
    'a',
    'observatory__source',
    'observatory.source'
  ) as HTMLAnchorElement;
  source.href = SCALE_SOURCE;
  source.target = '_blank';
  source.rel = 'noopener noreferrer';

  // Les valeurs sont recalculées seulement à l'entrée utilisateur ou au changement de langue.
  function update(): void {
    const value = slider.valueAsNumber;
    const locale = getLocale();
    const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 4 });
    const percent = new Intl.NumberFormat(locale, {
      style: 'percent',
      maximumFractionDigits: 1,
    });
    const mode = t(
      value === 100 ? 'observatory.proportional' : 'observatory.compressed'
    );
    const exponent = number.format(scaleExponent(value));
    equation.textContent = `${t('observatory.formula')} ${exponent}`;
    const earth = displayedRadius(1, value);
    slider.setAttribute(
      'aria-valuetext',
      `${mode} · ${t('observatory.exponent')} ${exponent} · ${t('observatory.earth')} ${percent.format(earth)}`
    );
    reading.textContent =
      `${t('observatory.reading')} ${percent.format(earth)} · ${t('observatory.reference')} ${percent.format(displayedRadius(1, 100))}` +
      (locale === 'fr'
        ? ' · Astrolabe : anneaux Terre, Jupiter, Neptune. Armature, inclinaisons et tailles symboliques.'
        : ' · Astrolabe: Earth, Jupiter, Neptune rings. Symbolic frame, tilts and body sizes.');
    SCALE_BODIES.forEach((body, index) => {
      const radius = displayedRadius(body.distanceAU, value);
      markers[index].setAttribute(
        'transform',
        `translate(${36 + 540 * radius} 0)`
      );
      readings[index].distance.textContent = number.format(body.distanceAU);
      readings[index].display.textContent = percent.format(radius);
    });
    for (const button of presets.querySelectorAll<HTMLButtonElement>('button'))
      button.dataset.active = String(Number(button.dataset.scale) === value);
    root.dataset.scale = String(value);
    publishSculpture(mount, {
      scene: 'galaxy',
      radii: SCALE_BODIES.map((body) =>
        displayedRadius(body.distanceAU, value)
      ),
    });
  }

  const translate = (): void => {
    for (const [node, key] of copy) node.textContent = t(key);
    update();
  };
  slider.addEventListener('input', update);
  onLocaleChange(translate);
  root.append(
    intro,
    svg,
    equation,
    label,
    slider,
    presets,
    reading,
    table,
    note,
    source
  );
  mount.replaceChildren(root);
  translate();
  // Le module différé peut arriver après le rafraîchissement du disclosure.
  ScrollTrigger.refresh();
}
