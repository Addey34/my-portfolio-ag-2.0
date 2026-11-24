import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface GlbJson {
  nodes: { name?: string }[];
  materials?: { name?: string }[];
  meshes: {
    primitives: { indices?: number; attributes: { POSITION: number } }[];
  }[];
  accessors: { count: number }[];
  images?: unknown[];
}

function readGlb(file: string): { json: GlbJson; bytes: number } {
  const buffer = readFileSync(
    new URL(`../../public/models/${file}`, import.meta.url)
  );
  const length = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.subarray(20, 20 + length).toString('utf8'));
  return { json, bytes: buffer.length };
}

function triangles(json: GlbJson): number {
  let count = 0;
  for (const mesh of json.meshes)
    for (const primitive of mesh.primitives) {
      const accessor = primitive.indices ?? primitive.attributes.POSITION;
      count += json.accessors[accessor].count / 3;
    }
  return count;
}

/**
 * Contrat d'intégration des trois pièces maîtresses : StoryWorld3D et GalaxySignature
 * retrouvent leurs pivots et leurs matières par nom, et le budget de rendu est borné.
 */
const CONTRACTS = [
  {
    file: 'galaxy_astrolabe.glb',
    nodes: [
      'ASTRO / ring 1 spin',
      'ASTRO / ring 2 spin',
      'ASTRO / ring 3 spin',
    ],
    materials: ['aged brass', 'sun', 'energy', 'rune'],
    maxTriangles: 25_000,
    maxBytes: 800_000,
  },
  {
    file: 'ludora_dice.glb',
    nodes: [
      'DICE / die pivot',
      'DICE / board pivot',
      ...[1, 2, 3, 4, 5, 6].map((k) => `DICE / tile ${k} pivot`),
    ],
    materials: ['titanium', 'cyan index', 'indigo enamel'],
    maxTriangles: 26_000,
    maxBytes: 900_000,
  },
  {
    file: 'magnotes_grimoire.glb',
    nodes: [
      'BOOK / book pivot',
      ...[1, 2, 3, 4, 5, 6].map((k) => `NOTE / 0${k} pivot`),
    ],
    materials: ['oxblood leather', 'champagne', 'ivory paper'],
    maxTriangles: 16_000,
    maxBytes: 700_000,
  },
];

describe('pièces maîtresses 3D', () => {
  for (const contract of CONTRACTS)
    it(`${contract.file} : pivots, matières et budget`, () => {
      const { json, bytes } = readGlb(contract.file);
      const names = new Set(json.nodes.map((node) => node.name));
      for (const name of contract.nodes)
        expect(names.has(name), name).toBe(true);
      const materials = (json.materials ?? []).map((m) => m.name ?? '');
      for (const part of contract.materials)
        expect(
          materials.some((name) => name.includes(part)),
          part
        ).toBe(true);
      expect(triangles(json)).toBeLessThanOrEqual(contract.maxTriangles);
      expect(bytes).toBeLessThanOrEqual(contract.maxBytes);
      // Aucune texture embarquée : le poids vient de la géométrie, pas d'images.
      expect(json.images ?? []).toHaveLength(0);
    });
});
