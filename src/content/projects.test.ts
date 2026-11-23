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
        study.summary,
        study.highlight,
        study.problem,
        study.role,
        study.decision,
        study.evidence,
        study.limit,
        study.note,
        ...study.flow,
        ...study.links.map((link) => link.label),
      ].forEach((value) => {
        expect(value.fr.trim()).not.toBe('');
        expect(value.en.trim()).not.toBe('');
      });
    });
  });
  it('preserves legacy anchors while presenting AIGen and safe public access', () => {
    expect(CASE_STUDIES.map(({ id, name }) => [id, name])).toEqual([
      ['siteguardian', 'SiteGuardian'],
      ['imagegeneratorlocal', 'AIGen'],
    ]);
    expect(
      CASE_STUDIES.flatMap((study) => study.links.map((link) => link.href))
    ).toEqual([
      'https://siteguardian.adrianguichard.dev/',
      'https://app.adrianguichard.dev/',
    ]);
  });

  it('keeps qualification separate from public availability in both languages', () => {
    const [guardian, aigen] = CASE_STUDIES;
    expect(guardian.flow).toHaveLength(6);
    expect(aigen.flow).toHaveLength(4);
    for (const locale of ['fr', 'en'] as const) {
      expect(guardian.evidence[locale]).toMatch(/2026/);
      expect(guardian.limit[locale]).toMatch(/ficti/);
      expect(aigen.limit[locale]).toContain('Authenticode');
      expect(aigen.limit[locale]).toContain('DirectML');
      expect(aigen.limit[locale]).toMatch(/désactivé|disabled/);
      expect(aigen.highlight[locale]).toContain('386');
      expect(aigen.evidence[locale]).toContain('DreamShaper LCM');
      expect(aigen.evidence[locale]).toContain('512 × 512');
      expect(aigen.evidence[locale]).toContain('828 s');
      expect(aigen.evidence[locale]).toMatch(/local/);
      expect(aigen.evidence[locale]).toContain('PNG');
      expect(aigen.limit[locale]).toMatch(/périmée|stale/);
      expect(aigen.limit[locale]).toMatch(/service public|public service/);
      expect(aigen.role[locale]).toMatch(/tiers|third-party/);
    }
  });
});
