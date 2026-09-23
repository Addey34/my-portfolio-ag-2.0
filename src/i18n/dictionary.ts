/**
 * Dictionnaire i18n - FR / EN.
 *
 * SOURCE UNIQUE des textes d'interface. Les noeuds statiques du HTML portent un
 * attribut `data-i18n="<cle>"` ; `applyI18n` (voir ./index.ts) recopie la bonne
 * traduction dedans. Les textes de contenu (taglines projet) restent dans
 * `content/projects.ts` sous forme `{ fr, en }` - voir le type `Localized`.
 */
export type Locale = 'fr' | 'en';

export const LOCALES: Locale[] = ['fr', 'en'];

/** Une valeur de contenu declinee par langue (pour la data, pas l'UI). */
export type Localized = Record<Locale, string>;

type Dict = Record<string, string>;

const fr: Dict = {
  'hero.tag.1': 'Product builder',
  'hero.tag.2': 'Full-stack TypeScript',
  'hero.tag.3': 'WebGL & temps réel',
  'hero.cta.projects': 'Explorer les produits',
  'hero.cta.contact': 'Parler d’un projet',
  'hero.lead':
    'Je construis des produits web complets : interfaces nettes, données utiles, temps réel et déploiement.',
  'intro.kicker': 'Des produits réels, pas seulement des écrans',
  'intro.title':
    'Je pars d’un usage et je construis le système qui le rend simple, fiable et vivant.',
  'project.label': 'Étude de cas',
  'project.problem': 'Contexte',
  'project.role': 'Contribution',
  'project.challenge': 'Défi technique',
  'project.result': 'Résultat',
  'stack.kicker': 'La méthode derrière le produit',
  'stack.title': 'Une architecture lisible, du premier écran au déploiement.',
  'stack.lead':
    'Je relie produit, interface, données et infrastructure pour que chaque décision serve l’usage.',
  'freelance.kicker': 'Intervenir là où le produit bloque',
  'freelance.title': 'Construire la bonne brique.',
  'freelance.lead':
    'J’interviens sur une séquence précise : cadrer, construire, fiabiliser ou livrer, avec un résultat visible à chaque étape.',
  'freelance.card.product.title': 'Du problème au MVP',
  'freelance.card.product.text':
    'Cadrage, parcours utilisateur et première version utile : je transforme une idée en produit testable, sans surconstruire.',
  'freelance.card.system.title': 'Une base qui tient',
  'freelance.card.system.text':
    'Frontend TypeScript, API, base de données, authentification et déploiement : les briques sont pensées ensemble pour rester maintenables.',
  'freelance.card.automation.title': 'Des données utiles',
  'freelance.card.automation.text':
    'Je transforme des données dispersées en flux fiables, comparateurs et interfaces qui aident vraiment à décider.',
  'freelance.card.delivery.title': 'Livrer sans perdre le fil',
  'freelance.card.delivery.text':
    'J’utilise l’IA pour accélérer la conception et la production, avec validation humaine sur l’architecture, la sécurité et la qualité.',
  'projects.threshold.kicker': 'Sélection actuelle',
  'projects.threshold.title': 'Des produits choisis pour leurs systèmes.',
  'projects.threshold.lead':
    'Trois terrains sont mis en lumière ici — 3D, temps réel et produit full-stack. D’autres travaux viendront compléter la sélection.',
  'projects.threshold.aria': 'Explorer les produits',
  'contact.kicker': 'Construisons quelque chose d’utile',
  'contact.title': 'Un produit à lancer ?',
  'contact.lead':
    'Parle-moi de l’usage, du problème et du niveau d’avancement. Je t’aiderai à trouver la prochaine bonne brique.',
  'contact.cta': 'Écrire à Adrian',
  'contact.form.open': 'Déplier le formulaire',
  'contact.form.close': 'Replier le formulaire',
  'contact.form.label': 'Contact / brief',
  'contact.form.name': 'Nom',
  'contact.form.email': 'Email',
  'contact.form.message': 'Projet ou contexte',
  'contact.form.submit': 'Préparer le message',
  'contact.form.note': 'Le message s’ouvrira dans ton client email.',
  'contact.signal.1': 'Sélection actuelle',
  'contact.signal.2': 'Du produit au déploiement',
  'contact.signal.3': 'Échange direct par email',
  'lang.toggle': 'EN',
  'lang.toggle.aria': 'Passer le site en anglais',
  'arch.interface': 'Interface',
  'arch.realtime': 'Temps réel',
  'arch.data': 'Données',
  'arch.deploy': 'Déploiement',
  'arch.hover': 'Points secondaires : survoler pour explorer',
  'rail.aria': 'Progression dans la page',
  'rail.stack': 'Système',
  'stack.techs': 'Technologies utilisées',
  'palette.hint': 'Commandes',
  'palette.aria': 'Ouvrir la palette de commandes',
  'palette.placeholder': 'Aller à une section, un projet, un lien...',
  'palette.empty': 'Aucun résultat.',
  'palette.group.nav': 'Navigation',
  'palette.group.projects': 'Produits',
  'palette.group.actions': 'Actions',
  'controls.title': 'Réglages visuels',
  'controls.aria': 'Ouvrir les réglages visuels',
  'controls.bg': 'Champ animé',
  'controls.mouse': 'Relief réactif',
  'controls.ambiance': 'Chapitres animés',
  'controls.intensity': 'Intensité du fond',
  'nav.hero': 'Haut de page',
  'nav.content': 'Aller au contenu',
  'nav.intro': 'Approche',
  'nav.freelance': 'Solutions',
  'nav.projects': 'Produits',
  'nav.contact': 'Contact',
  'action.lang': 'Basculer FR / EN',
  'action.github': 'Ouvrir GitHub',
  'action.linkedin': 'Ouvrir LinkedIn',
  'action.email': 'Envoyer un email',
  'action.share': 'Partager l’étude',
  'action.shared': 'Lien copié',
  'freelance.card.product.note': 'Clarifier → prioriser → livrer.',
  'freelance.card.system.note': 'Interface → API → données → déploiement.',
  'freelance.card.automation.note': 'Collecter → nettoyer → décider.',
  'freelance.card.delivery.note': 'Vitesse, clarté, qualité.',
};

