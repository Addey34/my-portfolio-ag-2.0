import { prefersReducedMotion } from '@/core/motion';
import type { Project } from '@/content/projects';
import type { VisualState } from '@/visual/types';
import {
  clamp01,
  easeOut,
  type ChapterFactory,
  type ChapterScene,
} from './types';

type ProductMode = 'comparator' | 'image-generator' | 'ultimate-transfer';

class ProductChapter implements ChapterScene {
  private readonly root: HTMLElement;
  private readonly reduced = prefersReducedMotion();
  private visualState: VisualState | null = null;
  private readonly mode: ProductMode;
  private readonly comparatorNodes: HTMLElement[] = [];
  private readonly comparatorOffers: HTMLElement[] = [];
  private readonly imageTiles: HTMLElement[] = [];
  private readonly imagePipeline: HTMLElement[] = [];
  private readonly transferFiles: HTMLElement[] = [];
  private readonly transferLinks: SVGLineElement[] = [];

  constructor(stage: HTMLElement, project: Project) {
    this.mode = project.id as ProductMode;
    stage.classList.add('stage--product', 'stage--' + this.mode);
    this.root = document.createElement('div');
    this.root.className = 'pc-scene pc-scene--' + this.mode;
    stage.appendChild(this.root);

    if (this.mode === 'comparator') this.buildComparator();
    else if (this.mode === 'image-generator') this.buildImageGenerator();
    else this.buildTransfer();
  }

  setVisualState(state: VisualState): void {
    this.visualState = state;
  }

  update(progress: number, time: number): void {
    const build = easeOut(clamp01((progress - 0.05) / 0.74));
    const seconds = this.reduced ? 0 : time * 0.001;
    const energy = this.visualState?.energy ?? 0.5;
    this.root.style.setProperty('--pc-build', String(build));
    this.root.style.setProperty('--pc-energy', String(energy));

    if (this.mode === 'comparator') {
      this.updateComparator(build, seconds);
    } else if (this.mode === 'image-generator') {
      this.updateImageGenerator(build, seconds);
    } else {
      this.updateTransfer(build, seconds);
    }
  }

  resize(): void {
    /* Les scènes utilisent des coordonnées relatives au stage. */
  }

  destroy(): void {
    this.root.remove();
  }

  private buildComparator(): void {
    const universe = this.node('div', 'pc-universe pc-universe--comparator');
    const rings = this.node('div', 'pc-orbit-rings');
    for (let i = 0; i < 3; i += 1) {
      rings.appendChild(this.node('span', 'pc-orbit-ring'));
    }

    const core = this.node('div', 'pc-orbit-core');
    core.append(
      this.node('small', '', 'SEARCH ENGINE'),
      this.node('strong', '', 'BOSCH SMS4HVI33E5'),
      this.node('span', '', 'NORMALISED / EUR')
    );
    universe.append(rings, core);

    [
      ['IDEALO', '-90', '1'],
      ['GEIZHALS', '0', '2'],
      ['GOOGLE', '90', '3'],
      ['DIRECT', '180', '4'],
    ].forEach((source) => {
      const item = this.node('div', 'pc-orbit-node');
      item.dataset.angle = source[1];
      item.dataset.radius = String(84 + Number(source[2]) * 18);
      item.append(
        this.node('i', 'pc-orbit-node__dot'),
        this.node('span', '', source[0])
      );
      universe.appendChild(item);
      this.comparatorNodes.push(item);
    });

    const stream = this.node('div', 'pc-offer-stream');
    stream.appendChild(
      this.node('p', 'pc-stream-label', 'OFFERS / LIVE RANKING')
    );
    [
      ['01', 'Bosch Home', 'FR', '€ 489,00'],
      ['02', 'Elektroshop', 'DE', '€ 472,90'],
      ['03', 'Kitchen Pro', 'NL', '€ 461,40'],
      ['04', 'Best Offer', 'EU', '€ 449,90'],
    ].forEach((offer, index) => {
      const row = this.node('div', 'pc-offer-row');
      row.append(
        this.node('b', '', offer[0]),
        this.node('strong', '', offer[1]),
        this.node('span', '', offer[2]),
        this.node('em', '', offer[3])
      );
      if (index === 3) row.classList.add('pc-offer-row--best');
      stream.appendChild(row);
      this.comparatorOffers.push(row);
    });

    const flow = this.node('div', 'pc-data-flow');
    ['COLLECT', 'NORMALISE', 'MATCH', 'RANK'].forEach((label, index) => {
      const step = this.node('span', '', '0' + (index + 1) + '  ' + label);
      flow.appendChild(step);
    });

    universe.append(stream, flow);
    this.root.appendChild(universe);
  }

