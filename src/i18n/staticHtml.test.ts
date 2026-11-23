import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  parse,
  serialize,
  defaultTreeAdapter as tree,
  type DefaultTreeAdapterMap,
} from 'parse5';
import { localizedHtml, localizedSitemap } from '../../tools/localizedHtml';
import { DICTIONARIES, LOCALES } from './dictionary';
import { LANGUAGE_PATHS, ORIGIN, SEO, localeFromPath } from './seo';
import { CASE_STUDIES, PROJECTS } from '../content/projects';

type Node = DefaultTreeAdapterMap['node'];
function elements(node: Node): DefaultTreeAdapterMap['element'][] {
  return [
    tree.isElementNode(node) ? [node] : [],
    'childNodes' in node ? node.childNodes.flatMap(elements) : [],
  ].flat();
}
const template = readFileSync(
  new URL('../../index.html', import.meta.url),
  'utf8'
);
function textContent(node: Node): string {
  return node.nodeName === '#text' && 'value' in node
    ? node.value
    : 'childNodes' in node
      ? node.childNodes.map(textContent).join('')
      : '';
}

describe('documents localisés', () => {
  for (const locale of LOCALES)
    it(`contenu, attributs et ressources : ${locale}`, () => {
      const html = localizedHtml(template, locale);
      const nodes = elements(parse(html));
      const attr = (node: (typeof nodes)[number], key: string) =>
        node.attrs.find((item) => item.name === key)?.value;
      const find = (key: string, value: string) =>
        nodes.find((node) => attr(node, key) === value)!;
      expect(
        attr(
          nodes.find((node) => node.tagName === 'html')!,
          'lang'
        )
      ).toBe(locale);
      expect(serialize(nodes.find((node) => node.tagName === 'title')!)).toBe(
        SEO[locale].title
      );
      expect(attr(find('rel', 'canonical'), 'href')).toBe(
        ORIGIN + LANGUAGE_PATHS[locale]
      );
      expect(attr(find('name', 'description'), 'content')).toBe(
        SEO[locale].description
      );
      expect(attr(find('property', 'og:url'), 'content')).toBe(
        ORIGIN + LANGUAGE_PATHS[locale]
      );
      for (const lang of ['fr', 'en', 'x-default'])
        expect(attr(find('hreflang', lang), 'href')).toBe(
          ORIGIN + LANGUAGE_PATHS[lang === 'en' ? 'en' : 'fr']
        );
      for (const node of nodes) {
        const key = attr(node, 'data-i18n');
        if (key) expect(textContent(node)).toBe(DICTIONARIES[locale][key]);
        for (const name of ['src', 'href']) {
          const value = attr(node, name);
          if (value) expect(value).toMatch(/^(\/|#|https:|mailto:)/);
        }
      }
      for (const project of PROJECTS) {
        expect(find('id', project.id)).toBeDefined();
        expect(textContent(find('id', project.id))).toContain(
          project.proof.evidence[locale]
        );
      }
      for (const study of CASE_STUDIES) {
        const content = textContent(find('id', study.id));
        expect(content).toContain(study.highlight[locale]);
        expect(content).toContain(study.evidence[locale]);
        expect(content).toContain(study.limit[locale]);
      }
      const person = JSON.parse(serialize(find('type', 'application/ld+json')));
      expect(person['@id']).toBe(ORIGIN + '/#person');
      expect(person.url).toBe(ORIGIN + '/');
      expect(html).not.toContain('<!-- PROJETS STATIQUES -->');
    });

  it('sitemap déterministe et chemins linguistiques explicites', () => {
    const xml = localizedSitemap();
    expect(xml.match(/<url>/g)).toHaveLength(2);
    expect(xml.match(/<xhtml:link/g)).toHaveLength(6);
    expect(localeFromPath('/en/')).toBe('en');
    expect(localeFromPath('/en/index.html')).toBe('en');
    expect(localeFromPath('/')).toBe('fr');
    expect(localeFromPath('/english')).toBe('fr');
  });
});
