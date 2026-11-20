import type { Texture } from 'three';

export class TextureWarmupCache {
  private entries = new WeakMap<
    Texture,
    { version: number; source: Texture['source']; sourceVersion: number }
  >();

  has(texture: Texture): boolean {
    const entry = this.entries.get(texture);
    return (
      !!entry &&
      entry.version === texture.version &&
      entry.source === texture.source &&
      entry.sourceVersion === texture.source.version
    );
  }

  mark(texture: Texture): void {
    this.entries.set(texture, {
      version: texture.version,
      source: texture.source,
      sourceVersion: texture.source.version,
    });
  }

  clear(): void {
    this.entries = new WeakMap();
  }
}