  private updateComparator(build: number, seconds: number): void {
    const orbit = build * 22 + Math.sin(seconds * 0.55) * 2;
    const center = this.root.querySelector<HTMLElement>('.pc-orbit-core');
    if (center) {
      center.style.transform =
        'translate(-50%, -50%) scale(' + (0.88 + build * 0.12) + ')';
    }

    this.comparatorNodes.forEach((node, index) => {
      const angle = Number(node.dataset.angle ?? 0) + orbit;
      const radius = Number(node.dataset.radius ?? 100);
      const local = easeOut(clamp01((build - index * 0.08) / 0.55));
      node.style.opacity = String(local);
      node.style.transform =
        'translate(-50%, -50%) rotate(' +
        angle +
        'deg) translateX(' +
        radius +
        'px) rotate(' +
        -angle +
        'deg) scale(' +
        (0.74 + local * 0.26) +
        ')';
    });

    this.comparatorOffers.forEach((row, index) => {
      const local = easeOut(clamp01((build - 0.32 - index * 0.08) / 0.46));
      row.style.opacity = String(local);
      row.style.transform = 'translate3d(' + (1 - local) * 46 + 'px,0,0)';
    });

    const flow = this.root.querySelector<HTMLElement>('.pc-data-flow');
    if (flow) flow.style.setProperty('--flow-progress', String(build));
  }

  private buildImageGenerator(): void {
    const field = this.node('div', 'pc-generation-field');
    const halo = this.node('div', 'pc-generation-halo');
    const tiles = this.node('div', 'pc-generation-grid');

    [
      ['FLUX', 'portrait', '#ec4899'],
      ['SD3', 'landscape', '#8b5cf6'],
      ['LoRA', 'style', '#06b6d4'],
      ['VAE', 'detail', '#f59e0b'],
      ['CONTROL', 'depth', '#22c55e'],
      ['2K', 'upscale', '#f43f5e'],
    ].forEach((item, index) => {
      const tile = this.node(
        'div',
        'pc-generation-tile pc-generation-tile--' + item[1]
      );
      tile.style.setProperty('--tile-color', item[2]);
      tile.style.setProperty('--tile-index', String(index));
      tile.append(
        this.node('strong', '', item[0]),
        this.node('span', '', item[1].toUpperCase())
      );
      tiles.appendChild(tile);
      this.imageTiles.push(tile);
    });

    const render = this.node('div', 'pc-render-card');
    const art = this.node('div', 'pc-render-art');
    art.append(
      this.node('span', 'pc-render-art__sun'),
      this.node('span', 'pc-render-art__planet'),
      this.node('span', 'pc-render-art__ring'),
      this.node('span', 'pc-render-art__grain')
    );
    render.append(
      art,
      this.node('small', '', 'LOCAL DIFFUSION / 2048 × 2048'),
      this.node('strong', '', 'A quiet synthetic landscape')
    );

    const prompt = this.node('div', 'pc-prompt-card');
    prompt.append(
      this.node('small', '', 'PROMPT'),
      this.node('strong', '', 'A quiet synthetic landscape'),
      this.node('span', '', 'CFG  7.5   ·   STEPS  28   ·   VRAM  7.4 GB')
    );

    const pipeline = this.node('div', 'pc-generation-pipeline');
    ['LOAD MODEL', 'QUANTIZE', 'OFFLOAD', 'RENDER'].forEach((label, index) => {
      const step = this.node('span', '', '0' + (index + 1) + '  ' + label);
      pipeline.appendChild(step);
      this.imagePipeline.push(step);
    });

    field.append(halo, tiles, render, prompt, pipeline);
    this.root.appendChild(field);
  }

  private updateImageGenerator(build: number, seconds: number): void {
    this.imageTiles.forEach((tile, index) => {
      const local = easeOut(clamp01((build - index * 0.07) / 0.54));
      const tilt = this.reduced ? 0 : Math.sin(seconds * 0.45 + index) * 2;
      tile.style.opacity = String(local);
      tile.style.transform =
        'translate3d(0,' +
        ((1 - local) * 48 + tilt) +
        'px,0) rotate(' +
        (index % 2 ? 1 : -1) * (1 - local) * 5 +
        'deg) scale(' +
        (0.82 + local * 0.18) +
        ')';
    });

    const art = this.root.querySelector<HTMLElement>('.pc-render-art');
    if (art) {
      const orbit = this.reduced ? 0 : Math.sin(seconds * 0.6) * 4;
      art.style.transform =
        'rotate(' + orbit + 'deg) scale(' + (0.82 + build * 0.18) + ')';
    }

    const beam = this.root.querySelector<HTMLElement>('.pc-generation-halo');
    if (beam) {
      beam.style.setProperty('--beam-position', String((build * 135) % 135));
    }

    this.imagePipeline.forEach((step, index) => {
      const local = easeOut(clamp01((build - 0.42 - index * 0.08) / 0.38));
      step.style.opacity = String(local);
      step.style.transform = 'translate3d(' + (1 - local) * -28 + 'px,0,0)';
    });
  }