const en: Dict = {
  'hero.tag.1': 'Product builder',
  'hero.tag.2': 'Full-stack TypeScript',
  'hero.tag.3': 'WebGL & real-time',
  'hero.cta.projects': 'Explore the products',
  'hero.cta.contact': 'Discuss a project',
  'hero.lead':
    'I build complete web products: clear interfaces, useful data, real-time systems and deployment.',
  'intro.kicker': 'Real products, not just screens',
  'intro.title':
    'I start with a use case and build the system that makes it simple, reliable and alive.',
  'project.label': 'Case study',
  'project.problem': 'Context',
  'project.role': 'Contribution',
  'project.challenge': 'Technical challenge',
  'project.result': 'Result',
  'stack.kicker': 'The method behind the product',
  'stack.title': 'A readable architecture, from first screen to deployment.',
  'stack.lead':
    'I connect product, interface, data and infrastructure so every decision serves the use case.',
  'freelance.kicker': 'Where the product gets stuck',
  'freelance.title': 'Build the right brick.',
  'freelance.lead':
    'I step into a specific sequence: frame, build, harden or ship, with a visible result at each stage.',
  'freelance.card.product.title': 'From problem to MVP',
  'freelance.card.product.text':
    'Framing, user flows and a useful first version: I turn an idea into a testable product without overbuilding it.',
  'freelance.card.system.title': 'A foundation that holds',
  'freelance.card.system.text':
    'TypeScript frontend, API, database, authentication and deployment: each brick is designed to work together and stay maintainable.',
  'freelance.card.automation.title': 'Useful data',
  'freelance.card.automation.text':
    'Scraping, price comparison, API orchestration, extraction, cleaning and control interfaces.',
  'freelance.card.delivery.title': 'Ship without losing the thread',
  'freelance.card.delivery.text':
    'I use AI to accelerate design and production, with human validation on architecture, security and quality.',
  'projects.threshold.kicker': 'Current selection',
  'projects.threshold.title': 'Products chosen for their systems.',
  'projects.threshold.lead':
    'Three terrains are in focus here — 3D, real-time systems and full-stack product work. More projects will join the selection later.',
  'projects.threshold.aria': 'Explore the products',
  'contact.kicker': 'Let’s build something useful',
  'contact.title': 'A product to launch?',
  'contact.lead':
    'Tell me about the use case, the problem and the current stage. I’ll help find the next right brick.',
  'contact.cta': 'Write to Adrian',
  'contact.form.open': 'Open the contact form',
  'contact.form.close': 'Close the contact form',
  'contact.form.label': 'Contact / brief',
  'contact.form.name': 'Name',
  'contact.form.email': 'Email',
  'contact.form.message': 'Project or context',
  'contact.form.submit': 'Prepare the message',
  'contact.form.note': 'The message will open in your email client.',
  'contact.signal.1': 'Current selection',
  'contact.signal.2': 'From product to deployment',
  'contact.signal.3': 'Direct email conversation',
  'lang.toggle': 'FR',
  'lang.toggle.aria': 'Switch the site to French',
  'arch.interface': 'Interface',
  'arch.realtime': 'Real-time',
  'arch.data': 'Data',
  'arch.deploy': 'Deploy',
  'arch.hover': 'Secondary points: hover to explore',
  'rail.aria': 'Progress through the page',
  'rail.stack': 'System',
  'stack.techs': 'Technologies used',
  'palette.hint': 'Commands',
  'palette.aria': 'Open command palette',
  'palette.placeholder': 'Jump to a section, a project, a link...',
  'palette.empty': 'No results.',
  'palette.group.nav': 'Navigation',
  'palette.group.projects': 'Products',
  'palette.group.actions': 'Actions',
  'controls.title': 'Visual settings',
  'controls.aria': 'Open visual settings',
  'controls.bg': 'Animated field',
  'controls.mouse': 'Reactive contours',
  'controls.ambiance': 'Animated chapters',
  'controls.intensity': 'Background intensity',
  'nav.hero': 'Top of page',
  'nav.content': 'Skip to content',
  'nav.intro': 'Approach',
  'nav.freelance': 'Solutions',
  'nav.projects': 'Products',
  'nav.contact': 'Contact',
  'action.lang': 'Toggle FR / EN',
  'action.github': 'Open GitHub',
  'action.linkedin': 'Open LinkedIn',
  'action.email': 'Send an email',
  'action.share': 'Share this case study',
  'action.shared': 'Link copied',
  'freelance.card.product.note': 'Clarify → prioritise → ship.',
  'freelance.card.system.note': 'Interface → API → data → deployment.',
  'freelance.card.automation.note': 'Collect → clean → decide.',
  'freelance.card.delivery.note': 'Speed, clarity, quality.',
};

export const DICTIONARIES: Record<Locale, Dict> = { fr, en };
