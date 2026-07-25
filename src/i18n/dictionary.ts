/**
 * Dictionnaire i18n — FR / EN.
 *
 * SOURCE UNIQUE des textes d'interface. Les nœuds statiques du HTML portent un
 * attribut `data-i18n="<clé>"` ; `applyI18n` (voir ./index.ts) recopie la bonne
 * traduction dedans. Les textes de contenu (taglines projet) restent dans
 * `content/projects.ts` sous forme `{ fr, en }` — voir le type `Localized`.
 */
export type Locale = 'fr' | 'en';

export const LOCALES: Locale[] = ['fr', 'en'];

/** Une valeur de contenu déclinée par langue (pour la data, pas l'UI). */
export type Localized = Record<Locale, string>;

type Dict = Record<string, string>;

const fr: Dict = {
  'hero.tag.1': 'Full Stack',
  'hero.tag.2': 'WebGL & 3D',
  'hero.tag.3': 'Temps réel',
  'hero.cta.projects': 'Découvrir les projets',
  'hero.cta.contact': 'Travaillons ensemble',
  'hero.lead':
    'Je transforme des systèmes complexes — 3D, temps réel et données — en produits web fluides, lisibles et utilisables.',
  'intro.kicker': 'Trois systèmes, une approche',
  'intro.title':
    "Chaque projet répond à une contrainte différente. La constante : comprendre le système complet avant d'écrire la première ligne.",
  'project.label': 'Projet',
  'project.problem': 'Problème',
  'project.role': 'Mon rôle',
  'project.challenge': 'Défi',
  'project.result': 'Résultat',
  'stack.kicker': "Le système derrière l'image",
  'stack.title':
    'Une architecture pensée comme un moteur, pas comme une liste.',
  'stack.lead':
    "Interface, temps réel, données et déploiement restent reliés du prototype jusqu'à la production.",
  'contact.title': 'Un système complexe à rendre simple ?',
  'contact.lead':
    'Application ambitieuse, moteur interactif ou produit à remettre à plat : parlons de ce que nous pouvons construire.',
  'contact.cta': 'Parlons de votre projet',
  'lang.toggle': 'EN',
  'lang.toggle.aria': 'Passer le site en anglais',
  'arch.interface': 'Interface',
  'arch.realtime': 'Temps réel',
  'arch.data': 'Données',
  'arch.deploy': 'Déploiement',
  'rail.aria': 'Progression dans la page',
  'rail.stack': 'Système',
  'stack.techs': 'Technologies utilisées',
  'palette.hint': 'Commandes',
  'palette.aria': 'Ouvrir la palette de commandes',
  'palette.placeholder': 'Aller à une section, un projet, un lien…',
  'palette.empty': 'Aucun résultat.',
  'palette.group.nav': 'Navigation',
  'palette.group.projects': 'Projets',
  'palette.group.actions': 'Actions',
  'controls.title': 'Réglages visuels',
  'controls.aria': 'Ouvrir les réglages visuels',
  'controls.bg': 'Champ animé',
  'controls.mouse': 'Relief réactif',
  'controls.ambiance': 'Chapitres animés',
  'controls.intensity': 'Intensité du fond',
  'nav.hero': 'Haut de page',
  'nav.content': 'Aller au contenu',
  'nav.intro': 'À propos',
  'nav.projects': 'Projets',
  'nav.contact': 'Contact',
  'action.lang': 'Basculer FR / EN',
  'action.github': 'Ouvrir GitHub',
  'action.linkedin': 'Ouvrir LinkedIn',
  'action.email': 'Envoyer un email',
};

const en: Dict = {
  'hero.tag.1': 'Full Stack',
  'hero.tag.2': 'WebGL & 3D',
  'hero.tag.3': 'Real-time',
  'hero.cta.projects': 'Explore the projects',
  'hero.cta.contact': "Let's work together",
  'hero.lead':
    'I turn complex systems — 3D, real-time and data — into web products that feel fast, clear and usable.',
  'intro.kicker': 'Three systems, one approach',
  'intro.title':
    'Each project answers a different constraint. The constant: understanding the full system before writing the first line.',
  'project.label': 'Project',
  'project.problem': 'Problem',
  'project.role': 'My role',
  'project.challenge': 'Challenge',
  'project.result': 'Result',
  'stack.kicker': 'The system behind the image',
  'stack.title': 'A stack designed as an engine, not a checklist.',
  'stack.lead':
    'Interface, real-time systems, data and delivery stay connected from prototype to production.',
  'contact.title': 'A complex system that needs to feel simple?',
  'contact.lead':
    "An ambitious application, an interactive engine or a product to rethink: let's talk about what we can build.",
  'contact.cta': 'Tell me about your project',
  'lang.toggle': 'FR',
  'lang.toggle.aria': 'Switch the site to French',
  'arch.interface': 'Interface',
  'arch.realtime': 'Real-time',
  'arch.data': 'Data',
  'arch.deploy': 'Deploy',
  'rail.aria': 'Progress through the page',
  'rail.stack': 'System',
  'stack.techs': 'Technologies used',
  'palette.hint': 'Commands',
  'palette.aria': 'Open command palette',
  'palette.placeholder': 'Jump to a section, a project, a link…',
  'palette.empty': 'No results.',
  'palette.group.nav': 'Navigation',
  'palette.group.projects': 'Projects',
  'palette.group.actions': 'Actions',
  'controls.title': 'Visual settings',
  'controls.aria': 'Open visual settings',
  'controls.bg': 'Animated field',
  'controls.mouse': 'Reactive contours',
  'controls.ambiance': 'Animated chapters',
  'controls.intensity': 'Background intensity',
  'nav.hero': 'Top of page',
  'nav.content': 'Skip to content',
  'nav.intro': 'About',
  'nav.projects': 'Projects',
  'nav.contact': 'Contact',
  'action.lang': 'Toggle FR / EN',
  'action.github': 'Open GitHub',
  'action.linkedin': 'Open LinkedIn',
  'action.email': 'Send an email',
};

export const DICTIONARIES: Record<Locale, Dict> = { fr, en };
