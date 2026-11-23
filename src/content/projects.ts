import type { Localized } from '@/i18n/dictionary';

/**
 * Catalogue des projets - SOURCE UNIQUE.
 *
 * Le DOM des sections, la navigation, la palette de commandes et les chapitres
 * animes se derivent de ce tableau. Chaque entree contient aussi une mini etude
 * de cas factuelle : probleme, role, defi et resultat.
 */
export interface Project {
  id: string;
  name: string;
  status: Localized;
  visual: 'immersive' | 'generic';
  tagline: Localized;
  /** Idee directrice du chapitre dans la progression globale. */
  thesis: Localized;
  proof: {
    problem: Localized;
    role: Localized;
    challenge: Localized;
    result: Localized;
    /** Choix technique assumé, et ce qu'il évite. */
    decision: Localized;
    /** Preuves vérifiables uniquement ; mentionner les limites connues. */
    evidence: Localized;
  };
  /** Trois faits vérifiés, affichés en puces sous le résultat. */
  highlights: Localized[];
  stack: string[];
  links: { label: Localized; href: string; kind?: 'demo' }[];
  preview: { src: string; height: number; alt: Localized };
  /** Precision honnete lorsque le code ou une demo ne sont pas publics. */
  linkNote?: Localized;
  accent: string;
  chapter: string;
}

const demo: Localized = { fr: 'Voir la démo', en: 'Open live demo' };
const code: Localized = { fr: 'Code source', en: 'Source code' };
const showcase: Localized = {
  fr: 'Présentation technique',
  en: 'Technical overview',
};
const live: Localized = { fr: 'Démo en ligne', en: 'Live demo' };

