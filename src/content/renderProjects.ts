import { CASE_STUDIES, PROJECTS, type Project } from '@/content/projects';
import { registerDynamic, t, tl } from '@/i18n';

/**
 * Construit le seuil narratif et le DOM des chapitres depuis PROJECTS.
 *
 * Le seuil annonce les univers sans dupliquer les données projet. Chaque
 * chapitre conserve ensuite deux temps de lecture dans le même panneau
 * sémantique : contexte, puis preuve/résultat.
 */
export function renderProjects(mount: HTMLElement): void {
  const frag = document.createDocumentFragment();
  frag.appendChild(buildThreshold());
  PROJECTS.forEach((project, i) => frag.appendChild(buildChapter(project, i)));
  mount.appendChild(frag);
}

function buildThreshold(): HTMLElement {
  const threshold = document.createElement('div');
  threshold.id = 'projects-intro';
  threshold.className = 'project-threshold';

  const inner = document.createElement('div');
  inner.className = 'project-threshold__inner';

  const kicker = el('p', 'project-threshold__kicker', '');
  kicker.setAttribute('data-reveal', '');
  kicker.dataset.i18n = 'projects.threshold.kicker';

  const title = el('h2', 'project-threshold__title', '');
  title.dataset.i18n = 'projects.threshold.title';
  title.setAttribute('data-reveal', '');

  const lead = el('p', 'project-threshold__lead', '');
  lead.dataset.i18n = 'projects.threshold.lead';
  lead.setAttribute('data-reveal', '');

  const list = document.createElement('ol');
  list.className = 'project-threshold__list';
  list.dataset.i18nAria = 'projects.threshold.aria';
  list.setAttribute('aria-label', t('projects.threshold.aria'));
  list.setAttribute('data-reveal', '');

  PROJECTS.forEach((project, index) => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#${project.id}`;
    link.setAttribute('data-magnetic', '');
    link.setAttribute('data-story-focus', '');
    link.setAttribute('data-reveal', '');

    const number = el('span', 'project-threshold__number', `0${index + 1}`);
    const name = el('strong', 'project-threshold__name', project.name);
    const thesis = el('span', 'project-threshold__thesis', '');
    registerDynamic(thesis, () => tl(project.thesis));
    const arrow = el('span', 'project-threshold__arrow', '↘');
    arrow.setAttribute('aria-hidden', 'true');

    link.append(number, name, thesis, arrow);
    item.appendChild(link);
    list.appendChild(item);
  });

  inner.append(kicker, title, lead, list);
  threshold.appendChild(inner);
  return threshold;
}

