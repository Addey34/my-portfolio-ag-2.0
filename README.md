# Portfolio — Adrian Guichard (v2)

Portfolio scrollytelling **Vite + TypeScript strict**, animations de scroll immersives Canvas/DOM.
Refonte complète, 100 % custom (aucun template), calquée sur les conventions de Galaxy / Ludora.

**🌐 Démo :** _à déployer_

## Le parti pris technique : un scroll qui ne casse jamais

Le problème classique des portfolios animés — « ça saccade en scroll rapide / trackpad / mobile » —
vient de deux erreurs qu'on évite ici par construction :

1. **On ne lie jamais une animation à l'événement `scroll`** (irrégulier, en retard, deltas
   énormes). À la place : **Lenis** lisse le scroll (lerp), et **une seule horloge — le ticker
   GSAP** — pilote _tout_ : Lenis, ScrollTrigger et les rendus Canvas. Un seul `requestAnimationFrame`
   pour scroll + animations + 3D ⇒ aucune contention, aucune désynchro.
2. **On n'anime que `transform` et `opacity`** (composité GPU, zéro reflow). `will-change` est posé
   puis _retiré_ après l'animation.

Voir [`src/core/SmoothScroll.ts`](src/core/SmoothScroll.ts) — c'est la pièce maîtresse.

## Stack

| Lib                  | Rôle                                                    |
| -------------------- | ------------------------------------------------------- |
| Vite                 | Bundler + dev server                                    |
| TypeScript           | Typage strict (`noUnusedLocals` / `noUnusedParameters`) |
| Canvas 2D maison     | Signal topographique + topologie technique AG           |
| Canvas 2D + DOM      | Chapitres projet : décors fidèles à chaque app          |
| GSAP + ScrollTrigger | Scrub des chapitres, reveals batchés, ticker maître     |
| Lenis                | Smooth-scroll normalisé (anti-jank)                     |
| View Transitions API | Cross-fade du contenu au changement de langue           |

> **Zéro dépendance visuelle.** Le champ topographique du héros et les chapitres
> sont rendus en Canvas 2D/DOM pur — pas de bibliothèque de rendu. Tout passe par
> l'horloge unique.

## Le cœur du design : les chapitres

Chaque projet est un **chapitre plein écran qui reconstitue l'univers réel de
l'app** — ses couleurs, ses composants, ses codes, extraits de ses sources :

- **Galaxy** — espace noir, champ d'étoiles, soleil + orbites + planètes, et la
  vraie barre de navigation planètes (pilules à halo coloré). Le scroll dessine
  les orbites et plonge la caméra.
- **Ludora** — le « portail » navy aux aurores cyan/indigo et la grille de tuiles
  de jeux, chacune dans SA couleur du design system, badge ⚡ spotlight. Le
  scroll remplit le catalogue en cascade.
- **MagNotes** — le board sombre à grille de points, des post-it reliés,
  éparpillés… qui s'organisent en colonnes Kanban au fil du scroll. Le chaos →
  la clarté : l'histoire du produit en une animation.

Le texte vit sur un panneau translucide au **contraste garanti** — la lisibilité
ne dépend jamais du décor.

## Commandes

```bash
pnpm install
pnpm dev            # serveur de dev (http://localhost:5173)
pnpm build          # tsc --noEmit puis build de production → dist/
pnpm preview        # servir le build localement
pnpm typecheck      # vérification de types seule
pnpm test           # tests unitaires Vitest
pnpm lint           # ESLint (flat config) ; lint:fix pour corriger
pnpm format         # Prettier
pnpm verify         # format:check + lint + typecheck + build (gate avant « fini »)
```

## Architecture

```
src/
├── main.ts                 # Racine de composition : câble tout sur la boucle unique
├── style.css               # Design tokens + styles
├── core/
│   ├── SmoothScroll.ts      # Lenis + ticker GSAP + pont ScrollTrigger (anti-jank)
│   ├── reveals.ts           # Reveals à l'entrée du viewport (ScrollTrigger.batch)
│   ├── scrollScenes.ts      # Parallaxe du héros (scrub)
│   └── motion.ts            # Garde-fou prefers-reduced-motion
├── i18n/
│   ├── dictionary.ts        # Dictionnaire FR/EN — SOURCE UNIQUE des textes d'UI
│   └── index.ts             # t()/tl(), toggle, registre dynamique, View Transition
├── chapters/                # LE CŒUR : un décor immersif fidèle par projet
│   ├── types.ts             # Contrat ChapterScene + helpers (clamp/ease/window)
│   ├── ChapterManager.ts    # Lazy-import + IntersectionObserver + scrub + pause
│   ├── PortfolioStoryScene.ts # Topologie pieuvre : 24 nœuds composent A et G
│   ├── GalaxyChapter.ts     # Système solaire + nav planètes à halo (Canvas 2D)
│   ├── LudoraChapter.ts     # Portail navy + grille de tuiles de jeux (DOM)
│   ├── MagNotesChapter.ts   # Post-it éparpillés → Kanban (DOM + SVG)
│   └── GenericChapter.ts    # Fallback évolutif : décor auto depuis l'accent
├── visual/
│   ├── VisualDirector.ts    # État artistique global + transitions entre univers
│   ├── SignalField.ts       # Signal persistant : courbes, grille, orbites, connexions
│   └── types.ts             # Contrat VisualState partagé par tous les rendus
├── ui/
│   ├── CommandPalette.ts    # Palette Ctrl/⌘+K : navigation, langue, liens
│   ├── ControlPanel.ts      # Réglages ⚙ : fond, souris, chapitres (persistés)
│   └── MagneticCursor.ts    # Curseur custom aimanté (pointeur fin uniquement)
├── content/
│   ├── projects.ts          # Catalogue des projets — SOURCE UNIQUE
│   └── renderProjects.ts    # Construit le DOM des chapitres depuis la source unique
└── utils/
    └── FPSCounter.ts        # Sonde FPS (dev only) — détecte les chutes de perf
```

