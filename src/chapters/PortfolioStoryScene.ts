import { prefersReducedMotion } from '@/core/motion';
import type { VisualState } from '@/visual/types';
import { clamp01, easeOut, type ChapterScene } from './types';

interface NodeDef {
  label: string;
  color: string;
  identity: [number, number];
  stack: [number, number];
}

const NODES: NodeDef[] = [
  {
    label: 'TypeScript',
    color: '#6ea8ff',
    identity: [0.18, 0.22],
    stack: [0.16, 0.24],
  },
  {
    label: 'WebGL',
    color: '#8f7bff',
    identity: [0.78, 0.16],
    stack: [0.39, 0.18],
  },
  {
    label: 'GSAP',
    color: '#7cf7c4',
    identity: [0.86, 0.48],
    stack: [0.65, 0.26],
  },
  {
    label: 'React',
    color: '#62d9ff',
    identity: [0.7, 0.8],
    stack: [0.83, 0.45],
  },
  {
    label: 'Node',
    color: '#84cc77',
    identity: [0.28, 0.82],
    stack: [0.68, 0.7],
  },
  {
    label: 'MongoDB',
    color: '#4ade80',
    identity: [0.1, 0.57],
    stack: [0.42, 0.78],
  },
  {
    label: 'Docker',
    color: '#4bb7ed',
    identity: [0.5, 0.08],
    stack: [0.17, 0.67],
  },
];

const LINKS: [number, number][] = [
  [0, 1],
  [0, 5],
  [1, 2],
  [1, 6],
  [2, 3],
  [3, 4],
  [4, 5],
  [4, 6],
];

export class PortfolioStoryScene implements ChapterScene {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly reduced = prefersReducedMotion();
  private w = 1;
  private h = 1;
  private dpr = 1;
  private visualState: VisualState | null = null;

  constructor(private readonly stage: HTMLElement) {
    stage.classList.add('stage--portfolio-story');
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'story-board';
    this.ctx = this.canvas.getContext('2d')!;
    stage.appendChild(this.canvas);
    this.resize();
  }

  setVisualState(state: VisualState): void {
    this.visualState = state;
  }

  update(progress: number, time: number): void {
    const morph = easeOut(clamp01((progress - 0.28) / 0.5));
    const pulse = this.reduced
      ? 0
      : (this.visualState?.pulse ?? Math.sin(time * 0.0012) * 0.5 + 0.5);
    const ctx = this.ctx;
    const compact = this.w < 760;
    const scale = Math.min(this.w, this.h) * (compact ? 0.58 : 0.9);
    const originX = compact ? this.w * 0.68 : this.w * 0.64;
    const originY = compact ? this.h * 0.34 : this.h * 0.5;
    const boardW = scale * (0.34 - morph * 0.14);
    const boardH = scale * (0.2 - morph * 0.08);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    this.drawGrid(ctx, morph);

    const positions = NODES.map((node, index) => {
      const ix = (node.identity[0] - 0.5) * scale;
      const iy = (node.identity[1] - 0.5) * scale * 0.72;
      const sx = (node.stack[0] - 0.5) * scale * 1.05;
      const sy = (node.stack[1] - 0.5) * scale * 0.72;
      const drift = this.reduced
        ? 0
        : Math.sin(time * 0.0008 + index * 1.7) * 4 * (1 - morph);
      return {
        x: originX + ix + (sx - ix) * morph,
        y: originY + iy + (sy - iy) * morph + drift,
      };
    });

    ctx.lineWidth = 1;
    for (const [a, b] of LINKS) {
      const from = positions[a];
      const to = positions[b];
      const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
      gradient.addColorStop(0, `${NODES[a].color}55`);
      gradient.addColorStop(1, `${NODES[b].color}55`);
      ctx.strokeStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.roundRect(
      originX - boardW / 2,
      originY - boardH / 2,
      boardW,
      boardH,
      12
    );
    ctx.fillStyle = `rgba(5, 8, 17, ${0.78 - morph * 0.28})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(110, 168, 255, ${0.55 - morph * 0.32})`;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(244, 246, 251, ${1 - morph * 0.7})`;
    ctx.font = `700 ${Math.max(24, scale * 0.075)}px "Space Grotesk", sans-serif`;
    ctx.fillText('AG', originX, originY - boardH * 0.08);
    ctx.fillStyle = `rgba(110, 168, 255, ${0.9 - morph * 0.45})`;
    ctx.font = `600 ${Math.max(8, scale * 0.018)}px Inter, sans-serif`;
    ctx.fillText(
      morph < 0.55 ? 'CREATIVE ENGINEER' : 'SYSTEM CORE',
      originX,
      originY + boardH * 0.27
    );

    positions.forEach((pos, index) => {
      this.drawNode(ctx, pos.x, pos.y, NODES[index], pulse, morph, compact);
    });
  }

  resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = this.stage.clientWidth || 1;
    this.h = this.stage.clientHeight || 1;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
  }

  destroy(): void {
    this.canvas.remove();
  }

  private drawGrid(ctx: CanvasRenderingContext2D, morph: number): void {
    ctx.fillStyle = `rgba(110, 168, 255, ${0.035 + morph * 0.025})`;
    const gap = 34;
    for (let x = gap; x < this.w; x += gap) {
      for (let y = gap; y < this.h; y += gap) ctx.fillRect(x, y, 1, 1);
    }
  }

  private drawNode(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    node: NodeDef,
    pulse: number,
    morph: number,
    compact: boolean
  ): void {
    const radius = 4 + pulse * 1.4;
    ctx.shadowColor = node.color;
    ctx.shadowBlur = 12 + pulse * 8;
    ctx.fillStyle = node.color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (compact) return;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${11 + morph * 2}px Inter, sans-serif`;
    ctx.fillStyle = `rgba(244, 246, 251, ${0.58 + morph * 0.4})`;
    ctx.fillText(node.label, x + 11, y);
  }
}
