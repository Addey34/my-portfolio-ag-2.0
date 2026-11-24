import {
  parse,
  parseFragment,
  serialize,
  defaultTreeAdapter as tree,
  type DefaultTreeAdapterMap,
} from 'parse5';
import { DICTIONARIES, LOCALES, type Locale } from '../src/i18n/dictionary';
import {
  LANGUAGE_PATHS,
  ORIGIN,
  SEO,
  personData,
  seoMeta,
} from '../src/i18n/seo';
import { CASE_STUDIES, PROJECTS } from '../src/content/projects';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];
const escape = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ] ?? char
  );
const attr = (node: Element, name: string): string | undefined =>
  node.attrs.find((item) => item.name === name)?.value;
function set(node: Element, name: string, value: string): void {
  const existing = node.attrs.find((item) => item.name === name);
  if (existing) existing.value = value;
  else node.attrs.push({ name, value });
}
function content(node: Element, html: string): void {
  node.childNodes = [];
  for (const child of [...parseFragment(html).childNodes])
    tree.appendChild(node, child);
}
function elements(node: Node): Element[] {
  const children =
    'childNodes' in node ? node.childNodes.flatMap(elements) : [];
  return tree.isElementNode(node) ? [node, ...children] : children;
}

/** Transformation structurelle : aucune traduction par remplacement de prose. */
export function localizedHtml(html: string, locale: Locale): string {
  const document = parse(html);
  const nodes = elements(document);
  const dict = DICTIONARIES[locale];
  const tr = (key: string): string => {
    const value = dict[key];
    if (value === undefined)
      throw new Error(`Traduction manquante : ${locale}/${key}`);
    return value;
  };
  const p = (text: string): string => `<p>${escape(text)}</p>`;
  const rows = (values: Record<string, { fr: string; en: string }>): string =>
    `<dl>${Object.entries(values)
      .map(
        ([key, value]) =>
          `<dt>${escape(tr(`project.${key}`))}</dt><dd>${escape(value[locale])}</dd>`
      )
      .join('')}</dl>`;
  const links = (
    values: { href: string; label: { fr: string; en: string } }[]
  ): string =>
    `<ul>${values.map((link) => `<li><a href="${escape(link.href)}">${escape(link.label[locale])}</a></li>`).join('')}</ul>`;
  for (const node of nodes) {
    const key = attr(node, 'data-i18n');
    if (key) content(node, escape(tr(key)));
    const aria = attr(node, 'data-i18n-aria');
    if (aria) set(node, 'aria-label', tr(aria));
    if (node.tagName === 'html') set(node, 'lang', locale);
    if (attr(node, 'id') === 'lang-toggle') {
      const other = locale === 'fr' ? 'en' : 'fr';
      set(node, 'href', LANGUAGE_PATHS[other]);
      set(node, 'hreflang', other);
      set(node, 'lang', other);
      set(node, 'aria-label', tr('lang.toggle.aria'));
      content(node, tr('lang.toggle'));
    }
    if (attr(node, 'id') === 'projects')
      content(
        node,
        `<div class="no-js-content"><h2>${escape(tr('nav.projects'))}</h2>${PROJECTS.map((project) => `<article id="${escape(project.id)}"><h3>${escape(project.name)}</h3>${p(project.thesis[locale])}${p(project.tagline[locale])}${rows(project.proof)}<ul>${project.highlights.map((item) => `<li>${escape(item[locale])}</li>`).join('')}</ul>${p(project.stack.join(' · '))}<img src="${escape(project.preview.src)}" alt="${escape(project.preview.alt[locale])}" width="1280" height="${project.preview.height}" loading="lazy" decoding="async">${links(project.links)}${project.linkNote ? p(project.linkNote[locale]) : ''}</article>`).join('')}</div>`
      );
    if (attr(node, 'id') === 'studies-list')
      content(
        node,
        `<div class="no-js-content">${CASE_STUDIES.map((study) => `<article id="${escape(study.id)}"><h3>${escape(study.name)}</h3>${p(study.status[locale])}${p(study.summary[locale])}${p(study.highlight[locale])}${rows({ problem: study.problem, role: study.role, decision: study.decision, evidence: study.evidence, limit: study.limit })}${p(study.stack.join(' · '))}<ol>${study.flow.map((step) => `<li>${escape(step[locale])}</li>`).join('')}</ol>${links(study.links)}${p(study.note[locale])}</article>`).join('')}</div>`
      );
    if (node.tagName === 'title') content(node, escape(SEO[locale].title));
    if (attr(node, 'rel') === 'canonical')
      set(node, 'href', ORIGIN + LANGUAGE_PATHS[locale]);
    if (attr(node, 'type') === 'application/ld+json') {
      node.childNodes = [];
      tree.insertText(
        node,
        JSON.stringify(personData(locale)).replace(/</g, '\\u003c')
      );
    }
  }
  const head = nodes.find((node) => node.tagName === 'head');
  if (!head) throw new Error('Gabarit sans head');
  for (const [key, value] of Object.entries(seoMeta(locale))) {
    const meta = nodes.find(
      (node) =>
        node.tagName === 'meta' &&
        (attr(node, 'name') === key || attr(node, 'property') === key)
    );
    if (meta) set(meta, 'content', value);
    else
      for (const child of [
        ...parseFragment(
          `<meta ${key.startsWith('og:') ? 'property' : 'name'}="${key}" content="${escape(value)}">`
        ).childNodes,
      ])
        tree.appendChild(head, child);
  }
  for (const language of [...LOCALES, 'x-default'] as const) {
    const href =
      ORIGIN + LANGUAGE_PATHS[language === 'x-default' ? 'fr' : language];
    for (const child of [
      ...parseFragment(
        `<link rel="alternate" hreflang="${language}" href="${href}">`
      ).childNodes,
    ])
      tree.appendChild(head, child);
  }
  return serialize(document);
}

export function localizedSitemap(): string {
  const alternates = [...LOCALES, 'x-default']
    .map(
      (locale) =>
        `<xhtml:link rel="alternate" hreflang="${locale}" href="${ORIGIN}${LANGUAGE_PATHS[locale === 'en' ? 'en' : 'fr']}"/>`
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${LOCALES.map((locale) => `<url><loc>${ORIGIN}${LANGUAGE_PATHS[locale]}</loc>${alternates}</url>`).join('')}</urlset>\n`;
}