  private buildTransfer(): void {
    const board = this.node('div', 'pc-transfer-board');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'pc-transfer-links');
    svg.setAttribute('viewBox', '0 0 100 100');
    for (let i = 0; i < 3; i += 1) {
      const line = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'line'
      );
      svg.appendChild(line);
      this.transferLinks.push(line);
    }

    const columns = this.node('div', 'pc-transfer-columns');
    ['UPLOAD', 'SECURE', 'SHARE'].forEach((label, index) => {
      const column = this.node('div', 'pc-transfer-column');
      column.style.setProperty('--column-index', String(index));
      column.append(
        this.node('small', '', '0' + (index + 1)),
        this.node('strong', '', label)
      );
      columns.appendChild(column);
    });

    const files = this.node('div', 'pc-transfer-files');
    [
      ['portfolio.pdf', '12.4 MB', '0', '0'],
      ['project-assets.zip', '84.1 MB', '1', '1'],
      ['handoff.txt', '18 KB', '2', '2'],
    ].forEach((file, _index) => {
      const item = this.node('div', 'pc-transfer-file');
      item.dataset.column = file[2];
      item.dataset.row = file[3];
      item.append(
        this.node('span', 'pc-transfer-file__icon', '▣'),
        this.node('strong', '', file[0]),
        this.node('small', '', file[1])
      );
      const bar = this.node('i', 'pc-transfer-file__bar');
      item.appendChild(bar);
      files.appendChild(item);
      this.transferFiles.push(item);
    });

    const lock = this.node('div', 'pc-transfer-lock');
    lock.append(
      this.node('span', '', '◈'),
      this.node('strong', '', '24H'),
      this.node('small', '', 'JWT · GRIDFS')
    );

    board.append(svg, columns, files, lock);
    this.root.appendChild(board);
  }

  private updateTransfer(build: number, seconds: number): void {
    const board = this.root.querySelector<HTMLElement>('.pc-transfer-board');
    const width = board?.clientWidth || 1;
    const height = board?.clientHeight || 1;
    const scatter = [
      [0.34, 0.23],
      [0.78, 0.34],
      [0.52, 0.75],
    ];
    const target = [
      [0.3, 0.53],
      [0.62, 0.53],
      [0.84, 0.53],
    ];

    this.transferFiles.forEach((file, index) => {
      const local = easeOut(clamp01((build - index * 0.09) / 0.58));
      const sx = scatter[index][0] * width - 94;
      const sy = scatter[index][1] * height - 32;
      const tx = target[index][0] * width - 94;
      const ty = target[index][1] * height - 32;
      const wobble = this.reduced
        ? 0
        : Math.sin(seconds * 0.75 + index) * (1 - local) * 7;
      file.style.opacity = String(0.35 + local * 0.65);
      file.style.transform =
        'translate3d(' +
        (sx + (tx - sx) * local) +
        'px,' +
        (sy + (ty - sy) * local + wobble) +
        'px,0) rotate(' +
        (1 - local) * (index === 1 ? 5 : -4) +
        'deg)';
      const bar = file.querySelector<HTMLElement>('.pc-transfer-file__bar');
      if (bar)
        bar.style.setProperty(
          '--file-progress',
          String(clamp01(build * (1.12 - index * 0.1)))
        );
    });

    this.transferLinks.forEach((line, index) => {
      const progress = clamp01((build - index * 0.1) / 0.65);
      const source = scatter[index];
      const destination = target[index];
      line.setAttribute(
        'x1',
        String(source[0] * 100 + (destination[0] - source[0]) * progress * 100)
      );
      line.setAttribute(
        'y1',
        String(source[1] * 100 + (destination[1] - source[1]) * progress * 100)
      );
      line.setAttribute('x2', String(destination[0] * 100));
      line.setAttribute('y2', String(destination[1] * 100));
      line.style.opacity = String(0.22 + progress * 0.5);
    });

    const lock = this.root.querySelector<HTMLElement>('.pc-transfer-lock');
    if (lock) {
      const pulse = this.reduced ? 0 : Math.sin(seconds * 2) * 2;
      lock.style.transform =
        'translate3d(-50%,' +
        pulse +
        'px,0) scale(' +
        (0.86 + build * 0.14) +
        ')';
    }
  }

  private node(tag: string, className: string, text?: string): HTMLElement {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }
}

export const create: ChapterFactory = (stage, project) =>
  new ProductChapter(stage, project);
