import { describe, expect, it } from 'vitest';
import { DICTIONARIES } from './dictionary';

describe('dictionaries', () => {
  it('keep the same translation keys in French and English', () => {
    expect(Object.keys(DICTIONARIES.fr).sort()).toEqual(
      Object.keys(DICTIONARIES.en).sort()
    );
  });

  it('do not contain empty translations', () => {
    Object.values(DICTIONARIES).forEach((dictionary) => {
      Object.entries(dictionary).forEach(([key, value]) => {
        expect(value.trim(), key).not.toBe('');
      });
    });
  });
});
