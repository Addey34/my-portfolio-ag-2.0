import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DETAIL_SPECS, detailKindFor } from '@/visual/materialDetail';

interface GlbMaterial {
  name?: string;
  emissiveFactor?: number[];
}

function glbMaterials(file: string): GlbMaterial[] {
  const buffer = readFileSync(
    new URL(`../../public/models/${file}`, import.meta.url)
  );
  const length = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + length).toString('utf8'))
    .materials;
}

describe('micro-détail de matière', () => {
  it('associe chaque matière du GLB à une identité, sauf les émissives', () => {
    for (const file of [
      'galaxy_astrolabe.glb',
      'ludora_dice.glb',
      'magnotes_grimoire.glb',
    ])
      for (const material of glbMaterials(file)) {
        const kind = detailKindFor(material.name ?? '');
        const emissive = (material.emissiveFactor ?? []).some((v) => v > 0);
        if (emissive) expect(kind, material.name).toBeNull();
        else expect(kind, `${file} : ${material.name}`).not.toBeNull();
      }
  });

  it('distingue cuir, papier, émail, laiton et métal poli', () => {
    expect(detailKindFor('BOOK / oxblood leather')).toBe('leather');
    expect(detailKindFor('BOOK / oiled strap')).toBe('leather');
    expect(detailKindFor('BOOK / ivory paper')).toBe('paper');
    expect(detailKindFor('DICE / indigo enamel')).toBe('enamel');
    expect(detailKindFor('ASTRO / aged brass')).toBe('brass');
    expect(detailKindFor('BOOK / champagne')).toBe('brass');
    expect(detailKindFor('DICE / polished edge')).toBe('polished');
    expect(detailKindFor('ASTRO / brushed titanium')).toBe('brushed');
    expect(detailKindFor('DICE / blued steel')).toBe('brushed');
    expect(detailKindFor('ASTRO / lens glass')).toBeNull();
  });

  it('garde des identifiants de shader uniques et des intensités bornées', () => {
    const specs = Object.values(DETAIL_SPECS);
    expect(new Set(specs.map((spec) => spec.id)).size).toBe(specs.length);
    for (const spec of specs) {
      expect(spec.bump).toBeLessThanOrEqual(2.5);
      expect(spec.rough).toBeLessThanOrEqual(0.3);
      expect(spec.tint).toBeLessThanOrEqual(0.6);
      expect(spec.scale).toBeGreaterThan(0);
    }
  });
});