export const PROJECTS: Project[] = [
  {
    id: 'galaxy',
    name: 'Galaxy',
    status: live,
    visual: 'immersive',
    thesis: {
      fr: "Rendre l'immensité navigable.",
      en: 'Making immensity navigable.',
    },
    tagline: {
      fr: 'Un système solaire navigable en temps réel, fondé sur des éphémérides astronomiques et plusieurs niveaux de détail.',
      en: 'A real-time navigable solar system built on astronomical ephemerides and multiple levels of detail.',
    },
    proof: {
      problem: {
        fr: 'Représenter des distances et des données astronomiques sans perdre la lisibilité.',
        en: 'Represent astronomical distances and data without losing clarity.',
      },
      role: {
        fr: 'Conception du moteur 3D, de la navigation et de la stratégie de rendu.',
        en: '3D engine, navigation and rendering strategy design.',
      },
      challenge: {
        fr: 'Faire cohabiter échelle vraie, éphémérides et textures de 1K à 8K en temps réel.',
        en: 'Combining true scale, ephemerides and 1K-to-8K textures in real time.',
      },
      result: {
        fr: 'Une exploration progressive du système solaire, du panorama à la surface des planètes.',
        en: 'A progressive solar-system journey, from the overview down to planetary surfaces.',
      },
      decision: {
        fr: 'Échelle réelle en exploration ; distances compressées en mode pédagogique pour garder les corps visibles.',
        en: 'True scale in exploration; compressed distances in educational mode keep bodies visible.',
      },
      evidence: {
        fr: 'NASA/JPL Horizons, astronomy-engine et éléments orbitaux : sources et précision comparée à Horizons documentées. Pas de mesure FPS publiée.',
        en: 'NASA/JPL Horizons, astronomy-engine and orbital elements: sources and accuracy compared with Horizons are documented. No FPS measurement published.',
      },
    },
    highlights: [
      {
        fr: 'Sources astronomiques documentées',
        en: 'Documented astronomical sources',
      },
      { fr: 'Voyage temporel', en: 'Time travel' },
      { fr: 'Code source public', en: 'Public source code' },
    ],
    stack: ['TypeScript', 'Three.js', 'astronomy-engine', 'Playwright', 'Vite'],
    links: [
      { kind: 'demo', label: demo, href: 'https://galaxy.adrianguichard.dev/' },
      { label: code, href: 'https://github.com/Addey34/galaxy-3d' },
      {
        label: { fr: 'Méthodologie', en: 'Methodology' },
        href: 'https://galaxy.adrianguichard.dev/methodology/',
      },
    ],
    accent: '#e7b95c',
    preview: {
      src: '/galaxy-preview.jpg',
      height: 800,
      alt: {
        fr: 'Vue du système solaire interactif Galaxy.',
        en: 'View of the interactive Galaxy solar system.',
      },
    },
    chapter: 'galaxy',
  },
  {
    id: 'ludora',
    name: 'Ludora',
    status: live,
    visual: 'immersive',
    thesis: {
      fr: 'Des jeux singuliers, une mécanique commune.',
      en: 'Distinct games, one shared system.',
    },
    tagline: {
      fr: 'Un catalogue de jeux en évolution, avec moteurs partagés, multijoueur et progression commune.',
      en: 'An evolving game catalogue with shared engines, multiplayer and common progression.',
    },
    proof: {
      problem: {
        fr: "Réunir des dizaines de gameplays sans dupliquer toute l'infrastructure.",
        en: 'Bring dozens of gameplays together without duplicating the entire infrastructure.',
      },
      role: {
        fr: 'Architecture Vite MPA, moteur temps réel, PWA et intégration Nakama.',
        en: 'Vite MPA architecture, real-time engine, PWA and Nakama integration.',
      },
      challenge: {
        fr: 'Isoler chaque jeu tout en partageant profil, défis, scores et multijoueur.',
        en: 'Isolate every game while sharing profiles, challenges, scores and multiplayer.',
      },
      result: {
        fr: 'Un catalogue cohérent avec défis quotidiens, classement mondial et modes connectés.',
        en: 'A cohesive catalogue with daily challenges, global rankings and connected modes.',
      },
      decision: {
        fr: 'Un jeu = une page isolée ; profils, scores et progression via une couche partagée.',
        en: 'One game = one isolated page; profiles, scores and progression through a shared layer.',
      },
      evidence: {
        fr: 'Création et lancement de salons testés ; parties complètes validées sur un échantillon. Pas de chiffres d’usage.',
        en: 'Room creation and launch tested; full matches validated on a sample. No usage figures.',
      },
    },
    highlights: [
      { fr: 'Catalogue en évolution', en: 'Evolving catalogue' },
      {
        fr: 'Création et lancement de salons testés',
        en: 'Room creation and launch tested',
      },
      { fr: 'Vitrine technique publique', en: 'Public technical overview' },
    ],
    stack: ['TypeScript', 'Vite MPA', 'Nakama', 'Canvas', 'PWA'],
    links: [
      { kind: 'demo', label: demo, href: 'https://ludora.adrianguichard.dev/' },
      { label: showcase, href: 'https://github.com/Addey34/ludora-showcase' },
    ],
    linkNote: {
      fr: 'Code client et serveur privés ; vitrine technique publique, architecture présentée ici.',
      en: 'Client and server code are private; public technical overview, architecture presented here.',
    },
    accent: '#7dd3fc',
    preview: {
      src: '/ludora-preview.jpg',
      height: 800,
      alt: { fr: 'Catalogue de jeux de Ludora.', en: 'Ludora game catalogue.' },
    },
    chapter: 'ludora',
  },
  {
    id: 'magnotes',
    name: 'MagNotes',
    status: live,
    visual: 'immersive',
    thesis: {
      fr: 'Des idées libres, une structure commune.',
      en: 'Free ideas, one shared structure.',
    },
    tagline: {
      fr: 'Un espace de travail visuel qui transforme les mêmes notes en canvas, Kanban, agenda ou timeline.',
      en: 'A visual workspace that turns the same notes into a canvas, Kanban, calendar or timeline.',
    },
    proof: {
      problem: {
        fr: 'Organiser des idées sans effacer les relations spatiales qui leur donnent du sens.',
        en: 'Organise ideas without erasing the spatial relationships that give them meaning.',
      },
      role: {
        fr: 'Produit full-stack React/Node, modèle MongoDB, interactions et déploiement.',
        en: 'Full-stack React/Node product, MongoDB model, interactions and deployment.',
      },
      challenge: {
        fr: 'Synchroniser canvas infini, liens et vues structurées autour des mêmes données.',
        en: 'Synchronise an infinite canvas, links and structured views around the same data.',
      },
      result: {
        fr: "Un produit conteneurisé avec Docker et déployé sur Oracle Cloud, du stockage à l'interface.",
        en: 'A product containerised with Docker and deployed on Oracle Cloud, from storage to interface.',
      },
      decision: {
        fr: 'Une seule source de notes pour canvas, Kanban, agenda et timeline.',
        en: 'A single source of notes for canvas, Kanban, calendar and timeline.',
      },
      evidence: {
        fr: 'Tests E2E Playwright + audit axe, démo locale sans backend, contrôle de production vert le 14/10/2026. Utilisateurs non mesurés.',
        en: 'Playwright E2E tests + axe audit, local demo without backend, production check green on 14 Oct 2026. Users not measured.',
      },
    },
    highlights: [
      {
        fr: 'Canvas, Kanban, agenda, timeline',
        en: 'Canvas, Kanban, calendar, timeline',
      },
      { fr: 'Tests E2E et audit axe', en: 'E2E tests and axe audit' },
      {
        fr: 'Contrôle de production documenté',
        en: 'Documented production check',
      },
    ],
    stack: ['React', 'TypeScript', 'MongoDB', 'Docker', 'Node'],
    links: [
      {
        kind: 'demo',
        label: demo,
        href: 'https://magnotes.adrianguichard.dev/',
      },
      { label: code, href: 'https://github.com/Addey34/magnotes-frontend' },
    ],
    linkNote: {
      fr: 'Backend privé ; frontend public et architecture détaillés ici.',
      en: 'Private backend; public frontend and architecture detailed here.',
    },
    accent: '#f0a6d8',
    preview: {
      src: '/magnotes-preview.jpg',
      height: 704,
      alt: {
        fr: 'Tableau de notes dans la vue canvas de MagNotes.',
        en: 'A notes board in the MagNotes canvas view.',
      },
    },
    chapter: 'magnotes',
  },
];

