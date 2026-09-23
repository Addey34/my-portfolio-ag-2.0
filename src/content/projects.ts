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
  };
  stack: string[];
  links: { label: Localized; href: string }[];
  /** Precision honnete lorsque le code ou une demo ne sont pas publics. */
  linkNote?: Localized;
  accent: string;
  chapter: string;
}

const demo: Localized = { fr: 'Démo', en: 'Live' };
const code: Localized = { fr: 'Code source', en: 'Source code' };
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
    },
    stack: ['TypeScript', 'Three.js', 'astronomy-engine', 'Playwright', 'Vite'],
    links: [
      { label: demo, href: 'https://galaxy.adrianguichard.dev/' },
      { label: code, href: 'https://github.com/Addey34/galaxy-3d' },
    ],
    accent: '#4a8fff',
    chapter: 'galaxy',
  },
  {
    id: 'ludora',
    name: 'Ludora',
    status: live,
    visual: 'immersive',
    thesis: {
      fr: 'Faire tenir la diversité dans un même système.',
      en: 'Making variety work as one system.',
    },
    tagline: {
      fr: 'Près de 50 jeux réunis dans une même application, avec moteur temps réel, multijoueur et progression partagée.',
      en: 'Nearly 50 games in one application, with a real-time engine, multiplayer and shared progression.',
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
    },
    stack: ['TypeScript', 'Vite MPA', 'Nakama', 'Canvas', 'PWA'],
    links: [
      { label: demo, href: 'https://ludora.adrianguichard.dev/' },
      { label: code, href: 'https://github.com/Addey34/ludora-frontend' },
    ],
    linkNote: {
      fr: 'Backend privé ; frontend public et architecture présentés ici.',
      en: 'Private backend; public frontend and architecture presented here.',
    },
    accent: '#7dd3fc',
    chapter: 'ludora',
  },
  {
    id: 'magnotes',
    name: 'MagNotes',
    status: live,
    visual: 'immersive',
    thesis: {
      fr: 'Transformer le chaos en produit.',
      en: 'Turning chaos into a product.',
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
        fr: "Un produit Dockerisé déployé sur Oracle Cloud, du stockage à l'interface.",
        en: 'A Dockerised product deployed on Oracle Cloud, from storage to interface.',
      },
    },
    stack: ['React', 'TypeScript', 'MongoDB', 'Docker', 'Node'],
    links: [
      { label: demo, href: 'https://magnotes.adrianguichard.dev/' },
      { label: code, href: 'https://github.com/Addey34/magnotes-frontend' },
    ],
    linkNote: {
      fr: 'Backend privé ; frontend public et architecture détaillés ici.',
      en: 'Private backend; public frontend and architecture detailed here.',
    },
    accent: '#6366f1',
    chapter: 'magnotes',
  },
];
