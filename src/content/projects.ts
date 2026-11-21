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
  note: Localized;
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'siteguardian',
    name: 'SiteGuardian',
    status: { fr: 'Pilote technique', en: 'Technical pilot' },
    accent: '#ffb35f',
    summary: {
      fr: 'Un outil de surveillance qui dit quoi faire, pas seulement ce qui est cassé.',
      en: 'A monitoring tool that says what to do, not just what is broken.',
    },
    highlight: {
      fr: '194 tests documentés · sonde publique datée',
      en: '194 documented tests · dated public probe',
    },
    problem: {
      fr: 'Surveiller les sites livrés, détecter les incidents et transformer les anomalies techniques en actions compréhensibles pour les freelances et petites agences.',
      en: 'Monitor delivered websites, detect incidents and turn technical anomalies into understandable actions for freelancers and small agencies.',
    },
    role: {
      fr: 'Conception produit, interface, API, logique de surveillance et déploiement.',
      en: 'Product design, interface, API, monitoring logic and deployment.',
    },
    decision: {
      fr: 'Un incident ne se résout qu’après une revisite saine de l’URL : séparer prise en compte et résolution évite de clore une panne qui existe encore.',
      en: 'An incident only resolves after a healthy revisit of the URL: separating acknowledgement from resolution avoids closing an outage that still exists.',
    },
    evidence: {
      fr: '194 tests documentés (01/09/2026) · smoke public quotidien vert, dernier 14/10/2026 · Stripe en mode test validé (28/08/2026). Aucun client payant confirmé.',
      en: '194 documented tests (1 Sep 2026) · daily public smoke check green, latest 14 Oct 2026 · Stripe test mode validated (28 Aug 2026). No paying customer confirmed.',
    },
    limit: {
      fr: 'Sessions en mémoire, workers largement séquentiels, protection réseau à renforcer, aucun test de charge.',
      en: 'In-memory sessions, mostly sequential workers, network protection to harden, no load testing.',
    },
    stack: [
      'TypeScript',
      'Vite',
      'Node.js',
      'PostgreSQL',
      'Playwright',
      'Stripe',
    ],
    note: {
      fr: 'Code privé ; présentation sans données ni configuration d’exploitation.',
      en: 'Private code; presented without data or operating configuration.',
    },
  },
  {
    id: 'imagegeneratorlocal',
    name: 'ImageGeneratorLocal',
    status: { fr: 'En développement', en: 'In development' },
    accent: '#a78bfa',
    summary: {
      fr: 'Installer et orchestrer des modèles de génération d’images sur son propre ordinateur.',
      en: 'Install and orchestrate image generation models on your own computer.',
    },
    highlight: {
      fr: 'Runtimes Windows vérifiés au téléchargement · calcul CUDA testé',
      en: 'Windows runtime downloads verified · CUDA compute tested',
    },
    problem: {
      fr: 'Générer des images par IA sur son propre ordinateur, sans dépendre d’un serveur GPU hébergé.',
      en: 'Generate AI images on your own computer, without depending on a hosted GPU server.',
    },
    role: {
      fr: 'Conception de l’application et de l’orchestration autour de modèles existants : tâches, agents, mémoire, installation.',
      en: 'Design of the application and orchestration around existing models: jobs, agents, memory, installation.',
    },
    decision: {
      fr: 'Un lanceur léger télécharge le runtime adapté au matériel, sans imposer le paquet CUDA à toutes les machines.',
      en: 'A small launcher downloads the runtime suited to the hardware, without forcing the CUDA package onto every machine.',
    },
    evidence: {
      fr: 'Runtimes Windows CUDA, CPU et DirectML validés au téléchargement (signatures, empreintes) ; calcul CUDA vérifié sur RTX 5070 Ti (WSL2). Aucun benchmark publié.',
      en: 'Windows CUDA, CPU and DirectML runtimes validated on download (signatures, checksums); CUDA compute verified on an RTX 5070 Ti (WSL2). No benchmark published.',
    },
    limit: {
      fr: 'Modèles tiers (non créés ici) ; génération non certifiée sur toutes les architectures GPU ; usage réel inconnu.',
      en: 'Third-party models (not created here); generation not certified on every GPU architecture; real usage unknown.',
    },
    stack: ['Python', 'FastAPI', 'PyTorch', 'Diffusers', 'TypeScript'],
    note: {
      fr: 'Code privé ; présentation sans comptes, chemins ni configuration privée.',
      en: 'Private code; presented without accounts, paths or private configuration.',
    },
  },
];