### Ajouter une langue

Une entrée par clé dans `src/i18n/dictionary.ts` (les nœuds `[data-i18n]` du HTML
et tout le contenu localisé `{ fr, en }` de `projects.ts` suivent automatiquement).

### Ajouter un projet (le chemin évolutif)

1. **Une entrée dans `PROJECTS`** (`src/content/projects.ts`) — c'est tout ce qui
   est obligatoire. Section, étude de cas, tags, liens, navigation et palette se
   génèrent ; sans chapitre dédié, le `GenericChapter` fabrique un décor propre
   à partir de l'accent. Publiable en 2 minutes.
2. **(Plus tard) Un chapitre sur mesure** : un fichier dans `src/chapters/` qui
   implémente `ChapterScene` (reconstituer l'univers de l'app : ses couleurs,
   ses composants, son histoire au scroll) + 1 ligne dans
   `ChapterManager.LOADERS`. Les trois chapitres existants sont les références.

## Budget performance (les garde-fous « œil aguerri »)

- **LCP < 2.5 s · CLS = 0 · INP < 200 ms · 60 fps** constants.
- Chapitres **lazy-chargés** (import() à l'approche), **en pause hors écran**
  (IntersectionObserver), animés en transform/opacity uniquement, zéro
  allocation par frame — et scrubés par ScrollTrigger, jamais l'événement scroll.
- Champ du héros limité à **30 fps** et DPR 1.5 → coût faible et stable, même sur mobile.
- `prefers-reduced-motion` : Lenis désactivé, reveals instantanés, chapitres
  posés en état statique complet, champ topographique figé.
- Sonde FPS visible en dev pour repérer toute chute pendant le scrollytelling.

## Fonctionnalités

- **Chapitres immersifs par projet** — chaque app est reconstituée dans son
  propre univers (voir « Le cœur du design ») et racontée par le scroll. On
  change de monde à chaque section, dans la même page.
- **i18n FR/EN** — bascule instantanée (HUD ou palette), persistée, sans framework
  ; le contenu se cross-fade via la View Transitions API.
- **Panneau de réglages ⚙** — l'utilisateur coupe/relance le fond animé, la
  réactivité à la souris et l'animation des chapitres ; choix persistés.
- **Champ topographique interactif (héros)** — des lignes de signal dérivent avec
  le scroll et se courbent doucement autour du pointeur. Discret, jamais sous les chapitres.
- **Direction visuelle unifiée** — le même signal devient réseau dans la stack,
  orbites dans Galaxy, grille dans Ludora, connexions dans MagNotes puis converge
  vers le CTA final. Accent, pulsation, énergie et pointeur sont partagés.
- **Command palette Ctrl/⌘+K** — navigation vers sections/projets, changement de
  langue, liens externes ; filtrage et navigation clavier, focus restauré (a11y).
- **Curseur magnétique** — point + anneau lissés, aimantation des éléments
  `[data-magnetic]`. Actif uniquement sur pointeur fin, jamais en reduced-motion.
- **CI Lighthouse** — `.github/workflows/lighthouse.yml` + `lighthouserc.json` :
  build et audit à chaque push/PR, CLS et accessibilité bloquants.

## Pistes suivantes

- Enrichir chaque chapitre (Galaxy : mode explo « voyage » ; Ludora : partie de
  Snake auto-jouée dans une tuile ; MagNotes : bascule Kanban → Timeline).
- Persistance du thème clair-sombre.
- Préchargement (`link rel=modulepreload`) du premier chapitre.

## Intégration GitHub

Le portfolio utilise l’API REST publique de GitHub pour afficher des informations
à jour sur le profil `Addey34` et son activité publique récente.

- API : `https://api.github.com`
- Données : profil public + dépôts publics appartenant au compte
- Authentification : aucune, uniquement des données publiques
- Cache navigateur : 30 minutes pour limiter les requêtes
- Support : `adrian34470@gmail.com`

L’intégration est conçue avec un fallback silencieux : une indisponibilité ou un
rate-limit GitHub n’empêche jamais le portfolio de fonctionner.

## Licence

Code sous **PolyForm Noncommercial License 1.0.0** (comme Galaxy / Ludora / MagNotes).
