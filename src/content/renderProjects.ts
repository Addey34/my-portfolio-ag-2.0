import { PROJECTS, type Project } from '@/content/projects';
import { registerDynamic, t, tl } from '@/i18n';

/**
 * Construit le DOM des chapitres projet depuis la source unique PROJECTS.
 *
 * Chaque chapitre : une section plein écran avec
 *  - `.chapter__stage` : le décor immersif de l'app (monté à l'approche par
 *    chapters/ChapterManager.ts — décoratif, aria-hidden) ;
 *  - `.chapter__panel` : le texte, sur panneau translucide LISIBLE quel que
 *    soit le décor derrière (contraste garanti par le CSS, pas par la chance).
 *
 * Les textes localisés passent par `registerDynamic` : mis à jour au changement
 * de langue sans re-render (les décors restent en place).
 */
export function renderProjects(mount: HTMLElement): void {
  const frag = document.createDocumentFragment();
  PROJECTS.forEach((project, i) => frag.appendChild(buildChapter(project, i)));
  mount.appendChild(frag);
}

function buildChapter(project: Project, index: number): HTMLElement {
  const article = document.createElement('article');
  article.className = 'chapter';
  article.id = project.id;
  article.style.setProperty('--chapter-accent', project.accent);

  // Panneau texte.
  const inner = document.createElement('div');
  inner.className = 'chapter__inner';
  const panel = document.createElement('div');
  panel.className = 'chapter__panel';
  panel.setAttribute('data-reveal-panel', '');

  const num = `0${index + 1}`;
  const idx = el('p', 'chapter__index', '');
  registerDynamic(idx, () => `${num} — ${t('project.label')}`);

  const name = el('h3', 'chapter__name', project.name);

  const thesis = el('p', 'chapter__thesis', '');
  registerDynamic(thesis, () => tl(project.thesis));

  const tagline = el('p', 'chapter__tagline', '');
  registerDynamic(tagline, () => tl(project.tagline));

  const proof = document.createElement('dl');
  proof.className = 'chapter__proof';
  const proofEntries = [
    ['problem', project.proof.problem],
    ['role', project.proof.role],
    ['challenge', project.proof.challenge],
    ['result', project.proof.result],
  ] as const;
  proofEntries.forEach(([key, value]) => {
    const item = document.createElement('div');
    item.className = 'chapter__proof-item';
    const term = el('dt', 'chapter__proof-label', t(`project.${key}`));
    term.dataset.i18n = `project.${key}`;
    const description = el('dd', 'chapter__proof-value', '');
    registerDynamic(description, () => tl(value));
    item.append(term, description);
    proof.appendChild(item);
  });

  const stack = document.createElement('ul');
  stack.className = 'chapter__stack';
  project.stack.forEach((tech) => stack.appendChild(el('li', '', tech)));

  const links = document.createElement('div');
  links.className = 'chapter__links';
  project.links.forEach(({ label, href }) => {
    const a = document.createElement('a');
    a.href = href;
    a.rel = 'noopener';
    if (href.startsWith('http')) a.target = '_blank';
    a.setAttribute('data-magnetic', '');
    registerDynamic(a, () => tl(label));
    links.appendChild(a);
  });

  if (project.linkNote) {
    const note = el('p', 'chapter__link-note', '');
    registerDynamic(note, () => tl(project.linkNote!));
    links.appendChild(note);
  }

  panel.append(idx, thesis, name, tagline, proof, stack, links);
  inner.appendChild(panel);
  article.append(inner);
  return article;
}

function el(tag: string, className: string, text: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}
