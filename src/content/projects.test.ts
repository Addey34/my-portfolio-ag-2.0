import { describe, expect, it } from 'vitest';
import { CASE_STUDIES, PROJECTS } from './projects';

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

  it('gives every project three verified highlights', () => {
    PROJECTS.forEach((project) => expect(project.highlights).toHaveLength(3));
  });

  it('provides complete bilingual case-study content', () => {
    PROJECTS.forEach((project) => {
      const localized = [
        project.tagline,
        project.thesis,
        ...Object.values(project.proof),
        ...project.highlights,
      ];
      localized.forEach((value) => {
        expect(value.fr.trim()).not.toBe('');
        expect(value.en.trim()).not.toBe('');
      });
    });
  });

  it('keeps complementary case studies bilingual and out of the chapters', () => {
    const ids = new Set(PROJECTS.map((project) => project.id));
    CASE_STUDIES.forEach((study) => {
      expect(ids.has(study.id)).toBe(false);
      [
        study.status,
        study.problem,
        study.role,
        study.decision,
        study.evidence,
        study.limit,
        study.note,
      ].forEach((value) => {
        expect(value.fr.trim()).not.toBe('');
        expect(value.en.trim()).not.toBe('');
      });
    });
  });
});