function buildChapter(project: Project, index: number): HTMLElement {
  const article = document.createElement('article');
  article.className = 'chapter';
  article.id = project.id;
  article.style.setProperty('--chapter-accent', project.accent);

  const inner = document.createElement('div');
  inner.className = 'chapter__inner';
  const shell = document.createElement('div');
  shell.className = 'chapter__panel-shell';
  const panel = document.createElement('div');
  panel.className = 'chapter__panel';
  panel.setAttribute('data-reveal-panel', '');

  const context = document.createElement('div');
  context.className = 'chapter__beat chapter__beat--context';
  const outcome = document.createElement('div');
  outcome.className = 'chapter__beat chapter__beat--outcome';

  const num = `0${index + 1}`;
  const meta = el('div', 'chapter__meta', '');
  const idx = el('p', 'chapter__index', '');
  registerDynamic(idx, () => `${num} — ${t('project.label')}`);

  const status = el('span', 'chapter__status', '');
  registerDynamic(status, () => tl(project.status));
  meta.append(idx, status);

  const name = el('h3', 'chapter__name', project.name);

  const thesis = el('p', 'chapter__thesis', '');
  registerDynamic(thesis, () => tl(project.thesis));

  const tagline = el('p', 'chapter__tagline', '');
  registerDynamic(tagline, () => tl(project.tagline));

  // Hiérarchie : contexte et contribution, puis résultat ; le défi, le choix
  // technique et les preuves vérifiées sont à un clic (détail dépliable).
  const contextProof = buildProof([
    ['problem', project.proof.problem],
    ['role', project.proof.role],
  ]);
  const outcomeProof = buildProof([['result', project.proof.result]]);
  const highlights = document.createElement('ul');
  highlights.className = 'chapter__highlights';
  project.highlights.forEach((highlight) => {
    const item = el('li', '', '');
    registerDynamic(item, () => tl(highlight));
    highlights.appendChild(item);
  });
  const more = document.createElement('details');
  more.className = 'chapter__more';
  const summary = document.createElement('summary');
  summary.className = 'chapter__more-toggle';
  summary.dataset.i18n = 'project.more';
  summary.textContent = t('project.more');
  more.append(
    summary,
    buildProof([
      ['challenge', project.proof.challenge],
      ['decision', project.proof.decision],
      ['evidence', project.proof.evidence],
    ])
  );

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
  const share = document.createElement('button');
  share.type = 'button';
  share.className = 'chapter__share';
  share.dataset.i18n = 'action.share';
  share.textContent = t('action.share');
  share.setAttribute('data-magnetic', '');
  share.addEventListener('click', async () => {
    const url = new URL('#' + project.id, window.location.href).href;
    try {
      await navigator.clipboard.writeText(url);
      share.dataset.i18n = 'action.shared';
      share.textContent = t('action.shared');
      window.setTimeout(() => {
        share.dataset.i18n = 'action.share';
        share.textContent = t('action.share');
      }, 1800);
    } catch {
      window.location.hash = project.id;
    }
  });
  links.appendChild(share);

  context.append(meta, thesis, name, tagline, contextProof);
  outcome.append(outcomeProof, highlights, more, stack, links);
  panel.append(context, outcome);
  shell.appendChild(panel);
  inner.appendChild(shell);
  article.append(inner);
  return article;
}

function buildProof(
  entries: ReadonlyArray<
    readonly [
      'problem' | 'role' | 'challenge' | 'result' | 'decision' | 'evidence',
      Project['proof'][keyof Project['proof']],
    ]
  >
): HTMLDListElement {
  const proof = document.createElement('dl');
  proof.className = 'chapter__proof';

  entries.forEach(([key, value]) => {
    const item = document.createElement('div');
    item.className = 'chapter__proof-item';
    item.tabIndex = 0;
    item.dataset.storyFocus = '';
    const term = el('dt', 'chapter__proof-label', t(`project.${key}`));
    term.dataset.i18n = `project.${key}`;
    const description = el('dd', 'chapter__proof-value', '');
    registerDynamic(description, () => tl(value));
    item.append(term, description);
    proof.appendChild(item);
  });

  return proof;
}

function el(tag: string, className: string, text: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

/** Etudes de cas complementaires, rendues hors du parcours des chapitres. */
export function renderStudies(mount: HTMLElement): void {
  const frag = document.createDocumentFragment();
  CASE_STUDIES.forEach((study) => {
    const article = document.createElement('article');
    article.className = 'study';
    article.id = study.id;
    article.style.setProperty('--study-accent', study.accent);

    const head = el('header', 'study__head', '');
    const name = el('h3', 'study__name', study.name);
    const status = el('span', 'study__status', '');
    registerDynamic(status, () => tl(study.status));
    head.append(name, status);

    const rows = document.createElement('dl');
    rows.className = 'study__rows';
    (
      [
        ['problem', study.problem],
        ['role', study.role],
        ['decision', study.decision],
        ['evidence', study.evidence],
        ['limit', study.limit],
      ] as const
    ).forEach(([key, value]) => {
      const row = document.createElement('div');
      row.className = 'study__row';
      const term = el('dt', 'study__label', t(`project.${key}`));
      term.dataset.i18n = `project.${key}`;
      const description = el('dd', 'study__value', '');
      registerDynamic(description, () => tl(value));
      row.append(term, description);
      rows.appendChild(row);
    });

    const stack = document.createElement('ul');
    stack.className = 'chapter__stack';
    study.stack.forEach((tech) => stack.appendChild(el('li', '', tech)));

    const note = el('p', 'chapter__link-note', '');
    registerDynamic(note, () => tl(study.note));

    article.append(head, rows, stack, note);
    frag.appendChild(article);
  });
  mount.appendChild(frag);
}