/**
 * Etudes de cas complementaires : projets prives presentes sans code ni
 * donnees d'exploitation, hors du parcours principal. Chaque affirmation doit
 * rester verifiable et datee ; ne rien ajouter qui ne soit constate.
 */
export interface CaseStudy {
  id: string;
  name: string;
  status: Localized;
  accent: string;
  summary: Localized;
  highlight: Localized;
  problem: Localized;
  role: Localized;
  decision: Localized;
  evidence: Localized;
  limit: Localized;
  stack: string[];
  flow: Localized[];
  links: Project['links'];
  note: Localized;
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'siteguardian',
    name: 'SiteGuardian',
    status: { fr: 'Pilote contrôlé', en: 'Controlled pilot' },
    accent: '#ffb35f',
    summary: {
      fr: 'Transformer une anomalie sur un site en correction vérifiable, pour les freelances et petites agences.',
      en: 'Turn a website anomaly into a verifiable fix, for freelancers and small agencies.',
    },
    highlight: {
      fr: 'Cycle d’incident validé le 1 septembre 2026 · preuve historique, pas un statut de santé actuel.',
      en: 'Incident lifecycle validated on 1 September 2026 · historical evidence, not a current health status.',
    },
    problem: {
      fr: 'Une alerte seule ne dit ni quelle page corriger, ni si la correction a réellement rétabli le service.',
      en: 'An alert alone says neither which page needs fixing nor whether the fix actually restored service.',
    },
    role: {
      fr: 'Conception produit et réalisation de l’interface, de l’API, de la persistance et du cycle des incidents. Frontend Vite sur Cloudflare Pages ; API Node.js et PostgreSQL sur Oracle Cloud.',
      en: 'Product design and implementation of the interface, API, persistence and incident lifecycle. Vite frontend on Cloudflare Pages; Node.js API and PostgreSQL on Oracle Cloud.',
    },
    decision: {
      fr: 'Reconnaître un incident ne le résout pas. Seule une nouvelle vérification saine de la page concernée confirme le rétablissement.',
      en: 'Acknowledging an incident does not resolve it. Only a fresh, healthy check of the affected page confirms recovery.',
    },
    evidence: {
      fr: 'Code et tests distinguent prise en compte, résolution et régression : un scan partiel ne clôt pas les incidents des pages non revisitées. Le scénario panne → rétablissement → régression est documenté au 01/09/2026. La validation du 02/09/2026 rapporte 260 tests et les builds frontend/API réussis. Rapports partagés révocables et PDF authentifiés sont implémentés.',
      en: 'Code and tests distinguish acknowledgement, resolution and regression: a partial scan cannot close incidents on pages it did not revisit. The failure → recovery → regression scenario is documented on 1 Sep 2026. Validation on 2 Sep 2026 records 260 passing tests and frontend/API builds. Revocable shared reports and authenticated PDFs are implemented.',
    },
    limit: {
      fr: 'Pilote sur des sites autorisés, notifications contrôlées. La démo publique utilise des données fictives, sans scan réseau. Ces validations datées ne constituent ni une garantie de disponibilité actuelle ni une qualification à grande échelle.',
      en: 'Pilot on authorised sites, with controlled notifications. The public demo uses fictional data, without network scans. Dated validations establish neither current availability nor qualification at scale.',
    },
    stack: ['TypeScript', 'Vite', 'Node.js', 'PostgreSQL', 'Playwright'],
    flow: [
      { fr: 'Site autorisé', en: 'Authorised site' },
      { fr: 'Constat + preuve', en: 'Finding + evidence' },
      { fr: 'Notification contrôlée', en: 'Controlled notification' },
      { fr: 'Prise en compte', en: 'Acknowledgement' },
      { fr: 'Nouvelle vérification', en: 'Fresh check' },
      { fr: 'Résolution ou régression', en: 'Resolution or regression' },
    ],
    links: [
      {
        label: {
          fr: 'Explorer la démo fictive',
          en: 'Explore the fictional demo',
        },
        href: 'https://siteguardian.adrianguichard.dev/',
      },
    ],
    note: {
      fr: 'Sources privées examinées ; aucun code, donnée client ou paramètre d’exploitation publié ici.',
      en: 'Private sources reviewed; no code, customer data or operating settings published here.',
    },
  },
  {
    id: 'imagegeneratorlocal',
    name: 'AIGen',
    status: { fr: 'Produit en développement', en: 'Product in development' },
    accent: '#a78bfa',
    summary: {
      fr: 'Relier une interface web à un moteur d’IA sur son ordinateur : installer, choisir le runtime et orchestrer les tâches.',
      en: 'Connect a web interface to an AI engine on your computer: install, select a runtime and orchestrate jobs.',
    },
    highlight: {
      fr: 'Lanceur Windows 386 publié · image réelle 512 × 512 obtenue sur CPU dans une VM Windows 11, avec un site de test local.',
      en: 'Windows launcher 386 published · a real 512 × 512 image obtained on CPU in a Windows 11 VM, using a local test site.',
    },
    problem: {
      fr: 'L’accès aux modèles ne suffit pas : il faut installer leurs dépendances, choisir un moteur compatible et relier calcul local et interface.',
      en: 'Access to models is not enough: dependencies must be installed, a compatible engine selected and local compute connected to the interface.',
    },
    role: {
      fr: 'Conception de l’application et de l’orchestration : API FastAPI, tâches persistantes, association navigateur–agent et distribution des runtimes PyTorch/Diffusers. Les modèles utilisés sont tiers, pas entraînés dans ce projet.',
      en: 'Application and orchestration design: FastAPI API, persistent jobs, browser–agent pairing and PyTorch/Diffusers runtime distribution. Models are third-party, not trained in this project.',
    },
    decision: {
      fr: 'Séparer le petit lanceur, le runtime adapté au matériel et les modèles. Chaque machine télécharge son moteur sans imposer CUDA à tout le monde.',
      en: 'Separate the small launcher, hardware-specific runtime and models. Each machine downloads its engine without imposing CUDA on everyone.',
    },
    evidence: {
      fr: 'Le 22/11/2026, le lanceur publié 386 a produit une image réelle 512 × 512 avec DreamShaper LCM dans une VM Windows 11 restaurée à un état vierge, sans GPU. Du clic à l’image : environ 828 s, démarrage du moteur et téléchargements compris. Le site était construit localement et son navigateur tournait sur le PC de test ; le calcul CPU était effectué dans la VM. Le 23/11/2026, un second essai local a vérifié le téléchargement de l’original et sa réouverture en PNG 512 × 512. Le code vérifie les manifestes de runtimes signés Ed25519 et les empreintes des fichiers.',
      en: 'On 22 Nov 2026, published launcher 386 produced a real 512 × 512 image with DreamShaper LCM in a Windows 11 VM restored to a clean snapshot, without a GPU. From click to image: about 828 s, including engine startup and downloads. The site was built locally and its browser ran on the test PC; CPU computation ran in the VM. On 23 Nov 2026, a second local run verified downloading the original and reopening it as a 512 × 512 PNG. Code verifies Ed25519-signed runtime manifests and file checksums.',
    },
    limit: {
      fr: 'Ces essais locaux ne qualifient pas le service public ni toutes les installations ou tous les GPU. Lors du second essai, l’indication de présence du modèle est restée périmée après l’image. Les nouvelles étapes de progression ne sont pas intégrées au lanceur 386 publié. Vidéo, audio et DirectML restent à qualifier selon le matériel. Installateur sans signature Authenticode ; calcul cloud optionnel désactivé par défaut. En mode hébergé, demandes et résultats transitent par le serveur.',
      en: 'These local runs do not qualify the public service, every installation or every GPU. In the second run, the model availability notice remained stale after the image. The new progress stages are not included in published launcher 386. Video, audio and DirectML still need hardware-specific qualification. Installer without an Authenticode signature; optional cloud compute is disabled by default. In hosted mode, requests and results pass through the server.',
    },
    stack: ['Python', 'FastAPI', 'PyTorch', 'Diffusers', 'TypeScript'],
    flow: [
      { fr: 'Navigateur', en: 'Browser' },
      { fr: 'API + tâches persistantes', en: 'API + persistent jobs' },
      { fr: 'Agent local associé', en: 'Paired local agent' },
      { fr: 'Runtime + modèles tiers', en: 'Runtime + third-party models' },
    ],
    links: [
      {
        label: {
          fr: 'Consulter l’interface publique',
          en: 'View the public interface',
        },
        href: 'https://app.adrianguichard.dev/',
      },
    ],
    note: {
      fr: 'AIGen est le nom produit ; l’ancre historique imagegeneratorlocal est conservée. Dépôt privé, sans lien public vers son code.',
      en: 'AIGen is the product name; the historical imagegeneratorlocal anchor is retained. Private repository, with no public code link.',
    },
  },
];
