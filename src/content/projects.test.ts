import { describe, expect, it } from 'vitest';
import { PROJECTS } from './projects';

describe('project catalogue', () => {
  it('keeps project identifiers unique and linkable', () => {
    const ids = PROJECTS.map((project) => project.id);
    expect(new Set(ids).size).toBe(ids.length);
    PROJECTS.forEach((project) => {
      expect(project.id).toMatch(/^[a-z0-9-]+$/);
      if (project.links.length === 0) expect(project.linkNote).toBeDefined();
      project.links.forEach((link) => expect(link.href).toMatch(/^https:\/\//));
    });
  });

  it('provides complete bilingual case-study content', () => {
    PROJECTS.forEach((project) => {
      const localized = [
        project.tagline,
        project.thesis,
        ...Object.values(project.proof),
      ];
      localized.forEach((value) => {
        expect(value.fr.trim()).not.toBe('');
        expect(value.en.trim()).not.toBe('');
      });
    });
  });
});
