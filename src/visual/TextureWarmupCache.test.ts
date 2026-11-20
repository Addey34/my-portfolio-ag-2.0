import { describe, expect, it } from 'vitest';
import { Source, Texture } from 'three';
import { TextureWarmupCache } from './TextureWarmupCache';

describe('préparation des textures', () => {
  it('distingue nouvelle texture, texture modifiée et source modifiée', () => {
    const cache = new TextureWarmupCache();
    const texture = new Texture();
    expect(cache.has(texture)).toBe(false);
    cache.mark(texture);
    expect(cache.has(texture)).toBe(true);
    texture.needsUpdate = true;
    expect(cache.has(texture)).toBe(false);
    cache.mark(texture);
    texture.source.needsUpdate = true;
    expect(cache.has(texture)).toBe(false);
  });

  it('distingue deux sources de même version et invalide après restauration', () => {
    const cache = new TextureWarmupCache();
    const texture = new Texture();
    cache.mark(texture);
    texture.source = new Source(null);
    expect(cache.has(texture)).toBe(false);
    cache.mark(texture);
    cache.clear();
    expect(cache.has(texture)).toBe(false);
    cache.mark(texture);
    expect(cache.has(new Texture())).toBe(false);
  });
});
